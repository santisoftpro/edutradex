import { Router } from 'express';
import authRoutes from './auth.routes.js';
import tradeRoutes from './trade.routes.js';
import marketRoutes from './market.routes.js';
import adminRoutes from './admin.routes.js';
import depositRoutes from './deposit.routes.js';
import spreadRoutes from './spread.routes.js';
import withdrawalRoutes from './withdrawal.routes.js';
import paymentMethodRoutes from './payment-method.routes.js';
import copyTradingRoutes from './copy-trading.routes.js';
import referralRoutes from './referral.routes.js';
import emailRoutes from './email.routes.js';
import kycRoutes from './kyc.routes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/trades', tradeRoutes);
router.use('/market', marketRoutes);
router.use('/admin', adminRoutes);
router.use('/deposits', depositRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/admin/spreads', spreadRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/copy-trading', copyTradingRoutes);
router.use('/referral', referralRoutes);
router.use('/email', emailRoutes);
router.use('/kyc', kycRoutes);

export default router;
