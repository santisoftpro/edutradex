import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { adminService, AdminServiceError } from '../services/admin/admin.service.js';
import {
  getUsersQuerySchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  resetUserBalanceSchema,
  updateMarketConfigSchema,
  setSystemSettingSchema,
} from '../validators/admin.validators.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// ============= User Management =============

router.get(
  '/users',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getUsersQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await adminService.getAllUsers(parsed.data);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/users/:userId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = await adminService.getUserDetail(userId);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

router.patch(
  '/users/:userId/status',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const parsed = updateUserStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      await adminService.updateUserStatus(userId, parsed.data.isActive);

      res.json({
        success: true,
        message: `User ${parsed.data.isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

router.patch(
  '/users/:userId/role',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const parsed = updateUserRoleSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      await adminService.updateUserRole(userId, parsed.data.role);

      res.json({
        success: true,
        message: `User role updated to ${parsed.data.role}`,
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

router.post(
  '/users/:userId/reset-balance',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const parsed = resetUserBalanceSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await adminService.resetUserBalance(userId, parsed.data.newBalance);

      res.json({
        success: true,
        message: 'User balance reset successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

router.delete(
  '/users/:userId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      await adminService.deleteUser(userId);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// ============= Platform Statistics =============

router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await adminService.getPlatformStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activity = await adminService.getRecentActivity(limit);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Market Configuration =============

router.get(
  '/markets',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const configs = await adminService.getAllMarketConfigs();

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/markets/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { symbol } = req.params;
      const decodedSymbol = decodeURIComponent(symbol);
      const config = await adminService.getMarketConfig(decodedSymbol);

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Market config not found',
        });
        return;
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/markets/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { symbol } = req.params;
      const decodedSymbol = decodeURIComponent(symbol);
      const parsed = updateMarketConfigSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const config = await adminService.updateMarketConfig(decodedSymbol, parsed.data);

      res.json({
        success: true,
        message: 'Market config updated successfully',
        data: config,
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

router.post(
  '/markets/initialize',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.initializeMarketConfigs();

      res.json({
        success: true,
        message: `Initialized ${result.created} market configs`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= System Settings =============

router.get(
  '/settings',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await adminService.getSystemSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/settings/:key',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key } = req.params;
      const value = await adminService.getSystemSetting(key);

      if (value === null) {
        res.status(404).json({
          success: false,
          error: 'Setting not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { key, value },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/settings',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = setSystemSettingSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const setting = await adminService.setSystemSetting(parsed.data.key, parsed.data.value);

      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: setting,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/settings/:key',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key } = req.params;
      await adminService.deleteSystemSetting(key);

      res.json({
        success: true,
        message: 'Setting deleted successfully',
      });
    } catch (error) {
      if (error instanceof AdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

export default router;
