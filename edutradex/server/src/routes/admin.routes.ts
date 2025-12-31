import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { impersonationRateLimiter } from '../middleware/rate-limit.middleware.js';
import { requirePasswordMiddleware } from '../middleware/superadmin-auth.middleware.js';
import { adminService, AdminServiceError } from '../services/admin/admin.service.js';
import { authService, AuthServiceError } from '../services/auth/auth.service.js';
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
import {
  otcAdminService,
  OTCAdminServiceError,
  manualControlService,
  otcHistorySeeder,
} from '../services/otc/index.js';
import { marketService } from '../services/market/market.service.js';
import {
  getOTCConfigsQuerySchema,
  otcConfigIdSchema,
  otcSymbolSchema,
  createOTCConfigSchema,
  updateOTCConfigSchema,
  getOTCPriceHistorySchema,
  getOTCActivityLogSchema,
  setDirectionBiasSchema,
  setVolatilitySchema,
  setPriceOverrideSchema,
  forceTradeOutcomeSchema,
  setUserTargetingSchema,
  getInterventionLogSchema,
  getActiveTradesSchema,
  userIdParamSchema,
  tradeIdParamSchema,
} from '../validators/otc.validators.js';

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

// ============= User Impersonation =============

router.post(
  '/users/:userId/impersonate',
  impersonationRateLimiter,
  requirePasswordMiddleware, // Requires password confirmation for security
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const adminId = req.user!.id;
      const adminRole = req.userRole!;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.impersonateUser(
        userId,
        adminId,
        adminRole,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: `Now impersonating user ${result.user.email}`,
        data: {
          user: result.user,
          token: result.token,
          originalAdminId: result.originalAdminId,
        },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
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
  '/impersonation/end',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { adminId } = req.body;

      if (!adminId) {
        res.status(400).json({
          success: false,
          error: 'adminId is required to end impersonation',
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Extract current token for blacklisting
      const authHeader = req.headers.authorization;
      const currentToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

      const result = await authService.endImpersonation(adminId, ipAddress, userAgent, currentToken);

      res.json({
        success: true,
        message: 'Impersonation ended, returned to admin account',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
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

// ============= OTC Market Management =============

// Get OTC system stats
router.get(
  '/otc/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await otcAdminService.getOTCStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all OTC configs
router.get(
  '/otc/configs',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getOTCConfigsQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await otcAdminService.getAllConfigs(parsed.data);

      res.json({
        success: true,
        data: result.configs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single OTC config by ID
router.get(
  '/otc/configs/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = otcConfigIdSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid config ID',
          details: parsed.error.issues,
        });
        return;
      }

      const config = await otcAdminService.getConfigById(parsed.data.params.id);

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'OTC config not found',
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

// Create new OTC config
router.post(
  '/otc/configs',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createOTCConfigSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const config = await otcAdminService.createConfig(parsed.data, req.user?.id);

      res.status(201).json({
        success: true,
        message: 'OTC config created successfully',
        data: config,
      });
    } catch (error) {
      if (error instanceof OTCAdminServiceError) {
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

// Update OTC config
router.patch(
  '/otc/configs/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idParsed = otcConfigIdSchema.safeParse({ params: req.params });
      const bodyParsed = updateOTCConfigSchema.safeParse(req.body);

      if (!idParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid config ID',
          details: idParsed.error.issues,
        });
        return;
      }

      if (!bodyParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: bodyParsed.error.issues,
        });
        return;
      }

      const config = await otcAdminService.updateConfig(
        idParsed.data.params.id,
        bodyParsed.data,
        req.user?.id
      );

      res.json({
        success: true,
        message: 'OTC config updated successfully',
        data: config,
      });
    } catch (error) {
      if (error instanceof OTCAdminServiceError) {
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

// Delete OTC config
router.delete(
  '/otc/configs/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = otcConfigIdSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid config ID',
          details: parsed.error.issues,
        });
        return;
      }

      await otcAdminService.deleteConfig(parsed.data.params.id, req.user?.id);

      res.json({
        success: true,
        message: 'OTC config deleted successfully',
      });
    } catch (error) {
      if (error instanceof OTCAdminServiceError) {
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

// Get all OTC exposures
router.get(
  '/otc/exposures',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const exposures = await otcAdminService.getAllExposures();

      res.json({
        success: true,
        data: exposures,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get exposure for specific symbol
router.get(
  '/otc/exposures/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = otcSymbolSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid symbol',
          details: parsed.error.issues,
        });
        return;
      }

      const decodedSymbol = decodeURIComponent(parsed.data.params.symbol);
      const exposure = await otcAdminService.getSymbolExposure(decodedSymbol);

      res.json({
        success: true,
        data: exposure,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset exposure for a symbol
router.post(
  '/otc/exposures/:symbol/reset',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = otcSymbolSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid symbol',
          details: parsed.error.issues,
        });
        return;
      }

      const decodedSymbol = decodeURIComponent(parsed.data.params.symbol);
      await otcAdminService.resetExposure(decodedSymbol, req.user?.id);

      res.json({
        success: true,
        message: 'Exposure reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get price history for a symbol
router.get(
  '/otc/prices/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getOTCPriceHistorySchema.safeParse({
        params: req.params,
        query: req.query,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        });
        return;
      }

      const decodedSymbol = decodeURIComponent(parsed.data.params.symbol);
      const history = await otcAdminService.getPriceHistory(decodedSymbol, parsed.data.query);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get activity log
router.get(
  '/otc/activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getOTCActivityLogSchema.safeParse({ query: req.query });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await otcAdminService.getActivityLog(parsed.data.query);

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk toggle enabled status
router.post(
  '/otc/configs/bulk/toggle-enabled',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ids, enabled } = req.body;

      if (!Array.isArray(ids) || typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Invalid request body. "ids" must be an array and "enabled" must be a boolean.',
        });
        return;
      }

      const count = await otcAdminService.bulkToggleEnabled(ids, enabled, req.user?.id);

      res.json({
        success: true,
        message: `${count} config(s) ${enabled ? 'enabled' : 'disabled'}`,
        data: { affected: count },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk toggle risk engine
router.post(
  '/otc/configs/bulk/toggle-risk',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ids, riskEnabled } = req.body;

      if (!Array.isArray(ids) || typeof riskEnabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Invalid request body. "ids" must be an array and "riskEnabled" must be a boolean.',
        });
        return;
      }

      const count = await otcAdminService.bulkToggleRisk(ids, riskEnabled, req.user?.id);

      res.json({
        success: true,
        message: `Risk engine ${riskEnabled ? 'enabled' : 'disabled'} for ${count} config(s)`,
        data: { affected: count },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= OTC MANUAL CONTROLS =============

// Get manual control state for a symbol
router.get(
  '/otc/controls/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const control = manualControlService.getManualControl(symbol);

      res.json({
        success: true,
        data: control || {
          symbol,
          directionBias: 0,
          directionStrength: 0,
          volatilityMultiplier: 1.0,
          priceOverride: null,
          priceOverrideExpiry: null,
          isActive: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all manual controls
router.get(
  '/otc/controls',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const controls = manualControlService.getAllManualControls();

      res.json({
        success: true,
        data: controls,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set direction bias for a symbol
router.post(
  '/otc/controls/:symbol/direction',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const parsed = setDirectionBiasSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const { bias, strength, durationMinutes, reason } = parsed.data;
      await manualControlService.setDirectionBias(symbol, bias, strength, req.user!.id, durationMinutes, reason);

      const durationText = durationMinutes ? ` for ${durationMinutes} minutes` : ' (permanent)';
      res.json({
        success: true,
        message: `Direction bias set to ${bias} at ${(strength * 100).toFixed(0)}% strength${durationText}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set volatility multiplier for a symbol
router.post(
  '/otc/controls/:symbol/volatility',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const parsed = setVolatilitySchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const { multiplier, durationMinutes, reason } = parsed.data;
      await manualControlService.setVolatilityMultiplier(symbol, multiplier, req.user!.id, durationMinutes, reason);

      const durationText = durationMinutes ? ` for ${durationMinutes} minutes` : ' (permanent)';
      res.json({
        success: true,
        message: `Volatility multiplier set to ${multiplier}x${durationText}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set price override for a symbol
router.post(
  '/otc/controls/:symbol/price-override',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const parsed = setPriceOverrideSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const { price, expiryMinutes, reason } = parsed.data;
      await manualControlService.setPriceOverride(symbol, price, expiryMinutes, req.user!.id, reason);

      res.json({
        success: true,
        message: `Price override set to ${price} for ${expiryMinutes} minutes`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clear price override for a symbol
router.delete(
  '/otc/controls/:symbol/price-override',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      await manualControlService.clearPriceOverride(symbol, req.user!.id);

      res.json({
        success: true,
        message: 'Price override cleared',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clear direction bias for a symbol
router.delete(
  '/otc/controls/:symbol/direction',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      await manualControlService.clearDirectionBias(symbol, req.user!.id);

      res.json({
        success: true,
        message: 'Direction bias cleared',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clear volatility multiplier for a symbol
router.delete(
  '/otc/controls/:symbol/volatility',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      await manualControlService.clearVolatilityMultiplier(symbol, req.user!.id);

      res.json({
        success: true,
        message: 'Volatility multiplier reset to 1.0x',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset ALL controls for a symbol (convenience endpoint)
router.delete(
  '/otc/controls/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      await manualControlService.resetAllControls(symbol, req.user!.id);

      res.json({
        success: true,
        message: `All controls reset to default for ${symbol}`,
        data: {
          directionBias: 0,
          directionStrength: 0,
          volatilityMultiplier: 1.0,
          priceOverride: null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get active OTC trades
router.get(
  '/otc/trades/active',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getActiveTradesSchema.safeParse({ query: req.query });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const { symbol } = parsed.data.query;
      const trades = await manualControlService.getActiveTrades(symbol);

      res.json({
        success: true,
        data: trades,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Force trade outcome
router.post(
  '/otc/trades/:tradeId/force',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tradeId } = req.params;
      const parsed = forceTradeOutcomeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const { outcome, reason } = parsed.data;
      await manualControlService.forceTradeOutcome(tradeId, outcome, req.user!.id, reason);

      res.json({
        success: true,
        message: `Trade ${tradeId} forced to ${outcome}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all user targets
router.get(
  '/otc/users/targets',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targets = await manualControlService.getAllUserTargets();

      res.json({
        success: true,
        data: targets,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get targeting for a specific user
router.get(
  '/otc/users/:userId/target',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const target = manualControlService.getUserTargeting(userId);

      res.json({
        success: true,
        data: target,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set user targeting
router.post(
  '/otc/users/:userId/target',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const parsed = setUserTargetingSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      await manualControlService.setUserTargeting(userId, parsed.data, req.user!.id);

      res.json({
        success: true,
        message: 'User targeting set successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove user targeting
router.delete(
  '/otc/users/:userId/target',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { symbol } = req.query as { symbol?: string };

      await manualControlService.removeUserTargeting(userId, symbol || null, req.user!.id);

      res.json({
        success: true,
        message: 'User targeting removed',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get intervention log
router.get(
  '/otc/interventions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getInterventionLogSchema.safeParse({ query: req.query });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const { actionType, targetType, targetId, from, to, page, limit } = parsed.data.query;

      const result = await manualControlService.getInterventionLog({
        actionType: actionType as any,
        targetType: targetType as any,
        targetId,
        from,
        to,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= OTC HISTORY SEEDING =============

// Seed history for a single OTC symbol
router.post(
  '/otc/history/seed/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const { count, resolution, clearExisting } = req.body;

      const result = await otcHistorySeeder.seedSymbol(symbol, {
        count: count || 500,
        resolution: resolution || 60,
        clearExisting: clearExisting !== false,
      });

      // Clear the historical bars cache for this symbol so new data is used
      marketService.clearHistoricalCache(symbol);

      res.json({
        success: true,
        message: `Seeded ${result.candlesSeeded} candles for ${symbol}`,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Seed history for all enabled OTC symbols
router.post(
  '/otc/history/seed-all',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { count, resolution, clearExisting } = req.body;

      const results = await otcHistorySeeder.seedAllSymbols({
        count: count || 500,
        resolution: resolution || 60,
        clearExisting: clearExisting !== false,
      });

      const totalSeeded = results.reduce((sum, r) => sum + r.candlesSeeded, 0);
      const successful = results.filter(r => r.candlesSeeded > 0).length;

      // Clear all OTC historical bars cache so new data is used
      marketService.clearHistoricalCache();

      res.json({
        success: true,
        message: `Seeded ${totalSeeded} candles across ${successful}/${results.length} symbols`,
        data: {
          totalSeeded,
          successful,
          total: results.length,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Seed history by market type (FOREX or CRYPTO)
router.post(
  '/otc/history/seed-type/:marketType',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const marketType = req.params.marketType.toUpperCase() as 'FOREX' | 'CRYPTO';

      if (marketType !== 'FOREX' && marketType !== 'CRYPTO') {
        res.status(400).json({
          success: false,
          error: 'Invalid market type. Must be FOREX or CRYPTO.',
        });
        return;
      }

      const { count, resolution, clearExisting } = req.body;

      const results = await otcHistorySeeder.seedByMarketType(marketType, {
        count: count || 500,
        resolution: resolution || 60,
        clearExisting: clearExisting !== false,
      });

      const totalSeeded = results.reduce((sum, r) => sum + r.candlesSeeded, 0);
      const successful = results.filter(r => r.candlesSeeded > 0).length;

      // Clear all OTC historical bars cache so new data is used
      marketService.clearHistoricalCache();

      res.json({
        success: true,
        message: `Seeded ${totalSeeded} candles for ${successful}/${results.length} ${marketType} symbols`,
        data: {
          marketType,
          totalSeeded,
          successful,
          total: results.length,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get seeded history stats for a symbol
router.get(
  '/otc/history/stats/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const stats = await otcHistorySeeder.getSeededHistoryStats(symbol);

      res.json({
        success: true,
        data: {
          symbol,
          ...stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check if symbol has seeded history
router.get(
  '/otc/history/has/:symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const symbol = decodeURIComponent(req.params.symbol);
      const hasHistory = await otcHistorySeeder.hasSeededHistory(symbol);

      res.json({
        success: true,
        data: {
          symbol,
          hasSeededHistory: hasHistory,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
