import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PriceTick } from '@/lib/api';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore, markTradeNotified } from '@/store/trade.store';
import { playWinSound, playLoseSound } from '@/lib/sounds';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;

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
          console.log('[WebSocket] Connected');
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
                console.log('[WebSocket] Connection confirmed', message.payload);
                break;

              case 'authenticated':
                console.log('[WebSocket] Authenticated', message.payload);
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

              case 'trade_settled': {
                console.log('[WebSocket] Trade settled received:', message.payload);
                const { id, symbol, result, profit, amount } = message.payload || {};
                const won = result === 'WON';
                const profitAmount = typeof profit === 'number' ? profit : 0;
                const tradeAmount = typeof amount === 'number' ? amount : 0;

                // Only show notification if not already shown (prevents duplicates)
                if (id && markTradeNotified(id)) {
                  console.log('[WebSocket] Trade result:', { won, profitAmount, tradeAmount, symbol });

                  // Play sound and show notification
                  if (won) {
                    playWinSound();
                    toast.success(`Profit +$${profitAmount.toFixed(2)} on ${symbol || 'trade'}`, { duration: 4000 });
                  } else {
                    playLoseSound();
                    toast.error(`Loss -$${tradeAmount.toFixed(2)} on ${symbol || 'trade'}`, { duration: 4000 });
                  }
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

                // Refresh balance only
                useAuthStore.getState().refreshProfile();
                break;
              }

              case 'subscribed':
                console.log('[WebSocket] Subscribed to', message.payload?.symbol);
                break;

              case 'unsubscribed':
                console.log('[WebSocket] Unsubscribed from', message.payload?.symbol);
                break;

              case 'pong':
                // Heartbeat response
                break;

              case 'error':
                console.error('[WebSocket] Server error', message.payload);
                break;

              default:
                console.log('[WebSocket] Unknown message type', message.type);
            }
          } catch (error) {
            console.error('[WebSocket] Failed to parse message', error);
          }
        };

        ws.onerror = () => {
          // WebSocket errors don't provide useful info in browser
          // The onclose handler will handle reconnection
          console.warn('[WebSocket] Connection error occurred');
          isConnectingRef.current = false;
        };

        ws.onclose = (event) => {
          console.log('[WebSocket] Disconnected', event.code, event.reason);
          isConnectingRef.current = false;
          setIsConnected(false);
          clearTimers();

          // Attempt reconnect
          if (!event.wasClean) {
            console.log(`[WebSocket] Reconnecting in ${RECONNECT_INTERVAL}ms...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, RECONNECT_INTERVAL);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('[WebSocket] Connection failed', error);
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
