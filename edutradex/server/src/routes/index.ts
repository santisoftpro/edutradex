import { Router } from 'express';
import authRoutes from './auth.routes.js';
import tradeRoutes from './trade.routes.js';
import marketRoutes from './market.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/trades', tradeRoutes);
router.use('/market', marketRoutes);
router.use('/admin', adminRoutes);

export default router;
