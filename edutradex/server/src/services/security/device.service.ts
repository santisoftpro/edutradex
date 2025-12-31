import { createHash } from 'crypto';
import { query, queryOne } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

/**
 * Device Fingerprinting Service
 *
 * Handles device tracking, fingerprint validation, and multi-account detection.
 * Uses server-side fingerprint validation combined with client-provided data.
 */

export interface DeviceInfo {
  fingerprint: string;
  deviceType: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  fingerprint: string;
  fingerprintHash: string;
  deviceType: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  isTrusted: boolean;
  trustScore: number;
  trustedAt?: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastIp?: string;
  lastCountry?: string;
  loginCount: number;
  isBlocked: boolean;
  blockReason?: string;
}

class DeviceService {
  /**
   * Hash a fingerprint for storage and comparison
   */
  hashFingerprint(fingerprint: string): string {
    return createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Parse device type from user agent
   */
  parseDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Parse browser info from user agent
   */
  parseBrowserInfo(userAgent?: string): { browser: string; version: string } {
    if (!userAgent) return { browser: 'unknown', version: '' };

    const ua = userAgent;

    // Check for common browsers
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      const match = ua.match(/Chrome\/(\d+)/);
      return { browser: 'Chrome', version: match?.[1] || '' };
    }
    if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)/);
      return { browser: 'Firefox', version: match?.[1] || '' };
    }
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/);
      return { browser: 'Safari', version: match?.[1] || '' };
    }
    if (ua.includes('Edg')) {
      const match = ua.match(/Edg\/(\d+)/);
      return { browser: 'Edge', version: match?.[1] || '' };
    }

    return { browser: 'other', version: '' };
  }

  /**
   * Parse OS info from user agent
   */
  parseOsInfo(userAgent?: string): { os: string; version: string } {
    if (!userAgent) return { os: 'unknown', version: '' };

    const ua = userAgent;

    if (ua.includes('Windows NT 10')) return { os: 'Windows', version: '10' };
    if (ua.includes('Windows NT 11')) return { os: 'Windows', version: '11' };
    if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      return { os: 'macOS', version: match?.[1]?.replace('_', '.') || '' };
    }
    if (ua.includes('Android')) {
      const match = ua.match(/Android (\d+)/);
      return { os: 'Android', version: match?.[1] || '' };
    }
    if (ua.includes('iPhone') || ua.includes('iPad')) {
      const match = ua.match(/OS (\d+)/);
      return { os: 'iOS', version: match?.[1] || '' };
    }
    if (ua.includes('Linux')) return { os: 'Linux', version: '' };

    return { os: 'other', version: '' };
  }

  /**
   * Get or create a device record for a user
   */
  async getOrCreateDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    country?: string
  ): Promise<{ device: UserDevice; isNew: boolean }> {
    const fingerprintHash = this.hashFingerprint(deviceInfo.fingerprint);

    // Check if device exists
    const existingDevice = await queryOne<UserDevice>(
      `SELECT * FROM "UserDevice" WHERE "userId" = $1 AND "fingerprintHash" = $2`,
      [userId, fingerprintHash]
    );

    if (existingDevice) {
      // Update last seen
      await query(
        `UPDATE "UserDevice"
         SET "lastSeenAt" = NOW(), "lastIp" = $1, "lastCountry" = $2, "loginCount" = "loginCount" + 1
         WHERE id = $3`,
        [ipAddress, country, existingDevice.id]
      );

      return {
        device: { ...existingDevice, loginCount: existingDevice.loginCount + 1 },
        isNew: false,
      };
    }

    // Create new device
    const newDevice = await queryOne<UserDevice>(
      `INSERT INTO "UserDevice" (
        id, "userId", fingerprint, "fingerprintHash", "deviceType",
        browser, "browserVersion", os, "osVersion", "screenResolution",
        timezone, language, "lastIp", "lastCountry"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        userId,
        deviceInfo.fingerprint,
        fingerprintHash,
        deviceInfo.deviceType,
        deviceInfo.browser,
        deviceInfo.browserVersion,
        deviceInfo.os,
        deviceInfo.osVersion,
        deviceInfo.screenResolution,
        deviceInfo.timezone,
        deviceInfo.language,
        ipAddress,
        country,
      ]
    );

    logger.info('New device registered', { userId, deviceType: deviceInfo.deviceType });

    return { device: newDevice!, isNew: true };
  }

  /**
   * Check if fingerprint is used by another user (multi-account detection)
   */
  async checkMultiAccountByFingerprint(
    fingerprint: string,
    excludeUserId?: string
  ): Promise<string[]> {
    const fingerprintHash = this.hashFingerprint(fingerprint);

    const query_text = excludeUserId
      ? `SELECT DISTINCT "userId" FROM "UserDevice" WHERE "fingerprintHash" = $1 AND "userId" != $2`
      : `SELECT DISTINCT "userId" FROM "UserDevice" WHERE "fingerprintHash" = $1`;

    const params = excludeUserId ? [fingerprintHash, excludeUserId] : [fingerprintHash];
    const result = await query(query_text, params);

    return result?.rows?.map((row: { userId: string }) => row.userId) || [];
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    const result = await query(
      `SELECT * FROM "UserDevice" WHERE "userId" = $1 ORDER BY "lastSeenAt" DESC`,
      [userId]
    );
    return result?.rows || [];
  }

  /**
   * Trust a device
   */
  async trustDevice(deviceId: string, trustedBy: string): Promise<void> {
    await query(
      `UPDATE "UserDevice"
       SET "isTrusted" = true, "trustedAt" = NOW(), "trustedBy" = $1, "trustScore" = 100
       WHERE id = $2`,
      [trustedBy, deviceId]
    );

    logger.info('Device trusted', { deviceId, trustedBy });
  }

  /**
   * Block a device
   */
  async blockDevice(deviceId: string, reason: string): Promise<void> {
    await query(
      `UPDATE "UserDevice"
       SET "isBlocked" = true, "blockReason" = $1, "blockedAt" = NOW(), "trustScore" = 0
       WHERE id = $2`,
      [reason, deviceId]
    );

    logger.warn('Device blocked', { deviceId, reason });
  }

  /**
   * Unblock a device
   */
  async unblockDevice(deviceId: string): Promise<void> {
    await query(
      `UPDATE "UserDevice"
       SET "isBlocked" = false, "blockReason" = NULL, "blockedAt" = NULL, "trustScore" = 50
       WHERE id = $1`,
      [deviceId]
    );

    logger.info('Device unblocked', { deviceId });
  }

  /**
   * Check if a device is blocked
   */
  async isDeviceBlocked(fingerprint: string): Promise<boolean> {
    const fingerprintHash = this.hashFingerprint(fingerprint);

    const result = await queryOne<{ isBlocked: boolean }>(
      `SELECT "isBlocked" FROM "UserDevice" WHERE "fingerprintHash" = $1 AND "isBlocked" = true LIMIT 1`,
      [fingerprintHash]
    );

    return !!result;
  }

  /**
   * Check if fingerprint is in global blocklist
   */
  async isInBlocklist(fingerprint: string): Promise<boolean> {
    const fingerprintHash = this.hashFingerprint(fingerprint);

    const result = await queryOne<{ id: string }>(
      `SELECT id FROM "SecurityBlocklist"
       WHERE type = 'FINGERPRINT' AND ("value" = $1 OR "valueHash" = $2)
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
       LIMIT 1`,
      [fingerprint, fingerprintHash]
    );

    if (result) {
      // Update blocked attempts count
      await query(
        `UPDATE "SecurityBlocklist"
         SET "blockedAttempts" = "blockedAttempts" + 1, "lastBlockedAt" = NOW()
         WHERE type = 'FINGERPRINT' AND ("value" = $1 OR "valueHash" = $2)`,
        [fingerprint, fingerprintHash]
      );
    }

    return !!result;
  }

  /**
   * Add fingerprint to blocklist
   */
  async addToBlocklist(
    fingerprint: string,
    reason: string,
    addedBy: string,
    permanent: boolean = false
  ): Promise<void> {
    const fingerprintHash = this.hashFingerprint(fingerprint);
    const expiresAt = permanent ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO "SecurityBlocklist" (id, type, value, "valueHash", reason, severity, "addedBy", "expiresAt")
       VALUES (gen_random_uuid(), 'FINGERPRINT', $1, $2, $3, $4, $5, $6)
       ON CONFLICT (type, value) DO UPDATE SET reason = $3, "addedBy" = $5, "expiresAt" = $6`,
      [fingerprint, fingerprintHash, reason, permanent ? 'PERMANENT' : 'TEMPORARY', addedBy, expiresAt]
    );

    logger.warn('Fingerprint added to blocklist', { fingerprintHash, reason, permanent });
  }

  /**
   * Calculate device trust score based on various factors
   */
  calculateTrustScore(device: UserDevice, daysSinceFirstSeen: number): number {
    let score = 50; // Base score

    // Age bonus (max +20)
    score += Math.min(daysSinceFirstSeen * 2, 20);

    // Login frequency bonus (max +15)
    score += Math.min(device.loginCount, 15);

    // Already trusted = max score
    if (device.isTrusted) {
      score = 100;
    }

    // Blocked = 0
    if (device.isBlocked) {
      score = 0;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Remove old devices that haven't been used in X days
   */
  async cleanupOldDevices(daysInactive: number = 90): Promise<number> {
    // Validate input to prevent SQL injection (only allow positive integers)
    const safeDays = Math.max(1, Math.floor(Math.abs(daysInactive)));

    const result = await query(
      `DELETE FROM "UserDevice"
       WHERE "lastSeenAt" < NOW() - INTERVAL '1 day' * $1
       AND "isTrusted" = false`,
      [safeDays]
    );

    const deleted = result?.rowCount || 0;
    if (deleted > 0) {
      logger.info('Cleaned up old devices', { deleted, daysInactive: safeDays });
    }

    return deleted;
  }
}

export const deviceService = new DeviceService();
