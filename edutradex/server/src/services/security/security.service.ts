import { query, queryOne } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { deviceService, DeviceInfo } from './device.service.js';
import { ipService, GeoLocation } from './ip.service.js';
import { emailService } from '../email/email.service.js';

/**
 * Security Service
 *
 * Main security orchestration service that handles:
 * - Login attempt tracking
 * - Risk assessment
 * - Account lockout
 * - Security alerts
 * - Multi-account detection
 */

export interface LoginContext {
  email: string;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  deviceInfo?: DeviceInfo;
}

export interface LoginAttemptResult {
  id: string;
  userId?: string;
  success: boolean;
  riskScore: number;
  riskFlags: string[];
  isNewDevice: boolean;
  isNewLocation: boolean;
  requiresVerification: boolean;
  alerts: SecurityAlertInput[];
}

export interface SecurityAlertInput {
  userId: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const LOCKOUT_ESCALATION_FACTOR = 2; // Each subsequent lockout doubles

// Velocity limiting settings (credential stuffing protection)
const MAX_ATTEMPTS_PER_IP_PER_HOUR = 20; // Max login attempts from same IP
const MAX_ATTEMPTS_PER_EMAIL_PER_HOUR = 10; // Max attempts for same email

class SecurityService {
  /**
   * Record a login attempt and assess risk
   */
  async recordLoginAttempt(
    context: LoginContext,
    success: boolean,
    userId?: string,
    failureReason?: string
  ): Promise<LoginAttemptResult> {
    const riskFlags: string[] = [];
    let riskScore = 0;
    const alerts: SecurityAlertInput[] = [];
    let isNewDevice = false;
    let isNewLocation = false;
    let deviceId: string | undefined;

    // Get geolocation
    const location = await ipService.getGeoLocation(context.ipAddress);
    const country = location?.country;
    const city = location?.city;

    // Check IP risk
    const ipRisk = await ipService.calculateIpRisk(context.ipAddress);
    riskScore += ipRisk.riskScore;
    riskFlags.push(...ipRisk.riskFlags);

    // Check if IP is blocked
    if (await ipService.isIpBlocked(context.ipAddress)) {
      riskFlags.push('BLOCKED_IP');
      riskScore += 50;
    }

    // Device fingerprint checks (if provided)
    if (context.deviceFingerprint && userId && success) {
      // Check if device is blocked
      if (await deviceService.isDeviceBlocked(context.deviceFingerprint)) {
        riskFlags.push('BLOCKED_DEVICE');
        riskScore += 50;
      }

      // Check global blocklist
      if (await deviceService.isInBlocklist(context.deviceFingerprint)) {
        riskFlags.push('BLOCKLISTED_DEVICE');
        riskScore += 50;
      }

      // Get or create device record
      const deviceResult = await deviceService.getOrCreateDevice(
        userId,
        context.deviceInfo || {
          fingerprint: context.deviceFingerprint,
          deviceType: deviceService.parseDeviceType(context.userAgent),
          ...deviceService.parseBrowserInfo(context.userAgent),
          ...deviceService.parseOsInfo(context.userAgent),
        },
        context.ipAddress,
        country
      );

      deviceId = deviceResult.device.id;
      isNewDevice = deviceResult.isNew;

      if (isNewDevice) {
        riskFlags.push('NEW_DEVICE');
        riskScore += 15;

        // Create alert for new device
        alerts.push({
          userId,
          alertType: 'NEW_DEVICE',
          severity: 'LOW',
          title: 'New device detected',
          description: `A new ${deviceResult.device.deviceType} device was used to log in from ${city || country || 'unknown location'}.`,
          metadata: {
            deviceId: deviceResult.device.id,
            deviceType: deviceResult.device.deviceType,
            browser: deviceResult.device.browser,
            os: deviceResult.device.os,
            ip: context.ipAddress,
            country,
            city,
          },
        });
      }

      // Check for multi-account by device
      const linkedByDevice = await deviceService.checkMultiAccountByFingerprint(
        context.deviceFingerprint,
        userId
      );

      if (linkedByDevice.length > 0) {
        riskFlags.push('SHARED_DEVICE');
        riskScore += 25;

        // Update risk profile with linked accounts
        await this.updateLinkedAccounts(userId, linkedByDevice, 'device');

        alerts.push({
          userId,
          alertType: 'MULTI_ACCOUNT_DEVICE',
          severity: 'HIGH',
          title: 'Device shared with other accounts',
          description: `This device is also used by ${linkedByDevice.length} other account(s).`,
          metadata: { linkedAccounts: linkedByDevice },
        });
      }
    }

    // Location checks for successful logins
    if (userId && success) {
      // Check for new location
      isNewLocation = await ipService.isNewIpForUser(userId, context.ipAddress);

      if (isNewLocation && country) {
        riskFlags.push('NEW_LOCATION');
        riskScore += 10;

        alerts.push({
          userId,
          alertType: 'NEW_LOCATION',
          severity: 'LOW',
          title: 'Login from new location',
          description: `Login detected from ${city ? city + ', ' : ''}${country}.`,
          metadata: { ip: context.ipAddress, country, city },
        });
      }

      // Check for impossible travel
      if (country) {
        const travelCheck = await ipService.checkImpossibleTravel(
          userId,
          context.ipAddress,
          country
        );

        if (travelCheck.isImpossible) {
          riskFlags.push('IMPOSSIBLE_TRAVEL');
          riskScore += 40;

          alerts.push({
            userId,
            alertType: 'IMPOSSIBLE_TRAVEL',
            severity: 'CRITICAL',
            title: 'Suspicious login location',
            description: `Login from ${country} detected ${travelCheck.timeDiff} minutes after login from ${travelCheck.previousLocation}. This may indicate account compromise.`,
            metadata: {
              currentLocation: country,
              previousLocation: travelCheck.previousLocation,
              timeDiffMinutes: travelCheck.timeDiff,
            },
          });
        }
      }

      // Check for shared IP (multi-account)
      const linkedByIp = await ipService.checkSharedIp(context.ipAddress, userId);
      if (linkedByIp.length > 0) {
        riskFlags.push('SHARED_IP');
        riskScore += 15;

        await this.updateLinkedAccounts(userId, linkedByIp, 'ip');
      }
    }

    // Failed login handling
    if (!success && failureReason === 'INVALID_CREDENTIALS') {
      riskFlags.push('FAILED_LOGIN');
      riskScore += 5;
    }

    // Record the login attempt
    const attempt = await queryOne<{ id: string }>(
      `INSERT INTO "LoginAttempt" (
        id, "userId", email, "ipAddress", country, city, "userAgent",
        "deviceId", "deviceFingerprint", success, "failureReason",
        "riskScore", "riskFlags", "isSuspicious"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id`,
      [
        userId,
        context.email,
        context.ipAddress,
        country,
        city,
        context.userAgent,
        deviceId,
        context.deviceFingerprint,
        success,
        failureReason,
        riskScore,
        riskFlags,
        riskScore >= 50,
      ]
    );

    // Create security alerts
    for (const alert of alerts) {
      await this.createSecurityAlert(alert);
    }

    // Update user risk profile if successful login
    if (userId && success) {
      await this.updateUserRiskProfile(userId, riskScore, riskFlags, context.ipAddress, country);
    }

    logger.debug('Login attempt recorded', {
      email: context.email,
      success,
      riskScore,
      riskFlags,
      isNewDevice,
      isNewLocation,
    });

    return {
      id: attempt!.id,
      userId,
      success,
      riskScore,
      riskFlags,
      isNewDevice,
      isNewLocation,
      requiresVerification: riskScore >= 50,
      alerts,
    };
  }

  /**
   * Check if account should be locked
   */
  async checkAccountLock(email: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
    lockReason?: string;
    failedAttempts: number;
  }> {
    const user = await queryOne<{
      id: string;
      lockedUntil: Date | null;
      lockReason: string | null;
      failedLoginAttempts: number;
    }>(
      `SELECT id, "lockedUntil", "lockReason", "failedLoginAttempts"
       FROM "User" WHERE email = $1`,
      [email]
    );

    if (!user) {
      return { isLocked: false, failedAttempts: 0 };
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return {
        isLocked: true,
        lockedUntil: user.lockedUntil,
        lockReason: user.lockReason || 'Too many failed login attempts',
        failedAttempts: user.failedLoginAttempts,
      };
    }

    return {
      isLocked: false,
      failedAttempts: user.failedLoginAttempts,
    };
  }

  /**
   * Handle failed login - increment counter and potentially lock
   */
  async handleFailedLogin(email: string): Promise<{
    locked: boolean;
    lockedUntil?: Date;
    attemptsRemaining: number;
  }> {
    const user = await queryOne<{
      id: string;
      failedLoginAttempts: number;
      lockedUntil: Date | null;
    }>(
      `UPDATE "User"
       SET "failedLoginAttempts" = "failedLoginAttempts" + 1
       WHERE email = $1
       RETURNING id, "failedLoginAttempts", "lockedUntil"`,
      [email]
    );

    if (!user) {
      return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
    }

    const attempts = user.failedLoginAttempts;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      // Calculate lockout duration with escalation
      const lockoutMinutes =
        LOCKOUT_DURATION_MINUTES *
        Math.pow(LOCKOUT_ESCALATION_FACTOR, Math.floor(attempts / MAX_FAILED_ATTEMPTS) - 1);

      const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

      await query(
        `UPDATE "User"
         SET "lockedUntil" = $1, "lockReason" = $2
         WHERE id = $3`,
        [lockedUntil, 'Too many failed login attempts', user.id]
      );

      // Create security alert
      await this.createSecurityAlert({
        userId: user.id,
        alertType: 'ACCOUNT_LOCKED',
        severity: 'HIGH',
        title: 'Account locked due to failed logins',
        description: `Account locked for ${lockoutMinutes} minutes after ${attempts} failed login attempts.`,
        metadata: { attempts, lockoutMinutes },
      });

      logger.warn('Account locked', { userId: user.id, attempts, lockoutMinutes });

      return {
        locked: true,
        lockedUntil,
        attemptsRemaining: 0,
      };
    }

    return {
      locked: false,
      attemptsRemaining: MAX_FAILED_ATTEMPTS - attempts,
    };
  }

  /**
   * Reset failed login counter on successful login
   */
  async handleSuccessfulLogin(userId: string): Promise<void> {
    await query(
      `UPDATE "User"
       SET "failedLoginAttempts" = 0, "lockedUntil" = NULL, "lockReason" = NULL
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Create a security alert
   */
  async createSecurityAlert(alert: SecurityAlertInput): Promise<string> {
    const result = await queryOne<{ id: string }>(
      `INSERT INTO "SecurityAlert" (
        id, "userId", "alertType", severity, title, description, metadata
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6
      ) RETURNING id`,
      [
        alert.userId,
        alert.alertType,
        alert.severity,
        alert.title,
        alert.description,
        alert.metadata ? JSON.stringify(alert.metadata) : null,
      ]
    );

    // Send email notification for high/critical alerts
    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      const user = await queryOne<{ email: string; name: string }>(
        `SELECT email, name FROM "User" WHERE id = $1`,
        [alert.userId]
      );

      if (user) {
        try {
          await emailService.sendSecurityAlert(user.email, user.name, alert.title, alert.description);

          await query(
            `UPDATE "SecurityAlert"
             SET "userNotified" = true, "notifiedAt" = NOW()
             WHERE id = $1`,
            [result!.id]
          );
        } catch (error) {
          logger.error('Failed to send security alert email', { alertId: result!.id, error });
        }
      }
    }

    return result!.id;
  }

  /**
   * Update or create user risk profile
   */
  async updateUserRiskProfile(
    userId: string,
    loginRiskScore: number,
    loginRiskFlags: string[],
    ipAddress: string,
    country?: string
  ): Promise<void> {
    const existing = await queryOne<{
      id: string;
      riskScore: number;
      riskFlags: string[];
      knownCountries: string[];
      knownIps: string[];
      dailyLoginCount: number;
      lastVelocityReset: Date;
    }>(
      `SELECT id, "riskScore", "riskFlags", "knownCountries", "knownIps",
              "dailyLoginCount", "lastVelocityReset"
       FROM "UserRiskProfile" WHERE "userId" = $1`,
      [userId]
    );

    if (existing) {
      // Reset daily counts if needed
      const lastReset = new Date(existing.lastVelocityReset);
      const shouldReset =
        new Date().toDateString() !== lastReset.toDateString();

      const newKnownCountries = country
        ? [...new Set([...existing.knownCountries, country])]
        : existing.knownCountries;

      const newKnownIps = [...new Set([...existing.knownIps, ipAddress])].slice(-50);

      // Calculate new risk score (weighted average)
      const newRiskScore = Math.round(existing.riskScore * 0.7 + loginRiskScore * 0.3);

      // Merge risk flags
      const newRiskFlags = [...new Set([...existing.riskFlags, ...loginRiskFlags])];

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(newRiskScore);

      await query(
        `UPDATE "UserRiskProfile"
         SET "riskScore" = $1, "riskLevel" = $2, "riskFlags" = $3,
             "knownCountries" = $4, "knownIps" = $5, "lastKnownLocation" = $6,
             "dailyLoginCount" = $7, "lastVelocityReset" = $8,
             "lastAssessedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $9`,
        [
          newRiskScore,
          riskLevel,
          newRiskFlags,
          newKnownCountries,
          newKnownIps,
          country,
          shouldReset ? 1 : existing.dailyLoginCount + 1,
          shouldReset ? new Date() : existing.lastVelocityReset,
          existing.id,
        ]
      );
    } else {
      // Create new risk profile
      const riskLevel = this.calculateRiskLevel(loginRiskScore);

      await query(
        `INSERT INTO "UserRiskProfile" (
          id, "userId", "riskScore", "riskLevel", "riskFlags",
          "knownCountries", "knownIps", "lastKnownLocation", "dailyLoginCount",
          "createdAt", "updatedAt", "lastAssessedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW(), NOW()
        )`,
        [
          userId,
          loginRiskScore,
          riskLevel,
          loginRiskFlags,
          country ? [country] : [],
          [ipAddress],
          country,
        ]
      );
    }
  }

  /**
   * Update linked accounts in risk profile
   */
  private async updateLinkedAccounts(
    userId: string,
    linkedUserIds: string[],
    linkType: 'device' | 'ip'
  ): Promise<void> {
    const field = linkType === 'device' ? 'sharedDevices' : 'sharedIps';

    await query(
      `UPDATE "UserRiskProfile"
       SET "${field}" = array_cat("${field}", $1::text[])
       WHERE "userId" = $2`,
      [linkedUserIds, userId]
    );

    // Also update linked accounts array
    await query(
      `UPDATE "UserRiskProfile"
       SET "linkedAccounts" = (
         SELECT array_agg(DISTINCT x)
         FROM unnest(array_cat("linkedAccounts", $1::text[])) x
       )
       WHERE "userId" = $2`,
      [linkedUserIds, userId]
    );
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): string {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Check velocity limits (credential stuffing protection)
   */
  async checkVelocityLimits(
    email: string,
    ipAddress: string
  ): Promise<{
    blocked: boolean;
    reason?: string;
    retryAfterMinutes?: number;
  }> {
    // Check attempts from this IP in the last hour
    const ipAttempts = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "LoginAttempt"
       WHERE "ipAddress" = $1 AND "attemptedAt" > NOW() - INTERVAL '1 hour'`,
      [ipAddress]
    );

    const ipCount = parseInt(ipAttempts?.count || '0');
    if (ipCount >= MAX_ATTEMPTS_PER_IP_PER_HOUR) {
      logger.warn('Velocity limit exceeded for IP', { ipAddress, attempts: ipCount });
      return {
        blocked: true,
        reason: 'Too many login attempts from this location. Please try again later.',
        retryAfterMinutes: 60,
      };
    }

    // Check attempts for this email in the last hour
    const emailAttempts = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "LoginAttempt"
       WHERE email = $1 AND "attemptedAt" > NOW() - INTERVAL '1 hour'`,
      [email]
    );

    const emailCount = parseInt(emailAttempts?.count || '0');
    if (emailCount >= MAX_ATTEMPTS_PER_EMAIL_PER_HOUR) {
      logger.warn('Velocity limit exceeded for email', { email, attempts: emailCount });
      return {
        blocked: true,
        reason: 'Too many login attempts for this account. Please try again later.',
        retryAfterMinutes: 60,
      };
    }

    return { blocked: false };
  }

  /**
   * Check for distributed attack patterns
   * (Many failed logins from different IPs for same account)
   */
  async checkDistributedAttack(email: string): Promise<{
    isUnderAttack: boolean;
    uniqueIps?: number;
  }> {
    const result = await queryOne<{ unique_ips: string; total_attempts: string }>(
      `SELECT
         COUNT(DISTINCT "ipAddress") as unique_ips,
         COUNT(*) as total_attempts
       FROM "LoginAttempt"
       WHERE email = $1
         AND success = false
         AND "attemptedAt" > NOW() - INTERVAL '1 hour'`,
      [email]
    );

    const uniqueIps = parseInt(result?.unique_ips || '0');
    const totalAttempts = parseInt(result?.total_attempts || '0');

    // If we see failed attempts from 5+ different IPs in an hour, it's suspicious
    if (uniqueIps >= 5 && totalAttempts >= 10) {
      logger.warn('Possible distributed attack detected', { email, uniqueIps, totalAttempts });
      return {
        isUnderAttack: true,
        uniqueIps,
      };
    }

    return { isUnderAttack: false };
  }

  /**
   * Get user's security status
   */
  async getUserSecurityStatus(userId: string): Promise<{
    riskLevel: string;
    riskScore: number;
    riskFlags: string[];
    devicesCount: number;
    trustedDevicesCount: number;
    recentAlerts: number;
    isLocked: boolean;
  }> {
    const profile = await queryOne<{
      riskLevel: string;
      riskScore: number;
      riskFlags: string[];
    }>(
      `SELECT "riskLevel", "riskScore", "riskFlags"
       FROM "UserRiskProfile" WHERE "userId" = $1`,
      [userId]
    );

    const deviceCounts = await queryOne<{
      total: string;
      trusted: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE "isTrusted" = true) as trusted
       FROM "UserDevice" WHERE "userId" = $1`,
      [userId]
    );

    const alertCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "SecurityAlert"
       WHERE "userId" = $1 AND status = 'OPEN' AND "createdAt" > NOW() - INTERVAL '7 days'`,
      [userId]
    );

    const user = await queryOne<{ lockedUntil: Date | null }>(
      `SELECT "lockedUntil" FROM "User" WHERE id = $1`,
      [userId]
    );

    return {
      riskLevel: profile?.riskLevel || 'LOW',
      riskScore: profile?.riskScore || 0,
      riskFlags: profile?.riskFlags || [],
      devicesCount: parseInt(deviceCounts?.total || '0'),
      trustedDevicesCount: parseInt(deviceCounts?.trusted || '0'),
      recentAlerts: parseInt(alertCount?.count || '0'),
      isLocked: !!(user?.lockedUntil && new Date(user.lockedUntil) > new Date()),
    };
  }
}

export const securityService = new SecurityService();
