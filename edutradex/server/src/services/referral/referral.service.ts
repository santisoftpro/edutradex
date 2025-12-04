import { prisma } from '../../config/database.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../../utils/logger.js';

type CommissionType = 'PROFIT_COMMISSION';
type CommissionStatus = 'PENDING' | 'CREDITED' | 'CANCELLED';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  referralCode: string;
}

interface ReferralUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  totalProfit: number;
  commissionsGenerated: number;
}

class ReferralServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ReferralServiceError';
  }
}

export class ReferralService {
  // Get or create referral settings
  async getSettings() {
    let settings = await prisma.referralSettings.findFirst();

    if (!settings) {
      settings = await prisma.referralSettings.create({
        data: {
          signupBonus: 0, // No signup bonus
          depositCommission: 0, // No deposit commission
          tradeCommission: 10, // 10% of referral's profit
          minWithdrawal: 10,
          maxCommissionPerUser: 10000,
          isActive: true,
        },
      });
    }

    return settings;
  }

  // Update referral settings (admin)
  async updateSettings(data: {
    signupBonus?: number;
    depositCommission?: number;
    tradeCommission?: number;
    minWithdrawal?: number;
    maxCommissionPerUser?: number;
    isActive?: boolean;
  }) {
    const settings = await this.getSettings();

    return prisma.referralSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  // Generate unique referral code for user
  generateReferralCode(userId: string, name: string): string {
    const namePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePrefix}${randomSuffix}`;
  }

  // Find user by referral code
  async findUserByReferralCode(referralCode: string) {
    const upperCode = referralCode.toUpperCase();

    const user = await prisma.user.findFirst({
      where: {
        referralCode: upperCode,
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
      },
    });

    return user;
  }

  // Link referral on user signup (no instant bonus)
  async linkReferral(newUserId: string, referralCode: string) {
    logger.info(`Linking referral`, { newUserId, referralCode });

    const settings = await this.getSettings();

    if (!settings.isActive) {
      logger.info('Referral system is disabled');
      return null;
    }

    // Find referrer
    const referrer = await this.findUserByReferralCode(referralCode);
    if (!referrer) {
      logger.warn(`Invalid referral code: ${referralCode}`);
      return null;
    }

    // Don't allow self-referral
    if (referrer.id === newUserId) {
      logger.warn('Self-referral attempted');
      return null;
    }

    // Update new user with referrer info
    await prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.id },
    });

    // Update referrer's total referrals
    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        totalReferrals: { increment: 1 },
      },
    });

    logger.info(`Referral linked: ${referrer.id} referred ${newUserId}`);

    return referrer;
  }

  // Calculate and credit profit commissions (run every 24 hours)
  async calculateDailyProfitCommissions() {
    const settings = await this.getSettings();

    if (!settings.isActive || settings.tradeCommission <= 0) {
      logger.info('Profit commission calculation skipped - system disabled or rate is 0');
      return { processed: 0, totalCommission: 0 };
    }

    // Get the last 24 hours
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // Find all users who were referred and have closed winning LIVE trades in the last 24 hours
    // Only LIVE account trades count for referral commissions (demo trades don't count)
    const referredUsers = await prisma.user.findMany({
      where: {
        referredBy: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        referredBy: true,
        trades: {
          where: {
            status: 'CLOSED',
            result: 'WIN',
            closedAt: { gte: since },
            accountType: 'LIVE', // Only LIVE trades count for commissions
          },
          select: {
            id: true,
            profit: true,
          },
        },
      },
    });

    let totalProcessed = 0;
    let totalCommission = 0;

    for (const user of referredUsers) {
      if (!user.referredBy || user.trades.length === 0) continue;

      // Calculate total profit from winning trades
      const totalProfit = user.trades.reduce((sum, trade) => sum + (trade.profit || 0), 0);

      if (totalProfit <= 0) continue;

      // Calculate commission
      const commissionAmount = (totalProfit * settings.tradeCommission) / 100;

      // Check if we already processed these trades (avoid duplicate commissions)
      const tradeIds = user.trades.map(t => t.id);
      const existingCommissions = await prisma.referralCommission.findMany({
        where: {
          generatorId: user.id,
          earnerId: user.referredBy,
          sourceId: { in: tradeIds },
        },
      });

      const processedTradeIds = new Set(existingCommissions.map(c => c.sourceId));
      const newTrades = user.trades.filter(t => !processedTradeIds.has(t.id));

      if (newTrades.length === 0) continue;

      const newProfit = newTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
      const newCommission = (newProfit * settings.tradeCommission) / 100;

      if (newCommission <= 0) continue;

      // Check max commission limit per user
      const existingTotal = await prisma.referralCommission.aggregate({
        where: {
          earnerId: user.referredBy,
          generatorId: user.id,
          status: 'CREDITED',
        },
        _sum: { amount: true },
      });

      const currentTotal = existingTotal._sum.amount || 0;
      const remainingLimit = settings.maxCommissionPerUser - currentTotal;

      if (remainingLimit <= 0) {
        logger.info(`Commission limit reached for user ${user.id}`);
        continue;
      }

      const finalCommission = Math.min(newCommission, remainingLimit);

      // Create commission record for each trade
      for (const trade of newTrades) {
        const tradeProfit = trade.profit || 0;
        const tradeCommission = (tradeProfit * settings.tradeCommission) / 100;

        if (tradeCommission <= 0) continue;

        await prisma.referralCommission.create({
          data: {
            earnerId: user.referredBy,
            generatorId: user.id,
            type: 'TRADE_COMMISSION',
            amount: Math.min(tradeCommission, remainingLimit),
            percentage: settings.tradeCommission,
            sourceAmount: tradeProfit,
            sourceId: trade.id,
            status: 'CREDITED',
            creditedAt: new Date(),
            description: `Commission from ${user.name}'s profit of $${tradeProfit.toFixed(2)}`,
          },
        });
      }

      // Credit referral earnings to referrer
      await prisma.user.update({
        where: { id: user.referredBy },
        data: {
          referralEarnings: { increment: finalCommission },
          demoBalance: { increment: finalCommission },
        },
      });

      totalProcessed++;
      totalCommission += finalCommission;

      logger.info(`Profit commission credited`, {
        referrerId: user.referredBy,
        generatorId: user.id,
        profit: newProfit,
        commission: finalCommission,
      });
    }

    logger.info(`Daily profit commission calculation complete`, {
      processed: totalProcessed,
      totalCommission,
    });

    return { processed: totalProcessed, totalCommission };
  }

  // Get user's referral stats
  async getUserStats(userId: string): Promise<ReferralStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        totalReferrals: true,
        referralEarnings: true,
      },
    });

    if (!user) {
      throw new ReferralServiceError('User not found', 404);
    }

    // Get active referrals count
    const activeReferrals = await prisma.user.count({
      where: {
        referredBy: userId,
        isActive: true,
      },
    });

    // Get pending earnings
    const pendingCommissions = await prisma.referralCommission.aggregate({
      where: {
        earnerId: userId,
        status: 'PENDING',
      },
      _sum: { amount: true },
    });

    // Get this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthCommissions = await prisma.referralCommission.aggregate({
      where: {
        earnerId: userId,
        status: 'CREDITED',
        creditedAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    return {
      totalReferrals: user.totalReferrals,
      activeReferrals,
      totalEarnings: user.referralEarnings,
      pendingEarnings: pendingCommissions._sum.amount || 0,
      thisMonthEarnings: thisMonthCommissions._sum.amount || 0,
      referralCode: user.referralCode || '',
    };
  }

  // Get user's referrals list
  async getUserReferrals(userId: string, page = 1, limit = 20): Promise<{
    data: ReferralUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      prisma.user.findMany({
        where: { referredBy: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          trades: {
            where: { status: 'CLOSED', result: 'WIN', accountType: 'LIVE' }, // Only LIVE trades
            select: { profit: true },
          },
          commissionsGenerated: {
            where: { earnerId: userId, status: 'CREDITED' },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { referredBy: userId } }),
    ]);

    const formattedReferrals: ReferralUser[] = referrals.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      createdAt: r.createdAt,
      totalProfit: r.trades.reduce((sum, t) => sum + (t.profit || 0), 0),
      commissionsGenerated: r.commissionsGenerated.reduce((sum, c) => sum + c.amount, 0),
    }));

    return {
      data: formattedReferrals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get user's commission history
  async getCommissionHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      prisma.referralCommission.findMany({
        where: { earnerId: userId },
        include: {
          generator: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.referralCommission.count({ where: { earnerId: userId } }),
    ]);

    return {
      data: commissions.map((c) => ({
        id: c.id,
        type: c.type,
        amount: c.amount,
        percentage: c.percentage,
        sourceAmount: c.sourceAmount,
        status: c.status,
        description: c.description,
        generatorName: c.generator.name,
        createdAt: c.createdAt,
        creditedAt: c.creditedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Get all referral stats
  async getAdminStats() {
    const [
      totalReferrals,
      totalCommissions,
      pendingCommissions,
      thisMonthCommissions,
      topReferrers,
    ] = await Promise.all([
      prisma.user.count({ where: { referredBy: { not: null } } }),
      prisma.referralCommission.aggregate({
        where: { status: 'CREDITED' },
        _sum: { amount: true },
      }),
      prisma.referralCommission.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.referralCommission.aggregate({
        where: {
          status: 'CREDITED',
          creditedAt: { gte: new Date(new Date().setDate(1)) },
        },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        where: { totalReferrals: { gt: 0 } },
        orderBy: { totalReferrals: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          totalReferrals: true,
          referralEarnings: true,
        },
      }),
    ]);

    return {
      totalReferrals,
      totalCommissionsPaid: totalCommissions._sum.amount || 0,
      pendingCommissions: pendingCommissions._sum.amount || 0,
      thisMonthCommissions: thisMonthCommissions._sum.amount || 0,
      topReferrers,
    };
  }

  // Admin: Manually trigger commission calculation
  async triggerCommissionCalculation() {
    return this.calculateDailyProfitCommissions();
  }
}

export const referralService = new ReferralService();
export { ReferralServiceError };
