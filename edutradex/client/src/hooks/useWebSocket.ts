import { useEffect, useRef, useState, useCallback } from 'react';
import { PriceTick } from '@/lib/api';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore, markTradeNotified } from '@/store/trade.store';
import { playWinSound, playLoseSound } from '@/lib/sounds';
import { showTradeNotification } from '@/components/notifications/TradeNotification';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;
const IS_DEV = process.env.NODE_ENV === 'development';

interface WebSocketMessage {
  type: string;
  payload?: any;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  latestPrices: Map<string, PriceTick>;
  priceHistory: Map<string, PriceTick[]>;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  subscribeAll: (symbols: string[]) => void;
}

const MAX_HISTORY_LENGTH = 300; // Keep 5 minutes of history at 1 tick/second

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [latestPrices, setLatestPrices] = useState<Map<string, PriceTick>>(new Map());
  const [priceHistory, setPriceHistory] = useState<Map<string, PriceTick[]>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const isAuthenticatedRef = useRef(false);
  const isConnectingRef = useRef(false);

  // Stable sendMessage ref that doesn't change between renders
  const sendMessageRef = useRef<(message: WebSocketMessage) => void>(() => {});
  sendMessageRef.current = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const subscribe = useCallback((symbol: string) => {
    subscribedSymbolsRef.current.add(symbol);
    sendMessageRef.current({ type: 'subscribe', payload: { symbol } });
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    subscribedSymbolsRef.current.delete(symbol);
    sendMessageRef.current({ type: 'unsubscribe', payload: { symbol } });
  }, []);

  const subscribeAll = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    sendMessageRef.current({ type: 'subscribe_all', payload: { symbols } });
  }, []);

  // Connection effect - runs only once on mount
  useEffect(() => {
    const clearTimers = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const startPingInterval = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      pingIntervalRef.current = setInterval(() => {
        sendMessageRef.current({ type: 'ping' });
      }, PING_INTERVAL);
    };

    const connect = () => {
      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      isConnectingRef.current = true;

      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (IS_DEV) console.log('[WebSocket] Connected');
          isConnectingRef.current = false;
          setIsConnected(true);
          clearTimers();
          startPingInterval();

          // Authenticate with token if available
          const currentToken = useAuthStore.getState().token;
          if (currentToken) {
            ws.send(JSON.stringify({ type: 'authenticate', payload: { token: currentToken } }));
          }

          // Resubscribe to previously subscribed symbols
          if (subscribedSymbolsRef.current.size > 0) {
            const symbols = Array.from(subscribedSymbolsRef.current);
            ws.send(JSON.stringify({ type: 'subscribe_all', payload: { symbols } }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            switch (message.type) {
              case 'connected':
                if (IS_DEV) console.log('[WebSocket] Connection confirmed');
                break;

              case 'authenticated':
                if (IS_DEV) console.log('[WebSocket] Authenticated');
                isAuthenticatedRef.current = true;
                break;

              case 'price_update':
                if (message.payload) {
                  const priceTick = message.payload as PriceTick;
                  // Batch updates to reduce re-renders
                  setLatestPrices((prev) => {
                    // Only update if price actually changed
                    const existing = prev.get(priceTick.symbol);
                    if (existing?.price === priceTick.price) {
                      return prev; // No change, don't trigger re-render
                    }
                    const newMap = new Map(prev);
                    newMap.set(priceTick.symbol, priceTick);
                    return newMap;
                  });
                  // Update price history
                  setPriceHistory((prev) => {
                    const history = prev.get(priceTick.symbol) || [];
                    const newHistory = [...history, priceTick];
                    if (newHistory.length > MAX_HISTORY_LENGTH) {
                      newHistory.shift();
                    }
                    const newMap = new Map(prev);
                    newMap.set(priceTick.symbol, newHistory);
                    return newMap;
                  });
                }
                break;

              // deposit_update and withdrawal_update are handled by DepositNotificationProvider
              // to avoid duplicate notifications

              case 'copy_trade_executed': {
                const { symbol, direction, amount, leaderName } = message.payload;
                useNotificationStore.getState().addNotification({
                  type: 'system',
                  title: 'Trade Copied',
                  message: `Copied ${direction} trade on ${symbol} for $${amount.toFixed(2)} from ${leaderName}`,
                  amount,
                });
                break;
              }

              case 'pending_copy_trade': {
                const { symbol, direction, suggestedAmount, leaderName } = message.payload;
                useNotificationStore.getState().addNotification({
                  type: 'system',
                  title: 'Trade Pending Approval',
                  message: `${leaderName} placed a ${direction} trade on ${symbol}. Approve to copy for $${suggestedAmount.toFixed(2)}`,
                  amount: suggestedAmount,
                });
                break;
              }

              case 'leader_status_change': {
                const { status, adminNote } = message.payload;
                const isApproved = status === 'APPROVED';
                const isSuspended = status === 'SUSPENDED';
                useNotificationStore.getState().addNotification({
                  type: isApproved ? 'copy_trading_approved' : 'copy_trading_rejected',
                  title: isApproved
                    ? 'Leader Application Approved'
                    : isSuspended
                    ? 'Leader Account Suspended'
                    : 'Leader Application Rejected',
                  message: isApproved
                    ? 'Congratulations! Your leader application has been approved. Traders can now follow you.'
                    : isSuspended
                    ? `Your leader account has been suspended.${adminNote ? ` Reason: ${adminNote}` : ''}`
                    : `Your leader application has been rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
                });
                break;
              }

              case 'balance_update': {
                // Immediate balance sync from server - no need to call refreshProfile
                const { balance, practiceBalance } = message.payload || {};
                if (typeof balance === 'number' || typeof practiceBalance === 'number') {
                  const authStore = useAuthStore.getState();
                  if (authStore.user) {
                    useAuthStore.setState({
                      user: {
                        ...authStore.user,
                        ...(typeof balance === 'number' && { demoBalance: balance }),
                        ...(typeof practiceBalance === 'number' && { practiceBalance }),
                      },
                    });
                  }
                }
                break;
              }

              case 'trade_settled': {
                const { id, symbol, result, profit, amount, newBalance, accountType, direction, entryPrice, exitPrice } = message.payload || {};
                const won = result === 'WON';
                const profitAmount = typeof profit === 'number' ? profit : 0;
                const tradeAmount = typeof amount === 'number' ? amount : 0;

                // Only show notification if not already shown (prevents duplicates)
                if (id && markTradeNotified(id)) {

                  // Play sound
                  if (won) {
                    playWinSound();
                  } else {
                    playLoseSound();
                  }

                  // Show styled trade notification
                  showTradeNotification({
                    symbol: symbol || 'Unknown',
                    result: won ? 'WON' : 'LOST',
                    amount: tradeAmount,
                    profit: profitAmount,
                    direction: direction || 'UP',
                    entryPrice,
                    exitPrice,
                  });
                }

                // Remove trade from active trades (don't call full syncFromApi to save API calls)
                if (id) {
                  const tradeStore = useTradeStore.getState();
                  const activeTrade = tradeStore.activeTrades.find(t => t.id === id);
                  if (activeTrade) {
                    useTradeStore.setState({
                      activeTrades: tradeStore.activeTrades.filter(t => t.id !== id),
                      trades: tradeStore.trades.map(t =>
                        t.id === id ? { ...t, status: won ? 'won' : 'lost', profit: profitAmount } : t
                      ),
                    });
                  }
                }

                // Update balance directly if provided, otherwise refresh from server
                if (typeof newBalance === 'number') {
                  const authStore = useAuthStore.getState();
                  if (authStore.user) {
                    const balanceKey = accountType === 'LIVE' ? 'demoBalance' : 'practiceBalance';
                    useAuthStore.setState({
                      user: {
                        ...authStore.user,
                        [balanceKey]: newBalance,
                      },
                    });
                  }
                } else {
                  // Fallback: Refresh balance from server
                  useAuthStore.getState().refreshProfile();
                }
                break;
              }

              case 'subscribed':
                // Subscription confirmed
                break;

              case 'unsubscribed':
                // Unsubscription confirmed
                break;

              case 'pong':
                // Heartbeat response
                break;

              case 'error':
                if (IS_DEV) console.error('[WebSocket] Server error:', message.payload?.message || 'Unknown error');
                break;

              default:
                if (IS_DEV) console.log('[WebSocket] Unknown message type:', message.type);
            }
          } catch {
            // Silently ignore malformed messages in production
            if (IS_DEV) console.error('[WebSocket] Failed to parse message');
          }
        };

        ws.onerror = () => {
          // WebSocket errors don't provide useful info in browser
          // The onclose handler will handle reconnection
          isConnectingRef.current = false;
        };

        ws.onclose = (event) => {
          if (IS_DEV) console.log('[WebSocket] Disconnected:', event.code);
          isConnectingRef.current = false;
          setIsConnected(false);
          clearTimers();

          // Attempt reconnect
          if (!event.wasClean) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, RECONNECT_INTERVAL);
          }
        };

        wsRef.current = ws;
      } catch {
        isConnectingRef.current = false;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_INTERVAL);
      }
    };

    // Start connection
    connect();

    // Cleanup on unmount
    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array - runs only once on mount

  // Re-authenticate when token changes (e.g., user logs in after page load)
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (isConnected && token && !isAuthenticatedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'authenticate', payload: { token } }));
    }
  }, [isConnected]);

  // Subscribe to auth store changes to detect login
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      // If token changed from null to a value, authenticate
      if (state.token && !prevState.token && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'authenticate', payload: { token: state.token } }));
        isAuthenticatedRef.current = false; // Reset so authenticated message sets it
      }
      // If token changed from a value to null (logout), reset authenticated state
      if (!state.token && prevState.token) {
        isAuthenticatedRef.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    latestPrices,
    priceHistory,
    subscribe,
    unsubscribe,
    subscribeAll,
  };
}
