import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealTimeMetrics } from '@/lib/api';

interface FinancialUpdate {
  type: 'realtime_metrics' | 'daily_snapshot' | 'monthly_report' | 'alert';
  payload: Record<string, unknown>;
  timestamp: number;
}

interface FinancialAlert {
  alertType: 'high_exposure' | 'daily_loss_limit' | 'unusual_activity';
  message: string;
  severity: 'warning' | 'critical';
  data?: Record<string, unknown>;
  timestamp: number;
}

interface UseFinancialUpdatesReturn {
  realTimeMetrics: RealTimeMetrics | null;
  alerts: FinancialAlert[];
  isConnected: boolean;
  clearAlerts: () => void;
}

export function useFinancialUpdates(): UseFinancialUpdatesReturn {
  const queryClient = useQueryClient();
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  useEffect(() => {
    // Get WebSocket connection from global state or context
    // For now, we'll use the window object to check for existing WS connection
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'financial_update') {
          const update = message.payload as FinancialUpdate;

          switch (update.type) {
            case 'realtime_metrics':
              setRealTimeMetrics(update.payload as unknown as RealTimeMetrics);
              // Also invalidate the query to keep React Query in sync
              queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
              break;

            case 'daily_snapshot':
              // Invalidate daily snapshots query
              queryClient.invalidateQueries({ queryKey: ['daily-snapshots'] });
              queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
              break;

            case 'monthly_report':
              // Invalidate monthly reports query
              queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
              break;

            case 'alert':
              // Add to alerts array
              setAlerts(prev => [...prev, {
                ...(update.payload as unknown as Omit<FinancialAlert, 'timestamp'>),
                timestamp: Date.now(),
              }]);
              break;
          }
        }

        if (message.type === 'financial_alert') {
          setAlerts(prev => [...prev, {
            ...message.payload,
            timestamp: Date.now(),
          }]);
        }

        if (message.type === 'connected') {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error parsing financial update:', error);
      }
    };

    // Listen for WebSocket messages
    // This assumes there's a global WebSocket instance or event bus
    // In a real implementation, you'd integrate with your WebSocket context

    // For now, we'll use a custom event for demonstration
    const handleCustomEvent = (event: CustomEvent) => {
      handleMessage({ data: JSON.stringify(event.detail) } as MessageEvent);
    };

    window.addEventListener('financial-update' as any, handleCustomEvent);

    // Cleanup
    return () => {
      window.removeEventListener('financial-update' as any, handleCustomEvent);
    };
  }, [queryClient]);

  return {
    realTimeMetrics,
    alerts,
    isConnected,
    clearAlerts,
  };
}

// Utility function to dispatch financial updates (for testing or manual triggering)
export function dispatchFinancialUpdate(update: FinancialUpdate): void {
  window.dispatchEvent(new CustomEvent('financial-update', { detail: { type: 'financial_update', payload: update } }));
}

export function dispatchFinancialAlert(alert: Omit<FinancialAlert, 'timestamp'>): void {
  window.dispatchEvent(new CustomEvent('financial-update', { detail: { type: 'financial_alert', payload: alert } }));
}
