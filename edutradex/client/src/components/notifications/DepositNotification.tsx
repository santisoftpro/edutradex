'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, X, DollarSign, ArrowUpFromLine, Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { DepositStatus, WithdrawalStatus } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;
const FALLBACK_POLL_INTERVAL = 60000; // Fallback polling every 60s if WebSocket fails

type TransactionType = 'deposit' | 'withdrawal';
type TransactionStatus = DepositStatus | WithdrawalStatus;

interface TransactionNotificationData {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  method: string;
  adminNote?: string;
}

interface WebSocketMessage {
  type: string;
  payload?: {
    id?: string;
    amount?: number;
    status?: 'APPROVED' | 'REJECTED';
    method?: string;
    adminNote?: string;
    timestamp?: number;
    // Connection/auth payload
    clientId?: string;
    userId?: string;
    message?: string;
    // Ticket reply payload
    ticketId?: string;
    ticketNumber?: string;
    subject?: string;
    isClosed?: boolean;
  };
}

export function DepositNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated, refreshProfile } = useAuthStore();
  const { addNotification } = useNotificationStore();

  // Debug: Log when provider mounts
  useEffect(() => {
    console.log('[Notifications] DepositNotificationProvider mounted', {
      isAuthenticated,
      hasToken: !!token,
      userId: user?.id,
    });
  }, [isAuthenticated, token, user?.id]);
  const [notification, setNotification] = useState<TransactionNotificationData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const previousDepositsRef = useRef<Map<string, TransactionStatus>>(new Map());
  const previousWithdrawalsRef = useRef<Map<string, TransactionStatus>>(new Map());
  const isInitializedRef = useRef(false);

  // WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Handle incoming WebSocket notification
  const handleWebSocketNotification = useCallback((type: 'deposit' | 'withdrawal', payload: WebSocketMessage['payload']) => {
    console.log('[Notifications] handleWebSocketNotification called:', type, payload);
    if (!payload || !payload.id || !payload.status) {
      console.log('[Notifications] Invalid payload, skipping notification');
      return;
    }

    const isApproved = payload.status === 'APPROVED';
    const isDeposit = type === 'deposit';
    const amount = payload.amount || 0;

    // Show toast notification immediately
    if (isApproved) {
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-emerald-500/50 overflow-hidden`}
        >
          <div className="flex-1 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  {isDeposit ? 'Deposit Completed!' : 'Withdrawal Completed!'}
                </p>
                <p className="mt-1 text-sm text-emerald-400 font-bold">
                  {formatCurrency(amount)} has been {isDeposit ? 'credited to your account' : 'processed'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-white focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
      });
    } else {
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-red-500/50 overflow-hidden`}
        >
          <div className="flex-1 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  {isDeposit ? 'Deposit Declined' : 'Withdrawal Declined'}
                </p>
                <p className="mt-1 text-sm text-red-400">
                  {formatCurrency(amount)} request was not approved
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-white focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
      });
    }

    // Add to notification store for the bell icon
    const notificationType = isDeposit
      ? isApproved ? 'deposit_approved' : 'deposit_rejected'
      : isApproved ? 'withdrawal_approved' : 'withdrawal_rejected';

    addNotification({
      type: notificationType,
      title: isDeposit
        ? isApproved ? 'Deposit Completed' : 'Deposit Declined'
        : isApproved ? 'Withdrawal Completed' : 'Withdrawal Declined',
      message: isApproved
        ? isDeposit
          ? 'Your funds have been credited to your account'
          : 'Your withdrawal has been processed'
        : payload.adminNote || 'Your request was not approved',
      amount: amount,
    });

    // Also set notification for modal
    setNotification({
      id: payload.id,
      type,
      amount: amount,
      status: payload.status,
      method: payload.method || '',
      adminNote: payload.adminNote,
    });
    setShowModal(true);

    // Refresh profile to update balance
    refreshProfile();
  }, [refreshProfile, addNotification]);

  // WebSocket connection logic
  const clearWsTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || !token) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[Notifications] WebSocket connected to:', WS_URL);
        setWsConnected(true);
        clearWsTimers();

        // Authenticate immediately
        console.log('[Notifications] Sending authentication...');
        ws.send(JSON.stringify({ type: 'authenticate', payload: { token } }));

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[Notifications] Received message:', message.type, message.payload);

          switch (message.type) {
            case 'authenticated':
              console.log('[Notifications] WebSocket authenticated successfully! User ID:', message.payload?.userId);
              break;

            case 'connected':
              console.log('[Notifications] WebSocket connection confirmed, client ID:', message.payload?.clientId);
              break;

            case 'withdrawal_update':
              console.log('[Notifications] Real-time withdrawal update received');
              handleWebSocketNotification('withdrawal', message.payload);
              break;

            case 'deposit_update':
              console.log('[Notifications] Real-time deposit update received');
              handleWebSocketNotification('deposit', message.payload);
              break;

            case 'ticket_reply':
              console.log('[Notifications] Ticket reply received');
              if (message.payload?.ticketNumber) {
                const { ticketNumber, subject, isClosed } = message.payload;
                addNotification({
                  type: 'ticket_reply',
                  title: isClosed ? 'Ticket Closed' : 'New Reply to Your Ticket',
                  message: `${ticketNumber}: ${subject}`,
                });
                toast.success(
                  isClosed
                    ? `Your ticket ${ticketNumber} has been resolved`
                    : `You have a new reply on ticket ${ticketNumber}`,
                  { duration: 5000 }
                );
              }
              break;

            case 'error':
              console.error('[Notifications] WebSocket error:', message.payload);
              break;
          }
        } catch (error) {
          console.error('[Notifications] Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        console.warn('[Notifications] WebSocket error occurred');
      };

      ws.onclose = (event) => {
        console.log('[Notifications] WebSocket disconnected:', event.code);
        setWsConnected(false);
        clearWsTimers();

        // Attempt reconnect if still authenticated
        if (!event.wasClean && isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_INTERVAL);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[Notifications] WebSocket connection failed:', error);
      if (isAuthenticated) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_INTERVAL);
      }
    }
  }, [isAuthenticated, token, clearWsTimers, handleWebSocketNotification]);

  // Fallback polling (only when WebSocket is not connected)
  const checkForUpdates = useCallback(async () => {
    if (!isAuthenticated || !user || !token || wsConnected) return;

    try {
      // Fetch deposits and withdrawals separately to handle errors gracefully
      let deposits: any[] = [];
      let withdrawals: any[] = [];

      try {
        deposits = await api.getMyDeposits();
      } catch (e) {
        console.warn('[Notifications] Failed to fetch deposits:', e);
      }

      try {
        withdrawals = await api.getMyWithdrawals();
      } catch (e) {
        console.warn('[Notifications] Failed to fetch withdrawals:', e);
      }

      if (deposits.length === 0 && withdrawals.length === 0) return;

      if (!isInitializedRef.current) {
        deposits.forEach(deposit => {
          previousDepositsRef.current.set(deposit.id, deposit.status);
        });
        withdrawals.forEach(withdrawal => {
          previousWithdrawalsRef.current.set(withdrawal.id, withdrawal.status);
        });
        isInitializedRef.current = true;
        return;
      }

      for (const deposit of deposits) {
        const previousStatus = previousDepositsRef.current.get(deposit.id);
        if (previousStatus && previousStatus !== deposit.status) {
          if (deposit.status === 'APPROVED' || deposit.status === 'REJECTED') {
            setNotification({
              id: deposit.id,
              type: 'deposit',
              amount: deposit.amount,
              status: deposit.status,
              method: deposit.method,
              adminNote: deposit.adminNote,
            });
            setShowModal(true);
            if (deposit.status === 'APPROVED') {
              await refreshProfile();
            }
          }
        }
        previousDepositsRef.current.set(deposit.id, deposit.status);
      }

      for (const withdrawal of withdrawals) {
        const previousStatus = previousWithdrawalsRef.current.get(withdrawal.id);
        if (previousStatus && previousStatus !== withdrawal.status) {
          if (withdrawal.status === 'APPROVED' || withdrawal.status === 'REJECTED') {
            setNotification({
              id: withdrawal.id,
              type: 'withdrawal',
              amount: withdrawal.amount,
              status: withdrawal.status,
              method: withdrawal.method,
              adminNote: withdrawal.adminNote,
            });
            setShowModal(true);
            await refreshProfile();
          }
        }
        previousWithdrawalsRef.current.set(withdrawal.id, withdrawal.status);
      }
    } catch (error) {
      console.error('Failed to check transaction updates:', error);
    }
  }, [isAuthenticated, user, token, wsConnected, refreshProfile]);

  // WebSocket connection effect
  useEffect(() => {
    if (isAuthenticated && token) {
      connectWebSocket();
    }

    return () => {
      clearWsTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, token, connectWebSocket, clearWsTimers]);

  // Fallback polling effect (only when WebSocket is not connected)
  useEffect(() => {
    if (!isAuthenticated) {
      isInitializedRef.current = false;
      previousDepositsRef.current.clear();
      previousWithdrawalsRef.current.clear();
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      return;
    }

    // Initial check for fallback
    if (!wsConnected) {
      checkForUpdates();
      fallbackIntervalRef.current = setInterval(checkForUpdates, FALLBACK_POLL_INTERVAL);
    } else if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, wsConnected, checkForUpdates]);

  const closeModal = () => {
    setShowModal(false);
    setNotification(null);
  };

  const isApproved = notification?.status === 'APPROVED';
  const isDeposit = notification?.type === 'deposit';

  return (
    <>
      {children}

      {/* Notification Modal */}
      {showModal && notification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 animate-in zoom-in-95 fade-in duration-300">
            <div className={`
              bg-slate-800 rounded-2xl border-2 shadow-2xl overflow-hidden
              ${isApproved ? 'border-emerald-500/50' : 'border-red-500/50'}
            `}>
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header with icon */}
              <div className={`
                px-6 py-8 text-center
                ${isApproved
                  ? 'bg-gradient-to-b from-emerald-600/20 to-transparent'
                  : 'bg-gradient-to-b from-red-600/20 to-transparent'
                }
              `}>
                <div className={`
                  w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4
                  ${isApproved
                    ? 'bg-emerald-500/20 ring-4 ring-emerald-500/30'
                    : 'bg-red-500/20 ring-4 ring-red-500/30'
                  }
                `}>
                  {isApproved ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  ) : (
                    <XCircle className="h-10 w-10 text-red-400" />
                  )}
                </div>

                <h2 className={`
                  text-2xl font-bold
                  ${isApproved ? 'text-emerald-400' : 'text-red-400'}
                `}>
                  {isDeposit
                    ? isApproved ? 'Deposit Completed!' : 'Deposit Declined'
                    : isApproved ? 'Withdrawal Completed!' : 'Withdrawal Declined'
                  }
                </h2>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-600 rounded-lg">
                        {isDeposit ? (
                          <DollarSign className="h-5 w-5 text-slate-300" />
                        ) : (
                          <ArrowUpFromLine className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Amount</p>
                        <p className="text-white text-xl font-bold">
                          {formatCurrency(notification.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">Method</p>
                      <p className="text-white font-medium">
                        {notification.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Crypto'}
                      </p>
                    </div>
                  </div>
                </div>

                {isDeposit ? (
                  isApproved ? (
                    <p className="text-slate-300 text-center mb-4">
                      Your funds have been credited to your account. You can now start trading!
                    </p>
                  ) : (
                    <div className="text-center mb-4">
                      <p className="text-slate-300 mb-2">
                        Unfortunately, your deposit request was declined.
                      </p>
                      {notification.adminNote && (
                        <p className="text-slate-400 text-sm italic">
                          Reason: {notification.adminNote}
                        </p>
                      )}
                    </div>
                  )
                ) : (
                  isApproved ? (
                    <p className="text-slate-300 text-center mb-4">
                      Your withdrawal has been processed. The funds will be sent to your account shortly.
                    </p>
                  ) : (
                    <div className="text-center mb-4">
                      <p className="text-slate-300 mb-2">
                        Unfortunately, your withdrawal request was declined.
                      </p>
                      {notification.adminNote && (
                        <p className="text-slate-400 text-sm italic">
                          Reason: {notification.adminNote}
                        </p>
                      )}
                    </div>
                  )
                )}

                <button
                  onClick={closeModal}
                  className={`
                    w-full py-3 rounded-xl font-medium transition-colors
                    ${isApproved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-600 hover:bg-slate-500 text-white'
                    }
                  `}
                >
                  {isApproved && isDeposit ? 'Start Trading' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
