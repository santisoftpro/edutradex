import { Router, Request, Response } from 'express';
import { query, queryOne, queryMany } from '../config/db.js';
import { marketService } from '../services/market/market.service.js';
import { logger } from '../utils/logger.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import {
  createSpreadConfigSchema,
  updateSpreadConfigSchema,
  CreateSpreadConfigInput,
  UpdateSpreadConfigInput,
} from '../validators/spread.validators.js';
import { randomUUID } from 'crypto';

const router = Router();

interface SpreadConfigRow {
  id: string;
  symbol: string;
  markupPips: number;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const spreads = await queryMany<SpreadConfigRow>(
      `SELECT * FROM "SpreadConfig" ORDER BY symbol ASC`
    );

    res.json({
      success: true,
      data: spreads,
    });
  } catch (error) {
    logger.error('Failed to fetch spread configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spread configurations',
    });
  }
});

router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const spread = await queryOne<SpreadConfigRow>(
      `SELECT * FROM "SpreadConfig" WHERE symbol = $1`,
      [symbol]
    );

    if (!spread) {
      res.status(404).json({
        success: false,
        error: 'Spread configuration not found',
      });
      return;
    }

    res.json({
      success: true,
      data: spread,
    });
  } catch (error) {
    logger.error('Failed to fetch spread config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spread configuration',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = createSpreadConfigSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.format(),
      });
      return;
    }

    const data: CreateSpreadConfigInput = validationResult.data;

    const existing = await queryOne<{ symbol: string }>(
      `SELECT symbol FROM "SpreadConfig" WHERE symbol = $1`,
      [data.symbol]
    );

    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Spread configuration already exists for this symbol',
      });
      return;
    }

    const now = new Date();
    const spread = await queryOne<SpreadConfigRow>(
      `INSERT INTO "SpreadConfig" (id, symbol, "markupPips", description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [randomUUID(), data.symbol, data.markupPips, data.description || null, data.isActive ?? true, now, now]
    );

    logger.info('Spread configuration created', {
      symbol: spread!.symbol,
      markupPips: spread!.markupPips,
    });

    res.status(201).json({
      success: true,
      data: spread,
    });
  } catch (error) {
    logger.error('Failed to create spread config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create spread configuration',
    });
  }
});

router.put('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const validationResult = updateSpreadConfigSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.format(),
      });
      return;
    }

    const data: UpdateSpreadConfigInput = validationResult.data;

    const existing = await queryOne<SpreadConfigRow>(
      `SELECT * FROM "SpreadConfig" WHERE symbol = $1`,
      [symbol]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Spread configuration not found',
      });
      return;
    }

    const now = new Date();
    const spread = await queryOne<SpreadConfigRow>(
      `UPDATE "SpreadConfig" SET
        "markupPips" = COALESCE($1, "markupPips"),
        description = COALESCE($2, description),
        "isActive" = COALESCE($3, "isActive"),
        "updatedAt" = $4
       WHERE symbol = $5
       RETURNING *`,
      [data.markupPips, data.description, data.isActive, now, symbol]
    );

    logger.info('Spread configuration updated', {
      symbol: spread!.symbol,
      markupPips: spread!.markupPips,
      isActive: spread!.isActive,
    });

    res.json({
      success: true,
      data: spread,
    });
  } catch (error) {
    logger.error('Failed to update spread config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update spread configuration',
    });
  }
});

router.delete('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const existing = await queryOne<{ symbol: string }>(
      `SELECT symbol FROM "SpreadConfig" WHERE symbol = $1`,
      [symbol]
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Spread configuration not found',
      });
      return;
    }

    await query(
      `DELETE FROM "SpreadConfig" WHERE symbol = $1`,
      [symbol]
    );

    logger.info('Spread configuration deleted', { symbol });

    res.json({
      success: true,
      message: 'Spread configuration deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete spread config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete spread configuration',
    });
  }
});

// Reload spread configurations in market service
router.post('/reload', async (req: Request, res: Response) => {
  try {
    await marketService.reloadSpreadConfigs();

    logger.info('Spread configurations reloaded');

    res.json({
      success: true,
      message: 'Spread configurations reloaded successfully',
    });
  } catch (error) {
    logger.error('Failed to reload spread configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload spread configurations',
    });
  }
});

export default router;
