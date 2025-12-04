import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  copyTradingService,
  copyExecutionService,
  CopyTradingServiceError,
  CopyExecutionServiceError,
} from '../services/copy-trading/index.js';
import {
  becomeLeaderBodySchema,
  updateLeaderProfileBodySchema,
  followLeaderBodySchema,
  updateFollowSettingsBodySchema,
  leaderIdParamsSchema,
  idParamsSchema,
  discoverLeadersQuerySchema,
  paginationQuerySchema,
} from '../validators/copy-trading.validators.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================
// Leader Routes
// =====================================

// Apply to become a leader
router.post(
  '/become-leader',
  validateBody(becomeLeaderBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const leader = await copyTradingService.becomeLeader(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Leader application submitted successfully. Awaiting admin approval.',
        data: leader,
      });
    } catch (error) {
      if (error instanceof CopyTradingServiceError) {
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

// Get my leader profile
router.get(
  '/my-leader-profile',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const leader = await copyTradingService.getMyLeaderProfile(userId);

      if (!leader) {
        res.status(404).json({
          success: false,
          error: 'You do not have a leader profile',
        });
        return;
      }

      res.json({
        success: true,
        data: leader,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update my leader profile
router.patch(
  '/my-leader-profile',
  validateBody(updateLeaderProfileBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const leader = await copyTradingService.updateMyLeaderProfile(userId, req.body);

      res.json({
        success: true,
        data: leader,
      });
    } catch (error) {
      if (error instanceof CopyTradingServiceError) {
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

// Get my followers (if I'm a leader)
router.get(
  '/followers',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await copyTradingService.getMyFollowers(userId);

      res.json({
        success: true,
        data: result.followers,
        pagination: {
          total: result.total,
        },
      });
    } catch (error) {
      if (error instanceof CopyTradingServiceError) {
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

// =====================================
// Discover Leaders Routes
// =====================================

// Discover leaders
router.get(
  '/leaders',
  validateQuery(discoverLeadersQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req as any).validatedQuery || req.query;
      const userId = (req as any).user?.id;
      const result = await copyTradingService.discoverLeaders({ ...query, userId });

      res.json({
        success: true,
        data: result.leaders,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get leader profile by ID
router.get(
  '/leaders/:id',
  validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leader = await copyTradingService.getLeaderProfile(req.params.id);

      if (!leader) {
        res.status(404).json({
          success: false,
          error: 'Leader not found',
        });
        return;
      }

      // Check if user is following this leader
      const isFollowing = await copyTradingService.isFollowing(
        req.user!.id,
        req.params.id
      );

      res.json({
        success: true,
        data: {
          ...leader,
          isFollowing,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================
// Following Routes
// =====================================

// Follow a leader
router.post(
  '/follow/:leaderId',
  validateParams(leaderIdParamsSchema),
  validateBody(followLeaderBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { leaderId } = req.params;

      const follow = await copyTradingService.followLeader(userId, leaderId, req.body);

      res.status(201).json({
        success: true,
        message: 'Successfully followed leader',
        data: follow,
      });
    } catch (error) {
      if (error instanceof CopyTradingServiceError) {
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

// Unfollow a leader
router.delete(
  '/follow/:leaderId',
  validateParams(leaderIdParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { leaderId } = req.params;

      await copyTradingService.unfollowLeader(userId, leaderId);

      res.json({
        success: true,
        message: 'Successfully unfollowed leader',
      });
    } catch (error) {
      if (error instanceof CopyTradingServiceError) {
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

// Update follow settings
router.patch(
  '/follow/:leaderId',
  validateParams(leaderIdParamsSchema),
  validateBody(updateFollowSettingsBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { leaderId } = req.params;

      const follow = await copyTradingService.updateFollowSettings(
        userId,
        leaderId,
        req.body
      );

      res.json({
        success: true,
        data: follow,
      });
    } catch (error) {
      if (error instanceof CopyTradingServiceError) {
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

// Get leaders I'm following
router.get(
  '/following',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await copyTradingService.getMyFollowing(userId);

      res.json({
        success: true,
        data: result.following,
        pagination: {
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================
// Pending Trades Routes (Manual Mode)
// =====================================

// Get pending trades
router.get(
  '/pending-trades',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const pendingTrades = await copyExecutionService.getPendingTrades(userId);

      res.json({
        success: true,
        data: pendingTrades,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve pending trade
router.post(
  '/pending-trades/:id/approve',
  validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await copyExecutionService.approvePendingTrade(
        req.params.id,
        userId
      );

      res.json({
        success: true,
        message: 'Trade copied successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof CopyExecutionServiceError) {
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

// Reject pending trade
router.post(
  '/pending-trades/:id/reject',
  validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await copyExecutionService.rejectPendingTrade(req.params.id, userId);

      res.json({
        success: true,
        message: 'Trade rejected',
      });
    } catch (error) {
      if (error instanceof CopyExecutionServiceError) {
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

// =====================================
// History & Stats Routes
// =====================================

// Get copy trading history
router.get(
  '/history',
  validateQuery(paginationQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const query = (req as any).validatedQuery || req.query;
      const result = await copyExecutionService.getCopyTradingHistory(userId, {
        page: query.page || 1,
        limit: query.limit || 20,
      });

      res.json({
        success: true,
        data: result.history,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get my copy trading stats
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const stats = await copyExecutionService.getCopyTradingStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
