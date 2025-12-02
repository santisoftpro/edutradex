import { Router, Request, Response } from 'express';
import { authService, AuthServiceError } from '../services/auth/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  resetBalanceSchema,
  type RegisterInput,
  type LoginInput,
  type ResetBalanceInput,
} from '../validators/auth.validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validateBody(registerSchema),
  async (req: Request<object, object, RegisterInput>, res: Response): Promise<void> => {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful',
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Registration error', { error });
      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request<object, object, LoginInput>, res: Response): Promise<void> => {
    try {
      const result = await authService.login(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Login error', { error });
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      logger.error('Get user error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get user info',
      });
    }
  }
);

/**
 * POST /api/auth/reset-balance
 * Reset demo balance to default or specified amount
 */
router.post(
  '/reset-balance',
  authMiddleware,
  validateBody(resetBalanceSchema),
  async (req: Request<object, object, ResetBalanceInput>, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const result = await authService.resetBalance(req.userId, req.body.balance);

      res.json({
        success: true,
        data: result,
        message: 'Balance reset successful',
      });
    } catch (error) {
      logger.error('Reset balance error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reset balance',
      });
    }
  }
);

/**
 * POST /api/auth/verify
 * Verify if token is valid
 */
router.post(
  '/verify',
  authMiddleware,
  (req: Request, res: Response): void => {
    res.json({
      success: true,
      data: {
        valid: true,
        user: req.user,
      },
    });
  }
);

export default router;
