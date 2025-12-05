import { Router, Request, Response } from 'express';
import { authService, AuthServiceError } from '../services/auth/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  resetBalanceSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetTokenSchema,
  type RegisterInput,
  type LoginInput,
  type ResetBalanceInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type VerifyResetTokenInput,
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
 * POST /api/auth/topup-demo
 * Add funds to demo account
 */
router.post(
  '/topup-demo',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const { amount } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number',
        });
        return;
      }

      const result = await authService.topUpDemoBalance(req.userId, amount);

      res.json({
        success: true,
        data: result,
        message: `$${amount.toLocaleString()} added to demo account`,
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Demo top-up error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to top up demo balance',
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

/**
 * POST /api/auth/send-verification
 * Send email verification code
 */
router.post(
  '/send-verification',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      await authService.sendVerificationCode(req.userId);

      res.json({
        success: true,
        message: 'Verification code sent to your email',
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Send verification error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to send verification code',
      });
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Verify email with code
 */
router.post(
  '/verify-email',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
        });
        return;
      }

      await authService.verifyEmail(req.userId, code);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Verify email error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to verify email',
      });
    }
  }
);

/**
 * POST /api/auth/switch-account
 * Switch between LIVE and DEMO accounts
 */
router.post(
  '/switch-account',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const { accountType } = req.body;
      if (!accountType || !['LIVE', 'DEMO'].includes(accountType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid account type. Must be LIVE or DEMO',
        });
        return;
      }

      const user = await authService.switchAccountType(req.userId, accountType);

      res.json({
        success: true,
        data: { user },
        message: `Switched to ${accountType} account`,
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Switch account error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to switch account',
      });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  async (req: Request<object, object, ForgotPasswordInput>, res: Response): Promise<void> => {
    try {
      await authService.forgotPassword(req.body.email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link',
      });
    } catch (error) {
      logger.error('Forgot password error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to process request',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  async (req: Request<object, object, ResetPasswordInput>, res: Response): Promise<void> => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Reset password error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  }
);

/**
 * POST /api/auth/verify-reset-token
 * Verify if reset token is valid
 */
router.post(
  '/verify-reset-token',
  validateBody(verifyResetTokenSchema),
  async (req: Request<object, object, VerifyResetTokenInput>, res: Response): Promise<void> => {
    try {
      const isValid = await authService.verifyResetToken(req.body.token);

      res.json({
        success: true,
        data: { valid: isValid },
      });
    } catch (error) {
      logger.error('Verify reset token error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to verify token',
      });
    }
  }
);

export default router;
