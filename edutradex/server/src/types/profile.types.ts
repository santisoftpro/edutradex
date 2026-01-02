/**
 * Profile Types
 *
 * TypeScript interfaces for user profile data
 */

export interface UserProfileKYC {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastKnownCountry: string | null;
  loginCount: number;
  kyc: UserProfileKYC | null;
  backupCodesCount: number;
}

export interface ProfileDevice {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  isTrusted: boolean;
  trustScore: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIp: string | null;
  lastCountry: string | null;
  loginCount: number;
  isBlocked: boolean;
  isCurrent: boolean;
}

export interface LoginHistoryItem {
  id: string;
  ipAddress: string;
  country: string | null;
  city: string | null;
  deviceType: string;
  browser: string | null;
  success: boolean;
  failureReason: string | null;
  isSuspicious: boolean;
  riskFlags: string[];
  attemptedAt: string;
}

export interface ProfileStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  winRate: number;
  totalProfit: number;
  referralCount: number;
  referralEarnings: number;
}
