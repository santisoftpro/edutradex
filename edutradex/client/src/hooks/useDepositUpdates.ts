import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';

type UpdateCallback = (depositId: string, status: 'APPROVED' | 'REJECTED') => void;

/**
 * Hook to listen for real-time deposit updates via WebSocket.
 * Calls the provided callback when a deposit_update message is received.
 */
export function useDepositUpdates(onUpdate: UpdateCallback) {
  const { token, isAuthenticated } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[useDepositUpdates] Connected');
      ws.send(JSON.stringify({ type: 'authenticate', payload: { token } }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'deposit_update' && message.payload) {
          const { id, status } = message.payload;
          if (id && (status === 'APPROVED' || status === 'REJECTED')) {
            console.log('[useDepositUpdates] Deposit update received:', id, status);
            onUpdateRef.current(id, status);
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      console.warn('[useDepositUpdates] WebSocket error');
    };

    ws.onclose = () => {
      console.log('[useDepositUpdates] Disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, token]);
}
