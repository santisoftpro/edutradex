import { Router, Request, Response } from 'express';
import { paymentMethodService, PaymentMethodServiceError } from '../services/payment-method/payment-method.service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  createCryptoPaymentMethodSchema,
  createMobileMoneyPaymentMethodSchema,
  updatePaymentMethodSchema,
  paymentMethodIdSchema,
  paymentMethodFiltersSchema,
  type CreateCryptoPaymentMethodInput,
  type CreateMobileMoneyPaymentMethodInput,
  type UpdatePaymentMethodInput,
} from '../validators/payment-method.validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ==================== PUBLIC ROUTES ====================

/**
 * GET /api/payment-methods/active
 * Get all active payment methods (for deposit page)
 */
router.get(
  '/active',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const paymentMethods = await paymentMethodService.getActivePaymentMethods();

      res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      logger.error('Get active payment methods error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
    }
  }
);

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/payment-methods/admin/all
 * Get all payment methods with filters (admin only)
 */
router.get(
  '/admin/all',
  authMiddleware,
  adminMiddleware,
  validateQuery(paymentMethodFiltersSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedQuery = (req as any).validatedQuery || {};

      const filters = {
        type: validatedQuery.type as 'CRYPTO' | 'MOBILE_MONEY' | undefined,
        isActive: validatedQuery.isActive as boolean | undefined,
        isPopular: validatedQuery.isPopular as boolean | undefined,
        page: validatedQuery.page as number | undefined,
        limit: validatedQuery.limit as number | undefined,
      };

      const result = await paymentMethodService.getAllPaymentMethods(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get all payment methods error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
    }
  }
);

/**
 * GET /api/payment-methods/admin/stats
 * Get payment method statistics (admin only)
 */
router.get(
  '/admin/stats',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await paymentMethodService.getPaymentMethodStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get payment method stats error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch payment method stats' });
    }
  }
);

/**
 * GET /api/payment-methods/admin/:id
 * Get a specific payment method (admin only)
 */
router.get(
  '/admin/:id',
  authMiddleware,
  adminMiddleware,
  validateParams(paymentMethodIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentMethod = await paymentMethodService.getPaymentMethodById(req.params.id);

      res.json({
        success: true,
        data: paymentMethod,
      });
    } catch (error) {
      if (error instanceof PaymentMethodServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Get payment method error', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch payment method' });
    }
  }
);

/**
 * POST /api/payment-methods/admin/crypto
 * Create a crypto payment method (admin only)
 */
router.post(
  '/admin/crypto',
  authMiddleware,
  adminMiddleware,
  validateBody(createCryptoPaymentMethodSchema),
  async (req: Request<object, object, CreateCryptoPaymentMethodInput>, res: Response): Promise<void> => {
    try {
      const paymentMethod = await paymentMethodService.createCryptoPaymentMethod(req.body);

      res.status(201).json({
        success: true,
        data: paymentMethod,
        message: 'Crypto payment method created successfully',
      });
    } catch (error) {
      if (error instanceof PaymentMethodServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Create crypto payment method error', { error });
      res.status(500).json({ success: false, error: 'Failed to create payment method' });
    }
  }
);

/**
 * POST /api/payment-methods/admin/mobile-money
 * Create a mobile money payment method (admin only)
 */
router.post(
  '/admin/mobile-money',
  authMiddleware,
  adminMiddleware,
  validateBody(createMobileMoneyPaymentMethodSchema),
  async (req: Request<object, object, CreateMobileMoneyPaymentMethodInput>, res: Response): Promise<void> => {
    try {
      const paymentMethod = await paymentMethodService.createMobileMoneyPaymentMethod(req.body);

      res.status(201).json({
        success: true,
        data: paymentMethod,
        message: 'Mobile money payment method created successfully',
      });
    } catch (error) {
      if (error instanceof PaymentMethodServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Create mobile money payment method error', { error });
      res.status(500).json({ success: false, error: 'Failed to create payment method' });
    }
  }
);

/**
 * PUT /api/payment-methods/admin/:id
 * Update a payment method (admin only)
 */
router.put(
  '/admin/:id',
  authMiddleware,
  adminMiddleware,
  validateParams(paymentMethodIdSchema),
  validateBody(updatePaymentMethodSchema),
  async (req: Request<{ id: string }, object, UpdatePaymentMethodInput>, res: Response): Promise<void> => {
    try {
      const paymentMethod = await paymentMethodService.updatePaymentMethod(req.params.id, req.body);

      res.json({
        success: true,
        data: paymentMethod,
        message: 'Payment method updated successfully',
      });
    } catch (error) {
      if (error instanceof PaymentMethodServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Update payment method error', { error });
      res.status(500).json({ success: false, error: 'Failed to update payment method' });
    }
  }
);

/**
 * POST /api/payment-methods/admin/:id/toggle
 * Toggle payment method active status (admin only)
 */
router.post(
  '/admin/:id/toggle',
  authMiddleware,
  adminMiddleware,
  validateParams(paymentMethodIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentMethod = await paymentMethodService.togglePaymentMethodStatus(req.params.id);

      res.json({
        success: true,
        data: paymentMethod,
        message: `Payment method ${paymentMethod.isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      if (error instanceof PaymentMethodServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Toggle payment method error', { error });
      res.status(500).json({ success: false, error: 'Failed to toggle payment method status' });
    }
  }
);

/**
 * DELETE /api/payment-methods/admin/:id
 * Delete a payment method (admin only)
 */
router.delete(
  '/admin/:id',
  authMiddleware,
  adminMiddleware,
  validateParams(paymentMethodIdSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await paymentMethodService.deletePaymentMethod(req.params.id);

      res.json({
        success: true,
        message: 'Payment method deleted successfully',
      });
    } catch (error) {
      if (error instanceof PaymentMethodServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      logger.error('Delete payment method error', { error });
      res.status(500).json({ success: false, error: 'Failed to delete payment method' });
    }
  }
);

/**
 * POST /api/payment-methods/admin/seed
 * Seed default payment methods (admin only)
 */
router.post(
  '/admin/seed',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      await paymentMethodService.seedDefaultPaymentMethods();

      res.json({
        success: true,
        message: 'Default payment methods seeded successfully',
      });
    } catch (error) {
      logger.error('Seed payment methods error', { error });
      res.status(500).json({ success: false, error: 'Failed to seed payment methods' });
    }
  }
);

export default router;
