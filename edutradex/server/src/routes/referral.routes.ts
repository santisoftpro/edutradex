import { Router, Request, Response, NextFunction } from 'express';
import { referralService, ReferralServiceError } from '../services/referral/referral.service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateSettingsSchema = z.object({
  signupBonus: z.number().min(0).optional(),
  depositCommission: z.number().min(0).max(100).optional(),
  tradeCommission: z.number().min(0).max(100).optional(),
  minWithdrawal: z.number().min(0).optional(),
  maxCommissionPerUser: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Validate referral code (public - for registration form)
router.get(
  '/validate/:code',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;

    const referrer = await referralService.findUserByReferralCode(code);

    if (!referrer) {
      res.json({
        success: false,
        valid: false,
        message: 'Invalid referral code',
      });
      return;
    }

    res.json({
      success: true,
      valid: true,
      referrer: {
        name: referrer.name,
      },
    });
  })
);

// Get referral settings (public - for showing commission rates)
router.get(
  '/settings/public',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await referralService.getSettings();

    res.json({
      success: true,
      data: {
        signupBonus: settings.signupBonus,
        depositCommission: settings.depositCommission,
        tradeCommission: settings.tradeCommission,
        isActive: settings.isActive,
      },
    });
  })
);

// ==========================================
// USER ROUTES (Authenticated)
// ==========================================

// Get user's referral stats
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const stats = await referralService.getUserStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get user's referrals list
router.get(
  '/my-referrals',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page, limit } = paginationSchema.parse(req.query);

    const result = await referralService.getUserReferrals(userId, page, limit);

    res.json({
      success: true,
      ...result,
    });
  })
);

// Get user's commission history
router.get(
  '/commissions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page, limit } = paginationSchema.parse(req.query);

    const result = await referralService.getCommissionHistory(userId, page, limit);

    res.json({
      success: true,
      ...result,
    });
  })
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get referral settings (full - admin only)
router.get(
  '/settings',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await referralService.getSettings();

    res.json({
      success: true,
      data: settings,
    });
  })
);

// Update referral settings
router.put(
  '/settings',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateSettingsSchema.parse(req.body);

    const settings = await referralService.updateSettings(data);

    res.json({
      success: true,
      message: 'Referral settings updated successfully',
      data: settings,
    });
  })
);

// Get admin referral stats
router.get(
  '/admin/stats',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await referralService.getAdminStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Trigger commission calculation (admin)
router.post(
  '/admin/calculate-commissions',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await referralService.triggerCommissionCalculation();

    res.json({
      success: true,
      message: 'Commission calculation completed',
      data: result,
    });
  })
);

// Error handling middleware
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ReferralServiceError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.issues,
    });
    return;
  }

  console.error('Referral route error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default router;
