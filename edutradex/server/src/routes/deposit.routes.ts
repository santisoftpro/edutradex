import { Router, Request, Response } from 'express';
import { depositService, DepositServiceError } from '../services/deposit/deposit.service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  mobileMoneyDepositSchema,
  cryptoDepositSchema,
  depositFiltersSchema,
  processDepositSchema,
  type MobileMoneyDepositInput,
  type CryptoDepositInput,
  type ProcessDepositInput,
} from '../validators/deposit.validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ==================== USER ROUTES ====================

/**
 * POST /api/deposits/mobile-money
 * Create a mobile money deposit request
 */
router.post(
  '/mobile-money',
  authMiddleware,
  validateBody(mobileMoneyDepositSchema),
  async (req: Request<object, object, MobileMoneyDepositInput>, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const deposit = await depositService.createMobileMoneyDeposit({
        userId: req.userId,
        amount: req.body.amount,
        phoneNumber: req.body.phoneNumber,
        mobileProvider: req.body.mobileProvider,
      });

      res.status(201).json({
        success: true,
        data: deposit,
        message: 'Deposit request submitted. Please wait for admin approval.',
      });
    } catch (error) {
      if (error instanceof DepositServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Create mobile money deposit error', { error });
      res.status(500).json({ success: false, error: 'Failed to create deposit request' });
    }
  }
);

/**
 * POST /api/deposits/crypto
 * Create a cryptocurrency deposit request
 */
router.post(
  '/crypto',
  authMiddleware,
  validateBody(cryptoDepositSchema),
  async (req: Request<object, object, CryptoDepositInput>, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const deposit = await depositService.createCryptoDeposit({
        userId: req.userId,
        amount: req.body.amount,
        cryptoCurrency: req.body.cryptoCurrency,
      });

      res.status(201).json({
        success: true,
        data: deposit,
        message: 'Deposit request submitted. Please wait for admin approval.',
      });
    } catch (error) {
      if (error instanceof DepositServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Create crypto deposit error', { error });
      res.status(500).json({ success: false, error: 'Failed to create deposit request' });
    }
  }
);

/**
 * GET /api/deposits/my
 * Get current user's deposits
 */
router.get(
  '/my',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const deposits = await depositService.getUserDeposits(req.userId, { status, limit });

      res.json({
        success: true,
        data: deposits,
      });
    } catch (error) {
      logger.error('Get user deposits error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch deposits' });
    }
  }
);

/**
 * GET /api/deposits/my-deposit-method
 * Get user's approved deposit method for withdrawal
 */
router.get(
  '/my-deposit-method',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const depositMethod = await depositService.getUserDepositMethod(req.userId);

      res.json({
        success: true,
        data: depositMethod,
      });
    } catch (error) {
      logger.error('Get user deposit method error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch deposit method' });
    }
  }
);

/**
 * GET /api/deposits/:depositId
 * Get a specific deposit (user can only see their own)
 */
router.get(
  '/:depositId',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deposit = await depositService.getDepositById(req.params.depositId, req.userId);

      res.json({
        success: true,
        data: deposit,
      });
    } catch (error) {
      if (error instanceof DepositServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Get deposit error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch deposit' });
    }
  }
);

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/deposits/admin/all
 * Get all deposits (admin only)
 */
router.get(
  '/admin/all',
  authMiddleware,
  adminMiddleware,
  validateQuery(depositFiltersSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Access validated query params from req.validatedQuery
      const validatedQuery = (req as any).validatedQuery || {};

      logger.debug('Getting all deposits with filters', { query: validatedQuery });

      // After validation, query params are already typed correctly
      const filters = {
        status: validatedQuery.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
        method: validatedQuery.method as 'MOBILE_MONEY' | 'CRYPTO' | undefined,
        userId: validatedQuery.userId as string | undefined,
        page: validatedQuery.page as number | undefined,
        limit: validatedQuery.limit as number | undefined,
      };

      logger.debug('Parsed filters', { filters });
      const result = await depositService.getAllDeposits(filters);
      logger.debug('Got deposits result', { count: result.data.length, pagination: result.pagination });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all deposits error', { error, message: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ success: false, error: 'Failed to fetch deposits' });
    }
  }
);

/**
 * GET /api/deposits/admin/stats
 * Get deposit statistics (admin only)
 */
router.get(
  '/admin/stats',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await depositService.getDepositStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get deposit stats error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch deposit stats' });
    }
  }
);

/**
 * GET /api/deposits/admin/pending-count
 * Get pending deposits count (admin only)
 */
router.get(
  '/admin/pending-count',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const count = await depositService.getPendingDepositsCount();

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      logger.error('Get pending count error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch pending count' });
    }
  }
);

/**
 * POST /api/deposits/admin/:depositId/approve
 * Approve a deposit (admin only)
 */
router.post(
  '/admin/:depositId/approve',
  authMiddleware,
  adminMiddleware,
  validateBody(processDepositSchema),
  async (req: Request<{ depositId: string }, object, ProcessDepositInput>, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const deposit = await depositService.approveDeposit(
        req.params.depositId,
        req.userId,
        req.body.adminNote
      );

      res.json({
        success: true,
        data: deposit,
        message: 'Deposit approved successfully',
      });
    } catch (error) {
      if (error instanceof DepositServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Approve deposit error', { error });
      res.status(500).json({ success: false, error: 'Failed to approve deposit' });
    }
  }
);

/**
 * POST /api/deposits/admin/:depositId/reject
 * Reject a deposit (admin only)
 */
router.post(
  '/admin/:depositId/reject',
  authMiddleware,
  adminMiddleware,
  validateBody(processDepositSchema),
  async (req: Request<{ depositId: string }, object, ProcessDepositInput>, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const deposit = await depositService.rejectDeposit(
        req.params.depositId,
        req.userId,
        req.body.adminNote
      );

      res.json({
        success: true,
        data: deposit,
        message: 'Deposit rejected',
      });
    } catch (error) {
      if (error instanceof DepositServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Reject deposit error', { error });
      res.status(500).json({ success: false, error: 'Failed to reject deposit' });
    }
  }
);

export default router;
