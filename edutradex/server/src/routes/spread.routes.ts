import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { marketService } from '../services/market/market.service.js';
import { logger } from '../utils/logger.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import {
  createSpreadConfigSchema,
  updateSpreadConfigSchema,
  CreateSpreadConfigInput,
  UpdateSpreadConfigInput,
} from '../validators/spread.validators.js';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all spread configurations
router.get('/', async (req: Request, res: Response) => {
  try {
    const spreads = await prisma.spreadConfig.findMany({
      orderBy: [
        { symbol: 'asc' },
      ],
    });

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

// Get specific spread configuration
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const spread = await prisma.spreadConfig.findUnique({
      where: { symbol },
    });

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

// Create new spread configuration
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

    const existing = await prisma.spreadConfig.findUnique({
      where: { symbol: data.symbol },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Spread configuration already exists for this symbol',
      });
      return;
    }

    const spread = await prisma.spreadConfig.create({
      data: {
        symbol: data.symbol,
        markupPips: data.markupPips,
        description: data.description,
        isActive: data.isActive,
      },
    });

    logger.info('Spread configuration created', {
      symbol: spread.symbol,
      markupPips: spread.markupPips,
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

// Update spread configuration
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

    const existing = await prisma.spreadConfig.findUnique({
      where: { symbol },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Spread configuration not found',
      });
      return;
    }

    const spread = await prisma.spreadConfig.update({
      where: { symbol },
      data,
    });

    logger.info('Spread configuration updated', {
      symbol: spread.symbol,
      markupPips: spread.markupPips,
      isActive: spread.isActive,
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

// Delete spread configuration
router.delete('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const existing = await prisma.spreadConfig.findUnique({
      where: { symbol },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Spread configuration not found',
      });
      return;
    }

    await prisma.spreadConfig.delete({
      where: { symbol },
    });

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
