import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { adminService, AdminServiceError } from '../services/admin/admin.service.js';
import {
  adminCopyTradingService,
  AdminCopyTradingServiceError,
} from '../services/copy-trading/index.js';
import {
  getUsersQuerySchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  resetUserBalanceSchema,
  updateMarketConfigSchema,
  setSystemSettingSchema,
} from '../validators/admin.validators.js';
import {
  adminLeaderListSchema,
  adminLeaderIdSchema,
  adminLeaderActionSchema,
  adminUpdateLeaderSettingsSchema,
  adminUpdateLeaderStatsSchema,
  adminLeaderFollowersSchema,
} from '../validators/copy-trading.validators.js';

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
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
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

// Get online users
router.get(
  '/online-users',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const onlineUsers = await adminService.getOnlineUsers();

      res.json({
        success: true,
        data: onlineUsers,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get recent platform trades
router.get(
  '/recent-trades',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const trades = await adminService.getRecentPlatformTrades(limit);

      res.json({
        success: true,
        data: trades,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get full user detail with live trades and account stats
router.get(
  '/users/:userId/full',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const data = await adminService.getUserFullDetail(userId);

      res.json({
        success: true,
        data,
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

// Get user's live trades
router.get(
  '/users/:userId/live-trades',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const trades = await adminService.getUserLiveTrades(userId);

      res.json({
        success: true,
        data: trades,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's transaction history
router.get(
  '/users/:userId/transactions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = (req.query.type as string) || 'all';

      const transactions = await adminService.getUserTransactions(userId, {
        page,
        limit,
        type: type as 'deposit' | 'withdrawal' | 'all',
      });

      res.json({
        success: true,
        data: transactions.transactions,
        pagination: {
          page: transactions.page,
          limit: transactions.limit,
          total: transactions.total,
          totalPages: transactions.totalPages,
        },
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

// ============= Copy Trading Management =============

// Get copy trading platform stats
router.get(
  '/copy-trading/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await adminCopyTradingService.getCopyTradingStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get recent copy trading activity
router.get(
  '/copy-trading/activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activity = await adminCopyTradingService.getRecentActivity(limit);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all leaders (with filters)
router.get(
  '/copy-trading/leaders',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderListSchema.safeParse({ query: req.query });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await adminCopyTradingService.getAllLeaders(parsed.data.query);

      res.json({
        success: true,
        data: result.leaders,
        pagination: {
          page: parsed.data.query.page,
          limit: parsed.data.query.limit,
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get pending leader applications
router.get(
  '/copy-trading/leaders/pending',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminCopyTradingService.getPendingLeaders({ page, limit });

      res.json({
        success: true,
        data: result.leaders,
        pagination: {
          page,
          limit,
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get leader detail
router.get(
  '/copy-trading/leaders/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderIdSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid leader ID',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.getLeaderDetail(parsed.data.params.id);

      res.json({
        success: true,
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Get leader's followers
router.get(
  '/copy-trading/leaders/:id/followers',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderFollowersSchema.safeParse({
        params: req.params,
        query: req.query,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await adminCopyTradingService.getLeaderFollowers(
        parsed.data.params.id,
        parsed.data.query
      );

      res.json({
        success: true,
        data: result.followers,
        pagination: {
          page: parsed.data.query.page,
          limit: parsed.data.query.limit,
          total: result.total,
        },
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Approve leader
router.post(
  '/copy-trading/leaders/:id/approve',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderActionSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.approveLeader(
        parsed.data.params.id,
        parsed.data.body.adminNote
      );

      res.json({
        success: true,
        message: 'Leader approved successfully',
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Reject leader
router.post(
  '/copy-trading/leaders/:id/reject',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderActionSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.rejectLeader(
        parsed.data.params.id,
        parsed.data.body.adminNote
      );

      res.json({
        success: true,
        message: 'Leader rejected',
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Suspend leader
router.post(
  '/copy-trading/leaders/:id/suspend',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderActionSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.suspendLeader(
        parsed.data.params.id,
        parsed.data.body.reason
      );

      res.json({
        success: true,
        message: 'Leader suspended',
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Reinstate leader
router.post(
  '/copy-trading/leaders/:id/reinstate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminLeaderIdSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid leader ID',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.reinstateLeader(parsed.data.params.id);

      res.json({
        success: true,
        message: 'Leader reinstated',
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Update leader settings (admin)
router.patch(
  '/copy-trading/leaders/:id/settings',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminUpdateLeaderSettingsSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.updateLeaderSettings(
        parsed.data.params.id,
        parsed.data.body
      );

      res.json({
        success: true,
        message: 'Leader settings updated',
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Update leader stats (admin - manual override for win rate, trades, profit)
router.patch(
  '/copy-trading/leaders/:id/stats',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminUpdateLeaderStatsSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await adminCopyTradingService.updateLeaderStats(
        parsed.data.params.id,
        parsed.data.body
      );

      res.json({
        success: true,
        message: 'Leader stats updated',
        data: leader,
      });
    } catch (error) {
      if (error instanceof AdminCopyTradingServiceError) {
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

// Get fake activity setting
router.get(
  '/copy-trading/settings/fake-activity',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabled = await adminService.getSystemSetting('copy_trading_fake_activity');

      res.json({
        success: true,
        data: {
          enabled: enabled === 'true',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Toggle fake activity setting
router.put(
  '/copy-trading/settings/fake-activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Invalid request body. "enabled" must be a boolean.',
        });
        return;
      }

      await adminService.setSystemSetting('copy_trading_fake_activity', String(enabled));

      res.json({
        success: true,
        message: `Fake activity ${enabled ? 'enabled' : 'disabled'}`,
        data: { enabled },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
