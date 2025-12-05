import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  AdminUser,
  AdminUserDetail,
  PlatformStats,
  RecentActivity,
  MarketConfig,
  SystemSetting,
  PaginatedResponse,
  Deposit,
  DepositStats,
  DepositMethod,
  DepositStatus,
  MobileProvider,
  CryptoCurrency,
  SpreadConfig,
  CreateSpreadConfigInput,
  UpdateSpreadConfigInput,
  MarketStatus,
  Withdrawal,
  WithdrawalStats,
  WithdrawalMethod,
  WithdrawalStatus,
  PaymentMethod,
  PaymentMethodStats,
  PaymentMethodType,
  CreateCryptoPaymentMethodInput,
  CreateMobileMoneyPaymentMethodInput,
  UpdatePaymentMethodInput,
  KYCInfo,
  KYCSubmission,
  KYCStats,
  DocumentType,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiTrade {
  id: string;
  userId: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  duration: number;
  payoutPercent: number;
  status: string;
  result: string | null;
  profit: number | null;
  market: string;
  accountType: 'LIVE' | 'DEMO'; // Which account this trade was placed from
  openedAt: string;
  closedAt: string | null;
  expiresAt: string;
}

export interface PlaceTradeData {
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  duration: number;
  entryPrice: number;
  marketType: 'forex' | 'otc';
}

export interface TradeStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  totalProfit: number;
  winRate: number;
}

export interface PriceTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: string;
  change: number;
  changePercent: number;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  marketType: 'forex' | 'otc';
  basePrice: number;
  volatility: number;
  pipSize: number;
  isActive: boolean;
  payoutPercent: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Only redirect on 401 for protected endpoints, not for auth endpoints
        const url = error.config?.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

        if (error.response?.status === 401 && !isAuthEndpoint) {
          this.token = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async get<T>(url: string, config = {}): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  // Safe version of get that never throws - returns null on error
  private async safeGet<T>(url: string, config = {}): Promise<T | null> {
    return this.client.get<T>(url, config)
      .then(response => response.data)
      .catch(() => null);
  }

  async post<T>(url: string, data = {}, config = {}) {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data = {}, config = {}) {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data = {}, config = {}) {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config = {}) {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async placeTrade(data: PlaceTradeData): Promise<ApiTrade> {
    const response = await this.post<ApiResponse<ApiTrade>>('/trades', data);
    return response.data;
  }

  async getTrades(options?: {
    status?: 'open' | 'closed';
    limit?: number;
    offset?: number;
  }): Promise<{ trades: ApiTrade[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const queryStr = params.toString();
    const response = await this.safeGet<ApiResponse<ApiTrade[]>>(
      `/trades${queryStr ? `?${queryStr}` : ''}`
    );

    if (!response) {
      return { trades: [], total: 0 };
    }

    const trades = response.data || [];
    return {
      trades,
      total: response.pagination?.total || trades.length,
    };
  }

  async getActiveTrades(): Promise<ApiTrade[]> {
    const response = await this.safeGet<ApiResponse<ApiTrade[]>>('/trades/active');
    return response?.data || [];
  }

  async getTradeStats(): Promise<TradeStats> {
    const response = await this.safeGet<ApiResponse<TradeStats>>('/trades/stats');
    return response?.data || {
      totalTrades: 0,
      wonTrades: 0,
      lostTrades: 0,
      totalProfit: 0,
      winRate: 0,
    };
  }

  async getTradeById(tradeId: string): Promise<ApiTrade | null> {
    const response = await this.safeGet<ApiResponse<ApiTrade>>(`/trades/${tradeId}`);
    return response?.data || null;
  }

  async clearTradeHistory(): Promise<{ deletedCount: number }> {
    const response = await this.delete<ApiResponse<{ deletedCount: number }>>('/trades/history');
    return response.data;
  }

  async getAllPrices(): Promise<PriceTick[]> {
    const response = await this.get<ApiResponse<PriceTick[]>>('/market/prices');
    return response.data;
  }

  async getForexPrices(): Promise<PriceTick[]> {
    const response = await this.get<ApiResponse<PriceTick[]>>('/market/prices/forex');
    return response.data;
  }

  async getOtcPrices(): Promise<PriceTick[]> {
    const response = await this.get<ApiResponse<PriceTick[]>>('/market/prices/otc');
    return response.data;
  }

  async getCurrentPrice(symbol: string): Promise<PriceTick | null> {
    try {
      const response = await this.get<ApiResponse<PriceTick>>(`/market/price/${encodeURIComponent(symbol)}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getAllAssets(): Promise<MarketAsset[]> {
    const response = await this.get<ApiResponse<MarketAsset[]>>('/market/assets');
    return response.data;
  }

  async getForexAssets(): Promise<MarketAsset[]> {
    const response = await this.get<ApiResponse<MarketAsset[]>>('/market/assets/forex');
    return response.data;
  }

  async getOtcAssets(): Promise<MarketAsset[]> {
    const response = await this.get<ApiResponse<MarketAsset[]>>('/market/assets/otc');
    return response.data;
  }

  async getAsset(symbol: string): Promise<MarketAsset | null> {
    try {
      const response = await this.get<ApiResponse<MarketAsset>>(`/market/asset/${encodeURIComponent(symbol)}`);
      return response.data;
    } catch {
      return null;
    }
  }

  // Admin API Methods
  async getAdminUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'USER' | 'ADMIN';
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<AdminUser>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.role) params.append('role', options.role);
    if (options?.isActive !== undefined) params.append('isActive', options.isActive.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

    const queryStr = params.toString();
    const response = await this.get<ApiResponse<AdminUser[]> & { pagination: PaginatedResponse<AdminUser>['pagination'] }>(
      `/admin/users${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  }

  async getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
    const response = await this.get<ApiResponse<AdminUserDetail>>(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<AdminUser> {
    const response = await this.patch<ApiResponse<AdminUser>>(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<AdminUser> {
    const response = await this.patch<ApiResponse<AdminUser>>(`/admin/users/${userId}/role`, { role });
    return response.data;
  }

  async resetUserBalance(userId: string, newBalance?: number): Promise<AdminUser> {
    const response = await this.post<ApiResponse<AdminUser>>(`/admin/users/${userId}/reset-balance`, { newBalance });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.delete(`/admin/users/${userId}`);
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const response = await this.get<ApiResponse<PlatformStats>>('/admin/stats');
    return response.data;
  }

  async getRecentActivity(limit?: number): Promise<RecentActivity> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await this.get<ApiResponse<RecentActivity>>(`/admin/activity${params}`);
    return response.data;
  }

  async getMarketConfigs(): Promise<MarketConfig[]> {
    const response = await this.get<ApiResponse<MarketConfig[]>>('/admin/markets');
    return response.data;
  }

  async getMarketConfig(symbol: string): Promise<MarketConfig> {
    const response = await this.get<ApiResponse<MarketConfig>>(`/admin/markets/${encodeURIComponent(symbol)}`);
    return response.data;
  }

  async updateMarketConfig(
    symbol: string,
    config: Partial<Pick<MarketConfig, 'isActive' | 'payoutPercent' | 'minTradeAmount' | 'maxTradeAmount' | 'volatilityMode'>>
  ): Promise<MarketConfig> {
    const response = await this.patch<ApiResponse<MarketConfig>>(`/admin/markets/${encodeURIComponent(symbol)}`, config);
    return response.data;
  }

  async initializeMarketConfigs(): Promise<MarketConfig[]> {
    const response = await this.post<ApiResponse<MarketConfig[]>>('/admin/markets/initialize');
    return response.data;
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    const response = await this.get<ApiResponse<SystemSetting[]>>('/admin/settings');
    return response.data;
  }

  async getSystemSetting(key: string): Promise<SystemSetting> {
    const response = await this.get<ApiResponse<SystemSetting>>(`/admin/settings/${encodeURIComponent(key)}`);
    return response.data;
  }

  async setSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const response = await this.put<ApiResponse<SystemSetting>>('/admin/settings', { key, value });
    return response.data;
  }

  async deleteSystemSetting(key: string): Promise<void> {
    await this.delete(`/admin/settings/${encodeURIComponent(key)}`);
  }

  // Deposit API Methods (User)
  async createMobileMoneyDeposit(data: {
    amount: number;
    phoneNumber: string;
    mobileProvider: MobileProvider;
  }): Promise<Deposit> {
    const response = await this.post<ApiResponse<Deposit>>('/deposits/mobile-money', data);
    return response.data;
  }

  async createCryptoDeposit(data: {
    amount: number;
    cryptoCurrency: CryptoCurrency;
  }): Promise<Deposit> {
    const response = await this.post<ApiResponse<Deposit>>('/deposits/crypto', data);
    return response.data;
  }

  async getMyDeposits(options?: {
    status?: DepositStatus;
    limit?: number;
  }): Promise<Deposit[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<Deposit[]>>(`/deposits/my${queryStr ? `?${queryStr}` : ''}`);
    return response.data;
  }

  async getDepositById(depositId: string): Promise<Deposit> {
    const response = await this.get<ApiResponse<Deposit>>(`/deposits/${depositId}`);
    return response.data;
  }

  // Deposit API Methods (Admin)
  async getAdminDeposits(options?: {
    status?: DepositStatus;
    method?: DepositMethod;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Deposit>> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.method) params.append('method', options.method);
    if (options?.userId) params.append('userId', options.userId);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<Deposit[]> & { pagination: PaginatedResponse<Deposit>['pagination'] }>(
      `/deposits/admin/all${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  }

  async getDepositStats(): Promise<DepositStats> {
    const response = await this.get<ApiResponse<DepositStats>>('/deposits/admin/stats');
    return response.data;
  }

  async getPendingDepositsCount(): Promise<number> {
    const response = await this.get<ApiResponse<{ count: number }>>('/deposits/admin/pending-count');
    return response.data.count;
  }

  async approveDeposit(depositId: string, adminNote?: string): Promise<Deposit> {
    const response = await this.post<ApiResponse<Deposit>>(`/deposits/admin/${depositId}/approve`, { adminNote });
    return response.data;
  }

  async rejectDeposit(depositId: string, adminNote?: string): Promise<Deposit> {
    const response = await this.post<ApiResponse<Deposit>>(`/deposits/admin/${depositId}/reject`, { adminNote });
    return response.data;
  }

  // Spread Configuration API Methods (Admin)
  async getAllSpreadConfigs(): Promise<SpreadConfig[]> {
    const response = await this.get<ApiResponse<SpreadConfig[]>>('/admin/spreads');
    return response.data;
  }

  async getSpreadConfig(symbol: string): Promise<SpreadConfig> {
    const response = await this.get<ApiResponse<SpreadConfig>>(`/admin/spreads/${encodeURIComponent(symbol)}`);
    return response.data;
  }

  async createSpreadConfig(data: CreateSpreadConfigInput): Promise<SpreadConfig> {
    const response = await this.post<ApiResponse<SpreadConfig>>('/admin/spreads', data);
    return response.data;
  }

  async updateSpreadConfig(symbol: string, data: UpdateSpreadConfigInput): Promise<SpreadConfig> {
    const response = await this.put<ApiResponse<SpreadConfig>>(`/admin/spreads/${encodeURIComponent(symbol)}`, data);
    return response.data;
  }

  async deleteSpreadConfig(symbol: string): Promise<void> {
    await this.delete(`/admin/spreads/${encodeURIComponent(symbol)}`);
  }

  async reloadSpreadConfigs(): Promise<void> {
    await this.post('/admin/spreads/reload');
  }

  // Market Status API Method
  async getMarketStatus(): Promise<MarketStatus> {
    const response = await this.get<ApiResponse<MarketStatus>>('/market/status');
    return response.data;
  }

  // Get current user profile (refreshes balance from server)
  async getProfile(): Promise<{ id: string; email: string; name: string; role: 'USER' | 'ADMIN'; liveBalance: number; demoBalance: number; activeAccountType: 'LIVE' | 'DEMO'; emailVerified: boolean }> {
    const response = await this.get<ApiResponse<{ user: { id: string; email: string; name: string; role: 'USER' | 'ADMIN'; liveBalance: number; demoBalance: number; activeAccountType: 'LIVE' | 'DEMO'; emailVerified: boolean } }>>('/auth/me');
    return response.data.user;
  }

  // Withdrawal API Methods (User)
  async createMobileMoneyWithdrawal(data: {
    amount: number;
    phoneNumber: string;
    mobileProvider: MobileProvider;
  }): Promise<Withdrawal> {
    const response = await this.post<ApiResponse<Withdrawal>>('/withdrawals/mobile-money', data);
    return response.data;
  }

  async createCryptoWithdrawal(data: {
    amount: number;
    cryptoCurrency: CryptoCurrency;
    walletAddress: string;
  }): Promise<Withdrawal> {
    const response = await this.post<ApiResponse<Withdrawal>>('/withdrawals/crypto', data);
    return response.data;
  }

  async getMyWithdrawals(options?: {
    status?: WithdrawalStatus;
    limit?: number;
  }): Promise<Withdrawal[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<Withdrawal[]>>(`/withdrawals/my${queryStr ? `?${queryStr}` : ''}`);
    return response.data;
  }

  async getWithdrawalById(withdrawalId: string): Promise<Withdrawal> {
    const response = await this.get<ApiResponse<Withdrawal>>(`/withdrawals/${withdrawalId}`);
    return response.data;
  }

  // Withdrawal API Methods (Admin)
  async getAdminWithdrawals(options?: {
    status?: WithdrawalStatus;
    method?: WithdrawalMethod;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Withdrawal>> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.method) params.append('method', options.method);
    if (options?.userId) params.append('userId', options.userId);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<Withdrawal[]> & { pagination: PaginatedResponse<Withdrawal>['pagination'] }>(
      `/withdrawals/admin/all${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  }

  async getWithdrawalStats(): Promise<WithdrawalStats> {
    const response = await this.get<ApiResponse<WithdrawalStats>>('/withdrawals/admin/stats');
    return response.data;
  }

  async getPendingWithdrawalsCount(): Promise<number> {
    const response = await this.get<ApiResponse<{ count: number }>>('/withdrawals/admin/pending-count');
    return response.data.count;
  }

  async approveWithdrawal(withdrawalId: string, adminNote?: string): Promise<Withdrawal> {
    const response = await this.post<ApiResponse<Withdrawal>>(`/withdrawals/admin/${withdrawalId}/approve`, { adminNote });
    return response.data;
  }

  async rejectWithdrawal(withdrawalId: string, adminNote?: string): Promise<Withdrawal> {
    const response = await this.post<ApiResponse<Withdrawal>>(`/withdrawals/admin/${withdrawalId}/reject`, { adminNote });
    return response.data;
  }

  // Payment Method API Methods (Public)
  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    const response = await this.get<ApiResponse<PaymentMethod[]>>('/payment-methods/active');
    return response.data;
  }

  // Payment Method API Methods (Admin)
  async getAdminPaymentMethods(options?: {
    type?: PaymentMethodType;
    isActive?: boolean;
    isPopular?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PaymentMethod>> {
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.isActive !== undefined) params.append('isActive', options.isActive.toString());
    if (options?.isPopular !== undefined) params.append('isPopular', options.isPopular.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<PaymentMethod[]> & { pagination: PaginatedResponse<PaymentMethod>['pagination'] }>(
      `/payment-methods/admin/all${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 50, total: response.data.length, totalPages: 1 },
    };
  }

  async getPaymentMethodStats(): Promise<PaymentMethodStats> {
    const response = await this.get<ApiResponse<PaymentMethodStats>>('/payment-methods/admin/stats');
    return response.data;
  }

  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    const response = await this.get<ApiResponse<PaymentMethod>>(`/payment-methods/admin/${id}`);
    return response.data;
  }

  async createCryptoPaymentMethod(data: CreateCryptoPaymentMethodInput): Promise<PaymentMethod> {
    const response = await this.post<ApiResponse<PaymentMethod>>('/payment-methods/admin/crypto', data);
    return response.data;
  }

  async createMobileMoneyPaymentMethod(data: CreateMobileMoneyPaymentMethodInput): Promise<PaymentMethod> {
    const response = await this.post<ApiResponse<PaymentMethod>>('/payment-methods/admin/mobile-money', data);
    return response.data;
  }

  async updatePaymentMethod(id: string, data: UpdatePaymentMethodInput): Promise<PaymentMethod> {
    const response = await this.put<ApiResponse<PaymentMethod>>(`/payment-methods/admin/${id}`, data);
    return response.data;
  }

  async togglePaymentMethodStatus(id: string): Promise<PaymentMethod> {
    const response = await this.post<ApiResponse<PaymentMethod>>(`/payment-methods/admin/${id}/toggle`);
    return response.data;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await this.delete(`/payment-methods/admin/${id}`);
  }

  async seedPaymentMethods(): Promise<void> {
    await this.post('/payment-methods/admin/seed');
  }

  // Copy Trading API Methods (User)
  async becomeLeader(data: { displayName: string; description?: string }): Promise<CopyTradingLeader> {
    const response = await this.post<ApiResponse<CopyTradingLeader>>('/copy-trading/become-leader', data);
    return response.data;
  }

  async getMyLeaderProfile(): Promise<CopyTradingLeader | null> {
    try {
      const response = await this.get<ApiResponse<CopyTradingLeader>>('/copy-trading/my-leader-profile');
      return response.data;
    } catch {
      return null;
    }
  }

  async updateMyLeaderProfile(data: { displayName?: string; description?: string; isPublic?: boolean }): Promise<CopyTradingLeader> {
    const response = await this.patch<ApiResponse<CopyTradingLeader>>('/copy-trading/my-leader-profile', data);
    return response.data;
  }

  async getMyFollowers(): Promise<{ followers: FollowerInfo[]; total: number }> {
    const response = await this.get<ApiResponse<FollowerInfo[]> & { pagination: { total: number } }>('/copy-trading/followers');
    return { followers: response.data, total: response.pagination?.total || 0 };
  }

  async discoverLeaders(options?: {
    page?: number;
    limit?: number;
    sortBy?: 'winRate' | 'totalTrades' | 'totalProfit' | 'followers';
    sortOrder?: 'asc' | 'desc';
    minWinRate?: number;
    minTrades?: number;
  }): Promise<{ leaders: CopyTradingLeader[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.minWinRate) params.append('minWinRate', options.minWinRate.toString());
    if (options?.minTrades) params.append('minTrades', options.minTrades.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<CopyTradingLeader[]> & { pagination: { total: number } }>(
      `/copy-trading/leaders${queryStr ? `?${queryStr}` : ''}`
    );
    return { leaders: response.data, total: response.pagination?.total || 0 };
  }

  async getLeaderProfile(leaderId: string): Promise<CopyTradingLeader & { isFollowing: boolean }> {
    const response = await this.get<ApiResponse<CopyTradingLeader & { isFollowing: boolean }>>(`/copy-trading/leaders/${leaderId}`);
    return response.data;
  }

  async followLeader(leaderId: string, data: { copyMode: 'AUTOMATIC' | 'MANUAL'; fixedAmount: number; maxDailyTrades?: number }): Promise<CopyTradingFollower> {
    const response = await this.post<ApiResponse<CopyTradingFollower>>(`/copy-trading/follow/${leaderId}`, data);
    return response.data;
  }

  async unfollowLeader(leaderId: string): Promise<void> {
    await this.delete(`/copy-trading/follow/${leaderId}`);
  }

  async updateFollowSettings(leaderId: string, data: { copyMode?: 'AUTOMATIC' | 'MANUAL'; fixedAmount?: number; maxDailyTrades?: number; isActive?: boolean }): Promise<CopyTradingFollower> {
    const response = await this.patch<ApiResponse<CopyTradingFollower>>(`/copy-trading/follow/${leaderId}`, data);
    return response.data;
  }

  async getMyFollowing(): Promise<{ following: CopyTradingFollower[]; total: number }> {
    const response = await this.get<ApiResponse<CopyTradingFollower[]> & { pagination: { total: number } }>('/copy-trading/following');
    return { following: response.data, total: response.pagination?.total || 0 };
  }

  async getPendingCopyTrades(): Promise<PendingCopyTrade[]> {
    const response = await this.get<ApiResponse<PendingCopyTrade[]>>('/copy-trading/pending-trades');
    return response.data;
  }

  async approvePendingTrade(tradeId: string): Promise<void> {
    await this.post(`/copy-trading/pending-trades/${tradeId}/approve`);
  }

  async rejectPendingTrade(tradeId: string): Promise<void> {
    await this.post(`/copy-trading/pending-trades/${tradeId}/reject`);
  }

  async getCopyTradingHistory(options?: { page?: number; limit?: number }): Promise<{ history: CopiedTrade[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<CopiedTrade[]> & { pagination: { total: number } }>(
      `/copy-trading/history${queryStr ? `?${queryStr}` : ''}`
    );
    return { history: response.data, total: response.pagination?.total || 0 };
  }

  async getCopyTradingStats(): Promise<CopyTradingStats> {
    const response = await this.get<ApiResponse<CopyTradingStats>>('/copy-trading/stats');
    return response.data;
  }

  // Copy Trading API Methods (Admin)
  async getAdminCopyTradingStats(): Promise<CopyTradingPlatformStats> {
    const response = await this.get<ApiResponse<CopyTradingPlatformStats>>('/admin/copy-trading/stats');
    return response.data;
  }

  async getAdminCopyTradingActivity(limit?: number): Promise<RecentCopyActivity[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await this.get<ApiResponse<RecentCopyActivity[]>>(`/admin/copy-trading/activity${params}`);
    return response.data;
  }

  async getAdminLeaders(options?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    search?: string;
    sortBy?: 'createdAt' | 'winRate' | 'totalTrades' | 'followers';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<CopyTradingLeaderDetail>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.search) params.append('search', options.search);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<CopyTradingLeaderDetail[]> & { pagination: PaginatedResponse<CopyTradingLeaderDetail>['pagination'] }>(
      `/admin/copy-trading/leaders${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  }

  async getAdminPendingLeaders(options?: { page?: number; limit?: number }): Promise<PaginatedResponse<CopyTradingLeaderDetail>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<CopyTradingLeaderDetail[]> & { pagination: PaginatedResponse<CopyTradingLeaderDetail>['pagination'] }>(
      `/admin/copy-trading/leaders/pending${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  }

  async getAdminLeaderDetail(leaderId: string): Promise<CopyTradingLeaderDetail> {
    const response = await this.get<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}`);
    return response.data;
  }

  async getAdminLeaderFollowers(leaderId: string, options?: { page?: number; limit?: number }): Promise<PaginatedResponse<FollowerInfo>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<FollowerInfo[]> & { pagination: PaginatedResponse<FollowerInfo>['pagination'] }>(
      `/admin/copy-trading/leaders/${leaderId}/followers${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  }

  async approveLeader(leaderId: string, adminNote?: string): Promise<CopyTradingLeaderDetail> {
    const response = await this.post<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}/approve`, { adminNote });
    return response.data;
  }

  async rejectLeader(leaderId: string, adminNote?: string): Promise<CopyTradingLeaderDetail> {
    const response = await this.post<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}/reject`, { adminNote });
    return response.data;
  }

  async suspendLeader(leaderId: string, reason?: string): Promise<CopyTradingLeaderDetail> {
    const response = await this.post<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}/suspend`, { reason });
    return response.data;
  }

  async reinstateLeader(leaderId: string): Promise<CopyTradingLeaderDetail> {
    const response = await this.post<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}/reinstate`);
    return response.data;
  }

  async updateLeaderSettings(leaderId: string, data: { maxFollowers?: number; isPublic?: boolean }): Promise<CopyTradingLeaderDetail> {
    const response = await this.patch<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}/settings`, data);
    return response.data;
  }

  async updateLeaderStats(leaderId: string, data: {
    winRate?: number;
    totalTrades?: number;
    winningTrades?: number;
    totalProfit?: number;
  }): Promise<CopyTradingLeaderDetail> {
    const response = await this.patch<ApiResponse<CopyTradingLeaderDetail>>(`/admin/copy-trading/leaders/${leaderId}/stats`, data);
    return response.data;
  }

  async getPendingLeadersCount(): Promise<number> {
    const response = await this.get<ApiResponse<CopyTradingLeaderDetail[]> & { pagination: { total: number } }>(
      '/admin/copy-trading/leaders/pending?limit=1'
    );
    return response.pagination?.total || response.data.length;
  }

  // Referral/Affiliate API Methods (Public)
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrer?: { name: string } }> {
    const response = await this.get<{ success: boolean; valid: boolean; referrer?: { name: string } }>(`/referral/validate/${encodeURIComponent(code)}`);
    return { valid: response.valid, referrer: response.referrer };
  }

  async getPublicReferralSettings(): Promise<ReferralSettings> {
    const response = await this.get<ApiResponse<ReferralSettings>>('/referral/settings/public');
    return response.data;
  }

  // Referral/Affiliate API Methods (User)
  async getReferralStats(): Promise<ReferralStats> {
    const response = await this.get<ApiResponse<ReferralStats>>('/referral/stats');
    return response.data;
  }

  async getMyReferrals(options?: { page?: number; limit?: number }): Promise<{ data: ReferralUser[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<ReferralUser[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/referral/my-referrals${queryStr ? `?${queryStr}` : ''}`
    );
    return { data: response.data, pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }

  async getCommissionHistory(options?: { page?: number; limit?: number }): Promise<{ data: ReferralCommission[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<ReferralCommission[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/referral/commissions${queryStr ? `?${queryStr}` : ''}`
    );
    return { data: response.data, pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }

  // Referral/Affiliate API Methods (Admin)
  async getAdminReferralSettings(): Promise<ReferralSettings & { id: string; minWithdrawal: number; maxCommissionPerUser: number }> {
    const response = await this.get<ApiResponse<ReferralSettings & { id: string; minWithdrawal: number; maxCommissionPerUser: number }>>('/referral/settings');
    return response.data;
  }

  async updateReferralSettings(data: Partial<ReferralSettings>): Promise<ReferralSettings> {
    const response = await this.put<ApiResponse<ReferralSettings>>('/referral/settings', data);
    return response.data;
  }

  async getAdminReferralStats(): Promise<ReferralAdminStats> {
    const response = await this.get<ApiResponse<ReferralAdminStats>>('/referral/admin/stats');
    return response.data;
  }

  // Email Verification API Methods
  async sendVerificationCode(): Promise<void> {
    await this.post('/auth/send-verification');
  }

  async verifyEmail(code: string): Promise<void> {
    await this.post('/auth/verify-email', { code });
  }

  // Password Reset API Methods
  async forgotPassword(email: string): Promise<void> {
    await this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.post('/auth/reset-password', { token, password });
  }

  async verifyResetToken(token: string): Promise<boolean> {
    const response = await this.post<{ success: boolean; data: { valid: boolean } }>('/auth/verify-reset-token', { token });
    return response.data.valid;
  }

  // KYC API Methods (User)
  async getKYCStatus(): Promise<KYCInfo> {
    const response = await this.get<ApiResponse<KYCInfo>>('/kyc/status');
    return response.data;
  }

  async submitKYCPersonalInfo(data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    phoneNumber: string;
  }): Promise<KYCInfo> {
    const response = await this.post<ApiResponse<KYCInfo>>('/kyc/personal-info', data);
    return response.data;
  }

  async submitKYCDocuments(formData: FormData): Promise<KYCInfo> {
    const response = await this.client.post<ApiResponse<KYCInfo>>('/kyc/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  // KYC API Methods (Admin)
  async getAdminKYCSubmissions(options?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<KYCSubmission>> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<KYCSubmission[]> & { pagination: PaginatedResponse<KYCSubmission>['pagination'] }>(
      `/kyc/admin/list${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  }

  async getKYCStats(): Promise<KYCStats> {
    const response = await this.get<ApiResponse<KYCStats>>('/kyc/admin/stats');
    return response.data;
  }

  async getPendingKYCCount(): Promise<number> {
    const response = await this.get<ApiResponse<{ count: number }>>('/kyc/admin/pending-count');
    return response.data.count;
  }

  async getKYCById(id: string): Promise<KYCSubmission> {
    const response = await this.get<ApiResponse<KYCSubmission>>(`/kyc/admin/${id}`);
    return response.data;
  }

  async approveKYC(id: string, adminNote?: string): Promise<KYCSubmission> {
    const response = await this.post<ApiResponse<KYCSubmission>>(`/kyc/admin/${id}/approve`, { adminNote });
    return response.data;
  }

  async rejectKYC(id: string, reason: string, adminNote?: string): Promise<KYCSubmission> {
    const response = await this.post<ApiResponse<KYCSubmission>>(`/kyc/admin/${id}/reject`, { reason, adminNote });
    return response.data;
  }
}

// Add types for copy trading
type LeaderStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

interface CopyTradingLeader {
  id: string;
  userId: string;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
  status: LeaderStatusType;
  totalTrades: number;
  winningTrades: number;
  totalProfit: number;
  winRate: number;
  maxFollowers: number;
  isPublic: boolean;
  followerCount: number;
  createdAt: string;
  user: { name: string };
}

interface CopyTradingLeaderDetail extends CopyTradingLeader {
  adminNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  recentTrades: Array<{
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    result: string | null;
    profit: number | null;
    openedAt: string;
  }>;
}

type CopyModeType = 'AUTOMATIC' | 'MANUAL';

interface CopyTradingFollower {
  id: string;
  leaderId: string;
  copyMode: CopyModeType;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: string;
  leader: CopyTradingLeader;
}

interface FollowerInfo {
  id: string;
  followerId: string;
  copyMode: CopyModeType;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: string;
  follower?: { id: string; name: string; email: string };
  user?: { id: string; name: string; email: string };
}

type DirectionType = 'UP' | 'DOWN';
type PendingStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

interface PendingCopyTrade {
  id: string;
  followerId: string;
  originalTradeId: string;
  symbol: string;
  direction: DirectionType;
  suggestedAmount: number;
  status: PendingStatusType;
  expiresAt: string;
  createdAt: string;
  leader?: { displayName: string };
}

interface CopiedTrade {
  id: string;
  followerId: string;
  leaderId: string;
  originalTradeId: string;
  copiedTradeId: string;
  amount: number;
  profit: number | null;
  createdAt: string;
  leader: { displayName: string };
  copiedTrade: { symbol: string; direction: string; result: string | null; profit: number | null };
}

interface CopyTradingStats {
  totalCopied: number;
  totalProfit: number;
  winRate: number;
  leadersFollowing: number;
}

interface CopyTradingPlatformStats {
  totalLeaders: number;
  pendingLeaders: number;
  approvedLeaders: number;
  suspendedLeaders: number;
  totalFollowers: number;
  totalCopiedTrades: number;
  totalCopyVolume: number;
  totalCopyProfit: number;
}

interface RecentCopyActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Referral/Affiliate Types
export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  referralCode: string;
}

export interface ReferralUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totalProfit: number;
  commissionsGenerated: number;
}

export interface ReferralCommission {
  id: string;
  type: 'TRADE_COMMISSION';
  amount: number;
  percentage: number;
  sourceAmount: number | null;
  status: 'PENDING' | 'CREDITED' | 'CANCELLED';
  description: string | null;
  generatorName: string;
  createdAt: string;
  creditedAt: string | null;
}

export interface ReferralSettings {
  signupBonus: number;
  depositCommission: number;
  tradeCommission: number;
  minWithdrawal?: number;
  maxCommissionPerUser?: number;
  isActive: boolean;
}

export interface ReferralAdminStats {
  totalReferrals: number;
  totalCommissionsPaid: number;
  pendingCommissions: number;
  thisMonthCommissions: number;
  topReferrers: Array<{
    id: string;
    name: string;
    email: string;
    totalReferrals: number;
    referralEarnings: number;
  }>;
}

export const api = new ApiClient();
