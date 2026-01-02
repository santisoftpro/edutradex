import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { query, queryOne } from '../../config/db.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { RegisterInput, LoginInput } from '../../validators/auth.validators.js';
import { referralService } from '../referral/referral.service.js';
import { emailService } from '../email/email.service.js';
import { auditService } from '../audit/audit.service.js';
import { tokenBlacklistService } from './token-blacklist.service.js';
import { twoFactorService } from './two-factor.service.js';
import { securityService, LoginContext } from '../security/security.service.js';
import { ipService } from '../security/ip.service.js';
import { deviceService, DeviceInfo } from '../security/device.service.js';
import { randomUUID } from 'crypto';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  isImpersonation?: boolean;
  impersonatedBy?: string;
}

interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
  liveBalance: number;
  demoBalance: number;           // NOTE: This is actually the REAL money balance (legacy naming)
  practiceBalance: number;        // Demo/practice balance for risk-free trading
  activeAccountType: 'LIVE' | 'DEMO';  // 'LIVE' uses demoBalance, 'DEMO' uses practiceBalance
  emailVerified: boolean;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface AuthResult {
  user: UserPublic;
  token: string;
}

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  liveBalance: number;
  demoBalance: number;
  practiceBalance: number;
  activeAccountType: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
}

// 2FA pending response - returned when 2FA is required
interface TwoFactorPendingResult {
  requires2FA: true;
  tempToken: string;
  userId: string;
}

// Temp token payload for 2FA verification
interface TempTokenPayload {
  userId: string;
  email: string;
  role: string;
  purpose: '2fa-verify';
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

// Combined login result type
type LoginResult =
  | (AuthResult & { securityInfo?: { isNewDevice: boolean; isNewLocation: boolean; requiresVerification: boolean } })
  | TwoFactorPendingResult;

class AuthServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export class AuthService {
  // 10 rounds is a good balance between security and performance (~100ms vs ~300ms for 12)
  // OWASP recommends minimum 10 rounds for bcrypt
  private readonly SALT_ROUNDS = 10;

  async register(
    data: RegisterInput,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string
  ): Promise<AuthResult> {
    // Check if email exists
    const existingUser = await queryOne<{ id: string }>(
      'SELECT id FROM "User" WHERE email = $1',
      [data.email]
    );

    if (existingUser) {
      throw new AuthServiceError('Email already registered', 409);
    }

    // Check if device fingerprint is blocked
    if (deviceFingerprint) {
      const isBlocked = await deviceService.isInBlocklist(deviceFingerprint);
      if (isBlocked) {
        logger.warn('Registration blocked - device in blocklist', { email: data.email, deviceFingerprint });
        throw new AuthServiceError('Registration not allowed from this device', 403);
      }
    }

    // Check if IP is blocked
    if (ipAddress) {
      const isIpBlocked = await ipService.isIpBlocked(ipAddress);
      if (isIpBlocked) {
        logger.warn('Registration blocked - IP in blocklist', { email: data.email, ipAddress });
        throw new AuthServiceError('Registration not allowed from this location', 403);
      }
    }

    // Get geolocation for registration
    let registrationCountry: string | undefined;
    if (ipAddress) {
      const geoLocation = await ipService.getGeoLocation(ipAddress);
      registrationCountry = geoLocation?.country;
    }

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);
    const userId = randomUUID();
    const referralCode = referralService.generateReferralCode('temp', data.name);
    const now = new Date();

    // Insert new user with registration tracking data
    const user = await queryOne<UserRow>(
      `INSERT INTO "User" (
        id, email, password, name, role, "liveBalance", "demoBalance",
        "activeAccountType", "isActive", "emailVerified", "referralCode",
        "registrationIp", "registrationCountry", "registrationUserAgent",
        "lastKnownCountry", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id, email, name, role, "liveBalance", "demoBalance", "practiceBalance", "activeAccountType", "emailVerified"`,
      [
        userId,
        data.email,
        hashedPassword,
        data.name,
        'USER',
        0,
        config.trading.defaultDemoBalance,
        'LIVE',
        true,
        false,
        referralCode,
        ipAddress,
        registrationCountry,
        userAgent,
        registrationCountry,
        now,
        now
      ]
    );

    if (!user) {
      throw new AuthServiceError('Failed to create user', 500);
    }

    // Check for multi-account by device fingerprint
    if (deviceFingerprint) {
      const linkedAccounts = await deviceService.checkMultiAccountByFingerprint(
        deviceFingerprint,
        userId
      );

      if (linkedAccounts.length > 0) {
        logger.warn('Multi-account detected during registration', {
          userId,
          linkedAccounts,
          deviceFingerprint,
        });

        // Create security alert for multi-account
        await securityService.createSecurityAlert({
          userId,
          alertType: 'MULTI_ACCOUNT_REGISTRATION',
          severity: 'HIGH',
          title: 'New account from shared device',
          description: `Registration detected from a device linked to ${linkedAccounts.length} other account(s).`,
          metadata: { linkedAccounts, deviceFingerprint, ipAddress },
        });
      }

      // Register the device for this user
      const deviceInfo: DeviceInfo = {
        fingerprint: deviceFingerprint,
        deviceType: deviceService.parseDeviceType(userAgent),
        ...deviceService.parseBrowserInfo(userAgent),
        ...deviceService.parseOsInfo(userAgent),
      };

      await deviceService.getOrCreateDevice(
        userId,
        deviceInfo,
        ipAddress || 'unknown',
        registrationCountry
      );
    }

    // Check for multi-account by IP
    if (ipAddress) {
      const linkedByIp = await ipService.checkSharedIp(ipAddress, userId);
      if (linkedByIp.length > 0) {
        logger.warn('Multi-account by IP detected during registration', {
          userId,
          linkedAccounts: linkedByIp,
          ipAddress,
        });

        await securityService.createSecurityAlert({
          userId,
          alertType: 'MULTI_ACCOUNT_IP',
          severity: 'MEDIUM',
          title: 'New account from shared IP',
          description: `Registration detected from an IP address linked to ${linkedByIp.length} other account(s).`,
          metadata: { linkedAccounts: linkedByIp, ipAddress },
        });
      }
    }

    // Process referral if provided
    if (data.referralCode) {
      try {
        await referralService.linkReferral(user.id, data.referralCode);
        logger.info('Referral linked for new user', { userId: user.id, referralCode: data.referralCode });
      } catch (error) {
        logger.error('Failed to link referral', { userId: user.id, referralCode: data.referralCode, error });
      }
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: ipAddress,
      country: registrationCountry,
    });

    // Send welcome email
    emailService.sendWelcomeEmail(user.email, user.name)
      .catch(err => logger.error('Failed to send welcome email', { userId: user.id, error: err }));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        liveBalance: Number(user.liveBalance),
        demoBalance: Number(user.demoBalance),
        practiceBalance: Number(user.practiceBalance),
        activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: user.emailVerified,
        kycStatus: 'NOT_SUBMITTED' as const,
      },
      token,
    };
  }

  async login(
    data: LoginInput,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string
  ): Promise<LoginResult> {
    const loginContext: LoginContext = {
      email: data.email,
      ipAddress: ipAddress || 'unknown',
      userAgent,
      deviceFingerprint,
    };

    // Check velocity limits (credential stuffing protection)
    const velocityCheck = await securityService.checkVelocityLimits(
      data.email,
      ipAddress || 'unknown'
    );
    if (velocityCheck.blocked) {
      await securityService.recordLoginAttempt(loginContext, false, undefined, 'VELOCITY_LIMIT');
      throw new AuthServiceError(velocityCheck.reason || 'Too many attempts', 429);
    }

    // Check if account is locked
    const lockStatus = await securityService.checkAccountLock(data.email);
    if (lockStatus.isLocked) {
      const minutesRemaining = lockStatus.lockedUntil
        ? Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / 60000)
        : 0;

      // Record failed attempt due to lock
      await securityService.recordLoginAttempt(loginContext, false, undefined, 'ACCOUNT_LOCKED');

      throw new AuthServiceError(
        `Account is locked. Try again in ${minutesRemaining} minutes.`,
        423 // Locked status code
      );
    }

    // Check if IP is blocked
    if (ipAddress && await ipService.isIpBlocked(ipAddress)) {
      await securityService.recordLoginAttempt(loginContext, false, undefined, 'IP_BLOCKED');
      throw new AuthServiceError('Access denied from this location', 403);
    }

    // Check if device is blocked
    if (deviceFingerprint && await deviceService.isInBlocklist(deviceFingerprint)) {
      await securityService.recordLoginAttempt(loginContext, false, undefined, 'DEVICE_BLOCKED');
      throw new AuthServiceError('Access denied from this device', 403);
    }

    const user = await queryOne<UserRow & { kycStatus: string | null }>(
      `SELECT u.id, u.email, u.password, u.name, u.role, u."liveBalance", u."demoBalance", u."practiceBalance",
              u."activeAccountType", u."isActive", u."emailVerified", u."twoFactorEnabled",
              k.status as "kycStatus"
       FROM "User" u
       LEFT JOIN "KYC" k ON k."userId" = u.id
       WHERE u.email = $1`,
      [data.email]
    );

    if (!user) {
      // Record failed attempt for non-existent user
      await securityService.recordLoginAttempt(loginContext, false, undefined, 'USER_NOT_FOUND');
      throw new AuthServiceError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      await securityService.recordLoginAttempt(loginContext, false, user.id, 'ACCOUNT_DEACTIVATED');
      throw new AuthServiceError('Account is deactivated', 403);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      // Handle failed login - increment counter, potentially lock
      const failResult = await securityService.handleFailedLogin(data.email);

      // Record failed attempt
      await securityService.recordLoginAttempt(loginContext, false, user.id, 'INVALID_CREDENTIALS');

      if (failResult.locked) {
        const minutesRemaining = failResult.lockedUntil
          ? Math.ceil((failResult.lockedUntil.getTime() - Date.now()) / 60000)
          : 0;
        throw new AuthServiceError(
          `Too many failed attempts. Account locked for ${minutesRemaining} minutes.`,
          423
        );
      }

      throw new AuthServiceError(
        `Invalid email or password. ${failResult.attemptsRemaining} attempts remaining.`,
        401
      );
    }

    // Check if 2FA is enabled - return temp token for 2FA verification
    if (user.twoFactorEnabled) {
      // Also check if admin requires 2FA setup (configurable)
      const tempToken = this.generateTempToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        purpose: '2fa-verify',
        ipAddress,
        userAgent,
        deviceFingerprint,
      });

      logger.info('2FA required for login', { userId: user.id, email: user.email });

      return {
        requires2FA: true,
        tempToken,
        userId: user.id,
      };
    }

    // Update login context with device info for successful login
    if (deviceFingerprint) {
      loginContext.deviceInfo = {
        fingerprint: deviceFingerprint,
        deviceType: deviceService.parseDeviceType(userAgent),
        ...deviceService.parseBrowserInfo(userAgent),
        ...deviceService.parseOsInfo(userAgent),
      };
    }

    // Record successful login attempt and get security assessment
    const loginResult = await securityService.recordLoginAttempt(
      loginContext,
      true,
      user.id
    );

    // Reset failed login counter
    await securityService.handleSuccessfulLogin(user.id);

    // Update last known country
    if (ipAddress) {
      const geoLocation = await ipService.getGeoLocation(ipAddress);
      if (geoLocation?.country) {
        await query(
          `UPDATE "User" SET "lastKnownCountry" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [geoLocation.country, user.id]
        );
      }
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      ip: ipAddress,
      riskScore: loginResult.riskScore,
      isNewDevice: loginResult.isNewDevice,
      isNewLocation: loginResult.isNewLocation,
    });

    // Log admin login and create session
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      await auditService.logLogin(user.id, ipAddress, userAgent);

      // Calculate token expiry based on role
      const expiresAt = this.getTokenExpiry(user.role);
      await auditService.createSession(user.id, token, expiresAt, ipAddress, userAgent);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        liveBalance: Number(user.liveBalance),
        demoBalance: Number(user.demoBalance),
        practiceBalance: Number(user.practiceBalance),
        activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: user.emailVerified,
        kycStatus: (user.kycStatus as UserPublic['kycStatus']) || 'NOT_SUBMITTED',
      },
      token,
      securityInfo: {
        isNewDevice: loginResult.isNewDevice,
        isNewLocation: loginResult.isNewLocation,
        requiresVerification: loginResult.requiresVerification,
      },
    };
  }

  async getUserById(userId: string): Promise<UserPublic | null> {
    const user = await queryOne<UserRow & { kycStatus: string | null }>(
      `SELECT u.id, u.email, u.name, u.role, u."liveBalance", u."demoBalance", u."practiceBalance",
              u."activeAccountType", u."isActive", u."emailVerified",
              k.status as "kycStatus"
       FROM "User" u
       LEFT JOIN "KYC" k ON k."userId" = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      liveBalance: Number(user.liveBalance),
      demoBalance: Number(user.demoBalance),
      practiceBalance: Number(user.practiceBalance),
      activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
      emailVerified: user.emailVerified,
      kycStatus: (user.kycStatus as UserPublic['kycStatus']) || 'NOT_SUBMITTED',
    };
  }

  async resetBalance(userId: string, newBalance?: number): Promise<{ demoBalance: number }> {
    const balance = newBalance ?? config.trading.defaultDemoBalance;

    const result = await queryOne<{ demoBalance: number }>(
      `UPDATE "User" SET "demoBalance" = $1, "updatedAt" = $2
       WHERE id = $3 RETURNING "demoBalance"`,
      [balance, new Date(), userId]
    );

    if (!result) {
      throw new AuthServiceError('User not found', 404);
    }

    logger.info('User balance reset', { userId, newBalance: balance });

    return {
      demoBalance: Number(result.demoBalance),
    };
  }

  async updateBalance(userId: string, amount: number): Promise<{ demoBalance: number }> {
    const result = await queryOne<{ demoBalance: number }>(
      `UPDATE "User" SET "demoBalance" = "demoBalance" + $1, "updatedAt" = $2
       WHERE id = $3 RETURNING "demoBalance"`,
      [amount, new Date(), userId]
    );

    if (!result) {
      throw new AuthServiceError('User not found', 404);
    }

    return {
      demoBalance: Number(result.demoBalance),
    };
  }

  async topUpDemoBalance(userId: string, amount: number): Promise<{ demoBalance: number }> {
    if (amount <= 0 || amount > 100000) {
      throw new AuthServiceError('Invalid top-up amount. Must be between 1 and 100,000', 400);
    }

    const result = await queryOne<{ demoBalance: number }>(
      `UPDATE "User" SET "demoBalance" = "demoBalance" + $1, "updatedAt" = $2
       WHERE id = $3 RETURNING "demoBalance"`,
      [amount, new Date(), userId]
    );

    if (!result) {
      throw new AuthServiceError('User not found', 404);
    }

    logger.info('Demo balance topped up', { userId, amount, newBalance: Number(result.demoBalance) });

    return {
      demoBalance: Number(result.demoBalance),
    };
  }

  /**
   * Top up practice balance for demo trading
   * Users can reset their practice balance anytime
   */
  async topUpPracticeBalance(userId: string, amount?: number): Promise<{ practiceBalance: number }> {
    // Default to 10000 if no amount specified (full reset)
    const topUpAmount = amount ?? 10000;

    if (topUpAmount <= 0 || topUpAmount > 100000) {
      throw new AuthServiceError('Invalid top-up amount. Must be between 1 and 100,000', 400);
    }

    const result = await queryOne<{ practiceBalance: number }>(
      `UPDATE "User" SET "practiceBalance" = $1, "updatedAt" = $2
       WHERE id = $3 RETURNING "practiceBalance"`,
      [topUpAmount, new Date(), userId]
    );

    if (!result) {
      throw new AuthServiceError('User not found', 404);
    }

    logger.info('Practice balance topped up', { userId, amount: topUpAmount, newBalance: Number(result.practiceBalance) });

    return {
      practiceBalance: Number(result.practiceBalance),
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      return decoded;
    } catch {
      throw new AuthServiceError('Invalid or expired token', 401);
    }
  }

  private generateToken(payload: JwtPayload): string {
    // SUPERADMIN gets shorter session (1 hour) for enhanced security
    // Regular ADMIN and USER get standard expiry (7 days)
    const expiresIn = payload.role === 'SUPERADMIN' ? '1h' : config.jwt.expiresIn;

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresIn as StringValue,
    });
  }

  /**
   * Get token expiry date based on role
   */
  getTokenExpiry(role: string): Date {
    const now = Date.now();
    if (role === 'SUPERADMIN') {
      return new Date(now + 60 * 60 * 1000); // 1 hour
    }
    return new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  /**
   * Generate a short-lived temp token for 2FA verification
   */
  private generateTempToken(payload: TempTokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: '5m', // 5 minutes to complete 2FA
    });
  }

  /**
   * Verify temp token for 2FA
   */
  verifyTempToken(token: string): TempTokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TempTokenPayload;
      if (decoded.purpose !== '2fa-verify') {
        throw new AuthServiceError('Invalid token purpose', 401);
      }
      return decoded;
    } catch (error) {
      if (error instanceof AuthServiceError) throw error;
      throw new AuthServiceError('Invalid or expired temporary token', 401);
    }
  }

  /**
   * Verify 2FA and complete login
   */
  async verify2FA(
    tempToken: string,
    code?: string,
    backupCode?: string
  ): Promise<AuthResult & { securityInfo?: { isNewDevice: boolean; isNewLocation: boolean; requiresVerification: boolean } }> {
    // Verify temp token
    const payload = this.verifyTempToken(tempToken);

    // Verify 2FA code or backup code
    let isValid = false;

    if (code) {
      isValid = await twoFactorService.verifyLoginToken(payload.userId, code);
    } else if (backupCode) {
      isValid = await twoFactorService.verifyBackupCode(payload.userId, backupCode);
    }

    if (!isValid) {
      throw new AuthServiceError('Invalid verification code', 401);
    }

    // Get user data for the final auth response
    const user = await queryOne<UserRow & { kycStatus: string | null }>(
      `SELECT u.id, u.email, u.name, u.role, u."liveBalance", u."demoBalance", u."practiceBalance",
              u."activeAccountType", u."isActive", u."emailVerified",
              k.status as "kycStatus"
       FROM "User" u
       LEFT JOIN "KYC" k ON k."userId" = u.id
       WHERE u.id = $1`,
      [payload.userId]
    );

    if (!user || !user.isActive) {
      throw new AuthServiceError('User not found or inactive', 401);
    }

    // Create login context for security tracking
    const loginContext: LoginContext = {
      email: user.email,
      ipAddress: payload.ipAddress || 'unknown',
      userAgent: payload.userAgent,
      deviceFingerprint: payload.deviceFingerprint,
    };

    // Update login context with device info
    if (payload.deviceFingerprint) {
      loginContext.deviceInfo = {
        fingerprint: payload.deviceFingerprint,
        deviceType: deviceService.parseDeviceType(payload.userAgent),
        ...deviceService.parseBrowserInfo(payload.userAgent),
        ...deviceService.parseOsInfo(payload.userAgent),
      };
    }

    // Record successful login attempt
    const loginResult = await securityService.recordLoginAttempt(
      loginContext,
      true,
      user.id
    );

    // Reset failed login counter
    await securityService.handleSuccessfulLogin(user.id);

    // Update last known country
    if (payload.ipAddress) {
      const geoLocation = await ipService.getGeoLocation(payload.ipAddress);
      if (geoLocation?.country) {
        await query(
          `UPDATE "User" SET "lastKnownCountry" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [geoLocation.country, user.id]
        );
      }
    }

    // Generate final auth token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User logged in with 2FA', {
      userId: user.id,
      ip: payload.ipAddress,
      riskScore: loginResult.riskScore,
    });

    // Log admin login and create session
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      await auditService.logLogin(user.id, payload.ipAddress, payload.userAgent);
      const expiresAt = this.getTokenExpiry(user.role);
      await auditService.createSession(user.id, token, expiresAt, payload.ipAddress, payload.userAgent);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        liveBalance: Number(user.liveBalance),
        demoBalance: Number(user.demoBalance),
        practiceBalance: Number(user.practiceBalance),
        activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: user.emailVerified,
        kycStatus: (user.kycStatus as UserPublic['kycStatus']) || 'NOT_SUBMITTED',
      },
      token,
      securityInfo: {
        isNewDevice: loginResult.isNewDevice,
        isNewLocation: loginResult.isNewLocation,
        requiresVerification: loginResult.requiresVerification,
      },
    };
  }

  async sendVerificationCode(userId: string): Promise<boolean> {
    const user = await queryOne<{ email: string; name: string; emailVerified: boolean }>(
      `SELECT email, name, "emailVerified" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AuthServiceError('Email already verified', 400);
    }

    const code = await emailService.sendVerificationCode(user.email, user.name);
    return code !== null;
  }

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    const user = await queryOne<{ email: string; name: string; emailVerified: boolean }>(
      `SELECT email, name, "emailVerified" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AuthServiceError('Email already verified', 400);
    }

    const isValid = await emailService.verifyCode(user.email, code);
    if (!isValid) {
      throw new AuthServiceError('Invalid or expired verification code', 400);
    }

    await query(
      `UPDATE "User" SET "emailVerified" = true, "emailVerifiedAt" = $1, "updatedAt" = $1
       WHERE id = $2`,
      [new Date(), userId]
    );

    // Send confirmation email
    emailService.sendEmailVerified(user.email, user.name)
      .catch(err => logger.error('Failed to send email verified notification', { userId, error: err }));

    logger.info('Email verified successfully', { userId });
    return true;
  }

  async switchAccountType(userId: string, accountType: 'LIVE' | 'DEMO'): Promise<UserPublic> {
    // Update the account type
    await queryOne(
      `UPDATE "User" SET "activeAccountType" = $1, "updatedAt" = $2 WHERE id = $3`,
      [accountType, new Date(), userId]
    );

    // Fetch user with KYC status
    const user = await queryOne<UserRow & { kycStatus: string | null }>(
      `SELECT u.id, u.email, u.name, u.role, u."liveBalance", u."demoBalance", u."practiceBalance",
              u."activeAccountType", u."emailVerified", k.status as "kycStatus"
       FROM "User" u
       LEFT JOIN "KYC" k ON k."userId" = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    logger.info('User switched account type', { userId, accountType });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      liveBalance: Number(user.liveBalance),
      demoBalance: Number(user.demoBalance),
      practiceBalance: Number(user.practiceBalance),
      activeAccountType: user.activeAccountType as 'LIVE' | 'DEMO',
      emailVerified: user.emailVerified,
      kycStatus: (user.kycStatus as UserPublic['kycStatus']) || 'NOT_SUBMITTED',
    };
  }

  async getActiveBalance(userId: string): Promise<{ balance: number; accountType: 'LIVE' | 'DEMO' }> {
    const user = await queryOne<{ demoBalance: number; practiceBalance: number; activeAccountType: string }>(
      `SELECT "demoBalance", "practiceBalance", "activeAccountType" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    // NOTE: Due to legacy naming:
    // - 'LIVE' mode uses demoBalance (which is actually the real money)
    // - 'DEMO' mode uses practiceBalance (which is the practice/demo money)
    const balance = user.activeAccountType === 'LIVE'
      ? Number(user.demoBalance)
      : Number(user.practiceBalance);

    return {
      balance,
      accountType: user.activeAccountType as 'LIVE' | 'DEMO',
    };
  }

  async updateActiveBalance(userId: string, amount: number): Promise<{ balance: number; accountType: 'LIVE' | 'DEMO' }> {
    const user = await queryOne<{ activeAccountType: string }>(
      `SELECT "activeAccountType" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    // NOTE: Due to legacy naming:
    // - 'LIVE' mode uses demoBalance (which is actually the real money)
    // - 'DEMO' mode uses practiceBalance (which is the practice/demo money)
    const balanceField = user.activeAccountType === 'LIVE' ? 'demoBalance' : 'practiceBalance';

    const updatedUser = await queryOne<{ demoBalance: number; practiceBalance: number; activeAccountType: string }>(
      `UPDATE "User" SET "${balanceField}" = "${balanceField}" + $1, "updatedAt" = $2
       WHERE id = $3
       RETURNING "demoBalance", "practiceBalance", "activeAccountType"`,
      [amount, new Date(), userId]
    );

    if (!updatedUser) {
      throw new AuthServiceError('Failed to update balance', 500);
    }

    const balance = updatedUser.activeAccountType === 'LIVE'
      ? Number(updatedUser.demoBalance)
      : Number(updatedUser.practiceBalance);

    return {
      balance,
      accountType: updatedUser.activeAccountType as 'LIVE' | 'DEMO',
    };
  }

  async forgotPassword(email: string): Promise<boolean> {
    const user = await queryOne<{ id: string; name: string; isActive: boolean }>(
      `SELECT id, name, "isActive" FROM "User" WHERE email = $1`,
      [email]
    );

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      logger.info('Password reset requested for non-existent/inactive email', { email });
      return true;
    }

    const token = await emailService.sendPasswordResetEmail(email, user.name, config.client.url);

    if (token) {
      logger.info('Password reset email sent', { userId: user.id });
    }

    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const email = await emailService.verifyResetToken(token);

    if (!email) {
      throw new AuthServiceError('Invalid or expired reset token', 400);
    }

    const user = await queryOne<{ id: string; name: string; isActive: boolean }>(
      `SELECT id, name, "isActive" FROM "User" WHERE email = $1`,
      [email]
    );

    if (!user || !user.isActive) {
      throw new AuthServiceError('User not found or inactive', 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await query(
      `UPDATE "User" SET password = $1, "updatedAt" = $2 WHERE email = $3`,
      [hashedPassword, new Date(), email]
    );

    await emailService.markResetTokenUsed(token);

    // Send confirmation email
    emailService.sendPasswordChanged(email, user.name)
      .catch(err => logger.error('Failed to send password changed email', { userId: user.id, error: err }));

    logger.info('Password reset successfully', { userId: user.id });
    return true;
  }

  async verifyResetToken(token: string): Promise<boolean> {
    const email = await emailService.verifyResetToken(token);
    return email !== null;
  }

  /**
   * Change password for authenticated user
   * Requires current password verification
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await queryOne<{ id: string; email: string; name: string; password: string; isActive: boolean }>(
      `SELECT id, email, name, password, "isActive" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user || !user.isActive) {
      throw new AuthServiceError('User not found or inactive', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AuthServiceError('Current password is incorrect', 401);
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AuthServiceError('New password must be different from current password', 400);
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await query(
      `UPDATE "User" SET password = $1, "updatedAt" = $2 WHERE id = $3`,
      [hashedPassword, new Date(), userId]
    );

    // Blacklist all user tokens to force re-login on other devices
    await tokenBlacklistService.blacklistAllUserTokens(userId, 'PASSWORD_CHANGED');

    // Send confirmation email
    emailService.sendPasswordChanged(user.email, user.name)
      .catch(err => logger.error('Failed to send password changed email', { userId: user.id, error: err }));

    logger.info('User changed password successfully', { userId: user.id });
    return true;
  }

  /**
   * Impersonate a user (Admin/SuperAdmin only)
   * Creates a special token that allows admin to access user's account
   */
  async impersonateUser(
    targetUserId: string,
    adminId: string,
    adminRole: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: UserPublic; token: string; originalAdminId: string }> {
    // Only ADMIN or SUPERADMIN can impersonate
    if (adminRole !== 'ADMIN' && adminRole !== 'SUPERADMIN') {
      throw new AuthServiceError('Unauthorized to impersonate users', 403);
    }

    // Get the target user with KYC status
    const targetUser = await queryOne<UserRow & { kycStatus: string | null }>(
      `SELECT u.id, u.email, u.password, u.name, u.role, u."liveBalance", u."demoBalance", u."practiceBalance",
              u."activeAccountType", u."isActive", u."emailVerified",
              k.status as "kycStatus"
       FROM "User" u
       LEFT JOIN "KYC" k ON k."userId" = u.id
       WHERE u.id = $1`,
      [targetUserId]
    );

    if (!targetUser) {
      throw new AuthServiceError('User not found', 404);
    }

    // Cannot impersonate other admins (only SuperAdmin can impersonate admins)
    if (targetUser.role === 'ADMIN' && adminRole !== 'SUPERADMIN') {
      throw new AuthServiceError('Only SuperAdmin can impersonate admin accounts', 403);
    }

    // Cannot impersonate SuperAdmin
    if (targetUser.role === 'SUPERADMIN') {
      throw new AuthServiceError('Cannot impersonate SuperAdmin accounts', 403);
    }

    // Generate impersonation token with special claims
    const token = this.generateToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      isImpersonation: true,
      impersonatedBy: adminId,
    });

    // Log the impersonation action
    await auditService.logAction({
      adminId,
      actionType: 'USER_IMPERSONATE',
      targetType: 'USER',
      targetId: targetUserId,
      description: `Started impersonating user ${targetUser.name} (${targetUser.email})`,
      metadata: { targetUserRole: targetUser.role },
      ipAddress,
      userAgent,
    });

    logger.info('Admin started impersonating user', {
      adminId,
      targetUserId,
      targetEmail: targetUser.email,
    });

    return {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        liveBalance: Number(targetUser.liveBalance),
        demoBalance: Number(targetUser.demoBalance),
        practiceBalance: Number(targetUser.practiceBalance),
        activeAccountType: targetUser.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: targetUser.emailVerified,
        kycStatus: (targetUser.kycStatus as UserPublic['kycStatus']) || 'NOT_SUBMITTED',
      },
      token,
      originalAdminId: adminId,
    };
  }

  /**
   * End impersonation and get admin token back
   * Also blacklists the impersonation token to prevent reuse
   */
  async endImpersonation(
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
    currentToken?: string
  ): Promise<AuthResult> {
    const admin = await queryOne<UserRow & { kycStatus: string | null }>(
      `SELECT u.id, u.email, u.password, u.name, u.role, u."liveBalance", u."demoBalance", u."practiceBalance",
              u."activeAccountType", u."isActive", u."emailVerified",
              k.status as "kycStatus"
       FROM "User" u
       LEFT JOIN "KYC" k ON k."userId" = u.id
       WHERE u.id = $1 AND u.role IN ('ADMIN', 'SUPERADMIN')`,
      [adminId]
    );

    if (!admin) {
      throw new AuthServiceError('Admin not found', 404);
    }

    if (!admin.isActive) {
      throw new AuthServiceError('Admin account is deactivated', 403);
    }

    // Blacklist the impersonation token if provided
    if (currentToken) {
      try {
        // Calculate token expiry (7 days from when it was issued, which we don't know exactly)
        // Use a conservative 7 days from now to ensure coverage
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await tokenBlacklistService.blacklistToken(
          currentToken,
          adminId,
          'IMPERSONATION_ENDED',
          expiresAt
        );
      } catch (error) {
        // Log but don't fail - ending impersonation is more important
        logger.error('Failed to blacklist impersonation token', { adminId, error });
      }
    }

    const token = this.generateToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    // Log end of impersonation
    await auditService.logAction({
      adminId,
      actionType: 'USER_IMPERSONATE_END',
      targetType: 'USER',
      targetId: adminId,
      description: 'Ended user impersonation session',
      ipAddress,
      userAgent,
    });

    logger.info('Admin ended impersonation', { adminId });

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        liveBalance: Number(admin.liveBalance),
        demoBalance: Number(admin.demoBalance),
        practiceBalance: Number(admin.practiceBalance),
        activeAccountType: admin.activeAccountType as 'LIVE' | 'DEMO',
        emailVerified: admin.emailVerified,
        kycStatus: (admin.kycStatus as UserPublic['kycStatus']) || 'NOT_SUBMITTED',
      },
      token,
    };
  }
}

export const authService = new AuthService();
export { AuthServiceError };
