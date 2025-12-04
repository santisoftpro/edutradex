import { create } from 'zustand';
import { api } from '@/lib/api';
import type {
  AdminUser,
  AdminUserDetail,
  PlatformStats,
  RecentActivity,
  MarketConfig,
  SystemSetting,
  PaginatedResponse,
} from '@/types';

interface UsersFilter {
  page: number;
  limit: number;
  search: string;
  role: 'USER' | 'ADMIN' | '';
  isActive: boolean | '';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AdminState {
  users: AdminUser[];
  usersPagination: PaginatedResponse<AdminUser>['pagination'] | null;
  usersFilter: UsersFilter;
  selectedUser: AdminUserDetail | null;
  platformStats: PlatformStats | null;
  recentActivity: RecentActivity | null;
  marketConfigs: MarketConfig[];
  systemSettings: SystemSetting[];
  isLoading: boolean;
  error: string | null;
}

interface AdminActions {
  fetchUsers: () => Promise<void>;
  setUsersFilter: (filter: Partial<UsersFilter>) => void;
  fetchUserDetail: (userId: string) => Promise<void>;
  updateUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  updateUserRole: (userId: string, role: 'USER' | 'ADMIN') => Promise<void>;
  resetUserBalance: (userId: string, newBalance?: number) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  fetchPlatformStats: () => Promise<void>;
  fetchRecentActivity: (limit?: number) => Promise<void>;
  fetchMarketConfigs: () => Promise<void>;
  updateMarketConfig: (
    symbol: string,
    config: Partial<Pick<MarketConfig, 'isActive' | 'payoutPercent' | 'minTradeAmount' | 'maxTradeAmount' | 'volatilityMode'>>
  ) => Promise<void>;
  initializeMarketConfigs: () => Promise<void>;
  fetchSystemSettings: () => Promise<void>;
  setSystemSetting: (key: string, value: string) => Promise<void>;
  deleteSystemSetting: (key: string) => Promise<void>;
  clearError: () => void;
  clearSelectedUser: () => void;
}

type AdminStore = AdminState & AdminActions;

const initialFilter: UsersFilter = {
  page: 1,
  limit: 10,
  search: '',
  role: '',
  isActive: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useAdminStore = create<AdminStore>((set, get) => ({
  users: [],
  usersPagination: null,
  usersFilter: initialFilter,
  selectedUser: null,
  platformStats: null,
  recentActivity: null,
  marketConfigs: [],
  systemSettings: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const filter = get().usersFilter;
      const response = await api.getAdminUsers({
        page: filter.page,
        limit: filter.limit,
        search: filter.search || undefined,
        role: filter.role || undefined,
        isActive: filter.isActive === '' ? undefined : filter.isActive,
        sortBy: filter.sortBy,
        sortOrder: filter.sortOrder,
      });
      set({ users: response.data, usersPagination: response.pagination, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      set({ error: message, isLoading: false });
    }
  },

  setUsersFilter: (filter: Partial<UsersFilter>) => {
    set((state) => ({
      usersFilter: { ...state.usersFilter, ...filter },
    }));
  },

  fetchUserDetail: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.getAdminUserDetail(userId);
      set({ selectedUser: user, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user details';
      set({ error: message, isLoading: false });
    }
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await api.updateUserStatus(userId, isActive);
      await get().fetchUsers();
      const selectedUser = get().selectedUser;
      if (selectedUser && selectedUser.id === userId) {
        await get().fetchUserDetail(userId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user status';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateUserRole: async (userId: string, role: 'USER' | 'ADMIN') => {
    set({ isLoading: true, error: null });
    try {
      await api.updateUserRole(userId, role);
      await get().fetchUsers();
      const selectedUser = get().selectedUser;
      if (selectedUser && selectedUser.id === userId) {
        await get().fetchUserDetail(userId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user role';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resetUserBalance: async (userId: string, newBalance?: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.resetUserBalance(userId, newBalance);
      await get().fetchUsers();
      const selectedUser = get().selectedUser;
      if (selectedUser && selectedUser.id === userId) {
        await get().fetchUserDetail(userId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset user balance';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteUser(userId);
      await get().fetchUsers();
      const selectedUser = get().selectedUser;
      if (selectedUser && selectedUser.id === userId) {
        set({ selectedUser: null });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchPlatformStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await api.getPlatformStats();
      set({ platformStats: stats, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch platform stats';
      set({ error: message, isLoading: false });
    }
  },

  fetchRecentActivity: async (limit?: number) => {
    set({ isLoading: true, error: null });
    try {
      const activity = await api.getRecentActivity(limit);
      set({ recentActivity: activity, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch recent activity';
      set({ error: message, isLoading: false });
    }
  },

  fetchMarketConfigs: async () => {
    set({ isLoading: true, error: null });
    try {
      const configs = await api.getMarketConfigs();
      set({ marketConfigs: configs, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch market configs';
      set({ error: message, isLoading: false });
    }
  },

  updateMarketConfig: async (symbol, config) => {
    set({ isLoading: true, error: null });
    try {
      await api.updateMarketConfig(symbol, config);
      await get().fetchMarketConfigs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update market config';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  initializeMarketConfigs: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.initializeMarketConfigs();
      await get().fetchMarketConfigs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize market configs';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchSystemSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await api.getSystemSettings();
      set({ systemSettings: settings, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch system settings';
      set({ error: message, isLoading: false });
    }
  },

  setSystemSetting: async (key: string, value: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.setSystemSetting(key, value);
      await get().fetchSystemSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set system setting';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteSystemSetting: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteSystemSetting(key);
      await get().fetchSystemSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete system setting';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearSelectedUser: () => set({ selectedUser: null }),
}));
