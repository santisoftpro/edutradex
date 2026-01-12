import { PartnerLevel, PartnerStatus } from "@prisma/client";

// ============================================
// AUTH TYPES
// ============================================

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  level: PartnerLevel;
  status: PartnerStatus;
}

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    level: PartnerLevel;
    status: PartnerStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    level: PartnerLevel;
    status: PartnerStatus;
  }
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardKPIs {
  ftdCount: number;
  ftdAmount: number;
  deposits: number;
  commission: number;
  balance: number;
  pendingBalance: number;
}

export interface PerformanceDataPoint {
  date: string;
  visitors: number;
  registrations: number;
  deposits: number;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface TraderStats {
  id: string;
  tradingUid: string;
  country: string | null;
  balance: number;
  depositCount: number;
  depositAmount: number;
  profit: number;
  loss: number;
  withdrawals: number;
  commissionShare: number;
  registeredAt: Date;
}

export interface TraderFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  search?: string;
  sortBy?: "depositAmount" | "profit" | "loss" | "commissionShare";
  sortOrder?: "asc" | "desc";
}

// ============================================
// LINKS TYPES
// ============================================

export interface TrackingLinkWithStats {
  id: string;
  code: string;
  comment: string | null;
  type: string;
  program: string;
  isActive: boolean;
  clickCount: number;
  registrations: number;
  ftdCount: number;
  createdAt: Date;
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  ftdCount: number;
  deposits: number;
  commission: number;
  isCurrentPartner?: boolean;
}

// ============================================
// LEVEL TYPES
// ============================================

export interface LevelProgress {
  currentLevel: PartnerLevel;
  currentRate: number;
  nextLevel: PartnerLevel | null;
  nextRate: number | null;
  ftdProgress: {
    current: number;
    required: number;
    percentage: number;
  };
  socialProgress: {
    status: string;
    channelCount: number;
    isRequired: boolean;
  };
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface WithdrawalRequest {
  amount: number;
  method: "CRYPTO" | "INTERNAL_TRANSFER";
  coin?: string;
  network?: string;
  address?: string;
  tradingUid?: string;
}

export interface WithdrawalHistoryItem {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  coin: string | null;
  network: string | null;
  address: string | null;
  status: string;
  txId: string | null;
  requestedAt: Date;
  completedAt: Date | null;
}

export interface SettlementHistoryItem {
  id: string;
  amount: number;
  level: PartnerLevel;
  rate: number;
  status: string;
  periodDate: Date;
  settledAt: Date;
}

// ============================================
// SUPPORT TYPES
// ============================================

export interface TicketWithReplies {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  replies: {
    id: string;
    message: string;
    isFromAdmin: boolean;
    adminName: string | null;
    createdAt: Date;
  }[];
}

// ============================================
// NEWS TYPES
// ============================================

export interface NewsArticleSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  coverImage: string | null;
  isPinned: boolean;
  publishedAt: Date;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  linkType: string | null;
  linkId: string | null;
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// SOCIAL TYPES
// ============================================

export interface SocialChannelData {
  id?: string;
  platform: string;
  profileUrl: string;
  username?: string;
  followersCount?: number;
  country?: string;
  notes?: string;
  status?: string;
}

// ============================================
// FORM TYPES
// ============================================

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface CreateLinkFormData {
  comment: string;
  type: string;
  program: string;
}

export interface CreateTicketFormData {
  category: string;
  subject: string;
  message: string;
}
