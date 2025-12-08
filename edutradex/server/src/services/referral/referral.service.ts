import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';

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

interface ReferralSettingsRow {
  id: string;
  signupBonus: number;
  depositCommission: number;
  tradeCommission: number;
  minWithdrawal: number;
  maxCommissionPerUser: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CommissionRow {
  id: string;
  earnerId: string;
  generatorId: string;
  type: string;
  amount: number;
  percentage: number;
  sourceAmount: number | null;
  sourceId: string | null;
  status: string;
  creditedAt: Date | null;
  description: string | null;
  createdAt: Date;
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
  async getSettings(): Promise<ReferralSettingsRow> {
    let settings = await queryOne<ReferralSettingsRow>(
      `SELECT * FROM "ReferralSettings" LIMIT 1`
    );

    if (!settings) {
      const id = randomUUID();
      const now = new Date();

      settings = await queryOne<ReferralSettingsRow>(
        `INSERT INTO "ReferralSettings" (
          id, "signupBonus", "depositCommission", "tradeCommission",
          "minWithdrawal", "maxCommissionPerUser", "isActive", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [id, 0, 0, 10, 10, 10000, true, now, now]
      );
    }

    return settings!;
  }

  async updateSettings(data: {
    signupBonus?: number;
    depositCommission?: number;
    tradeCommission?: number;
    minWithdrawal?: number;
    maxCommissionPerUser?: number;
    isActive?: boolean;
  }): Promise<ReferralSettingsRow> {
    const settings = await this.getSettings();
    const now = new Date();

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.signupBonus !== undefined) {
      updates.push(`"signupBonus" = $${paramIndex++}`);
      params.push(data.signupBonus);
    }
    if (data.depositCommission !== undefined) {
      updates.push(`"depositCommission" = $${paramIndex++}`);
      params.push(data.depositCommission);
    }
    if (data.tradeCommission !== undefined) {
      updates.push(`"tradeCommission" = $${paramIndex++}`);
      params.push(data.tradeCommission);
    }
    if (data.minWithdrawal !== undefined) {
      updates.push(`"minWithdrawal" = $${paramIndex++}`);
      params.push(data.minWithdrawal);
    }
    if (data.maxCommissionPerUser !== undefined) {
      updates.push(`"maxCommissionPerUser" = $${paramIndex++}`);
      params.push(data.maxCommissionPerUser);
    }
    if (data.isActive !== undefined) {
      updates.push(`"isActive" = $${paramIndex++}`);
      params.push(data.isActive);
    }

    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(now);
    params.push(settings.id);

    const result = await queryOne<ReferralSettingsRow>(
      `UPDATE "ReferralSettings" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return result!;
  }

  generateReferralCode(userId: string, name: string): string {
    const namePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePrefix}${randomSuffix}`;
  }

  async findUserByReferralCode(referralCode: string) {
    const upperCode = referralCode.toUpperCase();

    const user = await queryOne<{ id: string; name: string; referralCode: string }>(
      `SELECT id, name, "referralCode" FROM "User" WHERE "referralCode" = $1`,
      [upperCode]
    );

    return user;
  }

  async linkReferral(newUserId: string, referralCode: string) {
    logger.info(`Linking referral`, { newUserId, referralCode });

    const settings = await this.getSettings();

    if (!settings.isActive) {
      logger.info('Referral system is disabled');
      return null;
    }

    const referrer = await this.findUserByReferralCode(referralCode);
    if (!referrer) {
      logger.warn(`Invalid referral code: ${referralCode}`);
      return null;
    }

    if (referrer.id === newUserId) {
      logger.warn('Self-referral attempted');
      return null;
    }

    const now = new Date();

    await query(
      `UPDATE "User" SET "referredBy" = $1, "updatedAt" = $2 WHERE id = $3`,
      [referrer.id, now, newUserId]
    );

    await query(
      `UPDATE "User" SET "totalReferrals" = "totalReferrals" + 1, "updatedAt" = $1 WHERE id = $2`,
      [now, referrer.id]
    );

    logger.info(`Referral linked: ${referrer.id} referred ${newUserId}`);

    return referrer;
  }

  async calculateDailyProfitCommissions() {
    const settings = await this.getSettings();

    if (!settings.isActive || settings.tradeCommission <= 0) {
      logger.info('Profit commission calculation skipped - system disabled or rate is 0');
      return { processed: 0, totalCommission: 0 };
    }

    const since = new Date();
    since.setHours(since.getHours() - 24);

    // Find referred users with winning LIVE trades in the last 24 hours
    const referredUsers = await queryMany<{
      id: string;
      name: string;
      referredBy: string;
    }>(
      `SELECT id, name, "referredBy" FROM "User"
       WHERE "referredBy" IS NOT NULL AND "isActive" = true`,
      []
    );

    let totalProcessed = 0;
    let totalCommission = 0;

    for (const user of referredUsers) {
      if (!user.referredBy) continue;

      // Get winning LIVE trades for this user in the last 24 hours
      const trades = await queryMany<{ id: string; profit: number }>(
        `SELECT id, profit FROM "Trade"
         WHERE "userId" = $1 AND status = 'CLOSED' AND result = 'WON'
         AND "closedAt" >= $2 AND "accountType" = 'LIVE'`,
        [user.id, since]
      );

      if (trades.length === 0) continue;

      const totalProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
      if (totalProfit <= 0) continue;

      // Check for existing commissions on these trades
      const tradeIds = trades.map(t => t.id);
      const existingCommissions = await queryMany<{ sourceId: string }>(
        `SELECT "sourceId" FROM "ReferralCommission"
         WHERE "generatorId" = $1 AND "earnerId" = $2 AND "sourceId" = ANY($3)`,
        [user.id, user.referredBy, tradeIds]
      );

      const processedTradeIds = new Set(existingCommissions.map(c => c.sourceId));
      const newTrades = trades.filter(t => !processedTradeIds.has(t.id));

      if (newTrades.length === 0) continue;

      const newProfit = newTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
      const newCommission = (newProfit * settings.tradeCommission) / 100;

      if (newCommission <= 0) continue;

      // Check max commission limit per user
      const existingTotal = await queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission"
         WHERE "earnerId" = $1 AND "generatorId" = $2 AND status = 'CREDITED'`,
        [user.referredBy, user.id]
      );

      const currentTotal = existingTotal?.total || 0;
      const remainingLimit = settings.maxCommissionPerUser - currentTotal;

      if (remainingLimit <= 0) {
        logger.info(`Commission limit reached for user ${user.id}`);
        continue;
      }

      const finalCommission = Math.min(newCommission, remainingLimit);
      const now = new Date();

      // Create commission records and credit balance atomically
      await transaction(async (client) => {
        for (const trade of newTrades) {
          const tradeProfit = trade.profit || 0;
          const tradeCommission = (tradeProfit * settings.tradeCommission) / 100;

          if (tradeCommission <= 0) continue;

          const commissionId = randomUUID();
          await client.query(
            `INSERT INTO "ReferralCommission" (
              id, "earnerId", "generatorId", type, amount, percentage,
              "sourceAmount", "sourceId", status, "creditedAt", description, "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              commissionId,
              user.referredBy,
              user.id,
              'TRADE_COMMISSION',
              Math.min(tradeCommission, remainingLimit),
              settings.tradeCommission,
              tradeProfit,
              trade.id,
              'CREDITED',
              now,
              `Commission from ${user.name}'s profit of $${tradeProfit.toFixed(2)}`,
              now,
            ]
          );
        }

        // Credit referral earnings to referrer
        await client.query(
          `UPDATE "User" SET
            "referralEarnings" = "referralEarnings" + $1,
            "demoBalance" = "demoBalance" + $1,
            "updatedAt" = $2
           WHERE id = $3`,
          [finalCommission, now, user.referredBy]
        );
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

  async getUserStats(userId: string): Promise<ReferralStats> {
    const user = await queryOne<{
      referralCode: string | null;
      totalReferrals: number;
      referralEarnings: number;
    }>(
      `SELECT "referralCode", "totalReferrals", "referralEarnings"
       FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new ReferralServiceError('User not found', 404);
    }

    const activeReferrals = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "User"
       WHERE "referredBy" = $1 AND "isActive" = true`,
      [userId]
    );

    const pendingCommissions = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission"
       WHERE "earnerId" = $1 AND status = 'PENDING'`,
      [userId]
    );

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthCommissions = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission"
       WHERE "earnerId" = $1 AND status = 'CREDITED' AND "creditedAt" >= $2`,
      [userId, startOfMonth]
    );

    return {
      totalReferrals: user.totalReferrals,
      activeReferrals: parseInt(activeReferrals?.count || '0', 10),
      totalEarnings: Number(user.referralEarnings),
      pendingEarnings: pendingCommissions?.total || 0,
      thisMonthEarnings: thisMonthCommissions?.total || 0,
      referralCode: user.referralCode || '',
    };
  }

  async getUserReferrals(userId: string, page = 1, limit = 20): Promise<{
    data: ReferralUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const offset = (page - 1) * limit;

    const [referrals, countResult] = await Promise.all([
      queryMany<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
      }>(
        `SELECT id, name, email, "createdAt" FROM "User"
         WHERE "referredBy" = $1
         ORDER BY "createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "User" WHERE "referredBy" = $1`,
        [userId]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    // Get profits and commissions for each referral
    const formattedReferrals: ReferralUser[] = await Promise.all(
      referrals.map(async (r) => {
        const profitResult = await queryOne<{ total: number }>(
          `SELECT COALESCE(SUM(profit), 0) as total FROM "Trade"
           WHERE "userId" = $1 AND status = 'CLOSED' AND result = 'WON' AND "accountType" = 'LIVE'`,
          [r.id]
        );

        const commissionsResult = await queryOne<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission"
           WHERE "generatorId" = $1 AND "earnerId" = $2 AND status = 'CREDITED'`,
          [r.id, userId]
        );

        return {
          id: r.id,
          name: r.name,
          email: r.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          createdAt: r.createdAt,
          totalProfit: profitResult?.total || 0,
          commissionsGenerated: commissionsResult?.total || 0,
        };
      })
    );

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

  async getCommissionHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [commissions, countResult] = await Promise.all([
      queryMany<CommissionRow & { generatorName: string }>(
        `SELECT c.*, u.name as "generatorName"
         FROM "ReferralCommission" c
         JOIN "User" u ON u.id = c."generatorId"
         WHERE c."earnerId" = $1
         ORDER BY c."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "ReferralCommission" WHERE "earnerId" = $1`,
        [userId]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: commissions.map((c) => ({
        id: c.id,
        type: c.type,
        amount: c.amount,
        percentage: c.percentage,
        sourceAmount: c.sourceAmount,
        status: c.status,
        description: c.description,
        generatorName: c.generatorName,
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

  async getAdminStats() {
    const [
      totalReferralsResult,
      totalCommissionsResult,
      pendingCommissionsResult,
      thisMonthCommissionsResult,
      topReferrers,
    ] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "User" WHERE "referredBy" IS NOT NULL`
      ),
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission" WHERE status = 'CREDITED'`
      ),
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission" WHERE status = 'PENDING'`
      ),
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM "ReferralCommission"
         WHERE status = 'CREDITED' AND "creditedAt" >= date_trunc('month', CURRENT_DATE)`
      ),
      queryMany<{
        id: string;
        name: string;
        email: string;
        totalReferrals: number;
        referralEarnings: number;
      }>(
        `SELECT id, name, email, "totalReferrals", "referralEarnings"
         FROM "User"
         WHERE "totalReferrals" > 0
         ORDER BY "totalReferrals" DESC
         LIMIT 10`
      ),
    ]);

    return {
      totalReferrals: parseInt(totalReferralsResult?.count || '0', 10),
      totalCommissionsPaid: totalCommissionsResult?.total || 0,
      pendingCommissions: pendingCommissionsResult?.total || 0,
      thisMonthCommissions: thisMonthCommissionsResult?.total || 0,
      topReferrers,
    };
  }

  async triggerCommissionCalculation() {
    return this.calculateDailyProfitCommissions();
  }
}

export const referralService = new ReferralService();
export { ReferralServiceError };
