import { Router, Request, Response } from 'express';
import { twoFactorService, TwoFactorServiceError } from '../services/auth/two-factor.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  verify2FASetupSchema,
  disable2FASchema,
  regenerateBackupCodesSchema,
  type Verify2FASetupInput,
  type Disable2FAInput,
  type RegenerateBackupCodesInput,
} from '../validators/two-factor.validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All 2FA routes require authentication
router.use(authMiddleware);

/**
 * POST /api/auth/2fa/setup
 * Initiate 2FA setup - generates secret and QR code
 */
router.post('/setup', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;

    const result = await twoFactorService.generateSetup(userId);

    res.json({
      success: true,
      data: {
        qrCode: result.qrCode,
        secret: result.secret,
        otpauthUrl: result.otpauthUrl,
        manualEntryKey: result.manualEntryKey,
      },
      message: 'Scan the QR code or enter the key manually in your authenticator app',
    });
  } catch (error) {
    if (error instanceof TwoFactorServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.error('2FA setup error', { error, userId: req.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to initiate 2FA setup',
    });
  }
});

/**
 * POST /api/auth/2fa/verify-setup
 * Complete 2FA setup by verifying the TOTP code
 */
router.post(
  '/verify-setup',
  validateBody(verify2FASetupSchema),
  async (req: Request<object, object, Verify2FASetupInput>, res: Response): Promise<void> => {
    try {
      const userId = req.userId as string;
      const { token } = req.body;

      const result = await twoFactorService.verifySetup(userId, token);

      res.json({
        success: true,
        data: {
          backupCodes: result.backupCodes,
        },
        message: 'Two-factor authentication enabled successfully. Save your backup codes securely.',
      });
    } catch (error) {
      if (error instanceof TwoFactorServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('2FA verify setup error', { error, userId: req.userId });
      res.status(500).json({
        success: false,
        error: 'Failed to verify 2FA setup',
      });
    }
  }
);

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA (requires password confirmation)
 */
router.post(
  '/disable',
  validateBody(disable2FASchema),
  async (req: Request<object, object, Disable2FAInput>, res: Response): Promise<void> => {
    try {
      const userId = req.userId as string;
      const { password } = req.body;

      await twoFactorService.disable(userId, password);

      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
      });
    } catch (error) {
      if (error instanceof TwoFactorServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('2FA disable error', { error, userId: req.userId });
      res.status(500).json({
        success: false,
        error: 'Failed to disable 2FA',
      });
    }
  }
);

/**
 * POST /api/auth/2fa/backup-codes
 * Generate new backup codes (invalidates old ones, requires password)
 */
router.post(
  '/backup-codes',
  validateBody(regenerateBackupCodesSchema),
  async (req: Request<object, object, RegenerateBackupCodesInput>, res: Response): Promise<void> => {
    try {
      const userId = req.userId as string;
      const { password } = req.body;

      const backupCodes = await twoFactorService.regenerateBackupCodes(userId, password);

      res.json({
        success: true,
        data: {
          backupCodes,
        },
        message: 'New backup codes generated. Previous codes are now invalid.',
      });
    } catch (error) {
      if (error instanceof TwoFactorServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      logger.error('Backup codes regeneration error', { error, userId: req.userId });
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate backup codes',
      });
    }
  }
);

/**
 * GET /api/auth/2fa/status
 * Get current 2FA status for the authenticated user
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;

    const status = await twoFactorService.getStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    if (error instanceof TwoFactorServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
      return;
    }

    logger.error('2FA status error', { error, userId: req.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to get 2FA status',
    });
  }
});

export default router;
