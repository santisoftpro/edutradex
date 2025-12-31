import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate Limiting Middleware for Sensitive Endpoints
 *
 * Provides stricter rate limiting for security-sensitive operations
 * like impersonation, password reset, login, etc.
 */

// Standard response for rate limit exceeded
const rateLimitResponse = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: 'Too many requests. Please try again later.',
  });
};

/**
 * Rate limiter for impersonation endpoint
 * Very strict: 5 requests per 5 minutes per IP
 */
export const impersonationRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use both IP and user ID for more accurate limiting
    const userId = req.userId || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `impersonate:${ip}:${userId}`;
  },
  handler: rateLimitResponse,
  message: {
    success: false,
    error: 'Too many impersonation attempts. Please wait 5 minutes before trying again.',
  },
});

/**
 * Rate limiter for login attempts
 * 10 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `login:${ip}`;
  },
  handler: rateLimitResponse,
  message: {
    success: false,
    error: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Rate limiter for password reset
 * 3 attempts per hour per email
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `password-reset:${ip}:${email}`;
  },
  handler: rateLimitResponse,
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again in an hour.',
  },
});

/**
 * Rate limiter for admin actions
 * 100 requests per minute (allows normal admin work but prevents abuse)
 */
export const adminActionsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.userId || 'anonymous';
    return `admin:${userId}`;
  },
  handler: rateLimitResponse,
  message: {
    success: false,
    error: 'Too many admin requests. Please slow down.',
  },
});
