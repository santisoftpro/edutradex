import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { User, AuthResponse, AccountType } from '@/types';

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
  updateBalance: (newBalance: number) => void;
  updateLiveBalance: (newBalance: number) => void;
  updateDemoBalance: (newBalance: number) => void;
  resetBalance: () => Promise<void>;
  topUpDemoBalance: (amount: number) => Promise<void>;
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
          const response = await api.post<AuthResponse>('/auth/login', {
            email,
            password,
          });

          const { user, token } = response.data;
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
          const response = await api.post<AuthResponse>('/auth/register', {
            email,
            password,
            name,
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
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
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

      // Sync balance from server - this is the source of truth
      syncBalanceFromServer: async () => {
        try {
          const profile = await api.getProfile();
          const user = get().user;
          if (user && profile) {
            set({
              user: {
                ...user,
                demoBalance: profile.demoBalance,
                liveBalance: profile.liveBalance,
              }
            });
          }
        } catch (error) {
          console.error('Failed to sync balance from server:', error);
        }
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
        return user.demoBalance ?? 0;
      },

      refreshProfile: async () => {
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
                activeAccountType: profile.activeAccountType,
                emailVerified: profile.emailVerified,
              }
            });
          }
        } catch (error) {
          console.error('Failed to refresh profile:', error);
          // If profile fetch fails (e.g., token expired), logout the user
          const { logout } = get();
          logout();
        }
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
