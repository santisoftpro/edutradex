import { Router, Request, Response, NextFunction } from 'express';
import { withdrawalService, WithdrawalServiceError } from '../services/withdrawal/withdrawal.service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  mobileMoneyWithdrawalSchema,
  cryptoWithdrawalSchema,
  withdrawalFiltersSchema,
  processWithdrawalSchema,
  userWithdrawalsQuerySchema,
  sendVerificationCodeSchema,
  verifyWithdrawalCodeSchema,
} from '../validators/withdrawal.validators.js';
import { emailService } from '../services/email/email.service.js';

const router = Router();

// User routes
router.post(
  '/mobile-money',
  authMiddleware,
  validateBody(mobileMoneyWithdrawalSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is set by authMiddleware
      const withdrawal = await withdrawalService.createMobileMoneyWithdrawal({
        userId: req.user!.id,
        amount: req.body.amount,
        phoneNumber: req.body.phoneNumber,
        mobileProvider: req.body.mobileProvider,
      });

      res.status(201).json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/crypto',
  authMiddleware,
  validateBody(cryptoWithdrawalSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is set by authMiddleware
      const withdrawal = await withdrawalService.createCryptoWithdrawal({
        userId: req.user!.id,
        amount: req.body.amount,
        cryptoCurrency: req.body.cryptoCurrency,
        walletAddress: req.body.walletAddress,
        network: req.body.network,
      });

      res.status(201).json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/my',
  authMiddleware,
  validateQuery(userWithdrawalsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is set by authMiddleware
      const withdrawals = await withdrawalService.getUserWithdrawals(req.user!.id, {
        status: req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });

      res.json({
        success: true,
        data: withdrawals,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:withdrawalId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is set by authMiddleware
      const withdrawal = await withdrawalService.getWithdrawalById(
        req.params.withdrawalId,
        req.user!.id
      );

      res.json({
        success: true,
        data: withdrawal,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Withdrawal verification routes
router.post(
  '/send-verification',
  authMiddleware,
  validateBody(sendVerificationCodeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, method } = req.body;
      const user = req.user!;

      const code = await emailService.sendWithdrawalVerificationCode(
        user.email,
        user.name,
        amount,
        method
      );

      if (!code) {
        res.status(500).json({
          success: false,
          error: 'Failed to send verification code. Please try again.',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Verification code sent to your email',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/verify-code',
  authMiddleware,
  validateBody(verifyWithdrawalCodeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body;
      const user = req.user!;

      const isValid = await emailService.verifyWithdrawalCode(user.email, code);

      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired verification code',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Code verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin routes
router.get(
  '/admin/all',
  authMiddleware,
  adminMiddleware,
  validateQuery(withdrawalFiltersSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await withdrawalService.getAllWithdrawals({
        status: req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
        method: req.query.method as 'MOBILE_MONEY' | 'CRYPTO' | undefined,
        userId: req.query.userId as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/admin/stats',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await withdrawalService.getWithdrawalStats();

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
  '/admin/pending-count',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await withdrawalService.getPendingWithdrawalsCount();

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/:withdrawalId/approve',
  authMiddleware,
  adminMiddleware,
  validateBody(processWithdrawalSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is set by authMiddleware
      const withdrawal = await withdrawalService.approveWithdrawal(
        req.params.withdrawalId,
        req.user!.id,
        req.body.adminNote
      );

      res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/:withdrawalId/reject',
  authMiddleware,
  adminMiddleware,
  validateBody(processWithdrawalSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is set by authMiddleware
      const withdrawal = await withdrawalService.rejectWithdrawal(
        req.params.withdrawalId,
        req.user!.id,
        req.body.adminNote
      );

      res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal rejected',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Error handler for this router
router.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof WithdrawalServiceError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }
  next(error);
});

export default router;
