import { query, queryOne } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

/**
 * Token Blacklist Service
 *
 * Provides token revocation functionality to invalidate tokens before expiry.
 * Used when:
 * - User logs out
 * - Admin session is terminated
 * - Impersonation session ends
 * - Security breach detected
 *
 * Uses database for persistence (tokens survive server restart).
 * Includes automatic cleanup of expired tokens.
 */

interface BlacklistedToken {
  id: string;
  tokenHash: string;
  userId: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

class TokenBlacklistService {
  private memoryCache: Map<string, Date> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache
  private lastCacheRefresh = 0;

  /**
   * Hash a token for storage (we don't store raw tokens)
   * Uses a simple hash since we're just checking existence, not reversing
   */
  private hashToken(token: string): string {
    // Use last 32 chars of token as identifier (unique enough, avoids storing full token)
    const tokenSuffix = token.slice(-32);
    return Buffer.from(tokenSuffix).toString('base64');
  }

  /**
   * Add a token to the blacklist
   */
  async blacklistToken(
    token: string,
    userId: string,
    reason: string,
    expiresAt: Date
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    try {
      await query(
        `INSERT INTO "TokenBlacklist" (id, "tokenHash", "userId", reason, "expiresAt", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
         ON CONFLICT ("tokenHash") DO NOTHING`,
        [tokenHash, userId, reason, expiresAt]
      );

      // Add to memory cache
      this.memoryCache.set(tokenHash, expiresAt);

      logger.info('Token blacklisted', { userId, reason });
    } catch (error) {
      logger.error('Failed to blacklist token', { userId, error });
      // Don't throw - failing to blacklist shouldn't break logout
    }
  }

  /**
   * Check if a token is blacklisted
   * Uses memory cache first, then database
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    // Check memory cache first (fast path)
    const cachedExpiry = this.memoryCache.get(tokenHash);
    if (cachedExpiry) {
      if (cachedExpiry > new Date()) {
        return true; // Token is blacklisted and not expired
      } else {
        this.memoryCache.delete(tokenHash); // Clean up expired entry
        return false;
      }
    }

    // Check database (slow path)
    try {
      const result = await queryOne<{ id: string }>(
        `SELECT id FROM "TokenBlacklist"
         WHERE "tokenHash" = $1 AND "expiresAt" > NOW()`,
        [tokenHash]
      );

      if (result) {
        // Add to cache for faster future lookups
        this.memoryCache.set(tokenHash, new Date(Date.now() + this.CACHE_TTL_MS));
        return true;
      }
    } catch (error) {
      logger.error('Failed to check token blacklist', { error });
      // On error, assume token is valid (fail open for availability)
    }

    return false;
  }

  /**
   * Blacklist all tokens for a user (e.g., on password change, security breach)
   */
  async blacklistAllUserTokens(userId: string, reason: string): Promise<void> {
    try {
      // Set expiry far in the future - all current tokens will be invalidated
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await query(
        `INSERT INTO "TokenBlacklist" (id, "tokenHash", "userId", reason, "expiresAt", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
         ON CONFLICT ("tokenHash") DO UPDATE SET "expiresAt" = $4`,
        [`user:${userId}:all`, userId, reason, expiresAt]
      );

      logger.info('All tokens blacklisted for user', { userId, reason });
    } catch (error) {
      logger.error('Failed to blacklist all user tokens', { userId, error });
    }
  }

  /**
   * Check if all tokens for a user are blacklisted
   */
  async areAllUserTokensBlacklisted(userId: string): Promise<boolean> {
    try {
      const result = await queryOne<{ id: string }>(
        `SELECT id FROM "TokenBlacklist"
         WHERE "tokenHash" = $1 AND "expiresAt" > NOW()`,
        [`user:${userId}:all`]
      );
      return !!result;
    } catch (error) {
      logger.error('Failed to check user token blacklist', { userId, error });
      return false;
    }
  }

  /**
   * Clean up expired tokens from database
   * Should be called periodically (e.g., daily cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM "TokenBlacklist" WHERE "expiresAt" < NOW()`,
        []
      );
      const deletedCount = result?.rowCount || 0;

      if (deletedCount > 0) {
        logger.info('Cleaned up expired blacklisted tokens', { count: deletedCount });
      }

      // Also clean memory cache
      const now = new Date();
      for (const [hash, expiry] of this.memoryCache.entries()) {
        if (expiry < now) {
          this.memoryCache.delete(hash);
        }
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error });
      return 0;
    }
  }

  /**
   * Get count of blacklisted tokens (for monitoring)
   */
  async getBlacklistCount(): Promise<number> {
    try {
      const result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "TokenBlacklist" WHERE "expiresAt" > NOW()`,
        []
      );
      return parseInt(result?.count || '0', 10);
    } catch (error) {
      logger.error('Failed to get blacklist count', { error });
      return 0;
    }
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
