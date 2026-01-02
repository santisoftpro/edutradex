import { query, queryOne } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { deviceService } from '../security/device.service.js';
import type {
  UserProfile,
  UserProfileKYC,
  ProfileDevice,
  LoginHistoryItem,
  ProfileStats,
} from '../../types/profile.types.js';

/**
 * Profile Service
 *
 * Handles user profile data retrieval and device management for end users.
 */

interface DBUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  lastKnownCountry: string | null;
  loginCount: number;
  backupCodes: string[];
}

interface DBKYC {
  status: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

interface DBDevice {
  id: string;
  fingerprintHash: string;
  deviceType: string;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  isTrusted: boolean;
  trustScore: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastIp: string | null;
  lastCountry: string | null;
  loginCount: number;
  isBlocked: boolean;
}

interface DBLoginAttempt {
  id: string;
  ipAddress: string;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  isSuspicious: boolean;
  riskFlags: string[];
  attemptedAt: Date;
}

class ProfileService {
  /**
   * Get complete user profile with KYC data
   */
  async getFullProfile(userId: string): Promise<UserProfile> {
    const user = await queryOne<DBUser>(
      `SELECT id, email, name, role, "emailVerified", "twoFactorEnabled",
              "createdAt", "lastLoginAt", "lastLoginIp", "lastKnownCountry",
              "loginCount", "backupCodes"
       FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new ProfileServiceError('User not found', 404);
    }

    const kyc = await queryOne<DBKYC>(
      `SELECT status, "firstName", "lastName", "dateOfBirth", nationality,
              "phoneNumber", address, city, country, "postalCode",
              "submittedAt", "reviewedAt", "rejectionReason"
       FROM "KYC" WHERE "userId" = $1`,
      [userId]
    );

    const kycData: UserProfileKYC | null = kyc
      ? {
          status: kyc.status as UserProfileKYC['status'],
          firstName: kyc.firstName,
          lastName: kyc.lastName,
          dateOfBirth: kyc.dateOfBirth?.toISOString() || null,
          nationality: kyc.nationality,
          phoneNumber: kyc.phoneNumber,
          address: kyc.address,
          city: kyc.city,
          country: kyc.country,
          postalCode: kyc.postalCode,
          submittedAt: kyc.submittedAt?.toISOString() || null,
          reviewedAt: kyc.reviewedAt?.toISOString() || null,
          rejectionReason: kyc.rejectionReason,
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserProfile['role'],
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      lastLoginIp: user.lastLoginIp,
      lastKnownCountry: user.lastKnownCountry,
      loginCount: user.loginCount,
      kyc: kycData,
      backupCodesCount: user.backupCodes?.length || 0,
    };
  }

  /**
   * Get user's devices with current device indicator
   */
  async getUserDevices(
    userId: string,
    currentFingerprint?: string
  ): Promise<ProfileDevice[]> {
    const devices = await query<DBDevice>(
      `SELECT id, "fingerprintHash", "deviceType", browser, "browserVersion",
              os, "osVersion", "isTrusted", "trustScore", "firstSeenAt",
              "lastSeenAt", "lastIp", "lastCountry", "loginCount", "isBlocked"
       FROM "UserDevice" WHERE "userId" = $1
       ORDER BY "lastSeenAt" DESC`,
      [userId]
    );

    const currentHash = currentFingerprint
      ? deviceService.hashFingerprint(currentFingerprint)
      : null;

    return (devices?.rows || []).map((device) => ({
      id: device.id,
      deviceType: device.deviceType as ProfileDevice['deviceType'],
      browser: device.browser,
      browserVersion: device.browserVersion,
      os: device.os,
      osVersion: device.osVersion,
      isTrusted: device.isTrusted,
      trustScore: device.trustScore,
      firstSeenAt: device.firstSeenAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
      lastIp: device.lastIp,
      lastCountry: device.lastCountry,
      loginCount: device.loginCount,
      isBlocked: device.isBlocked,
      isCurrent: currentHash ? device.fingerprintHash === currentHash : false,
    }));
  }

  /**
   * Remove a device from user's account
   */
  async removeDevice(
    userId: string,
    deviceId: string,
    currentFingerprint?: string
  ): Promise<void> {
    // Verify device belongs to user
    const device = await queryOne<{ id: string; fingerprintHash: string }>(
      `SELECT id, "fingerprintHash" FROM "UserDevice" WHERE id = $1 AND "userId" = $2`,
      [deviceId, userId]
    );

    if (!device) {
      throw new ProfileServiceError('Device not found', 404);
    }

    // Prevent removing current device
    if (currentFingerprint) {
      const currentHash = deviceService.hashFingerprint(currentFingerprint);
      if (device.fingerprintHash === currentHash) {
        throw new ProfileServiceError('Cannot remove current device', 400);
      }
    }

    await query(`DELETE FROM "UserDevice" WHERE id = $1`, [deviceId]);

    logger.info('User removed device', { userId, deviceId });
  }

  /**
   * User self-trusts a device
   */
  async selfTrustDevice(userId: string, deviceId: string): Promise<void> {
    // Verify device belongs to user
    const device = await queryOne<{ id: string }>(
      `SELECT id FROM "UserDevice" WHERE id = $1 AND "userId" = $2`,
      [deviceId, userId]
    );

    if (!device) {
      throw new ProfileServiceError('Device not found', 404);
    }

    await query(
      `UPDATE "UserDevice"
       SET "isTrusted" = true, "trustedAt" = NOW(), "trustedBy" = $1, "trustScore" = 100
       WHERE id = $2`,
      [userId, deviceId]
    );

    logger.info('User self-trusted device', { userId, deviceId });
  }

  /**
   * Get user's login history
   */
  async getLoginHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ data: LoginHistoryItem[]; total: number }> {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "LoginAttempt" WHERE "userId" = $1`,
      [userId]
    );

    const total = parseInt(countResult?.count || '0', 10);

    const attempts = await query<DBLoginAttempt>(
      `SELECT id, "ipAddress", country, city, "userAgent",
              success, "failureReason", "isSuspicious", "riskFlags", "attemptedAt"
       FROM "LoginAttempt" WHERE "userId" = $1
       ORDER BY "attemptedAt" DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const data: LoginHistoryItem[] = (attempts?.rows || []).map((attempt) => ({
      id: attempt.id,
      ipAddress: this.maskIpAddress(attempt.ipAddress),
      country: attempt.country,
      city: attempt.city,
      deviceType: this.parseDeviceTypeFromUserAgent(attempt.userAgent),
      browser: this.parseBrowserFromUserAgent(attempt.userAgent),
      success: attempt.success,
      failureReason: attempt.failureReason,
      isSuspicious: attempt.isSuspicious,
      riskFlags: attempt.riskFlags || [],
      attemptedAt: attempt.attemptedAt.toISOString(),
    }));

    return { data, total };
  }

  /**
   * Get user profile stats
   */
  async getProfileStats(userId: string): Promise<ProfileStats> {
    // Get trade stats
    const tradeStats = await queryOne<{
      total: string;
      won: string;
      lost: string;
      profit: string;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as lost,
        COALESCE(SUM(profit), 0) as profit
       FROM "Trade"
       WHERE "userId" = $1 AND status = 'CLOSED'`,
      [userId]
    );

    // Get referral stats
    const referralStats = await queryOne<{ count: string; earnings: string }>(
      `SELECT
        COUNT(*) as count,
        COALESCE((SELECT "referralEarnings" FROM "User" WHERE id = $1), 0) as earnings
       FROM "User" WHERE "referredBy" = $1`,
      [userId]
    );

    const totalTrades = parseInt(tradeStats?.total || '0', 10);
    const wonTrades = parseInt(tradeStats?.won || '0', 10);

    return {
      totalTrades,
      wonTrades,
      lostTrades: parseInt(tradeStats?.lost || '0', 10),
      winRate: totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0,
      totalProfit: parseFloat(tradeStats?.profit || '0'),
      referralCount: parseInt(referralStats?.count || '0', 10),
      referralEarnings: parseFloat(referralStats?.earnings || '0'),
    };
  }

  /**
   * Mask IP address for privacy (show first and last octet only)
   */
  private maskIpAddress(ip: string): string {
    if (!ip) return 'Unknown';

    // Check if IPv6
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length > 2) {
        return `${parts[0]}:***:${parts[parts.length - 1]}`;
      }
      return ip;
    }

    // IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.***.***.***.${parts[3]}`;
    }

    return ip;
  }

  /**
   * Parse device type from user agent
   */
  private parseDeviceTypeFromUserAgent(userAgent?: string | null): string {
    if (!userAgent) return 'unknown';
    return deviceService.parseDeviceType(userAgent);
  }

  /**
   * Parse browser from user agent
   */
  private parseBrowserFromUserAgent(userAgent?: string | null): string | null {
    if (!userAgent) return null;
    const { browser } = deviceService.parseBrowserInfo(userAgent);
    return browser !== 'unknown' ? browser : null;
  }
}

/**
 * Profile Service Error
 */
export class ProfileServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ProfileServiceError';
  }
}

export const profileService = new ProfileService();
