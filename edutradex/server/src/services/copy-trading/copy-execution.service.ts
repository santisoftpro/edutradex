import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { randomUUID } from 'crypto';

interface TradeData {
  id: string;
  userId: string;
  symbol: string;
  direction: string;
  amount: number;
  entryPrice: number;
  duration: number;
  market: string;
  expiresAt: Date;
}

interface CopiedTradeResult {
  followerId: string;
  copiedTradeId: string | null;
  status: 'copied' | 'pending' | 'skipped';
  reason?: string;
}

interface PendingTradeInfo {
  id: string;
  symbol: string;
  direction: string;
  suggestedAmount: number;
  entryPrice: number;
  duration: number;
  market: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  originalTrade: {
    id: string;
    result: string | null;
  };
  leader: {
    id: string;
    displayName: string;
  };
}

interface FollowerRow {
  id: string;
  followerId: string;
  leaderId: string;
  copyMode: string;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  tradesToday: number;
  lastTradeDate: Date | null;
  createdAt: Date;
  followerBalance: number;
  followerIsActive: boolean;
}

interface TradeRow {
  id: string;
  userId: string;
  symbol: string;
  direction: string;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  duration: number;
  payoutPercent: number;
  status: string;
  result: string | null;
  profit: number | null;
  market: string;
  accountType: string;
  isCopyTrade: boolean;
  expiresAt: Date;
  openedAt: Date;
  closedAt: Date | null;
}

interface PendingCopyTradeRow {
  id: string;
  followerId: string;
  originalTradeId: string;
  symbol: string;
  direction: string;
  suggestedAmount: number;
  entryPrice: number;
  duration: number;
  market: string;
  status: string;
  expiresAt: Date;
  processedAt: Date | null;
  createdAt: Date;
}

interface CopiedTradeRow {
  id: string;
  followerId: string;
  leaderId: string;
  originalTradeId: string;
  copiedTradeId: string;
  amount: number;
  profit: number | null;
  createdAt: Date;
}

class CopyExecutionServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CopyExecutionServiceError';
  }
}

export class CopyExecutionService {
  async executeCopyTrades(
    originalTrade: TradeData,
    leaderId: string
  ): Promise<CopiedTradeResult[]> {
    const results: CopiedTradeResult[] = [];

    const followers = await queryMany<FollowerRow>(
      `SELECT f.*, u."demoBalance" as "followerBalance", u."isActive" as "followerIsActive"
       FROM "CopyTradingFollower" f
       JOIN "User" u ON u.id = f."followerId"
       WHERE f."leaderId" = $1 AND f."isActive" = true`,
      [leaderId]
    );

    if (followers.length === 0) {
      return results;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const follow of followers) {
      try {
        if (!follow.followerIsActive) {
          results.push({
            followerId: follow.followerId,
            copiedTradeId: null,
            status: 'skipped',
            reason: 'Follower account is inactive',
          });
          continue;
        }

        const shouldResetDaily =
          !follow.lastTradeDate || new Date(follow.lastTradeDate) < today;

        if (shouldResetDaily) {
          await query(
            `UPDATE "CopyTradingFollower" SET "tradesToday" = 0, "lastTradeDate" = $1, "updatedAt" = $2 WHERE id = $3`,
            [today, new Date(), follow.id]
          );
          follow.tradesToday = 0;
        }

        if (follow.tradesToday >= follow.maxDailyTrades) {
          results.push({
            followerId: follow.followerId,
            copiedTradeId: null,
            status: 'skipped',
            reason: 'Daily trade limit reached',
          });
          continue;
        }

        if (follow.fixedAmount > follow.followerBalance) {
          results.push({
            followerId: follow.followerId,
            copiedTradeId: null,
            status: 'skipped',
            reason: 'Insufficient balance',
          });
          continue;
        }

        if (follow.copyMode === 'AUTOMATIC') {
          const copiedTrade = await this.executeAutomaticCopy(
            follow,
            originalTrade,
            leaderId
          );
          results.push({
            followerId: follow.followerId,
            copiedTradeId: copiedTrade.id,
            status: 'copied',
          });
        } else {
          await this.createPendingCopyTrade(follow, originalTrade);
          results.push({
            followerId: follow.followerId,
            copiedTradeId: null,
            status: 'pending',
          });
        }
      } catch (error) {
        logger.error('Error copying trade for follower', {
          followerId: follow.followerId,
          originalTradeId: originalTrade.id,
          error,
        });
        results.push({
          followerId: follow.followerId,
          copiedTradeId: null,
          status: 'skipped',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Copy trades executed', {
      originalTradeId: originalTrade.id,
      leaderId,
      results: results.map((r) => ({ followerId: r.followerId, status: r.status })),
    });

    return results;
  }

  private async executeAutomaticCopy(
    follow: {
      id: string;
      followerId: string;
      fixedAmount: number;
      tradesToday: number;
    },
    originalTrade: TradeData,
    leaderId: string
  ) {
    const payoutPercent = config.trading.defaultPayoutPercentage;
    const tradeId = randomUUID();
    const now = new Date();

    const copiedTrade = await transaction(async (client) => {
      // Create trade
      const tradeResult = await client.query<TradeRow>(
        `INSERT INTO "Trade" (
          id, "userId", symbol, direction, amount, "entryPrice", duration,
          market, "payoutPercent", status, "isCopyTrade", "expiresAt", "accountType", "openedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          tradeId,
          follow.followerId,
          originalTrade.symbol,
          originalTrade.direction,
          follow.fixedAmount,
          originalTrade.entryPrice,
          originalTrade.duration,
          originalTrade.market,
          payoutPercent,
          'OPEN',
          true,
          originalTrade.expiresAt,
          'DEMO',
          now,
        ]
      );

      // Deduct balance
      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" - $1, "updatedAt" = $2 WHERE id = $3`,
        [follow.fixedAmount, now, follow.followerId]
      );

      // Update follower stats
      await client.query(
        `UPDATE "CopyTradingFollower" SET "tradesToday" = "tradesToday" + 1, "totalCopied" = "totalCopied" + 1, "updatedAt" = $2
         WHERE id = $1`,
        [follow.id, now]
      );

      return tradeResult.rows[0];
    });

    // Create copied trade record
    const copiedTradeRecordId = randomUUID();
    await query(
      `INSERT INTO "CopiedTrade" (id, "followerId", "leaderId", "originalTradeId", "copiedTradeId", amount, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [copiedTradeRecordId, follow.id, leaderId, originalTrade.id, copiedTrade.id, follow.fixedAmount, now]
    );

    this.scheduleTradeSettlement(copiedTrade.id, originalTrade.duration, follow.id, leaderId);

    // Get leader name for notification
    const leader = await queryOne<{ displayName: string }>(
      `SELECT "displayName" FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    // Send WebSocket notification to follower
    wsManager.notifyCopyTradeExecuted(follow.followerId, {
      copiedTradeId: copiedTrade.id,
      originalTradeId: originalTrade.id,
      symbol: originalTrade.symbol,
      direction: originalTrade.direction,
      amount: follow.fixedAmount,
      leaderName: leader?.displayName ?? 'Unknown',
    });

    logger.info('Automatic copy trade executed', {
      followerId: follow.followerId,
      copiedTradeId: copiedTrade.id,
      originalTradeId: originalTrade.id,
    });

    return copiedTrade;
  }

  private async createPendingCopyTrade(
    follow: { id: string; followerId: string; fixedAmount: number; leaderId?: string },
    originalTrade: TradeData
  ) {
    const expiresAt = new Date(originalTrade.expiresAt.getTime() - 5000);
    const id = randomUUID();
    const now = new Date();

    await query(
      `INSERT INTO "PendingCopyTrade" (
        id, "followerId", "originalTradeId", symbol, direction, "suggestedAmount",
        "entryPrice", duration, market, "expiresAt", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        follow.id,
        originalTrade.id,
        originalTrade.symbol,
        originalTrade.direction,
        follow.fixedAmount,
        originalTrade.entryPrice,
        originalTrade.duration,
        originalTrade.market,
        expiresAt,
        now,
      ]
    );

    // Get leader info for notification
    const followerRel = await queryOne<{ leaderId: string; leaderDisplayName: string }>(
      `SELECT f."leaderId", l."displayName" as "leaderDisplayName"
       FROM "CopyTradingFollower" f
       JOIN "CopyTradingLeader" l ON l.id = f."leaderId"
       WHERE f.id = $1`,
      [follow.id]
    );

    // Send WebSocket notification to follower
    wsManager.notifyPendingCopyTrade(follow.followerId, {
      pendingTradeId: id,
      originalTradeId: originalTrade.id,
      symbol: originalTrade.symbol,
      direction: originalTrade.direction,
      suggestedAmount: follow.fixedAmount,
      leaderName: followerRel?.leaderDisplayName ?? 'Unknown',
      expiresAt,
    });

    logger.info('Pending copy trade created', {
      followerId: follow.followerId,
      originalTradeId: originalTrade.id,
    });
  }

  async getPendingTrades(userId: string): Promise<PendingTradeInfo[]> {
    const followerRelations = await queryMany<{ id: string }>(
      `SELECT id FROM "CopyTradingFollower" WHERE "followerId" = $1`,
      [userId]
    );

    const followerIds = followerRelations.map((f) => f.id);

    if (followerIds.length === 0) {
      return [];
    }

    const pendingTrades = await queryMany<
      PendingCopyTradeRow & {
        originalTradeResult: string | null;
        leaderId: string;
        leaderDisplayName: string;
      }
    >(
      `SELECT pt.*, t.result as "originalTradeResult", l.id as "leaderId", l."displayName" as "leaderDisplayName"
       FROM "PendingCopyTrade" pt
       JOIN "Trade" t ON t.id = pt."originalTradeId"
       JOIN "CopyTradingFollower" f ON f.id = pt."followerId"
       JOIN "CopyTradingLeader" l ON l.id = f."leaderId"
       WHERE pt."followerId" = ANY($1) AND pt.status = 'PENDING' AND pt."expiresAt" > NOW()
       ORDER BY pt."createdAt" DESC`,
      [followerIds]
    );

    return pendingTrades.map((pt) => ({
      id: pt.id,
      symbol: pt.symbol,
      direction: pt.direction,
      suggestedAmount: Number(pt.suggestedAmount),
      entryPrice: Number(pt.entryPrice),
      duration: pt.duration,
      market: pt.market,
      status: pt.status,
      expiresAt: pt.expiresAt,
      createdAt: pt.createdAt,
      originalTrade: {
        id: pt.originalTradeId,
        result: pt.originalTradeResult,
      },
      leader: {
        id: pt.leaderId,
        displayName: pt.leaderDisplayName,
      },
    }));
  }

  async approvePendingTrade(pendingId: string, userId: string): Promise<{ tradeId: string }> {
    const pending = await queryOne<
      PendingCopyTradeRow & {
        followerRelId: string;
        followerUserId: string;
        followerBalance: number;
        leaderId: string;
        originalTradeStatus: string;
        originalTradeExpiresAt: Date;
      }
    >(
      `SELECT pt.*, f.id as "followerRelId", f."followerId" as "followerUserId",
              u."demoBalance" as "followerBalance", f."leaderId",
              t.status as "originalTradeStatus", t."expiresAt" as "originalTradeExpiresAt"
       FROM "PendingCopyTrade" pt
       JOIN "CopyTradingFollower" f ON f.id = pt."followerId"
       JOIN "User" u ON u.id = f."followerId"
       JOIN "Trade" t ON t.id = pt."originalTradeId"
       WHERE pt.id = $1`,
      [pendingId]
    );

    if (!pending) {
      throw new CopyExecutionServiceError('Pending trade not found', 404);
    }

    if (pending.followerUserId !== userId) {
      throw new CopyExecutionServiceError('Not authorized', 403);
    }

    if (pending.status !== 'PENDING') {
      throw new CopyExecutionServiceError('Trade already processed', 400);
    }

    if (new Date() > pending.expiresAt) {
      await query(
        `UPDATE "PendingCopyTrade" SET status = 'EXPIRED', "processedAt" = $1 WHERE id = $2`,
        [new Date(), pendingId]
      );
      throw new CopyExecutionServiceError('Trade has expired', 400);
    }

    if (pending.originalTradeStatus !== 'OPEN') {
      await query(
        `UPDATE "PendingCopyTrade" SET status = 'EXPIRED', "processedAt" = $1 WHERE id = $2`,
        [new Date(), pendingId]
      );
      throw new CopyExecutionServiceError('Original trade already settled', 400);
    }

    if (pending.suggestedAmount > pending.followerBalance) {
      throw new CopyExecutionServiceError('Insufficient balance', 400);
    }

    const remainingDuration = Math.max(
      5,
      Math.floor((pending.originalTradeExpiresAt.getTime() - Date.now()) / 1000)
    );

    const payoutPercent = config.trading.defaultPayoutPercentage;
    const expiresAt = new Date(Date.now() + remainingDuration * 1000);
    const tradeId = randomUUID();
    const now = new Date();

    const copiedTrade = await transaction(async (client) => {
      // Create trade
      const tradeResult = await client.query<TradeRow>(
        `INSERT INTO "Trade" (
          id, "userId", symbol, direction, amount, "entryPrice", duration,
          market, "payoutPercent", status, "isCopyTrade", "expiresAt", "accountType", "openedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          tradeId,
          userId,
          pending.symbol,
          pending.direction,
          pending.suggestedAmount,
          pending.entryPrice,
          remainingDuration,
          pending.market,
          payoutPercent,
          'OPEN',
          true,
          expiresAt,
          'DEMO',
          now,
        ]
      );

      // Deduct balance
      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" - $1, "updatedAt" = $2 WHERE id = $3`,
        [pending.suggestedAmount, now, userId]
      );

      // Update follower stats
      await client.query(
        `UPDATE "CopyTradingFollower" SET "tradesToday" = "tradesToday" + 1, "totalCopied" = "totalCopied" + 1, "updatedAt" = $2
         WHERE id = $1`,
        [pending.followerRelId, now]
      );

      // Update pending trade status
      await client.query(
        `UPDATE "PendingCopyTrade" SET status = 'APPROVED', "processedAt" = $1 WHERE id = $2`,
        [now, pendingId]
      );

      return tradeResult.rows[0];
    });

    // Create copied trade record
    const copiedTradeRecordId = randomUUID();
    await query(
      `INSERT INTO "CopiedTrade" (id, "followerId", "leaderId", "originalTradeId", "copiedTradeId", amount, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [copiedTradeRecordId, pending.followerRelId, pending.leaderId, pending.originalTradeId, copiedTrade.id, pending.suggestedAmount, now]
    );

    this.scheduleTradeSettlement(
      copiedTrade.id,
      remainingDuration,
      pending.followerRelId,
      pending.leaderId
    );

    logger.info('Manual copy trade approved', {
      userId,
      copiedTradeId: copiedTrade.id,
      pendingId,
    });

    return { tradeId: copiedTrade.id };
  }

  async rejectPendingTrade(pendingId: string, userId: string): Promise<void> {
    const pending = await queryOne<PendingCopyTradeRow & { followerUserId: string }>(
      `SELECT pt.*, f."followerId" as "followerUserId"
       FROM "PendingCopyTrade" pt
       JOIN "CopyTradingFollower" f ON f.id = pt."followerId"
       WHERE pt.id = $1`,
      [pendingId]
    );

    if (!pending) {
      throw new CopyExecutionServiceError('Pending trade not found', 404);
    }

    if (pending.followerUserId !== userId) {
      throw new CopyExecutionServiceError('Not authorized', 403);
    }

    if (pending.status !== 'PENDING') {
      throw new CopyExecutionServiceError('Trade already processed', 400);
    }

    await query(
      `UPDATE "PendingCopyTrade" SET status = 'REJECTED', "processedAt" = $1 WHERE id = $2`,
      [new Date(), pendingId]
    );

    logger.info('Manual copy trade rejected', { userId, pendingId });
  }

  async expirePendingTrades(): Promise<number> {
    const result = await query(
      `UPDATE "PendingCopyTrade" SET status = 'EXPIRED', "processedAt" = $1
       WHERE status = 'PENDING' AND "expiresAt" < NOW()`,
      [new Date()]
    );

    const count = result.rowCount || 0;

    if (count > 0) {
      logger.info('Expired pending copy trades', { count });
    }

    return count;
  }

  private scheduleTradeSettlement(
    tradeId: string,
    duration: number,
    followRelationId: string,
    leaderId: string
  ): void {
    setTimeout(async () => {
      try {
        await this.updateCopiedTradeResult(tradeId, followRelationId, leaderId);
      } catch (error) {
        logger.error('Error updating copied trade result', { tradeId, error });
      }
    }, (duration + 1) * 1000);
  }

  private async updateCopiedTradeResult(
    tradeId: string,
    followRelationId: string,
    leaderId: string
  ): Promise<void> {
    const trade = await queryOne<TradeRow>(
      `SELECT * FROM "Trade" WHERE id = $1`,
      [tradeId]
    );

    if (!trade || trade.status !== 'CLOSED') {
      return;
    }

    const profit = trade.profit ?? 0;
    const now = new Date();

    await transaction(async (client) => {
      await client.query(
        `UPDATE "CopiedTrade" SET profit = $1 WHERE "copiedTradeId" = $2`,
        [profit, tradeId]
      );

      await client.query(
        `UPDATE "CopyTradingFollower" SET "totalProfit" = "totalProfit" + $1, "updatedAt" = $3 WHERE id = $2`,
        [profit, followRelationId, now]
      );
    });
  }

  async updateLeaderStats(leaderId: string): Promise<void> {
    const leader = await queryOne<{ userId: string }>(
      `SELECT "userId" FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) return;

    const stats = await queryOne<{
      totalTrades: string;
      winningTrades: string;
      totalProfit: number;
    }>(
      `SELECT
        COUNT(*) as "totalTrades",
        COUNT(*) FILTER (WHERE result = 'WON') as "winningTrades",
        COALESCE(SUM(profit), 0) as "totalProfit"
       FROM "Trade"
       WHERE "userId" = $1 AND status = 'CLOSED' AND "isCopyTrade" = false`,
      [leader.userId]
    );

    const totalTrades = parseInt(stats?.totalTrades || '0', 10);
    const winningTrades = parseInt(stats?.winningTrades || '0', 10);
    const totalProfit = Number(stats?.totalProfit || 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    await query(
      `UPDATE "CopyTradingLeader" SET "totalTrades" = $1, "winningTrades" = $2, "totalProfit" = $3, "winRate" = $4, "updatedAt" = $5
       WHERE id = $6`,
      [totalTrades, winningTrades, totalProfit, winRate, new Date(), leaderId]
    );

    logger.debug('Leader stats updated', { leaderId, totalTrades, winRate });
  }

  async getCopyTradingHistory(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    history: Array<{
      id: string;
      amount: number;
      profit: number | null;
      createdAt: Date;
      originalTrade: {
        id: string;
        symbol: string;
        direction: string;
        result: string | null;
      };
      copiedTrade: {
        id: string;
        symbol: string;
        direction: string;
        result: string | null;
        status: string;
      };
      leader: {
        id: string;
        displayName: string;
      };
    }>;
    total: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const followerRelations = await queryMany<{ id: string }>(
      `SELECT id FROM "CopyTradingFollower" WHERE "followerId" = $1`,
      [userId]
    );

    const followerIds = followerRelations.map((f) => f.id);

    if (followerIds.length === 0) {
      return { history: [], total: 0 };
    }

    const [history, countResult] = await Promise.all([
      queryMany<
        CopiedTradeRow & {
          originalSymbol: string;
          originalDirection: string;
          originalResult: string | null;
          copiedSymbol: string;
          copiedDirection: string;
          copiedResult: string | null;
          copiedStatus: string;
          leaderDisplayName: string;
        }
      >(
        `SELECT ct.*,
          ot.symbol as "originalSymbol", ot.direction as "originalDirection", ot.result as "originalResult",
          cpt.symbol as "copiedSymbol", cpt.direction as "copiedDirection", cpt.result as "copiedResult", cpt.status as "copiedStatus",
          l."displayName" as "leaderDisplayName"
         FROM "CopiedTrade" ct
         JOIN "Trade" ot ON ot.id = ct."originalTradeId"
         JOIN "Trade" cpt ON cpt.id = ct."copiedTradeId"
         JOIN "CopyTradingLeader" l ON l.id = ct."leaderId"
         WHERE ct."followerId" = ANY($1)
         ORDER BY ct."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [followerIds, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "CopiedTrade" WHERE "followerId" = ANY($1)`,
        [followerIds]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      history: history.map((h) => ({
        id: h.id,
        amount: Number(h.amount),
        profit: h.profit !== null ? Number(h.profit) : null,
        createdAt: h.createdAt,
        originalTrade: {
          id: h.originalTradeId,
          symbol: h.originalSymbol,
          direction: h.originalDirection,
          result: h.originalResult,
        },
        copiedTrade: {
          id: h.copiedTradeId,
          symbol: h.copiedSymbol,
          direction: h.copiedDirection,
          result: h.copiedResult,
          status: h.copiedStatus,
        },
        leader: {
          id: h.leaderId,
          displayName: h.leaderDisplayName,
        },
      })),
      total,
    };
  }

  async getCopyTradingStats(userId: string): Promise<{
    totalCopied: number;
    totalProfit: number;
    winRate: number;
    leadersFollowing: number;
  }> {
    const followerRelations = await queryMany<{ id: string; totalCopied: number; totalProfit: number }>(
      `SELECT id, "totalCopied", "totalProfit" FROM "CopyTradingFollower" WHERE "followerId" = $1`,
      [userId]
    );

    const followerIds = followerRelations.map((f) => f.id);

    if (followerIds.length === 0) {
      return {
        totalCopied: 0,
        totalProfit: 0,
        winRate: 0,
        leadersFollowing: 0,
      };
    }

    const copiedTradesStats = await queryOne<{ totalCopied: string; wonTrades: string }>(
      `SELECT COUNT(*) as "totalCopied",
        COUNT(*) FILTER (WHERE t.result = 'WON') as "wonTrades"
       FROM "CopiedTrade" ct
       JOIN "Trade" t ON t.id = ct."copiedTradeId"
       WHERE ct."followerId" = ANY($1)`,
      [followerIds]
    );

    const totalCopied = parseInt(copiedTradesStats?.totalCopied || '0', 10);
    const wonTrades = parseInt(copiedTradesStats?.wonTrades || '0', 10);
    const totalProfit = followerRelations.reduce((sum, f) => sum + Number(f.totalProfit), 0);
    const winRate = totalCopied > 0 ? (wonTrades / totalCopied) * 100 : 0;

    return {
      totalCopied,
      totalProfit,
      winRate,
      leadersFollowing: followerRelations.length,
    };
  }
}

export const copyExecutionService = new CopyExecutionService();
export { CopyExecutionServiceError };
