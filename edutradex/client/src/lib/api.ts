import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
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
  SimulatedLeader,
  SimulatedLeaderForDisplay,
  SimulatedLeaderStats,
  CreateSimulatedLeaderInput,
  SimulatedLeaderFollower,
  SimulatedLeaderFollowingInfo,
  FollowLeaderInput,
  UpdateFollowSettingsInput,
  CopyTradingFollower,
  FollowerInfo,
  PendingCopyTrade,
  CopyMode,
  UserProfile,
  ProfileDevice,
  LoginHistoryItem,
  ProfileStats,
} from '@/types';

export type { PaginatedResponse };

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
  marketType: 'forex' | 'crypto' | 'stock' | 'index';
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
  marketType: 'forex' | 'crypto' | 'stock' | 'index';
  basePrice: number;
  pipSize: number;
  isActive: boolean;
  payoutPercent: number;
}

export interface OHLCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
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

// Two-Factor Authentication Types
export interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: string | null;
  backupCodesRemaining: number;
}

export interface TwoFactorSetup {
  qrCode: string;
  secret: string;
  otpauthUrl: string;
  manualEntryKey: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    liveBalance: number;
    demoBalance: number;
    activeAccountType: 'LIVE' | 'DEMO';
    emailVerified: boolean;
  };
  token: string;
  securityInfo?: {
    isNewDevice: boolean;
    isNewLocation: boolean;
    requiresVerification: boolean;
  };
}

export interface TwoFactorPendingResponse {
  requires2FA: true;
  tempToken: string;
  userId: string;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private barsCache: Map<string, { bars: OHLCBar[]; timestamp: number }> = new Map();
  private readonly BARS_CACHE_TTL_MS = 30000; // 30 seconds client-side cache

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
        // Only redirect on 401 for protected endpoints, not for public auth endpoints
        const url = error.config?.url || '';
        const isPublicAuthEndpoint =
          url.includes('/auth/login') ||
          url.includes('/auth/register') ||
          url.includes('/auth/forgot-password') ||
          url.includes('/auth/reset-password') ||
          url.includes('/auth/verify-reset-token');

        if (error.response?.status === 401 && !isPublicAuthEndpoint) {
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

  async getCryptoAssets(): Promise<MarketAsset[]> {
    const response = await this.get<ApiResponse<MarketAsset[]>>('/market/assets/crypto');
    return response.data;
  }

  async getIndexAssets(): Promise<MarketAsset[]> {
    const response = await this.get<ApiResponse<MarketAsset[]>>('/market/assets/indices');
    return response.data;
  }

  async getStockAssets(): Promise<MarketAsset[]> {
    const response = await this.get<ApiResponse<MarketAsset[]>>('/market/assets/stocks');
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

  async getHistoricalBars(
    symbol: string,
    resolution: number = 60,
    limit: number = 500
  ): Promise<OHLCBar[]> {
    const cacheKey = `${symbol}-${resolution}-${limit}`;
    const cached = this.barsCache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.BARS_CACHE_TTL_MS) {
      return cached.bars;
    }

    try {
      const response = await this.get<ApiResponse<OHLCBar[]>>(
        `/market/bars/${encodeURIComponent(symbol)}?resolution=${resolution}&limit=${limit}`
      );
      const bars = response.data;

      // Cache the result
      if (bars.length > 0) {
        this.barsCache.set(cacheKey, { bars, timestamp: Date.now() });
      }

      return bars;
    } catch {
      return [];
    }
  }

  clearBarsCache(): void {
    this.barsCache.clear();
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

  async getOnlineUsers(): Promise<{
    count: number;
    users: {
      id: string;
      name: string;
      email: string;
      connectionCount: number;
      liveBalance: number;
      demoBalance: number;
      activeAccountType: string;
    }[];
  }> {
    const response = await this.get<ApiResponse<{
      count: number;
      users: {
        id: string;
        name: string;
        email: string;
        connectionCount: number;
        liveBalance: number;
        demoBalance: number;
        activeAccountType: string;
      }[];
    }>>('/admin/online-users');
    return response.data;
  }

  async getRecentPlatformTrades(limit?: number): Promise<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    symbol: string;
    direction: string;
    amount: number;
    profit: number | null;
    status: string;
    result: string | null;
    accountType: string;
    openedAt: string;
    closedAt: string | null;
  }[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await this.get<ApiResponse<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      symbol: string;
      direction: string;
      amount: number;
      profit: number | null;
      status: string;
      result: string | null;
      accountType: string;
      openedAt: string;
      closedAt: string | null;
    }[]>>(`/admin/recent-trades${params}`);
    return response.data;
  }

  async getAdminUserFullDetail(userId: string): Promise<{
    user: AdminUserDetail;
    isOnline: boolean;
    liveTrades: {
      id: string;
      symbol: string;
      direction: string;
      amount: number;
      entryPrice: number;
      duration: number;
      payoutPercent: number;
      accountType: string;
      openedAt: string;
      expiresAt: string;
    }[];
    accountStats: {
      liveBalance: number;
      demoBalance: number;
      activeAccountType: string;
      totalDeposits: number;
      totalWithdrawals: number;
      pendingDeposits: number;
      pendingWithdrawals: number;
    };
  }> {
    const response = await this.get<ApiResponse<{
      user: AdminUserDetail;
      isOnline: boolean;
      liveTrades: {
        id: string;
        symbol: string;
        direction: string;
        amount: number;
        entryPrice: number;
        duration: number;
        payoutPercent: number;
        accountType: string;
        openedAt: string;
        expiresAt: string;
      }[];
      accountStats: {
        liveBalance: number;
        demoBalance: number;
        activeAccountType: string;
        totalDeposits: number;
        totalWithdrawals: number;
        pendingDeposits: number;
        pendingWithdrawals: number;
      };
    }>>(`/admin/users/${userId}/full`);
    return response.data;
  }

  async getUserLiveTrades(userId: string): Promise<{
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    entryPrice: number;
    duration: number;
    payoutPercent: number;
    accountType: string;
    openedAt: string;
    expiresAt: string;
  }[]> {
    const response = await this.get<ApiResponse<{
      id: string;
      symbol: string;
      direction: string;
      amount: number;
      entryPrice: number;
      duration: number;
      payoutPercent: number;
      accountType: string;
      openedAt: string;
      expiresAt: string;
    }[]>>(`/admin/users/${userId}/live-trades`);
    return response.data;
  }

  async getUserTransactions(userId: string, options?: {
    page?: number;
    limit?: number;
    type?: 'deposit' | 'withdrawal' | 'all';
  }): Promise<PaginatedResponse<{
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    status: string;
    method: string;
    createdAt: string;
    processedAt?: string;
  }>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.type) params.append('type', options.type);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.get<{
      success: boolean;
      data: {
        id: string;
        type: 'deposit' | 'withdrawal';
        amount: number;
        status: string;
        method: string;
        createdAt: string;
        processedAt?: string;
      }[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/users/${userId}/transactions${queryString}`);
    return {
      data: response.data,
      pagination: response.pagination,
    };
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

  async getMyDepositMethod(): Promise<(PaymentMethod & { userPhoneNumber?: string }) | null> {
    const response = await this.get<ApiResponse<(PaymentMethod & { userPhoneNumber?: string }) | null>>('/deposits/my-deposit-method');
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
  async getProfile(): Promise<{ id: string; email: string; name: string; role: 'USER' | 'ADMIN' | 'SUPERADMIN'; liveBalance: number; demoBalance: number; practiceBalance: number; activeAccountType: 'LIVE' | 'DEMO'; emailVerified: boolean; kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' }> {
    const response = await this.get<ApiResponse<{ user: { id: string; email: string; name: string; role: 'USER' | 'ADMIN' | 'SUPERADMIN'; liveBalance: number; demoBalance: number; practiceBalance: number; activeAccountType: 'LIVE' | 'DEMO'; emailVerified: boolean; kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' } }>>('/auth/me');
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
    network: string;
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

  // Withdrawal Verification Methods
  async sendWithdrawalVerificationCode(data: { amount: number; method: string }): Promise<void> {
    await this.post<ApiResponse<void>>('/withdrawals/send-verification', data);
  }

  async verifyWithdrawalCode(code: string): Promise<void> {
    await this.post<ApiResponse<void>>('/withdrawals/verify-code', { code });
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

  async followLeader(leaderId: string, data: FollowLeaderInput): Promise<CopyTradingFollower> {
    const response = await this.post<ApiResponse<CopyTradingFollower>>(`/copy-trading/follow/${leaderId}`, data);
    return response.data;
  }

  async unfollowLeader(leaderId: string): Promise<void> {
    await this.delete(`/copy-trading/follow/${leaderId}`);
  }

  async updateFollowSettings(leaderId: string, data: UpdateFollowSettingsInput): Promise<CopyTradingFollower> {
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

  // Fake Activity Settings (Admin)
  async getFakeActivitySetting(): Promise<{ enabled: boolean }> {
    const response = await this.get<ApiResponse<{ enabled: boolean }>>('/admin/copy-trading/settings/fake-activity');
    return response.data;
  }

  async setFakeActivitySetting(enabled: boolean): Promise<{ enabled: boolean }> {
    const response = await this.put<ApiResponse<{ enabled: boolean }>>('/admin/copy-trading/settings/fake-activity', { enabled });
    return response.data;
  }

  // Fake Activity Settings (Public - read only)
  async getCopyTradingFakeActivitySetting(): Promise<{ enabled: boolean }> {
    const response = await this.get<ApiResponse<{ enabled: boolean }>>('/simulated-leaders/settings/enabled');
    return response.data;
  }

  // Simulated Leaders API Methods (Admin)
  async getSimulatedLeaders(): Promise<SimulatedLeader[]> {
    const response = await this.get<ApiResponse<SimulatedLeader[]>>('/simulated-leaders');
    return response.data;
  }

  async getSimulatedLeaderStats(): Promise<SimulatedLeaderStats> {
    const response = await this.get<ApiResponse<SimulatedLeaderStats>>('/simulated-leaders/stats');
    return response.data;
  }

  async getSimulatedLeaderById(id: string): Promise<SimulatedLeader> {
    const response = await this.get<ApiResponse<SimulatedLeader>>(`/simulated-leaders/${id}`);
    return response.data;
  }

  async createSimulatedLeader(data: CreateSimulatedLeaderInput): Promise<SimulatedLeader> {
    const response = await this.post<ApiResponse<SimulatedLeader>>('/simulated-leaders', data);
    return response.data;
  }

  async updateSimulatedLeader(id: string, data: Partial<CreateSimulatedLeaderInput>): Promise<SimulatedLeader> {
    const response = await this.patch<ApiResponse<SimulatedLeader>>(`/simulated-leaders/${id}`, data);
    return response.data;
  }

  async toggleSimulatedLeader(id: string): Promise<SimulatedLeader> {
    const response = await this.post<ApiResponse<SimulatedLeader>>(`/simulated-leaders/${id}/toggle`);
    return response.data;
  }

  async deleteSimulatedLeader(id: string): Promise<void> {
    await this.delete(`/simulated-leaders/${id}`);
  }

  async autoGenerateSimulatedLeaders(count: number): Promise<SimulatedLeader[]> {
    const response = await this.post<ApiResponse<SimulatedLeader[]>>('/simulated-leaders/auto-generate', { count });
    return response.data;
  }

  // Simulated Leaders API Methods (Public - for display)
  async getActiveSimulatedLeaders(): Promise<SimulatedLeaderForDisplay[]> {
    const response = await this.get<ApiResponse<SimulatedLeaderForDisplay[]>>('/simulated-leaders/public');
    return response.data;
  }

  // Simulated Leaders Following API Methods (User)
  async followSimulatedLeader(leaderId: string, data: FollowLeaderInput): Promise<SimulatedLeaderFollower> {
    const response = await this.post<ApiResponse<SimulatedLeaderFollower>>(`/simulated-leaders/follow/${leaderId}`, data);
    return response.data;
  }

  async unfollowSimulatedLeader(leaderId: string): Promise<void> {
    await this.delete(`/simulated-leaders/follow/${leaderId}`);
  }

  async updateSimulatedLeaderFollowSettings(leaderId: string, data: UpdateFollowSettingsInput): Promise<SimulatedLeaderFollower> {
    const response = await this.patch<ApiResponse<SimulatedLeaderFollower>>(`/simulated-leaders/follow/${leaderId}`, data);
    return response.data;
  }

  async getMySimulatedLeaderFollowing(): Promise<SimulatedLeaderFollowingInfo[]> {
    const response = await this.get<ApiResponse<SimulatedLeaderFollowingInfo[]>>('/simulated-leaders/following');
    return response.data;
  }

  async getMySimulatedLeaderFollowingIds(): Promise<string[]> {
    const response = await this.get<ApiResponse<string[]>>('/simulated-leaders/following/ids');
    return response.data;
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

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.post('/auth/change-password', { currentPassword, newPassword });
  }

  // Two-Factor Authentication (2FA) API Methods
  async get2FAStatus(): Promise<TwoFactorStatus> {
    const response = await this.get<ApiResponse<TwoFactorStatus>>('/auth/2fa/status');
    return response.data;
  }

  async setup2FA(): Promise<TwoFactorSetup> {
    const response = await this.post<ApiResponse<TwoFactorSetup>>('/auth/2fa/setup');
    return response.data;
  }

  async verify2FASetup(token: string): Promise<{ backupCodes: string[] }> {
    const response = await this.post<ApiResponse<{ backupCodes: string[] }>>('/auth/2fa/verify-setup', { token });
    return response.data;
  }

  async disable2FA(password: string): Promise<void> {
    await this.post('/auth/2fa/disable', { password });
  }

  async regenerateBackupCodes(password: string): Promise<{ backupCodes: string[] }> {
    const response = await this.post<ApiResponse<{ backupCodes: string[] }>>('/auth/2fa/backup-codes', { password });
    return response.data;
  }

  async verify2FALogin(tempToken: string, token?: string, backupCode?: string): Promise<LoginResponse> {
    const response = await this.post<ApiResponse<LoginResponse>>('/auth/verify-2fa', {
      tempToken,
      token,
      backupCode,
    });
    return response.data;
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

  // OTC Market API Methods (Admin)
  async getOTCStats(): Promise<OTCStats> {
    const response = await this.get<ApiResponse<OTCStats>>('/admin/otc/stats');
    return response.data;
  }

  async getOTCConfigs(options?: {
    marketType?: 'FOREX' | 'CRYPTO';
    isEnabled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<OTCConfig>> {
    const params = new URLSearchParams();
    if (options?.marketType) params.append('marketType', options.marketType);
    if (options?.isEnabled !== undefined) params.append('isEnabled', options.isEnabled.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<OTCConfig[]> & { pagination: PaginatedResponse<OTCConfig>['pagination'] }>(
      `/admin/otc/configs${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 50, total: response.data.length, totalPages: 1 },
    };
  }

  async getOTCConfigById(id: string): Promise<OTCConfig> {
    const response = await this.get<ApiResponse<OTCConfig>>(`/admin/otc/configs/${id}`);
    return response.data;
  }

  async createOTCConfig(data: CreateOTCConfigInput): Promise<OTCConfig> {
    const response = await this.post<ApiResponse<OTCConfig>>('/admin/otc/configs', data);
    return response.data;
  }

  async updateOTCConfig(id: string, data: UpdateOTCConfigInput): Promise<OTCConfig> {
    const response = await this.patch<ApiResponse<OTCConfig>>(`/admin/otc/configs/${id}`, data);
    return response.data;
  }

  async deleteOTCConfig(id: string): Promise<void> {
    await this.delete(`/admin/otc/configs/${id}`);
  }

  async getOTCExposures(): Promise<OTCExposure[]> {
    const response = await this.get<ApiResponse<OTCExposure[]>>('/admin/otc/exposures');
    return response.data;
  }

  async getOTCExposureBySymbol(symbol: string): Promise<OTCExposure | null> {
    const response = await this.get<ApiResponse<OTCExposure>>(`/admin/otc/exposures/${encodeURIComponent(symbol)}`);
    return response.data;
  }

  async resetOTCExposure(symbol: string): Promise<void> {
    await this.post(`/admin/otc/exposures/${encodeURIComponent(symbol)}/reset`);
  }

  async getOTCActivityLog(options?: {
    symbol?: string;
    actionType?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<OTCActivityLog>> {
    const params = new URLSearchParams();
    if (options?.symbol) params.append('symbol', options.symbol);
    if (options?.actionType) params.append('actionType', options.actionType);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryStr = params.toString();
    const response = await this.get<ApiResponse<OTCActivityLog[]> & { pagination: PaginatedResponse<OTCActivityLog>['pagination'] }>(
      `/admin/otc/activity${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 50, total: response.data.length, totalPages: 1 },
    };
  }

  async bulkToggleOTCConfigs(ids: string[], enabled: boolean): Promise<{ affected: number }> {
    const response = await this.post<ApiResponse<{ affected: number }>>('/admin/otc/configs/bulk/toggle-enabled', { ids, enabled });
    return response.data;
  }

  async bulkToggleOTCRisk(ids: string[], riskEnabled: boolean): Promise<{ affected: number }> {
    const response = await this.post<ApiResponse<{ affected: number }>>('/admin/otc/configs/bulk/toggle-risk', { ids, riskEnabled });
    return response.data;
  }

  // ============= OTC Manual Controls =============

  async getManualControl(symbol: string): Promise<ManualControl> {
    const response = await this.get<ApiResponse<ManualControl>>(`/admin/otc/controls/${encodeURIComponent(symbol)}`);
    return response.data;
  }

  async getAllManualControls(): Promise<ManualControl[]> {
    const response = await this.get<ApiResponse<ManualControl[]>>('/admin/otc/controls');
    return response.data;
  }

  async setDirectionBias(symbol: string, bias: number, strength: number, durationMinutes?: number, reason?: string): Promise<void> {
    await this.post(`/admin/otc/controls/${encodeURIComponent(symbol)}/direction`, { bias, strength, durationMinutes, reason });
  }

  async clearDirectionBias(symbol: string): Promise<void> {
    await this.delete(`/admin/otc/controls/${encodeURIComponent(symbol)}/direction`);
  }

  async setVolatilityMultiplier(symbol: string, multiplier: number, durationMinutes?: number, reason?: string): Promise<void> {
    await this.post(`/admin/otc/controls/${encodeURIComponent(symbol)}/volatility`, { multiplier, durationMinutes, reason });
  }

  async clearVolatilityMultiplier(symbol: string): Promise<void> {
    await this.delete(`/admin/otc/controls/${encodeURIComponent(symbol)}/volatility`);
  }

  async setPriceOverride(symbol: string, price: number, expiryMinutes: number, reason?: string): Promise<void> {
    await this.post(`/admin/otc/controls/${encodeURIComponent(symbol)}/price-override`, { price, expiryMinutes, reason });
  }

  async clearPriceOverride(symbol: string): Promise<void> {
    await this.delete(`/admin/otc/controls/${encodeURIComponent(symbol)}/price-override`);
  }

  async getActiveOTCTrades(symbol?: string): Promise<ActiveTradeInfo[]> {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
    const response = await this.get<ApiResponse<ActiveTradeInfo[]>>(`/admin/otc/trades/active${query}`);
    return response.data;
  }

  async forceTradeOutcome(tradeId: string, outcome: 'WIN' | 'LOSE', reason?: string): Promise<void> {
    await this.post(`/admin/otc/trades/${tradeId}/force`, { outcome, reason });
  }

  async getAllUserTargets(): Promise<UserTargeting[]> {
    const response = await this.get<ApiResponse<UserTargeting[]>>('/admin/otc/users/targets');
    return response.data;
  }

  async getUserTargeting(userId: string): Promise<UserTargeting | null> {
    const response = await this.get<ApiResponse<UserTargeting | null>>(`/admin/otc/users/${userId}/target`);
    return response.data;
  }

  async setUserTargeting(userId: string, config: UserTargetingInput): Promise<void> {
    await this.post(`/admin/otc/users/${userId}/target`, config);
  }

  async removeUserTargeting(userId: string, symbol?: string): Promise<void> {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
    await this.delete(`/admin/otc/users/${userId}/target${query}`);
  }

  async getInterventionLog(params: InterventionLogParams): Promise<PaginatedResponse<ManualIntervention>> {
    const queryParts: string[] = [];
    if (params.actionType) queryParts.push(`actionType=${params.actionType}`);
    if (params.targetType) queryParts.push(`targetType=${params.targetType}`);
    if (params.targetId) queryParts.push(`targetId=${params.targetId}`);
    if (params.from) queryParts.push(`from=${params.from.toISOString()}`);
    if (params.to) queryParts.push(`to=${params.to.toISOString()}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    const queryStr = queryParts.join('&');

    const response = await this.get<ApiResponse<ManualIntervention[]> & { pagination: PaginatedResponse<ManualIntervention>['pagination'] }>(
      `/admin/otc/interventions${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 50, total: response.data.length, totalPages: 1 },
    };
  }

  // ============= OTC HISTORY SEEDING =============

  async seedOTCHistory(symbol: string, options?: { count?: number; resolution?: number; clearExisting?: boolean }): Promise<SeedResult> {
    const response = await this.post<ApiResponse<SeedResult>>(`/admin/otc/history/seed/${encodeURIComponent(symbol)}`, options || {});
    return response.data;
  }

  async seedAllOTCHistory(options?: { count?: number; resolution?: number; clearExisting?: boolean }): Promise<SeedAllResult> {
    const response = await this.post<ApiResponse<SeedAllResult>>('/admin/otc/history/seed-all', options || {});
    return response.data;
  }

  async seedOTCHistoryByType(marketType: 'FOREX' | 'CRYPTO', options?: { count?: number; resolution?: number; clearExisting?: boolean }): Promise<SeedAllResult> {
    const response = await this.post<ApiResponse<SeedAllResult>>(`/admin/otc/history/seed-type/${marketType}`, options || {});
    return response.data;
  }

  async getOTCHistoryStats(symbol: string): Promise<{ symbol: string; count: number; oldest: string | null; newest: string | null }> {
    const response = await this.get<ApiResponse<{ symbol: string; count: number; oldest: string | null; newest: string | null }>>(`/admin/otc/history/stats/${encodeURIComponent(symbol)}`);
    return response.data;
  }

  async hasOTCSeededHistory(symbol: string): Promise<boolean> {
    const response = await this.get<ApiResponse<{ symbol: string; hasSeededHistory: boolean }>>(`/admin/otc/history/has/${encodeURIComponent(symbol)}`);
    return response.data.hasSeededHistory;
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

// CopyTradingFollower, FollowerInfo, and PendingCopyTrade are imported from @/types

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

// OTC Market Types
export interface OTCConfig {
  id: string;
  symbol: string;
  baseSymbol: string;
  marketType: 'FOREX' | 'CRYPTO';
  name: string;
  pipSize: number;
  isEnabled: boolean;
  riskEnabled: boolean;
  is24Hours: boolean;
  baseVolatility: number;
  volatilityMultiplier: number;
  meanReversionStrength: number;
  maxDeviationPercent: number;
  priceOffsetPips: number;
  momentumFactor: number;
  garchAlpha: number;
  garchBeta: number;
  garchOmega: number;
  exposureThreshold: number;
  minInterventionRate: number;
  maxInterventionRate: number;
  spreadMultiplier: number;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  anchoringDurationMins: number;
  createdAt: string;
  updatedAt: string;
}

export interface OTCExposure {
  id: string;
  symbol: string;
  totalUpAmount: number;
  totalDownAmount: number;
  activeUpTrades: number;
  activeDownTrades: number;
  netExposure: number;
  exposureRatio: number;
  brokerRiskAmount: number;
  totalInterventions: number;
  successfulInterventions: number;
  totalTradesProcessed: number;
  lastUpdated: string;
}

export interface OTCActivityLog {
  id: string;
  symbol: string;
  eventType: string;
  details: Record<string, unknown>;
  userId: string | null;
  timestamp: string;
}

export interface OTCStats {
  totalConfigs: number;
  enabledConfigs: number;
  forexConfigs: number;
  cryptoConfigs: number;
  totalExposure: number;
  interventionsToday: number;
}

// ============= OTC Manual Control Types =============

export type ManualActionType = 'PRICE_BIAS' | 'VOLATILITY' | 'PRICE_OVERRIDE' | 'TRADE_FORCE' | 'USER_TARGET';
export type ManualTargetType = 'SYMBOL' | 'TRADE' | 'USER';

export interface ManualControl {
  symbol: string;
  directionBias: number;
  directionStrength: number;
  directionBiasExpiry: string | null;
  volatilityMultiplier: number;
  volatilityExpiry: string | null;
  priceOverride: number | null;
  priceOverrideExpiry: string | null;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UserTargeting {
  id: string;
  userId: string;
  symbol: string | null;
  targetWinRate: number | null;
  forceNextWin: number;
  forceNextLose: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualIntervention {
  id: string;
  adminId: string;
  actionType: ManualActionType;
  targetType: ManualTargetType;
  targetId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  reason: string | null;
  createdAt: string;
}

export interface ActiveTradeInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  expiresAt: string;
  timeLeftMs: number;
  accountType: string;
}

export interface UserTargetingInput {
  symbol?: string;
  targetWinRate?: number;
  forceNextWin?: number;
  forceNextLose?: number;
  reason?: string;
}

export interface InterventionLogParams {
  actionType?: ManualActionType;
  targetType?: ManualTargetType;
  targetId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface CreateOTCConfigInput {
  symbol: string;
  baseSymbol: string;
  marketType: 'FOREX' | 'CRYPTO';
  name: string;
  pipSize: number;
  isEnabled?: boolean;
  riskEnabled?: boolean;
  is24Hours?: boolean;
  baseVolatility?: number;
  volatilityMultiplier?: number;
  meanReversionStrength?: number;
  maxDeviationPercent?: number;
  priceOffsetPips?: number;
  momentumFactor?: number;
  garchAlpha?: number;
  garchBeta?: number;
  garchOmega?: number;
  exposureThreshold?: number;
  minInterventionRate?: number;
  maxInterventionRate?: number;
  spreadMultiplier?: number;
  payoutPercent?: number;
  minTradeAmount?: number;
  maxTradeAmount?: number;
  anchoringDurationMins?: number;
}

export type UpdateOTCConfigInput = Partial<Omit<CreateOTCConfigInput, 'symbol' | 'baseSymbol' | 'marketType'>>;

// OTC History Seeding Types
export interface SeedResult {
  symbol: string;
  baseSymbol: string;
  candlesSeeded: number;
  oldestCandle: string | null;
  newestCandle: string | null;
  source: 'BINANCE' | 'DERIV' | 'NONE';
}

export interface SeedAllResult {
  totalSeeded: number;
  successful: number;
  total: number;
  marketType?: 'FOREX' | 'CRYPTO';
  results: SeedResult[];
}

// ============= SuperAdmin Types =============

export interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPERADMIN';
  isActive: boolean;
  isProtected: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminUserDetail extends SuperAdminUser {
  actionsCount: number;
  actionsThisMonth: number;
  lastAction: string | null;
  activeSessions: AdminSession[];
  recentActions: {
    id: string;
    actionType: string;
    description: string;
    createdAt: string;
  }[];
}

export interface AdminSession {
  id: string;
  adminId: string;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: string;
  logoutAt: string | null;
  isActive: boolean;
}

export interface SuperAdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  superAdmins: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  recentLogins: {
    adminId: string;
    adminName: string;
    adminEmail: string;
    loginAt: string;
    ipAddress: string | null;
  }[];
  topAdminsByActivity: {
    adminId: string;
    adminName: string;
    count: number;
  }[];
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  description: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogSummary {
  totalActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  actionsByType: { actionType: string; count: number }[];
  topAdmins: { adminId: string; adminName: string; count: number }[];
  recentLogins: {
    adminId: string;
    adminName: string;
    loginAt: string;
    ipAddress: string | null;
  }[];
}

export interface CreateAdminInput {
  email: string;
  name: string;
  password?: string;
}

export interface UpdateAdminInput {
  name?: string;
  email?: string;
}

export const api = new ApiClient();

// Add SuperAdmin API methods to ApiClient prototype
Object.assign(ApiClient.prototype, {
  // SuperAdmin Dashboard
  async getSuperAdminStats(): Promise<SuperAdminStats> {
    const response = await api.get<ApiResponse<SuperAdminStats>>('/superadmin/stats');
    return response.data;
  },

  // Admin Management
  async getSuperAdminAdmins(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'ADMIN' | 'SUPERADMIN' | '';
    isActive?: boolean | '';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<SuperAdminUser>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.role) params.append('role', options.role);
    if (options?.isActive !== undefined && options.isActive !== '') params.append('isActive', options.isActive.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryStr = params.toString();
    const response = await api.get<ApiResponse<SuperAdminUser[]> & { pagination: PaginatedResponse<SuperAdminUser>['pagination'] }>(
      `/superadmin/admins${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  },

  async getSuperAdminAdminDetail(adminId: string): Promise<SuperAdminUserDetail> {
    const response = await api.get<ApiResponse<SuperAdminUserDetail>>(`/superadmin/admins/${adminId}`);
    return response.data;
  },

  async createSuperAdminAdmin(data: CreateAdminInput & { adminPassword: string }): Promise<{ admin: SuperAdminUser; tempPassword?: string }> {
    const response = await api.post<ApiResponse<{ admin: SuperAdminUser; tempPassword?: string }>>('/superadmin/admins', data);
    return response.data;
  },

  async updateSuperAdminAdmin(adminId: string, data: UpdateAdminInput): Promise<SuperAdminUser> {
    const response = await api.patch<ApiResponse<SuperAdminUser>>(`/superadmin/admins/${adminId}`, data);
    return response.data;
  },

  async resetAdminPassword(adminId: string, adminPassword: string): Promise<{ tempPassword: string }> {
    const response = await api.post<ApiResponse<{ tempPassword: string }>>(`/superadmin/admins/${adminId}/reset-password`, { adminPassword });
    return response.data;
  },

  async activateSuperAdminAdmin(adminId: string): Promise<SuperAdminUser> {
    const response = await api.post<ApiResponse<SuperAdminUser>>(`/superadmin/admins/${adminId}/activate`);
    return response.data;
  },

  async deactivateSuperAdminAdmin(adminId: string, adminPassword: string): Promise<SuperAdminUser> {
    const response = await api.post<ApiResponse<SuperAdminUser>>(`/superadmin/admins/${adminId}/deactivate`, { adminPassword });
    return response.data;
  },

  async deleteSuperAdminAdmin(adminId: string, adminPassword: string): Promise<void> {
    await api.delete(`/superadmin/admins/${adminId}`, { data: { adminPassword } });
  },

  // Session Management
  async getAdminSessions(adminId: string): Promise<AdminSession[]> {
    const response = await api.get<ApiResponse<AdminSession[]>>(`/superadmin/admins/${adminId}/sessions`);
    return response.data;
  },

  async terminateAdminSession(sessionId: string): Promise<void> {
    await api.delete(`/superadmin/sessions/${sessionId}`);
  },

  // Audit Logs
  async getAuditLogs(options?: {
    page?: number;
    limit?: number;
    adminId?: string;
    actionType?: string;
    targetType?: string;
    targetId?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.adminId) params.append('adminId', options.adminId);
    if (options?.actionType) params.append('actionType', options.actionType);
    if (options?.targetType) params.append('targetType', options.targetType);
    if (options?.targetId) params.append('targetId', options.targetId);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.search) params.append('search', options.search);
    const queryStr = params.toString();
    const response = await api.get<ApiResponse<AuditLog[]> & { pagination: PaginatedResponse<AuditLog>['pagination'] }>(
      `/superadmin/audit-logs${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  },

  async getAuditLogSummary(): Promise<AuditLogSummary> {
    const response = await api.get<ApiResponse<AuditLogSummary>>('/superadmin/audit-logs/summary');
    return response.data;
  },

  async exportAuditLogs(options?: {
    adminId?: string;
    actionType?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const params = new URLSearchParams();
    if (options?.adminId) params.append('adminId', options.adminId);
    if (options?.actionType) params.append('actionType', options.actionType);
    if (options?.targetType) params.append('targetType', options.targetType);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    const queryStr = params.toString();

    const response = await fetch(`${API_URL}/superadmin/audit-logs/export${queryStr ? `?${queryStr}` : ''}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token') || ''}`,
      },
    });
    return response.text();
  },

  // ============= User Impersonation =============
  async impersonateUser(userId: string, adminPassword: string): Promise<{
    user: User;
    token: string;
    originalAdminId: string;
  }> {
    const response = await api.post<ApiResponse<{
      user: User;
      token: string;
      originalAdminId: string;
    }>>(`/admin/users/${userId}/impersonate`, { adminPassword });
    return response.data;
  },

  async endImpersonation(adminId: string): Promise<{
    user: User;
    token: string;
  }> {
    const response = await api.post<ApiResponse<{
      user: User;
      token: string;
    }>>('/admin/impersonation/end', { adminId });
    return response.data;
  },

  // ============= User Profile =============

  async getFullProfile(): Promise<UserProfile> {
    const response = await api.get<ApiResponse<UserProfile>>('/user/profile');
    return response.data;
  },

  async getProfileStats(): Promise<ProfileStats> {
    const response = await api.get<ApiResponse<ProfileStats>>('/user/stats');
    return response.data;
  },

  async getUserDevices(): Promise<ProfileDevice[]> {
    const response = await api.get<ApiResponse<ProfileDevice[]>>('/user/devices');
    return response.data;
  },

  async removeDevice(deviceId: string): Promise<void> {
    await api.delete(`/user/devices/${deviceId}`);
  },

  async trustDevice(deviceId: string): Promise<void> {
    await api.post(`/user/devices/${deviceId}/trust`);
  },

  async getLoginHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: LoginHistoryItem[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const queryStr = params.toString();

    const response = await api.get<ApiResponse<LoginHistoryItem[]> & { pagination: { total: number } }>(
      `/user/login-history${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      total: response.pagination?.total || response.data.length,
    };
  },

  // ============= Financial Management =============

  async getFinancialSummary(): Promise<FinancialSummary> {
    const response = await api.get<ApiResponse<FinancialSummary>>('/superadmin/financial/summary');
    return response.data;
  },

  async getFinancialRealTimeMetrics(): Promise<RealTimeMetrics> {
    const response = await api.get<ApiResponse<RealTimeMetrics>>('/superadmin/financial/realtime');
    return response.data;
  },

  async getFinancialDailySnapshots(options?: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<DailySnapshot>> {
    const params = new URLSearchParams();
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    const queryStr = params.toString();
    const response = await api.get<ApiResponse<DailySnapshot[]> & { pagination: PaginatedResponse<DailySnapshot>['pagination'] }>(
      `/superadmin/financial/daily${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 30, total: response.data.length, totalPages: 1 },
    };
  },

  async getFinancialDailySnapshot(date: string): Promise<DailySnapshot> {
    const response = await api.get<ApiResponse<DailySnapshot>>(`/superadmin/financial/daily/${date}`);
    return response.data;
  },

  async setOperatingCosts(date: string, operatingCosts: number, adminPassword: string): Promise<DailySnapshot> {
    const response = await api.post<ApiResponse<DailySnapshot>>(`/superadmin/financial/daily/${date}/costs`, {
      operatingCosts,
      adminPassword,
    });
    return response.data;
  },

  async getFinancialMonthlyReports(year?: number): Promise<MonthlyReport[]> {
    const params = year ? `?year=${year}` : '';
    const response = await api.get<ApiResponse<MonthlyReport[]>>(`/superadmin/financial/monthly${params}`);
    return response.data;
  },

  async getFinancialMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const response = await api.get<ApiResponse<MonthlyReport>>(`/superadmin/financial/monthly/${year}/${month}`);
    return response.data;
  },

  async triggerDailySnapshot(date?: string): Promise<{ success: boolean; date: string }> {
    const response = await api.post<{ success: boolean; message: string; date: string }>('/superadmin/financial/generate/daily', { date });
    return { success: true, date: response.date || new Date().toISOString().split('T')[0] };
  },

  async triggerMonthlyReport(month: number, year: number): Promise<{ success: boolean; month: number; year: number }> {
    const response = await api.post<{ success: boolean; message: string; month: number; year: number }>('/superadmin/financial/generate/monthly', { month, year });
    return { success: true, month: response.month || month, year: response.year || year };
  },

  async backfillSnapshots(startDate: string, endDate: string): Promise<{ success: boolean; generated: number }> {
    const response = await api.post<{ success: boolean; generated: number }>('/superadmin/financial/backfill', { startDate, endDate });
    return { success: true, generated: response.generated };
  },

  async getFinancialAuditLogs(options?: {
    page?: number;
    limit?: number;
    actionType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<FinancialAuditLog>> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.actionType) params.append('actionType', options.actionType);
    if (options?.entityType) params.append('entityType', options.entityType);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const queryStr = params.toString();
    const response = await api.get<ApiResponse<FinancialAuditLog[]> & { pagination: PaginatedResponse<FinancialAuditLog>['pagination'] }>(
      `/superadmin/financial/audit-logs${queryStr ? `?${queryStr}` : ''}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 50, total: response.data.length, totalPages: 1 },
    };
  },

  async getTopMetrics(from: string, to: string): Promise<TopMetrics> {
    const response = await api.get<ApiResponse<TopMetrics>>(`/superadmin/financial/top-metrics?from=${from}&to=${to}`);
    return response.data;
  },

  async getSchedulerStatus(): Promise<SchedulerStatus> {
    const response = await api.get<ApiResponse<SchedulerStatus>>('/superadmin/financial/scheduler-status');
    return response.data;
  },

  // ============= Analytics & Charts =============

  async getRevenueTrend(days: number = 30): Promise<RevenueTrendData[]> {
    const response = await api.get<ApiResponse<RevenueTrendData[]>>(`/superadmin/financial/analytics/revenue-trend?days=${days}`);
    return response.data;
  },

  async getTopDepositors(limit: number = 10): Promise<TopDepositor[]> {
    const response = await api.get<ApiResponse<TopDepositor[]>>(`/superadmin/financial/analytics/top-depositors?limit=${limit}`);
    return response.data;
  },

  async getTopTraders(limit: number = 10): Promise<TopTrader[]> {
    const response = await api.get<ApiResponse<TopTrader[]>>(`/superadmin/financial/analytics/top-traders?limit=${limit}`);
    return response.data;
  },

  async compareDateRanges(range1Start: string, range1End: string, range2Start: string, range2End: string): Promise<DateRangeComparison> {
    const response = await api.post<ApiResponse<DateRangeComparison>>('/superadmin/financial/analytics/compare', {
      range1Start, range1End, range2Start, range2End,
    });
    return response.data;
  },

  async getAdvancedAnalytics(): Promise<AdvancedAnalytics> {
    const response = await api.get<ApiResponse<AdvancedAnalytics>>('/superadmin/financial/analytics/advanced');
    return response.data;
  },

  async getBudgetTargets(): Promise<BudgetTargets> {
    const response = await api.get<ApiResponse<BudgetTargets>>('/superadmin/financial/budget-targets');
    return response.data;
  },

  async setBudgetTargets(targets: Partial<BudgetTargets>, adminPassword: string): Promise<{ success: boolean }> {
    await api.post('/superadmin/financial/budget-targets', { ...targets, adminPassword });
    return { success: true };
  },

  async getAlertThresholds(): Promise<AlertThresholds> {
    const response = await api.get<ApiResponse<AlertThresholds>>('/superadmin/financial/alert-thresholds');
    return response.data;
  },

  async setAlertThresholds(thresholds: Partial<AlertThresholds>, adminPassword: string): Promise<{ success: boolean }> {
    await api.post('/superadmin/financial/alert-thresholds', { ...thresholds, adminPassword });
    return { success: true };
  },

  // ============= User Type Management =============

  async getUsersByType(userType: UserType, options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<UserWithType>> {
    const params = new URLSearchParams();
    params.append('userType', userType);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    const queryStr = params.toString();
    const response = await api.get<ApiResponse<UserWithType[]> & { pagination: PaginatedResponse<UserWithType>['pagination'] }>(
      `/superadmin/users/by-type?${queryStr}`
    );
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, limit: 20, total: response.data.length, totalPages: 1 },
    };
  },

  async updateUserType(userId: string, userType: UserType, adminPassword: string): Promise<{ success: boolean; previousType: UserType; newType: UserType }> {
    const response = await api.patch<{ success: boolean; previousType: UserType; newType: UserType; message?: string }>(`/superadmin/users/${userId}/type`, {
      userType,
      adminPassword,
    });
    return { success: true, previousType: response.previousType, newType: response.newType };
  },

  async bulkUpdateUserTypes(userIds: string[], userType: UserType, adminPassword: string): Promise<{ success: boolean; updated: number }> {
    const response = await api.post<{ success: boolean; updated: number; message?: string }>('/superadmin/users/bulk-type', {
      userIds,
      userType,
      adminPassword,
    });
    return { success: true, updated: response.updated };
  },

  async previewDemoOnlyClassification(): Promise<{ count: number; users: { id: string; email: string; name: string }[]; message: string }> {
    const response = await api.get<{ success: boolean; count: number; users: { id: string; email: string; name: string }[]; message: string }>('/superadmin/users/demo-only/preview');
    return { count: response.count, users: response.users, message: response.message };
  },

  async autoClassifyDemoOnlyUsers(adminPassword: string): Promise<{ success: boolean; classified: number; message: string }> {
    const response = await api.post<{ success: boolean; classified: number; userIds: string[]; message: string }>('/superadmin/users/demo-only/classify', {
      adminPassword,
    });
    return { success: true, classified: response.classified, message: response.message };
  },
});

// Type declarations for dynamically added methods
interface ApiClient {
  // SuperAdmin methods
  getSuperAdminStats(): Promise<SuperAdminStats>;
  getSuperAdminAdmins(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'ADMIN' | 'SUPERADMIN' | '';
    isActive?: boolean | '';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<SuperAdminUser>>;
  createSuperAdminAdmin(data: CreateAdminInput): Promise<SuperAdminUser>;
  updateSuperAdminAdmin(adminId: string, data: UpdateAdminInput): Promise<SuperAdminUser>;
  deleteSuperAdminAdmin(adminId: string): Promise<void>;
  toggleSuperAdminAdminStatus(adminId: string): Promise<SuperAdminUser>;
  resetSuperAdminAdminPassword(adminId: string, newPassword: string): Promise<void>;
  getSuperAdminSession(adminId: string): Promise<AdminSession | null>;
  terminateSuperAdminSession(adminId: string): Promise<void>;
  getAuditLogs(options?: {
    page?: number;
    limit?: number;
    adminId?: string;
    actionType?: string;
    targetType?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<PaginatedResponse<AuditLog>>;
  getAuditLogSummary(): Promise<AuditLogSummary>;
  exportAuditLogs(options?: {
    adminId?: string;
    actionType?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }): Promise<string>;
  // User Impersonation
  impersonateUser(userId: string, adminPassword: string): Promise<{
    user: User;
    token: string;
    originalAdminId: string;
  }>;
  endImpersonation(adminId: string): Promise<{
    user: User;
    token: string;
  }>;
  // User Profile
  getFullProfile(): Promise<UserProfile>;
  getProfileStats(): Promise<ProfileStats>;
  getUserDevices(): Promise<ProfileDevice[]>;
  removeDevice(deviceId: string): Promise<void>;
  trustDevice(deviceId: string): Promise<void>;
  getLoginHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: LoginHistoryItem[]; total: number }>;
  // Financial Management
  getFinancialSummary(): Promise<FinancialSummary>;
  getFinancialRealTimeMetrics(): Promise<RealTimeMetrics>;
  getFinancialDailySnapshots(options?: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<DailySnapshot>>;
  getFinancialDailySnapshot(date: string): Promise<DailySnapshot>;
  setOperatingCosts(date: string, operatingCosts: number, adminPassword: string): Promise<DailySnapshot>;
  getFinancialMonthlyReports(year?: number): Promise<MonthlyReport[]>;
  getFinancialMonthlyReport(year: number, month: number): Promise<MonthlyReport>;
  triggerDailySnapshot(date?: string): Promise<{ success: boolean; date: string }>;
  triggerMonthlyReport(month: number, year: number): Promise<{ success: boolean; month: number; year: number }>;
  backfillSnapshots(startDate: string, endDate: string): Promise<{ success: boolean; generated: number }>;
  getFinancialAuditLogs(options?: {
    page?: number;
    limit?: number;
    actionType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<FinancialAuditLog>>;
  getTopMetrics(from: string, to: string): Promise<TopMetrics>;
  getSchedulerStatus(): Promise<SchedulerStatus>;
  // Analytics & Charts
  getRevenueTrend(days?: number): Promise<RevenueTrendData[]>;
  getTopDepositors(limit?: number): Promise<TopDepositor[]>;
  getTopTraders(limit?: number): Promise<TopTrader[]>;
  compareDateRanges(range1Start: string, range1End: string, range2Start: string, range2End: string): Promise<DateRangeComparison>;
  getAdvancedAnalytics(): Promise<AdvancedAnalytics>;
  getBudgetTargets(): Promise<BudgetTargets>;
  setBudgetTargets(targets: Partial<BudgetTargets>, adminPassword: string): Promise<{ success: boolean }>;
  getAlertThresholds(): Promise<AlertThresholds>;
  setAlertThresholds(thresholds: Partial<AlertThresholds>, adminPassword: string): Promise<{ success: boolean }>;
  // User Type Management
  getUsersByType(userType: UserType, options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<UserWithType>>;
  updateUserType(userId: string, userType: UserType, adminPassword: string): Promise<{ success: boolean; previousType: UserType; newType: UserType }>;
  bulkUpdateUserTypes(userIds: string[], userType: UserType, adminPassword: string): Promise<{ success: boolean; updated: number }>;
  previewDemoOnlyClassification(): Promise<{ count: number; users: { id: string; email: string; name: string }[]; message: string }>;
  autoClassifyDemoOnlyUsers(adminPassword: string): Promise<{ success: boolean; classified: number; message: string }>;
}

// ============= Financial Types =============

export type UserType = 'REAL' | 'TEST' | 'DEMO_ONLY' | 'AFFILIATE_TEST';

export interface RealTimeMetrics {
  totalOpenTrades: number;
  totalOpenVolume: number;
  maxPotentialPayout: number;
  netExposure: number;
  todayRevenue: number;
  todayVolume: number;
  todayTrades: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayAffiliateCommissions: number;
  currentDailyPL: number;
  isAlertActive: boolean;
  alertMessage: string | null;
}

export interface DailySnapshot {
  id: string;
  date: string;
  grossTradingRevenue: number;
  totalTradeVolume: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  brokerWinRate: number;
  avgPayoutPercent: number;
  totalWonAmount: number;
  totalLostAmount: number;
  totalPayoutsPaid: number;
  totalAffiliateCommissions: number;
  signupBonusCosts: number;
  depositCommissionCosts: number;
  tradeCommissionCosts: number;
  affiliateCount: number;
  netRevenue: number;
  operatingCosts: number;
  netProfit: number;
  totalDeposits: number;
  depositCount: number;
  totalWithdrawals: number;
  withdrawalCount: number;
  netDeposits: number;
  activeTraders: number;
  newRegistrations: number;
  newDepositors: number;
  totalActiveUsers: number;
  realUserTradeCount: number;
  realUserVolume: number;
  testUserTradeCount: number;
  testUserVolume: number;
  copyTradingVolume: number;
  copyTradingTrades: number;
  activeLeaders: number;
  activeFollowers: number;
  otcTradingVolume: number;
  otcTradingTrades: number;
  otcBrokerRevenue: number;
  otcInterventions: number;
  profitFactor: number;
  revenuePerUser: number;
  revenuePerTrade: number;
  userWinRate: number;
  isFinalized: boolean;
  notes: string | null;
}

export interface MonthlyReport {
  id: string;
  month: number;
  year: number;
  totalRevenue: number;
  totalVolume: number;
  totalTrades: number;
  netProfit: number;
  profitMargin: number;
  totalDeposits: number;
  totalWithdrawals: number;
  uniqueActiveTraders: number;
  newRegistrations: number;
  avgBrokerWinRate: number;
  avgProfitFactor: number;
  arpu: number;
  profitableDays: number;
  lossDays: number;
}

export interface FinancialSummary {
  today: RealTimeMetrics;
  yesterday: DailySnapshot | null;
  thisMonth: {
    totalRevenue: number;
    totalVolume: number;
    totalTrades: number;
    netProfit: number;
    daysReported: number;
  };
  lastMonth: MonthlyReport | null;
  yearToDate: {
    totalRevenue: number;
    totalVolume: number;
    netProfit: number;
  };
}

export interface FinancialAuditLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  description: string;
  newValue: unknown;
  performedBy: string | null;
  createdAt: string;
}

export interface TopMetrics {
  topProfitableDays: { date: string; revenue: number }[];
  topLossDays: { date: string; revenue: number }[];
  topTradingDays: { date: string; trades: number }[];
  topVolumesDays: { date: string; volume: number }[];
}

export interface SchedulerStatus {
  running: boolean;
  lastSnapshotDate: string | null;
  lastMonthlyReport: string | null;
  intervals: {
    realTimeMetrics: boolean;
    dailySnapshot: boolean;
    monthlyReport: boolean;
    midnightReset: boolean;
  };
}

// Analytics Types
export interface RevenueTrendData {
  date: string;
  grossRevenue: number;
  netRevenue: number;
  netProfit: number;
  volume: number;
  trades: number;
  deposits: number;
  withdrawals: number;
}

export interface TopDepositor {
  userId: string;
  email: string;
  name: string;
  totalDeposits: number;
  depositCount: number;
  lastDeposit: string | null;
}

export interface TopTrader {
  userId: string;
  email: string;
  name: string;
  totalVolume: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  winRate: number;
  netPnL: number;
}

export interface DateRangeComparison {
  range1: {
    start: string;
    end: string;
    metrics: Record<string, number>;
  };
  range2: {
    start: string;
    end: string;
    metrics: Record<string, number>;
  };
  comparison: Record<string, { diff: number; percentChange: number }>;
}

export interface AdvancedAnalytics {
  averageLTV: number;
  averageDepositSize: number;
  averageTradesPerUser: number;
  userRetentionRate: number;
  avgRevenuePerTrade: number;
  depositToWithdrawalRatio: number;
  activeUserPercentage: number;
  realVsTestRatio: number;
}

export interface BudgetTargets {
  monthlyRevenueTarget: number;
  monthlyProfitTarget: number;
  dailyVolumeTarget: number;
  newUsersTarget: number;
  depositsTarget: number;
}

export interface AlertThresholds {
  exposureAlertThreshold: number;
  dailyLossLimit: number;
  lowBalanceAlert: number;
  highVolumeAlert: number;
}

export interface UserWithType {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  createdAt: string;
}
