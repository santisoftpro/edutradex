/**
 * Rate Limiter Service
 * Provides in-memory rate limiting with sliding window algorithm
 * For production with multiple servers, replace with Redis-based implementation
 */

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
  lockedUntil: number | null;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutDurationMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  lockedUntil: number | null;
  retryAfterMs: number | null;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Check if an action is allowed for the given identifier
   */
  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // Check if locked out
    if (entry?.lockedUntil && entry.lockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.lockedUntil,
        lockedUntil: entry.lockedUntil,
        retryAfterMs: entry.lockedUntil - now,
      };
    }

    // Reset if window has expired
    if (!entry || now - entry.windowStart > config.windowMs) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetAt: now + config.windowMs,
        lockedUntil: null,
        retryAfterMs: null,
      };
    }

    const remaining = Math.max(0, config.maxAttempts - entry.attempts);

    return {
      allowed: remaining > 0,
      remaining,
      resetAt: entry.windowStart + config.windowMs,
      lockedUntil: null,
      retryAfterMs: remaining > 0 ? null : entry.windowStart + config.windowMs - now,
    };
  }

  /**
   * Record a failed attempt for the given identifier
   */
  recordFailure(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    let entry = this.store.get(identifier);

    // Reset if window has expired or no entry
    if (!entry || now - entry.windowStart > config.windowMs) {
      entry = {
        attempts: 0,
        windowStart: now,
        lockedUntil: null,
      };
    }

    // Clear lockout if expired
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      entry = {
        attempts: 0,
        windowStart: now,
        lockedUntil: null,
      };
    }

    entry.attempts++;

    // Lock out if max attempts reached
    if (entry.attempts >= config.maxAttempts) {
      entry.lockedUntil = now + config.lockoutDurationMs;
    }

    this.store.set(identifier, entry);

    const remaining = Math.max(0, config.maxAttempts - entry.attempts);

    return {
      allowed: remaining > 0 && !entry.lockedUntil,
      remaining,
      resetAt: entry.lockedUntil || entry.windowStart + config.windowMs,
      lockedUntil: entry.lockedUntil,
      retryAfterMs: entry.lockedUntil
        ? entry.lockedUntil - now
        : (remaining > 0 ? null : entry.windowStart + config.windowMs - now),
    };
  }

  /**
   * Record a successful attempt (clears the rate limit for the identifier)
   */
  recordSuccess(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Reset rate limit for an identifier (e.g., after password reset)
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, entry] of this.store.entries()) {
      const entryAge = now - entry.windowStart;
      const isLockExpired = !entry.lockedUntil || entry.lockedUntil <= now;

      if (entryAge > maxAge && isLockExpired) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get the number of tracked identifiers (for monitoring)
   */
  get size(): number {
    return this.store.size;
  }
}

// Singleton instance
const globalForRateLimiter = globalThis as unknown as {
  rateLimiter: RateLimiter | undefined;
};

export const rateLimiter =
  globalForRateLimiter.rateLimiter ?? new RateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimiter.rateLimiter = rateLimiter;
}

// Default configurations for different rate limit scenarios
export const RATE_LIMIT_CONFIGS = {
  // Partner login - 5 attempts per 15 minutes, 30 minute lockout
  PARTNER_LOGIN: {
    maxAttempts: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || "5", 10),
    windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || "900000", 10),
    lockoutDurationMs: parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS || "1800000", 10),
  },
  // Admin login - stricter: 3 attempts per 15 minutes, 1 hour lockout
  ADMIN_LOGIN: {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutDurationMs: 60 * 60 * 1000, // 1 hour
  },
  // Password reset - 3 attempts per hour
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutDurationMs: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Registration - 5 attempts per hour per IP
  REGISTRATION: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutDurationMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Create a rate limit identifier for login attempts
 * Uses combination of email and IP for better security
 */
export function createLoginIdentifier(email: string, ip: string | null): string {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedIp = ip || "unknown";
  return `login:${normalizedEmail}:${normalizedIp}`;
}

/**
 * Create a rate limit identifier for IP-based limiting
 */
export function createIpIdentifier(prefix: string, ip: string | null): string {
  return `${prefix}:${ip || "unknown"}`;
}

export type { RateLimitConfig, RateLimitResult };
