import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/auth.service.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  demoBalance: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Authorization header is required',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization format. Use: Bearer <token>',
      });
      return;
    }

    const token = authHeader.slice(7);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token is required',
      });
      return;
    }

    const decoded = authService.verifyToken(token);

    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found or account deactivated',
      });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.userRole = user.role;
    req.user = user;

    next();
  } catch (error) {
    logger.debug('Auth middleware error', { error });

    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}

export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = authService.verifyToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
  } catch {
    // Token invalid, continue without auth
  }

  next();
}
