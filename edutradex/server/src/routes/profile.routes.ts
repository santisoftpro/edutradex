import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { profileService, ProfileServiceError } from '../services/user/profile.service.js';
import {
  deviceIdParamsSchema,
  loginHistoryQuerySchema,
} from '../validators/profile.validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/user/profile
 * Returns complete user profile with KYC data
 */
router.get(
  '/profile',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const profile = await profileService.getFullProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user/stats
 * Returns user profile statistics
 */
router.get(
  '/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const stats = await profileService.getProfileStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user/devices
 * Returns user's registered devices
 */
router.get(
  '/devices',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const fingerprint = req.headers['x-device-fingerprint'] as string | undefined;

      const devices = await profileService.getUserDevices(userId, fingerprint);

      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/user/devices/:deviceId
 * Remove a device from user's account
 */
router.delete(
  '/devices/:deviceId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const fingerprint = req.headers['x-device-fingerprint'] as string | undefined;

      const { deviceId } = deviceIdParamsSchema.parse(req.params);

      await profileService.removeDevice(userId, deviceId, fingerprint);

      logger.info('Device removed by user', { userId, deviceId });

      res.json({
        success: true,
        message: 'Device removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/user/devices/:deviceId/trust
 * User self-trusts a device
 */
router.post(
  '/devices/:deviceId/trust',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { deviceId } = deviceIdParamsSchema.parse(req.params);

      await profileService.selfTrustDevice(userId, deviceId);

      res.json({
        success: true,
        message: 'Device trusted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user/login-history
 * Returns user's login attempts history
 */
router.get(
  '/login-history',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { limit, offset } = loginHistoryQuerySchema.parse(req.query);

      const result = await profileService.getLoginHistory(userId, limit, offset);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Error handler for profile routes
 */
router.use(
  (error: Error, _req: Request, res: Response, next: NextFunction): void => {
    if (error instanceof ProfileServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: (error as any).errors,
      });
      return;
    }

    next(error);
  }
);

export default router;
