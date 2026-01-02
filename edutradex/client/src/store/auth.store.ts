import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, type LoginResponse, type TwoFactorPendingResponse } from '@/lib/api';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { User, AuthResponse, AccountType } from '@/types';

// Custom error for 2FA required
export class TwoFactorRequiredError extends Error {
  constructor(public tempToken: string, public userId: string) {
    super('Two-factor authentication required');
    this.name = 'TwoFactorRequiredError';
  }
}

// Throttle state for preventing rapid API calls
let lastRefreshTime = 0;
let pendingRefresh: Promise<void> | null = null;
const REFRESH_THROTTLE_MS = 2000; // Minimum 2 seconds between profile refreshes

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  updateBalance: (newBalance: number) => void;
  updateLiveBalance: (newBalance: number) => void;
  updateDemoBalance: (newBalance: number) => void;
  updatePracticeBalance: (newBalance: number) => void;
  resetBalance: () => Promise<void>;
  topUpDemoBalance: (amount: number) => Promise<void>;
  topUpPracticeBalance: (amount?: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchAccount: (accountType: AccountType) => Promise<void>;
  setHydrated: () => void;
  initializeToken: () => void;
  getActiveBalance: () => number;
  syncBalanceFromServer: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  isHydrated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // Get device fingerprint for security tracking
          let deviceFingerprint: string | undefined;
          try {
            deviceFingerprint = await getDeviceFingerprint();
          } catch (e) {
            console.warn('Failed to generate device fingerprint:', e);
          }

          const response = await api.post<AuthResponse | TwoFactorPendingResponse>('/auth/login', {
            email,
            password,
            deviceFingerprint,
          });

          // Check if 2FA is required (TwoFactorPendingResponse is inside data)
          const responseData = response as AuthResponse;
          if ('requires2FA' in responseData.data) {
            const pending = responseData.data as unknown as TwoFactorPendingResponse;
            set({ isLoading: false });
            throw new TwoFactorRequiredError(pending.tempToken, pending.userId);
          }

          // Normal login response
          const { user, token } = responseData.data;
          api.setToken(token);

          // Set user from server response - this is the source of truth
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string, referralCode?: string) => {
        set({ isLoading: true });
        try {
          // Get device fingerprint for security tracking
          let deviceFingerprint: string | undefined;
          try {
            deviceFingerprint = await getDeviceFingerprint();
          } catch (e) {
            console.warn('Failed to generate device fingerprint:', e);
          }

          const response = await api.post<AuthResponse>('/auth/register', {
            email,
            password,
            name,
            deviceFingerprint,
            ...(referralCode && { referralCode }),
          });

          const { user, token } = response.data;
          api.setToken(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        api.setToken(null);

        // Clear trade store to prevent data leakage between users
        try {
          const { useTradeStore } = require('./trade.store');
          useTradeStore.getState().resetStore();
        } catch (error) {
          console.error('Failed to reset trade store:', error);
        }

        // Clear notification store to prevent data leakage between users
        try {
          const { useNotificationStore } = require('./notification.store');
          useNotificationStore.getState().resetStore();
        } catch (error) {
          console.error('Failed to reset notification store:', error);
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      // Set user directly (used for impersonation)
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      // Set token directly (used for impersonation)
      setToken: (token: string) => {
        api.setToken(token);
        set({ token });
      },

      // NOTE: This is for optimistic UI updates only. Always call syncBalanceFromServer() after trades.
      updateBalance: (newBalance: number) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, demoBalance: newBalance } });
        }
      },

      updateLiveBalance: (newBalance: number) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, liveBalance: newBalance } });
        }
      },

      updateDemoBalance: (newBalance: number) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, demoBalance: newBalance } });
        }
      },

      updatePracticeBalance: (newBalance: number) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, practiceBalance: newBalance } });
        }
      },

      // Sync balance from server - this is the source of truth
      // Uses the same throttle as refreshProfile since they call the same API
      syncBalanceFromServer: async () => {
        const now = Date.now();

        // If there's a pending refresh, wait for it
        if (pendingRefresh) {
          return pendingRefresh;
        }

        // Throttle: skip if called too recently
        if (now - lastRefreshTime < REFRESH_THROTTLE_MS) {
          return;
        }

        // Just call refreshProfile since it updates the same data
        return get().refreshProfile();
      },

      resetBalance: async () => {
        const response = await api.post<{ success: boolean; data: { demoBalance: number } }>(
          '/auth/reset-balance',
          {}
        );
        const { demoBalance } = response.data;
        const user = get().user;
        if (user) {
          set({ user: { ...user, demoBalance } });
        }
      },

      topUpDemoBalance: async (amount: number) => {
        const response = await api.post<{ success: boolean; data: { demoBalance: number } }>(
          '/auth/topup-demo',
          { amount }
        );
        const { demoBalance } = response.data;
        const user = get().user;
        if (user) {
          set({ user: { ...user, demoBalance } });
        }
      },

      topUpPracticeBalance: async (amount?: number) => {
        const response = await api.post<{ success: boolean; data: { practiceBalance: number } }>(
          '/auth/topup-practice',
          amount ? { amount } : {}
        );
        const { practiceBalance } = response.data;
        const user = get().user;
        if (user) {
          set({ user: { ...user, practiceBalance } });
        }
      },

      switchAccount: async (accountType: AccountType) => {
        const response = await api.post<{ success: boolean; data: { user: User } }>(
          '/auth/switch-account',
          { accountType }
        );
        const { user } = response.data;
        set({ user });
      },

      getActiveBalance: () => {
        const user = get().user;
        if (!user) return 0;
        // NOTE: Due to legacy naming:
        // - 'LIVE' mode uses demoBalance (which is actually the real money)
        // - 'DEMO' mode uses practiceBalance (which is the practice/demo money)
        return user.activeAccountType === 'LIVE'
          ? (user.demoBalance ?? 0)
          : (user.practiceBalance ?? 0);
      },

      refreshProfile: async () => {
        const now = Date.now();

        // If there's a pending refresh, return that promise
        if (pendingRefresh) {
          return pendingRefresh;
        }

        // Throttle: skip if called too recently
        if (now - lastRefreshTime < REFRESH_THROTTLE_MS) {
          return;
        }

        lastRefreshTime = now;

        pendingRefresh = (async () => {
          try {
            const profile = await api.getProfile();
            if (profile) {
              // Set user data from server profile
              set({
                user: {
                  id: profile.id,
                  email: profile.email,
                  name: profile.name,
                  role: profile.role,
                  demoBalance: profile.demoBalance,
                  liveBalance: profile.liveBalance,
                  practiceBalance: profile.practiceBalance,
                  activeAccountType: profile.activeAccountType,
                  emailVerified: profile.emailVerified,
                  kycStatus: profile.kycStatus,
                }
              });
            }
          } catch (error: any) {
            console.error('Failed to refresh profile:', error);

            // Only logout on authentication errors (401, 403), not on network/timeout errors
            const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;

            if (isAuthError) {
              console.warn('Auth error detected, logging out user');
              const { logout } = get();
              logout();
            } else {
              // Network error or timeout - keep user logged in, just log the error
              console.warn('Network error during profile refresh, keeping user logged in');
            }
          } finally {
            pendingRefresh = null;
          }
        })();

        return pendingRefresh;
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },

      initializeToken: () => {
        const token = get().token;
        if (token) {
          api.setToken(token);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // IMPORTANT: Only persist token and auth status, NOT user data with balance
      // User data should always be fetched fresh from the server
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
          state.initializeToken();
          // Fetch fresh user data from server after hydration
          if (state.token && state.isAuthenticated) {
            state.refreshProfile();
          }
        }
      },
    }
  )
);
