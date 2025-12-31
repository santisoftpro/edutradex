import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * SuperAdmin Enhanced Authentication Middleware
 *
 * Provides additional security for SuperAdmin operations:
 * - Password re-authentication for sensitive actions
 * - Session validation
 * - Activity logging
 */

interface UserWithPassword {
  id: string;
  password: string;
  role: string;
}

/**
 * Middleware that requires password re-authentication for sensitive SuperAdmin actions.
 * The password must be provided in the request body as `adminPassword`.
 *
 * Usage:
 * router.post('/sensitive-action', authMiddleware, superAdminMiddleware, requirePasswordMiddleware, handler);
 */
export async function requirePasswordMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { adminPassword } = req.body;

    if (!adminPassword) {
      res.status(401).json({
        success: false,
        error: 'Password confirmation required for this action',
        code: 'PASSWORD_REQUIRED',
      });
      return;
    }

    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user's current password hash
    const user = await queryOne<UserWithPassword>(
      `SELECT id, password, role FROM "User" WHERE id = $1`,
      [req.userId]
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(adminPassword, user.password);

    if (!isValidPassword) {
      logger.warn('Failed password re-authentication attempt', {
        userId: req.userId,
        ip: req.ip,
        action: req.path,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid password',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    logger.debug('Password re-authentication successful', {
      userId: req.userId,
      action: req.path,
    });

    // Remove password from body so it doesn't get logged or processed further
    delete req.body.adminPassword;

    next();
  } catch (error) {
    logger.error('Password re-authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Middleware that validates SuperAdmin session is still active.
 * Checks the AdminSession table to ensure the session hasn't been terminated.
 */
export async function validateSuperAdminSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId || req.userRole !== 'SUPERADMIN') {
      next();
      return;
    }

    // Get the token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      next();
      return;
    }

    // Check if there's an active session with this token
    const session = await queryOne<{ id: string; isActive: boolean }>(
      `SELECT id, "isActive" FROM "AdminSession"
       WHERE "adminId" = $1 AND token = $2`,
      [req.userId, token]
    );

    // If session exists but is not active, reject
    if (session && !session.isActive) {
      logger.warn('Attempted use of terminated SuperAdmin session', {
        userId: req.userId,
        sessionId: session.id,
      });

      res.status(401).json({
        success: false,
        error: 'Session has been terminated. Please log in again.',
        code: 'SESSION_TERMINATED',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Session validation error', { error });
    next(); // Continue on error to avoid blocking legitimate requests
  }
}

/**
 * Rate limiter specifically for SuperAdmin sensitive operations.
 * More strict than general admin rate limiting.
 */
import rateLimit from 'express-rate-limit';

export const superAdminSensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 sensitive operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return `superadmin-sensitive:${req.userId || req.ip}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many sensitive operations. Please wait before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
