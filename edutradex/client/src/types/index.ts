export type AccountType = 'LIVE' | 'DEMO';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  liveBalance: number;
  demoBalance: number;
  activeAccountType: AccountType;
  emailVerified: boolean;
}

// KYC Types
export type KYCStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type DocumentType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE';

export interface KYCInfo {
  id?: string;
  status: KYCStatus;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  message?: string;
}

export interface KYCSubmission extends KYCInfo {
  documentFront?: string;
  documentBack?: string;
  selfieWithId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

export interface KYCStats {
  notSubmitted: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
}

export interface Trade {
  id: string;
  userId: string;
  market: 'FOREX' | 'OTC' | 'SYNTHETIC';
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  duration: number;
  payoutPercent: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  result: 'WIN' | 'LOSS' | 'TIE' | null;
  profit: number | null;
  openedAt: string;
  closedAt: string | null;
  expiresAt: string;
}

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  ties: number;
  totalProfit: number;
  winRate: string;
}

export interface PriceTick {
  symbol: string;
  price: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  liveBalance: number;
  demoBalance: number;
  activeAccountType: AccountType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    trades: number;
  };
}

export interface AdminUserDetail extends AdminUser {
  stats: {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
  };
  recentTrades: Trade[];
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  platformWinRate: number;
  totalVolume: number;
  roleDistribution: {
    USER: number;
    ADMIN: number;
  };
  tradeStatusDistribution: {
    OPEN: number;
    CLOSED: number;
    CANCELLED: number;
  };
}

export interface RecentActivity {
  recentTrades: Trade[];
  newUsers: AdminUser[];
}

export interface MarketConfig {
  id: string;
  symbol: string;
  marketType: 'forex' | 'otc';
  isActive: boolean;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  volatilityMode: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type DepositMethod = 'MOBILE_MONEY' | 'CRYPTO';
export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MobileProvider = 'MPESA' | 'AIRTEL' | 'MTN' | 'VODAFONE' | 'ORANGE' | 'TIGO' | 'OTHER';
export type CryptoCurrency = 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'BNB' | 'SOL' | 'XRP' | 'OTHER';

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  method: DepositMethod;
  status: DepositStatus;
  phoneNumber?: string;
  mobileProvider?: MobileProvider;
  cryptoCurrency?: CryptoCurrency;
  walletAddress?: string;
  transactionHash?: string;
  adminNote?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DepositStats {
  pending: number;
  approved: number;
  rejected: number;
  totalVolume: number;
}

export interface SpreadConfig {
  id: string;
  symbol: string;
  markupPips: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpreadConfigInput {
  symbol: string;
  markupPips: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSpreadConfigInput {
  markupPips?: number;
  description?: string;
  isActive?: boolean;
}

export interface MarketStatus {
  derivAvailable: boolean;
  derivConnected: boolean;
  usingSimulation: boolean;
  spreadConfigsLoaded: number;
}

export type WithdrawalMethod = 'MOBILE_MONEY' | 'CRYPTO';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  phoneNumber?: string;
  mobileProvider?: MobileProvider;
  cryptoCurrency?: CryptoCurrency;
  walletAddress?: string;
  adminNote?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WithdrawalStats {
  pending: number;
  approved: number;
  rejected: number;
  totalVolume: number;
}

export type PaymentMethodType = 'CRYPTO' | 'MOBILE_MONEY';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  code: string;
  cryptoCurrency?: string;
  network?: string;
  walletAddress?: string;
  mobileProvider?: string;
  phoneNumber?: string;
  accountName?: string;
  iconUrl?: string;
  iconBg: string;
  displayOrder: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  isActive: boolean;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodStats {
  totalCrypto: number;
  totalMobile: number;
  active: number;
  inactive: number;
  total: number;
}

export interface CreateCryptoPaymentMethodInput {
  name: string;
  code: string;
  cryptoCurrency: string;
  network?: string;
  walletAddress: string;
  iconUrl?: string;
  iconBg?: string;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
}

export interface CreateMobileMoneyPaymentMethodInput {
  name: string;
  code: string;
  mobileProvider: string;
  phoneNumber: string;
  accountName?: string;
  iconUrl?: string;
  iconBg?: string;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  walletAddress?: string;
  phoneNumber?: string;
  accountName?: string;
  iconUrl?: string;
  iconBg?: string;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
}

// Copy Trading Types
export type LeaderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type CopyMode = 'AUTOMATIC' | 'MANUAL';
export type PendingTradeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CopyTradingLeader {
  id: string;
  userId: string;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
  status: LeaderStatus;
  totalTrades: number;
  winningTrades: number;
  totalProfit: number;
  winRate: number;
  maxFollowers: number;
  isPublic: boolean;
  followerCount: number;
  createdAt: string;
  user: {
    name: string;
  };
  isFollowing?: boolean;
}

export interface CopyTradingLeaderDetail extends CopyTradingLeader {
  adminNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
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

export interface CopyTradingFollower {
  id: string;
  leaderId: string;
  copyMode: CopyMode;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: string;
  leader: CopyTradingLeader;
}

export interface FollowerInfo {
  id: string;
  followerId: string;
  copyMode: CopyMode;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: string;
  follower?: {
    id: string;
    name: string;
    email: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PendingCopyTrade {
  id: string;
  followerId: string;
  originalTradeId: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  suggestedAmount: number;
  status: PendingTradeStatus;
  expiresAt: string;
  createdAt: string;
  leader?: {
    displayName: string;
  };
}

export interface CopiedTrade {
  id: string;
  followerId: string;
  leaderId: string;
  originalTradeId: string;
  copiedTradeId: string;
  amount: number;
  profit: number | null;
  createdAt: string;
  leader: {
    displayName: string;
  };
  copiedTrade: {
    symbol: string;
    direction: string;
    result: string | null;
    profit: number | null;
  };
}

export interface CopyTradingStats {
  totalCopied: number;
  totalProfit: number;
  winRate: number;
  leadersFollowing: number;
}

export interface CopyTradingPlatformStats {
  totalLeaders: number;
  pendingLeaders: number;
  approvedLeaders: number;
  suspendedLeaders: number;
  totalFollowers: number;
  totalCopiedTrades: number;
  totalCopyVolume: number;
  totalCopyProfit: number;
}

export interface FollowLeaderInput {
  copyMode: CopyMode;
  fixedAmount: number;
  maxDailyTrades?: number;
}

export interface UpdateFollowSettingsInput {
  copyMode?: CopyMode;
  fixedAmount?: number;
  maxDailyTrades?: number;
  isActive?: boolean;
}

export interface BecomeLeaderInput {
  displayName: string;
  description?: string;
}

export interface UpdateLeaderProfileInput {
  displayName?: string;
  description?: string;
  isPublic?: boolean;
}
