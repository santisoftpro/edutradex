import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType =
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'copy_trading_approved'
  | 'copy_trading_rejected'
  | 'trade_win'
  | 'trade_loss'
  | 'ticket_reply'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amount?: number;
  read: boolean;
  createdAt: string; // Changed to string for serialization
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isHydrated: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  resetStore: () => void;
  setHydrated: () => void;
}

// Helper to get user-specific storage key
function getUserStorageKey(): string {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      const userId = parsed?.state?.user?.id;
      if (userId) {
        return `notifications-storage-${userId}`;
      }
    }
  } catch {
    // Fallback to default key if parsing fails
  }
  return 'notifications-storage';
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification && !notification.read) {
            return {
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            };
          }
          return state;
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      resetStore: () => {
        // Clear all notification data (called on logout)
        set({
          notifications: [],
          unreadCount: 0,
          isHydrated: false,
        });
        // Clear localStorage for ALL possible user keys
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('notifications-storage')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.error('Failed to clear notification storage:', error);
        }
      },
    }),
    {
      name: getUserStorageKey(), // User-specific storage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 20),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recalculate unreadCount from notifications
          const unreadCount = state.notifications.filter((n) => !n.read).length;
          state.unreadCount = unreadCount;
          state.isHydrated = true;
        }
      },
    }
  )
);
