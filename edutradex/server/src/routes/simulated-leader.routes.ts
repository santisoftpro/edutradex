import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { simulatedLeaderService } from '../services/simulated-leader/index.js';

const router = Router();

// Validation schemas
const createSchema = z.object({
  displayName: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  winRate: z.number().min(0).max(100).optional(),
  totalProfit: z.number().optional(),
  totalTrades: z.number().int().min(0).optional(),
  followerCount: z.number().int().min(0).optional(),
  winRateMin: z.number().min(0).max(100).optional(),
  winRateMax: z.number().min(0).max(100).optional(),
  profitMin: z.number().optional(),
  profitMax: z.number().optional(),
  followerMin: z.number().int().min(0).optional(),
  followerMax: z.number().int().min(0).optional(),
  tradesMin: z.number().int().min(0).optional(),
  tradesMax: z.number().int().min(0).optional(),
  tradeFrequency: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

const updateSchema = createSchema.partial();

const autoGenerateSchema = z.object({
  count: z.number().int().min(1).max(20),
});

// Public route - get active simulated leaders for display
router.get(
  '/public',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const leaders = await simulatedLeaderService.getActiveForDisplay();
      res.json({ success: true, data: leaders });
    } catch (error) {
      next(error);
    }
  }
);

// Public route - get fake activity enabled setting
router.get(
  '/settings/enabled',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminService } = await import('../services/admin/admin.service.js');
      const enabled = await adminService.getSystemSetting('copy_trading_fake_activity');
      res.json({ success: true, data: { enabled: enabled === 'true' } });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// User Routes (authenticated users)
// ==========================================

const followSettingsSchema = z.object({
  copyMode: z.enum(['AUTOMATIC', 'MANUAL']).optional(),
  fixedAmount: z.number().min(1).max(10000).optional(),
  maxDailyTrades: z.number().int().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

// Follow a simulated leader
router.post(
  '/follow/:leaderId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { leaderId } = req.params;

      const parsed = followSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: parsed.error.issues,
        });
        return;
      }

      const follower = await simulatedLeaderService.followLeader(userId, leaderId, parsed.data);
      res.status(201).json({
        success: true,
        message: 'Successfully followed leader',
        data: follower,
      });
    } catch (error: any) {
      if (error.message === 'Simulated leader not found' || error.message === 'This leader is not available') {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      if (error.message === 'Already following this leader') {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  }
);

// Unfollow a simulated leader
router.delete(
  '/follow/:leaderId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { leaderId } = req.params;

      await simulatedLeaderService.unfollowLeader(userId, leaderId);
      res.json({ success: true, message: 'Successfully unfollowed leader' });
    } catch (error: any) {
      if (error.message === 'Not following this leader') {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  }
);

// Update follow settings
router.patch(
  '/follow/:leaderId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { leaderId } = req.params;

      const parsed = followSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: parsed.error.issues,
        });
        return;
      }

      const follower = await simulatedLeaderService.updateFollowSettings(userId, leaderId, parsed.data);
      res.json({ success: true, data: follower });
    } catch (error: any) {
      if (error.message === 'Not following this leader') {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  }
);

// Get user's followed simulated leaders
router.get(
  '/following',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const following = await simulatedLeaderService.getUserFollowing(userId);
      res.json({ success: true, data: following });
    } catch (error) {
      next(error);
    }
  }
);

// Get IDs of simulated leaders user is following (for UI state)
router.get(
  '/following/ids',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const ids = await simulatedLeaderService.getUserFollowingIds(userId);
      res.json({ success: true, data: ids });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// Admin Routes
// ==========================================
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all simulated leaders (admin)
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const leaders = await simulatedLeaderService.getAll();
      res.json({ success: true, data: leaders });
    } catch (error) {
      next(error);
    }
  }
);

// Get stats
router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await simulatedLeaderService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Get single simulated leader
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leader = await simulatedLeaderService.getById(req.params.id);
      if (!leader) {
        res.status(404).json({ success: false, error: 'Simulated leader not found' });
        return;
      }
      res.json({ success: true, data: leader });
    } catch (error) {
      next(error);
    }
  }
);

// Create simulated leader
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await simulatedLeaderService.create(parsed.data);
      res.status(201).json({ success: true, data: leader });
    } catch (error) {
      next(error);
    }
  }
);

// Auto-generate simulated leaders
router.post(
  '/auto-generate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = autoGenerateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: parsed.error.issues,
        });
        return;
      }

      const leaders = await simulatedLeaderService.autoGenerate(parsed.data.count);
      res.status(201).json({
        success: true,
        message: `Generated ${leaders.length} simulated leaders`,
        data: leaders,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update simulated leader
router.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: parsed.error.issues,
        });
        return;
      }

      const leader = await simulatedLeaderService.update(req.params.id, parsed.data);
      res.json({ success: true, data: leader });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ success: false, error: 'Simulated leader not found' });
        return;
      }
      next(error);
    }
  }
);

// Toggle active status
router.post(
  '/:id/toggle',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leader = await simulatedLeaderService.toggleActive(req.params.id);
      res.json({
        success: true,
        message: leader.isActive ? 'Simulated leader activated' : 'Simulated leader deactivated',
        data: leader,
      });
    } catch (error: any) {
      if (error.message === 'Simulated leader not found') {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  }
);

// Delete simulated leader
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await simulatedLeaderService.delete(req.params.id);
      res.json({ success: true, message: 'Simulated leader deleted' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ success: false, error: 'Simulated leader not found' });
        return;
      }
      next(error);
    }
  }
);

export default router;
