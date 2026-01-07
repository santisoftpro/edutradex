import { query, queryOne } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

/**
 * Token Blacklist Service
 *
 * High-performance token revocation service with LRU caching.
 * Provides O(1) average lookup time for blacklist checks.
 *
 * Used when:
 * - User logs out
 * - Admin session is terminated
 * - Impersonation session ends
 * - Security breach detected
 * - Password changed
 *
 * Architecture:
 * - Two-tier caching: LRU memory cache + database persistence
 * - Negative cache: Caches "not blacklisted" results to avoid repeated DB hits
 * - Bounded memory: Max 10,000 entries with LRU eviction
 */

interface CacheEntry {
  isBlacklisted: boolean;
  expiresAt: Date;      // Token expiry (for blacklisted) or cache TTL (for negative cache)
  cachedAt: number;     // Timestamp for LRU tracking
}

interface BlacklistedTokenRow {
  id: string;
  expiresAt: Date;
}

class TokenBlacklistService {
  // LRU cache with bounded size
  private readonly cache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 1 minute for "not blacklisted" results

  // Pre-computed hash prefix for user-all tokens
  private readonly USER_ALL_PREFIX = 'user:';
  private readonly USER_ALL_SUFFIX = ':all';

  /**
   * Hash a token for storage (we don't store raw tokens)
   * Uses base64 encoding of the last 32 characters for uniqueness
   */
  private hashToken(token: string): string {
    return Buffer.from(token.slice(-32)).toString('base64');
  }

  /**
   * Generate the special "all tokens" hash for a user
   */
  private getUserAllHash(userId: string): string {
    return `${this.USER_ALL_PREFIX}${userId}${this.USER_ALL_SUFFIX}`;
  }

  /**
   * Evict oldest entries when cache exceeds max size
   * Uses LRU (Least Recently Used) eviction strategy
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;

    // Find and remove oldest 10% of entries
    const entriesToRemove = Math.ceil(this.MAX_CACHE_SIZE * 0.1);
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt);

    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      this.cache.delete(sortedEntries[i][0]);
    }
  }

  /**
   * Get from cache with expiry check
   * Returns undefined if not cached or expired
   */
  private getFromCache(tokenHash: string): CacheEntry | undefined {
    const entry = this.cache.get(tokenHash);
    if (!entry) return undefined;

    const now = new Date();

    // Check if cache entry is still valid
    if (entry.expiresAt <= now) {
      this.cache.delete(tokenHash);
      return undefined;
    }

    // Update access time for LRU
    entry.cachedAt = Date.now();
    return entry;
  }

  /**
   * Add to cache with automatic eviction
   */
  private setCache(tokenHash: string, isBlacklisted: boolean, expiresAt: Date): void {
    this.evictIfNeeded();
    this.cache.set(tokenHash, {
      isBlacklisted,
      expiresAt,
      cachedAt: Date.now()
    });
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
         ON CONFLICT ("tokenHash") DO UPDATE SET "expiresAt" = GREATEST("TokenBlacklist"."expiresAt", EXCLUDED."expiresAt")`,
        [tokenHash, userId, reason, expiresAt]
      );

      // Update cache with actual expiry
      this.setCache(tokenHash, true, expiresAt);

      logger.info('Token blacklisted', { userId, reason });
    } catch (error) {
      logger.error('Failed to blacklist token', { userId, error });
      // Don't throw - failing to blacklist shouldn't break logout
    }
  }

  /**
   * Check if a token is blacklisted
   * Uses two-tier caching with negative cache support
   *
   * Performance: O(1) average case (cache hit), O(log n) worst case (DB query with index)
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    // Fast path: Check memory cache
    const cached = this.getFromCache(tokenHash);
    if (cached !== undefined) {
      return cached.isBlacklisted;
    }

    // Slow path: Query database (uses composite index idx_token_blacklist_hash_expiry)
    try {
      const result = await queryOne<BlacklistedTokenRow>(
        `SELECT id, "expiresAt" FROM "TokenBlacklist"
         WHERE "tokenHash" = $1 AND "expiresAt" > NOW()`,
        [tokenHash]
      );

      if (result) {
        // Cache positive result with actual token expiry
        this.setCache(tokenHash, true, new Date(result.expiresAt));
        return true;
      }

      // Cache negative result with short TTL (reduces DB load for frequently checked tokens)
      this.setCache(
        tokenHash,
        false,
        new Date(Date.now() + this.NEGATIVE_CACHE_TTL_MS)
      );
      return false;
    } catch (error) {
      logger.error('Failed to check token blacklist', { error });
      // Fail open for availability - token assumed valid on DB error
      return false;
    }
  }

  /**
   * Blacklist all tokens for a user (e.g., on password change, security breach)
   * Creates a special marker entry that invalidates all existing user tokens
   */
  async blacklistAllUserTokens(userId: string, reason: string): Promise<void> {
    const userAllHash = this.getUserAllHash(userId);
    // Set expiry far in the future - all current tokens will be invalidated
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    try {
      await query(
        `INSERT INTO "TokenBlacklist" (id, "tokenHash", "userId", reason, "expiresAt", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
         ON CONFLICT ("tokenHash") DO UPDATE SET "expiresAt" = GREATEST("TokenBlacklist"."expiresAt", EXCLUDED."expiresAt")`,
        [userAllHash, userId, reason, expiresAt]
      );

      // Update cache
      this.setCache(userAllHash, true, expiresAt);

      logger.info('All tokens blacklisted for user', { userId, reason });
    } catch (error) {
      logger.error('Failed to blacklist all user tokens', { userId, error });
    }
  }

  /**
   * Check if all tokens for a user are blacklisted
   * Uses same caching strategy as single token check
   */
  async areAllUserTokensBlacklisted(userId: string): Promise<boolean> {
    const userAllHash = this.getUserAllHash(userId);

    // Fast path: Check memory cache
    const cached = this.getFromCache(userAllHash);
    if (cached !== undefined) {
      return cached.isBlacklisted;
    }

    // Slow path: Query database
    try {
      const result = await queryOne<BlacklistedTokenRow>(
        `SELECT id, "expiresAt" FROM "TokenBlacklist"
         WHERE "tokenHash" = $1 AND "expiresAt" > NOW()`,
        [userAllHash]
      );

      if (result) {
        this.setCache(userAllHash, true, new Date(result.expiresAt));
        return true;
      }

      this.setCache(
        userAllHash,
        false,
        new Date(Date.now() + this.NEGATIVE_CACHE_TTL_MS)
      );
      return false;
    } catch (error) {
      logger.error('Failed to check user token blacklist', { userId, error });
      return false;
    }
  }

  /**
   * Clean up expired tokens from database
   * Should be called periodically (e.g., daily cron job)
   *
   * Uses batch deletion for efficiency
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

      // Clean memory cache - remove expired entries
      const now = new Date();
      const entries = Array.from(this.cache.entries());
      for (const [hash, entry] of entries) {
        if (entry.expiresAt < now) {
          this.cache.delete(hash);
        }
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error });
      return 0;
    }
  }

  /**
   * Get count of active blacklisted tokens (for monitoring)
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

  /**
   * Get cache statistics (for monitoring/debugging)
   */
  getCacheStats(): { size: number; maxSize: number; hitRatio?: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /**
   * Clear cache (for testing or emergency reset)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Token blacklist cache cleared');
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
