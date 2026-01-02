import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne } from '../../config/db.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { auditService } from '../audit/audit.service.js';

// Configure authenticator with standard settings
authenticator.options = {
  digits: 6,
  step: 30, // 30-second time window
  window: 1, // Allow 1 step tolerance (±30 seconds)
};

const APP_NAME = 'EduTradeX';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

interface UserRow {
  id: string;
  email: string;
  password: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  backupCodes: string[];
}

interface TwoFactorSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
  manualEntryKey: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: Date | null;
  backupCodesRemaining: number;
}

class TwoFactorServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TwoFactorServiceError';
  }
}

export class TwoFactorService {
  private readonly SALT_ROUNDS = 10;

  // Derive encryption key from JWT secret (32 bytes for AES-256)
  private getEncryptionKey(): Buffer {
    return crypto.scryptSync(config.jwt.secret, 'totp-encryption-salt', 32);
  }

  // Encrypt TOTP secret before storing
  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // Decrypt TOTP secret when verifying
  private decryptSecret(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new TwoFactorServiceError('Invalid encrypted secret format', 500);
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = this.getEncryptionKey();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Format secret for manual entry (space-separated groups)
  private formatManualEntryKey(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  // Generate random backup codes
  private generateBackupCodeSet(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars (I, O, 0, 1)

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      let code = '';
      for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }

    return codes;
  }

  // Hash backup codes for storage
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map(code => bcrypt.hash(code, this.SALT_ROUNDS)));
  }

  // Generate TOTP setup data (secret + QR code)
  async generateSetup(userId: string): Promise<TwoFactorSetupResult> {
    // Get user email for the TOTP URL
    const user = await queryOne<{ email: string; twoFactorEnabled: boolean }>(
      'SELECT email, "twoFactorEnabled" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new TwoFactorServiceError('User not found', 404);
    }

    if (user.twoFactorEnabled) {
      throw new TwoFactorServiceError('Two-factor authentication is already enabled', 400);
    }

    // Generate new TOTP secret
    const secret = authenticator.generateSecret();

    // Create otpauth URL for authenticator apps
    const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret);

    // Generate QR code as base64 data URL
    const qrCode = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Store encrypted secret temporarily (not enabled yet)
    const encryptedSecret = this.encryptSecret(secret);
    await query(
      'UPDATE "User" SET "twoFactorSecret" = $1 WHERE id = $2',
      [encryptedSecret, userId]
    );

    logger.info('2FA setup initiated', { userId, email: user.email });

    return {
      secret,
      otpauthUrl,
      qrCode,
      manualEntryKey: this.formatManualEntryKey(secret),
    };
  }

  // Verify TOTP token
  verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  // Complete 2FA setup - verify token and enable
  async verifySetup(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await queryOne<UserRow>(
      'SELECT id, email, "twoFactorEnabled", "twoFactorSecret" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new TwoFactorServiceError('User not found', 404);
    }

    if (user.twoFactorEnabled) {
      throw new TwoFactorServiceError('Two-factor authentication is already enabled', 400);
    }

    if (!user.twoFactorSecret) {
      throw new TwoFactorServiceError('Please initiate 2FA setup first', 400);
    }

    // Decrypt and verify
    const secret = this.decryptSecret(user.twoFactorSecret);
    const isValid = this.verifyToken(secret, token);

    if (!isValid) {
      throw new TwoFactorServiceError('Invalid verification code', 400);
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodeSet();
    const hashedCodes = await this.hashBackupCodes(backupCodes);

    // Enable 2FA
    await query(
      `UPDATE "User"
       SET "twoFactorEnabled" = true,
           "twoFactorVerifiedAt" = NOW(),
           "backupCodes" = $1
       WHERE id = $2`,
      [hashedCodes, userId]
    );

    logger.info('2FA enabled successfully', { userId, email: user.email });

    // Log to audit
    await auditService.logAction({
      adminId: userId,
      actionType: 'SETTINGS_CHANGE',
      targetType: 'SETTINGS',
      targetId: userId,
      description: `Two-factor authentication enabled for ${user.email}`,
    });

    return { backupCodes };
  }

  // Disable 2FA (requires password verification)
  async disable(userId: string, password: string): Promise<void> {
    const user = await queryOne<UserRow>(
      'SELECT id, email, password, "twoFactorEnabled" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new TwoFactorServiceError('User not found', 404);
    }

    if (!user.twoFactorEnabled) {
      throw new TwoFactorServiceError('Two-factor authentication is not enabled', 400);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new TwoFactorServiceError('Invalid password', 401);
    }

    // Disable 2FA and clear secrets
    await query(
      `UPDATE "User"
       SET "twoFactorEnabled" = false,
           "twoFactorSecret" = NULL,
           "twoFactorVerifiedAt" = NULL,
           "backupCodes" = '{}'
       WHERE id = $1`,
      [userId]
    );

    logger.info('2FA disabled', { userId, email: user.email });

    // Log to audit
    await auditService.logAction({
      adminId: userId,
      actionType: 'SETTINGS_CHANGE',
      targetType: 'SETTINGS',
      targetId: userId,
      description: `Two-factor authentication disabled for ${user.email}`,
    });
  }

  // Verify TOTP during login
  async verifyLoginToken(userId: string, token: string): Promise<boolean> {
    const user = await queryOne<UserRow>(
      'SELECT id, "twoFactorEnabled", "twoFactorSecret" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    return this.verifyToken(secret, token);
  }

  // Verify backup code during login
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await queryOne<UserRow>(
      'SELECT id, email, "backupCodes" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    // Normalize code (uppercase, remove spaces)
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    // Find and verify the backup code
    for (let i = 0; i < user.backupCodes.length; i++) {
      const isMatch = await bcrypt.compare(normalizedCode, user.backupCodes[i]);
      if (isMatch) {
        // Remove the used backup code
        const updatedCodes = [...user.backupCodes];
        updatedCodes.splice(i, 1);

        await query(
          'UPDATE "User" SET "backupCodes" = $1 WHERE id = $2',
          [updatedCodes, userId]
        );

        logger.info('Backup code used', { userId, remainingCodes: updatedCodes.length });

        // Log to audit
        await auditService.logAction({
          adminId: userId,
          actionType: 'SETTINGS_CHANGE',
          targetType: 'SETTINGS',
          targetId: userId,
          description: `Backup code used for ${user.email}. ${updatedCodes.length} codes remaining.`,
        });

        return true;
      }
    }

    return false;
  }

  // Generate new backup codes (invalidates old ones)
  async regenerateBackupCodes(userId: string, password: string): Promise<string[]> {
    const user = await queryOne<UserRow>(
      'SELECT id, email, password, "twoFactorEnabled" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new TwoFactorServiceError('User not found', 404);
    }

    if (!user.twoFactorEnabled) {
      throw new TwoFactorServiceError('Two-factor authentication is not enabled', 400);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new TwoFactorServiceError('Invalid password', 401);
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodeSet();
    const hashedCodes = await this.hashBackupCodes(backupCodes);

    await query(
      'UPDATE "User" SET "backupCodes" = $1 WHERE id = $2',
      [hashedCodes, userId]
    );

    logger.info('Backup codes regenerated', { userId, email: user.email });

    // Log to audit
    await auditService.logAction({
      adminId: userId,
      actionType: 'SETTINGS_CHANGE',
      targetType: 'SETTINGS',
      targetId: userId,
      description: `Backup codes regenerated for ${user.email}`,
    });

    return backupCodes;
  }

  // Get 2FA status for user
  async getStatus(userId: string): Promise<TwoFactorStatus> {
    const user = await queryOne<{
      twoFactorEnabled: boolean;
      twoFactorVerifiedAt: Date | null;
      backupCodes: string[];
    }>(
      'SELECT "twoFactorEnabled", "twoFactorVerifiedAt", "backupCodes" FROM "User" WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new TwoFactorServiceError('User not found', 404);
    }

    return {
      enabled: user.twoFactorEnabled,
      verifiedAt: user.twoFactorVerifiedAt,
      backupCodesRemaining: user.backupCodes?.length || 0,
    };
  }

  // Check if 2FA is enabled for a user (used during login)
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await queryOne<{ twoFactorEnabled: boolean }>(
      'SELECT "twoFactorEnabled" FROM "User" WHERE id = $1',
      [userId]
    );
    return user?.twoFactorEnabled || false;
  }

  // Check if admin 2FA is required (from system config)
  async isAdmin2FARequired(): Promise<boolean> {
    const config = await queryOne<{ value: string }>(
      'SELECT value FROM "SystemConfig" WHERE key = $1',
      ['REQUIRE_ADMIN_2FA']
    );
    return config?.value === 'true';
  }
}

export const twoFactorService = new TwoFactorService();
export { TwoFactorServiceError };

// Initialize 2FA system config on module load
async function initializeTwoFactorConfig() {
  try {
    const existing = await queryOne<{ value: string }>(
      'SELECT value FROM "SystemConfig" WHERE key = $1',
      ['REQUIRE_ADMIN_2FA']
    );

    if (!existing) {
      await query(
        `INSERT INTO "SystemConfig" (id, key, value, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'REQUIRE_ADMIN_2FA', 'false', NOW(), NOW())
         ON CONFLICT (key) DO NOTHING`,
        []
      );
      logger.info('Initialized REQUIRE_ADMIN_2FA system config');
    }
  } catch (error) {
    // Silently ignore - table may not exist during initial setup
    logger.debug('Could not initialize 2FA config', { error });
  }
}

// Run initialization (non-blocking)
initializeTwoFactorConfig();
