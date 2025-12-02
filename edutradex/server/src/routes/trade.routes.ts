import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { tradeService, TradeServiceError } from '../services/trade/trade.service.js';
import {
  placeTradeSchema,
  getTradesQuerySchema,
  type PlaceTradeInput,
} from '../validators/trade.validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validate(placeTradeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const tradeData = req.body as PlaceTradeInput;

      const trade = await tradeService.placeTrade(userId, tradeData);

      res.status(201).json({
        success: true,
        data: trade,
      });
    } catch (error) {
      if (error instanceof TradeServiceError) {
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

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const parsed = getTradesQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const { status, limit, offset } = parsed.data;
      const result = await tradeService.getUserTrades(userId, { status, limit, offset });

      res.json({
        success: true,
        data: result.trades,
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

router.get(
  '/active',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const trades = await tradeService.getActiveTrades(userId);

      res.json({
        success: true,
        data: trades,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const stats = await tradeService.getUserStats(userId);

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
  '/:tradeId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { tradeId } = req.params;

      const trade = await tradeService.getTradeById(tradeId, userId);

      if (!trade) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
        });
        return;
      }

      res.json({
        success: true,
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const result = await tradeService.clearUserHistory(userId);

      res.json({
        success: true,
        message: `Cleared ${result.deletedCount} trades from history`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
