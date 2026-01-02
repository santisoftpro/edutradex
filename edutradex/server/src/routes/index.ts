import { Router } from 'express';
import authRoutes from './auth.routes.js';
import twoFactorRoutes from './two-factor.routes.js';
import tradeRoutes from './trade.routes.js';
import marketRoutes from './market.routes.js';
import adminRoutes from './admin.routes.js';
import superadminRoutes from './superadmin.routes.js';
import depositRoutes from './deposit.routes.js';
import spreadRoutes from './spread.routes.js';
import withdrawalRoutes from './withdrawal.routes.js';
import paymentMethodRoutes from './payment-method.routes.js';
import copyTradingRoutes from './copy-trading.routes.js';
import referralRoutes from './referral.routes.js';
import emailRoutes from './email.routes.js';
import kycRoutes from './kyc.routes.js';
import settingsRoutes from './settings.routes.js';
import supportRoutes from './support.routes.js';
import simulatedLeaderRoutes from './simulated-leader.routes.js';
import securityRoutes from './security.routes.js';
import profileRoutes from './profile.routes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth/2fa', twoFactorRoutes);
router.use('/trades', tradeRoutes);
router.use('/market', marketRoutes);
router.use('/admin', adminRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/deposits', depositRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/admin/spreads', spreadRoutes);
router.use('/admin/security', securityRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/copy-trading', copyTradingRoutes);
router.use('/referral', referralRoutes);
router.use('/email', emailRoutes);
router.use('/kyc', kycRoutes);
router.use('/settings', settingsRoutes);
router.use('/support', supportRoutes);
router.use('/simulated-leaders', simulatedLeaderRoutes);
router.use('/user', profileRoutes);

export default router;
