import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PriceTick } from '@/lib/api';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';

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

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((symbol: string) => {
    subscribedSymbolsRef.current.add(symbol);
    sendMessage({ type: 'subscribe', payload: { symbol } });
  }, [sendMessage]);

  const unsubscribe = useCallback((symbol: string) => {
    subscribedSymbolsRef.current.delete(symbol);
    sendMessage({ type: 'unsubscribe', payload: { symbol } });
  }, [sendMessage]);

  const subscribeAll = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => subscribedSymbolsRef.current.add(symbol));
    sendMessage({ type: 'subscribe_all', payload: { symbols } });
  }, [sendMessage]);

  const startPingInterval = useCallback(() => {
    clearInterval(pingIntervalRef.current!);
    pingIntervalRef.current = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, PING_INTERVAL);
  }, [sendMessage]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
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
          sendMessage({ type: 'subscribe_all', payload: { symbols } });
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
                setLatestPrices((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(priceTick.symbol, priceTick);
                  return newMap;
                });
                // Update price history
                setPriceHistory((prev) => {
                  const newMap = new Map(prev);
                  const history = newMap.get(priceTick.symbol) || [];
                  const updatedHistory = [...history, priceTick];
                  // Keep only the last MAX_HISTORY_LENGTH entries
                  if (updatedHistory.length > MAX_HISTORY_LENGTH) {
                    updatedHistory.shift();
                  }
                  newMap.set(priceTick.symbol, updatedHistory);
                  return newMap;
                });
              }
              break;

            case 'deposit_update': {
              const { amount, status, adminNote } = message.payload;
              const isApproved = status === 'APPROVED';
              const depositMessage = isApproved
                ? `Your deposit of $${amount.toFixed(2)} has been approved and added to your balance.`
                : `Your deposit of $${amount.toFixed(2)} has been rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`;

              // Add to notification store
              useNotificationStore.getState().addNotification({
                type: isApproved ? 'deposit_approved' : 'deposit_rejected',
                title: isApproved ? 'Deposit Approved' : 'Deposit Rejected',
                message: depositMessage,
                amount,
              });

              // Show toast for immediate feedback
              if (isApproved) {
                toast.success(depositMessage, { duration: 5000 });
              } else {
                toast.error(depositMessage, { duration: 5000 });
              }

              // Refresh user profile to get updated balance
              useAuthStore.getState().refreshProfile();
              break;
            }

            case 'withdrawal_update': {
              const { amount, status, adminNote } = message.payload;
              const isApproved = status === 'APPROVED';
              const withdrawalMessage = isApproved
                ? `Your withdrawal of $${amount.toFixed(2)} has been approved and processed.`
                : `Your withdrawal of $${amount.toFixed(2)} has been rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`;

              // Add to notification store
              useNotificationStore.getState().addNotification({
                type: isApproved ? 'withdrawal_approved' : 'withdrawal_rejected',
                title: isApproved ? 'Withdrawal Approved' : 'Withdrawal Rejected',
                message: withdrawalMessage,
                amount,
              });

              // Show toast for immediate feedback
              if (isApproved) {
                toast.success(withdrawalMessage, { duration: 5000 });
              } else {
                toast.error(withdrawalMessage, { duration: 5000 });
              }

              // Refresh user profile to get updated balance
              useAuthStore.getState().refreshProfile();
              break;
            }

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
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', event.code, event.reason);
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
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_INTERVAL);
    }
  }, [clearTimers, startPingInterval, sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);

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
