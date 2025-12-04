import { prisma } from '../../config/database.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { authService } from '../auth/auth.service.js';
import { marketService } from '../market/market.service.js';
import { copyExecutionService } from '../copy-trading/index.js';

interface PlaceTradeInput {
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  duration: number;
  entryPrice: number;
  marketType: 'forex' | 'otc';
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { demoBalance: true, isActive: true },
    });

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

    // Allow durations from 5 seconds to 24 hours (86400 seconds)
    if (data.duration < 5 || data.duration > 86400) {
      throw new TradeServiceError('Trade duration must be between 5 seconds and 24 hours', 400);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.duration * 1000);
    const payoutPercent = config.trading.defaultPayoutPercentage;

    const [trade] = await prisma.$transaction([
      prisma.trade.create({
        data: {
          userId,
          symbol: data.symbol,
          direction: data.direction,
          amount: data.amount,
          entryPrice: data.entryPrice,
          duration: data.duration,
          payoutPercent,
          market: data.marketType.toUpperCase(),
          status: 'OPEN',
          expiresAt,
          accountType: 'DEMO',
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          demoBalance: {
            decrement: data.amount,
          },
        },
      }),
    ]);

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
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

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

    const [updatedTrade] = await prisma.$transaction([
      prisma.trade.update({
        where: { id: tradeId },
        data: {
          exitPrice,
          status: 'CLOSED',
          result: won ? 'WON' : 'LOST',
          profit: won ? profit : -trade.amount,
          closedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: trade.userId },
        data: {
          demoBalance: {
            increment: returnAmount,
          },
        },
      }),
    ]);

    logger.info('Trade settled', {
      tradeId,
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

    const where: { userId: string; status?: string } = { userId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count({ where }),
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
      total,
    };
  }

  async getTradeById(tradeId: string, userId: string): Promise<TradeResult | null> {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
    });

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
    const trades = await prisma.trade.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

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
    const trades = await prisma.trade.findMany({
      where: { userId, status: 'CLOSED' },
      select: { result: true, profit: true },
    });

    const totalTrades = trades.length;
    const wonTrades = trades.filter((t) => t.result === 'WON').length;
    const lostTrades = trades.filter((t) => t.result === 'LOST').length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
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
    const result = await prisma.trade.deleteMany({
      where: { userId, status: 'CLOSED' },
    });

    logger.info('User trade history cleared', { userId, deletedCount: result.count });

    return { deletedCount: result.count };
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
    const leaderProfile = await prisma.copyTradingLeader.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });

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
    const leaderProfile = await prisma.copyTradingLeader.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!leaderProfile) {
      return;
    }

    await copyExecutionService.updateLeaderStats(leaderProfile.id);
  }
}

export const tradeService = new TradeService();
export { TradeServiceError };
