import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { marketService } from '../market/market.service.js';
import { copyExecutionService } from '../copy-trading/index.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { randomUUID } from 'crypto';

interface PlaceTradeInput {
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  duration: number;
  entryPrice: number;
  marketType: 'forex' | 'crypto' | 'stock' | 'index';
}

interface TradeResult {
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
  openedAt: Date;
  closedAt: Date | null;
  expiresAt: Date;
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
  openedAt: Date;
  closedAt: Date | null;
  expiresAt: Date;
  isCopyTrade: boolean;
}

interface TradeStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  totalProfit: number;
  winRate: number;
}

class TradeServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TradeServiceError';
  }
}

export class TradeService {
  async placeTrade(userId: string, data: PlaceTradeInput): Promise<TradeResult> {
    const user = await queryOne<{ demoBalance: number; isActive: boolean }>(
      `SELECT "demoBalance", "isActive" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user || !user.isActive) {
      throw new TradeServiceError('User not found or account deactivated', 404);
    }

    if (data.amount < config.trading.minTradeAmount) {
      throw new TradeServiceError(
        `Minimum trade amount is $${config.trading.minTradeAmount}`,
        400
      );
    }

    if (data.amount > config.trading.maxTradeAmount) {
      throw new TradeServiceError(
        `Maximum trade amount is $${config.trading.maxTradeAmount}`,
        400
      );
    }

    if (data.amount > user.demoBalance) {
      throw new TradeServiceError('Insufficient balance', 400);
    }

    if (data.duration < 5 || data.duration > 86400) {
      throw new TradeServiceError('Trade duration must be between 5 seconds and 24 hours', 400);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.duration * 1000);
    const payoutPercent = config.trading.defaultPayoutPercentage;
    const tradeId = randomUUID();

    // Create trade and deduct balance atomically using transaction
    const trade = await transaction(async (client) => {
      // Insert trade
      const tradeResult = await client.query<TradeRow>(
        `INSERT INTO "Trade" (
          id, "userId", symbol, direction, amount, "entryPrice", duration,
          "payoutPercent", market, status, "expiresAt", "accountType",
          "isCopyTrade", "openedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          tradeId,
          userId,
          data.symbol,
          data.direction,
          data.amount,
          data.entryPrice,
          data.duration,
          payoutPercent,
          data.marketType.toUpperCase(),
          'OPEN',
          expiresAt,
          'DEMO',
          false,
          now
        ]
      );

      // Deduct balance
      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" - $1, "updatedAt" = $2 WHERE id = $3`,
        [data.amount, now, userId]
      );

      return tradeResult.rows[0];
    });

    logger.info('Trade placed', {
      tradeId: trade.id,
      userId,
      symbol: data.symbol,
      direction: data.direction,
      amount: data.amount,
      duration: data.duration,
    });

    this.scheduleTradeSettlement(trade.id, data.duration);

    // Copy trading: Execute copy trades for followers if user is an approved leader
    this.executeCopyTradesForLeader(userId, trade).catch((error) => {
      logger.error('Error executing copy trades', { tradeId: trade.id, error });
    });

    return {
      id: trade.id,
      userId: trade.userId,
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      duration: trade.duration,
      payoutPercent: trade.payoutPercent,
      status: trade.status,
      result: trade.result,
      profit: trade.profit,
      market: trade.market,
      accountType: trade.accountType,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
      expiresAt: trade.expiresAt,
    };
  }

  private scheduleTradeSettlement(tradeId: string, duration: number): void {
    setTimeout(async () => {
      try {
        await this.settleTrade(tradeId);
      } catch (error) {
        logger.error('Trade settlement failed', { tradeId, error });
      }
    }, duration * 1000);
  }

  async settleTrade(tradeId: string): Promise<TradeResult | null> {
    const trade = await queryOne<TradeRow>(
      `SELECT * FROM "Trade" WHERE id = $1`,
      [tradeId]
    );

    if (!trade) {
      logger.error('Trade not found for settlement', { tradeId });
      return null;
    }

    if (trade.status !== 'OPEN') {
      logger.debug('Trade already settled', { tradeId, status: trade.status });
      return null;
    }

    const exitPrice = marketService.generateExitPrice(trade.symbol, trade.entryPrice, trade.duration);
    const priceWentUp = exitPrice > trade.entryPrice;

    const won =
      (trade.direction === 'UP' && priceWentUp) ||
      (trade.direction === 'DOWN' && !priceWentUp);

    const profit = won ? trade.amount * (trade.payoutPercent / 100) : 0;
    const returnAmount = won ? trade.amount + profit : 0;
    const now = new Date();

    // Update trade and user balance atomically
    const updatedTrade = await transaction(async (client) => {
      // Update trade
      const tradeResult = await client.query<TradeRow>(
        `UPDATE "Trade" SET
          "exitPrice" = $1, status = $2, result = $3, profit = $4, "closedAt" = $5
        WHERE id = $6 RETURNING *`,
        [exitPrice, 'CLOSED', won ? 'WON' : 'LOST', won ? profit : -trade.amount, now, tradeId]
      );

      // Add return amount to user balance
      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" + $1, "updatedAt" = $2 WHERE id = $3`,
        [returnAmount, now, trade.userId]
      );

      return tradeResult.rows[0];
    });

    logger.info('Trade settled', {
      tradeId,
      result: won ? 'WON' : 'LOST',
      profit: won ? profit : -trade.amount,
      exitPrice,
    });

    // Send real-time WebSocket notification to user
    wsManager.notifyTradeSettled(trade.userId, {
      id: tradeId,
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      result: won ? 'WON' : 'LOST',
      profit: won ? profit : -trade.amount,
      exitPrice,
    });

    // Update leader stats if this user is a leader (non-copy trade)
    if (!trade.isCopyTrade) {
      this.updateLeaderStatsIfApplicable(trade.userId).catch((error) => {
        logger.error('Error updating leader stats', { userId: trade.userId, error });
      });
    }

    return {
      id: updatedTrade.id,
      userId: updatedTrade.userId,
      symbol: updatedTrade.symbol,
      direction: updatedTrade.direction,
      amount: updatedTrade.amount,
      entryPrice: updatedTrade.entryPrice,
      exitPrice: updatedTrade.exitPrice,
      duration: updatedTrade.duration,
      payoutPercent: updatedTrade.payoutPercent,
      status: updatedTrade.status,
      result: updatedTrade.result,
      profit: updatedTrade.profit,
      market: updatedTrade.market,
      accountType: updatedTrade.accountType,
      openedAt: updatedTrade.openedAt,
      closedAt: updatedTrade.closedAt,
      expiresAt: updatedTrade.expiresAt,
    };
  }

  async getUserTrades(
    userId: string,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ trades: TradeResult[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    let whereClause = `"userId" = $1`;
    const params: any[] = [userId];

    if (status) {
      whereClause += ` AND status = $2`;
      params.push(status.toUpperCase());
    }

    const [trades, countResult] = await Promise.all([
      queryMany<TradeRow>(
        `SELECT * FROM "Trade" WHERE ${whereClause}
         ORDER BY "openedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "Trade" WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      trades: trades.map((trade) => ({
        id: trade.id,
        userId: trade.userId,
        symbol: trade.symbol,
        direction: trade.direction,
        amount: trade.amount,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        duration: trade.duration,
        payoutPercent: trade.payoutPercent,
        status: trade.status,
        result: trade.result,
        profit: trade.profit,
        market: trade.market,
        accountType: trade.accountType,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        expiresAt: trade.expiresAt,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async getTradeById(tradeId: string, userId: string): Promise<TradeResult | null> {
    const trade = await queryOne<TradeRow>(
      `SELECT * FROM "Trade" WHERE id = $1 AND "userId" = $2`,
      [tradeId, userId]
    );

    if (!trade) return null;

    return {
      id: trade.id,
      userId: trade.userId,
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      duration: trade.duration,
      payoutPercent: trade.payoutPercent,
      status: trade.status,
      result: trade.result,
      profit: trade.profit,
      market: trade.market,
      accountType: trade.accountType,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
      expiresAt: trade.expiresAt,
    };
  }

  async getActiveTrades(userId: string): Promise<TradeResult[]> {
    const trades = await queryMany<TradeRow>(
      `SELECT * FROM "Trade" WHERE "userId" = $1 AND status = 'OPEN' ORDER BY "openedAt" DESC`,
      [userId]
    );

    return trades.map((trade) => ({
      id: trade.id,
      userId: trade.userId,
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      duration: trade.duration,
      payoutPercent: trade.payoutPercent,
      status: trade.status,
      result: trade.result,
      profit: trade.profit,
      market: trade.market,
      accountType: trade.accountType,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
      expiresAt: trade.expiresAt,
    }));
  }

  async getUserStats(userId: string): Promise<TradeStats> {
    const stats = await queryOne<{
      total: string;
      won: string;
      lost: string;
      profit: number;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE result = 'WON') as won,
        COUNT(*) FILTER (WHERE result = 'LOST') as lost,
        COALESCE(SUM(profit), 0) as profit
       FROM "Trade" WHERE "userId" = $1 AND status = 'CLOSED'`,
      [userId]
    );

    const totalTrades = parseInt(stats?.total || '0', 10);
    const wonTrades = parseInt(stats?.won || '0', 10);
    const lostTrades = parseInt(stats?.lost || '0', 10);
    const totalProfit = Number(stats?.profit || 0);
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      wonTrades,
      lostTrades,
      totalProfit,
      winRate,
    };
  }

  async clearUserHistory(userId: string): Promise<{ deletedCount: number }> {
    const result = await query(
      `DELETE FROM "Trade" WHERE "userId" = $1 AND status = 'CLOSED'`,
      [userId]
    );

    const deletedCount = result.rowCount || 0;
    logger.info('User trade history cleared', { userId, deletedCount });

    return { deletedCount };
  }

  private async executeCopyTradesForLeader(
    userId: string,
    trade: {
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
  ): Promise<void> {
    const leaderProfile = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM "CopyTradingLeader" WHERE "userId" = $1`,
      [userId]
    );

    if (!leaderProfile || leaderProfile.status !== 'APPROVED') {
      return;
    }

    const results = await copyExecutionService.executeCopyTrades(trade, leaderProfile.id);

    if (results.length > 0) {
      logger.info('Copy trades executed for leader', {
        leaderId: leaderProfile.id,
        originalTradeId: trade.id,
        copiedCount: results.filter((r) => r.status === 'copied').length,
        pendingCount: results.filter((r) => r.status === 'pending').length,
        skippedCount: results.filter((r) => r.status === 'skipped').length,
      });
    }
  }

  private async updateLeaderStatsIfApplicable(userId: string): Promise<void> {
    const leaderProfile = await queryOne<{ id: string }>(
      `SELECT id FROM "CopyTradingLeader" WHERE "userId" = $1`,
      [userId]
    );

    if (!leaderProfile) {
      return;
    }

    await copyExecutionService.updateLeaderStats(leaderProfile.id);
  }
}

export const tradeService = new TradeService();
export { TradeServiceError };
