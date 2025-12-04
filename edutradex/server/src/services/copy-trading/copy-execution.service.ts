import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';
import { wsManager } from '../websocket/websocket.manager.js';

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

    const followers = await prisma.copyTradingFollower.findMany({
      where: {
        leaderId,
        isActive: true,
      },
      include: {
        follower: {
          select: { id: true, demoBalance: true, isActive: true },
        },
      },
    });

    if (followers.length === 0) {
      return results;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const follow of followers) {
      try {
        if (!follow.follower.isActive) {
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
          await prisma.copyTradingFollower.update({
            where: { id: follow.id },
            data: { tradesToday: 0, lastTradeDate: today },
          });
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

        if (follow.fixedAmount > follow.follower.demoBalance) {
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

    const [copiedTrade] = await prisma.$transaction([
      prisma.trade.create({
        data: {
          userId: follow.followerId,
          symbol: originalTrade.symbol,
          direction: originalTrade.direction,
          amount: follow.fixedAmount,
          entryPrice: originalTrade.entryPrice,
          duration: originalTrade.duration,
          market: originalTrade.market,
          payoutPercent,
          status: 'OPEN',
          isCopyTrade: true,
          expiresAt: originalTrade.expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: follow.followerId },
        data: {
          demoBalance: { decrement: follow.fixedAmount },
        },
      }),
      prisma.copyTradingFollower.update({
        where: { id: follow.id },
        data: {
          tradesToday: { increment: 1 },
          totalCopied: { increment: 1 },
        },
      }),
    ]);

    await prisma.copiedTrade.create({
      data: {
        followerId: follow.id,
        leaderId,
        originalTradeId: originalTrade.id,
        copiedTradeId: copiedTrade.id,
        amount: follow.fixedAmount,
      },
    });

    this.scheduleTradeSettlement(copiedTrade.id, originalTrade.duration, follow.id, leaderId);

    // Get leader name for notification
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
      select: { displayName: true },
    });

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

    const pendingTrade = await prisma.pendingCopyTrade.create({
      data: {
        followerId: follow.id,
        originalTradeId: originalTrade.id,
        symbol: originalTrade.symbol,
        direction: originalTrade.direction,
        suggestedAmount: follow.fixedAmount,
        entryPrice: originalTrade.entryPrice,
        duration: originalTrade.duration,
        market: originalTrade.market,
        expiresAt,
      },
      include: {
        followerRel: {
          include: {
            leader: { select: { displayName: true } },
          },
        },
      },
    });

    // Send WebSocket notification to follower
    wsManager.notifyPendingCopyTrade(follow.followerId, {
      pendingTradeId: pendingTrade.id,
      originalTradeId: originalTrade.id,
      symbol: originalTrade.symbol,
      direction: originalTrade.direction,
      suggestedAmount: follow.fixedAmount,
      leaderName: pendingTrade.followerRel.leader.displayName,
      expiresAt,
    });

    logger.info('Pending copy trade created', {
      followerId: follow.followerId,
      originalTradeId: originalTrade.id,
    });
  }

  async getPendingTrades(userId: string): Promise<PendingTradeInfo[]> {
    const followerRelations = await prisma.copyTradingFollower.findMany({
      where: { followerId: userId },
      select: { id: true },
    });

    const followerIds = followerRelations.map((f) => f.id);

    if (followerIds.length === 0) {
      return [];
    }

    const pendingTrades = await prisma.pendingCopyTrade.findMany({
      where: {
        followerId: { in: followerIds },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        originalTrade: {
          select: { id: true, result: true },
        },
        followerRel: {
          include: {
            leader: {
              select: { id: true, displayName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pendingTrades.map((pt) => ({
      id: pt.id,
      symbol: pt.symbol,
      direction: pt.direction,
      suggestedAmount: pt.suggestedAmount,
      entryPrice: pt.entryPrice,
      duration: pt.duration,
      market: pt.market,
      status: pt.status,
      expiresAt: pt.expiresAt,
      createdAt: pt.createdAt,
      originalTrade: {
        id: pt.originalTrade.id,
        result: pt.originalTrade.result,
      },
      leader: pt.followerRel.leader,
    }));
  }

  async approvePendingTrade(pendingId: string, userId: string): Promise<{ tradeId: string }> {
    const pending = await prisma.pendingCopyTrade.findUnique({
      where: { id: pendingId },
      include: {
        followerRel: {
          include: {
            follower: { select: { id: true, demoBalance: true } },
            leader: { select: { id: true } },
          },
        },
        originalTrade: true,
      },
    });

    if (!pending) {
      throw new CopyExecutionServiceError('Pending trade not found', 404);
    }

    if (pending.followerRel.follower.id !== userId) {
      throw new CopyExecutionServiceError('Not authorized', 403);
    }

    if (pending.status !== 'PENDING') {
      throw new CopyExecutionServiceError('Trade already processed', 400);
    }

    if (new Date() > pending.expiresAt) {
      await prisma.pendingCopyTrade.update({
        where: { id: pendingId },
        data: { status: 'EXPIRED', processedAt: new Date() },
      });
      throw new CopyExecutionServiceError('Trade has expired', 400);
    }

    if (pending.originalTrade.status !== 'OPEN') {
      await prisma.pendingCopyTrade.update({
        where: { id: pendingId },
        data: { status: 'EXPIRED', processedAt: new Date() },
      });
      throw new CopyExecutionServiceError('Original trade already settled', 400);
    }

    if (pending.suggestedAmount > pending.followerRel.follower.demoBalance) {
      throw new CopyExecutionServiceError('Insufficient balance', 400);
    }

    const remainingDuration = Math.max(
      5,
      Math.floor((pending.originalTrade.expiresAt.getTime() - Date.now()) / 1000)
    );

    const payoutPercent = config.trading.defaultPayoutPercentage;
    const expiresAt = new Date(Date.now() + remainingDuration * 1000);

    const [copiedTrade] = await prisma.$transaction([
      prisma.trade.create({
        data: {
          userId,
          symbol: pending.symbol,
          direction: pending.direction,
          amount: pending.suggestedAmount,
          entryPrice: pending.entryPrice,
          duration: remainingDuration,
          market: pending.market,
          payoutPercent,
          status: 'OPEN',
          isCopyTrade: true,
          expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          demoBalance: { decrement: pending.suggestedAmount },
        },
      }),
      prisma.copyTradingFollower.update({
        where: { id: pending.followerRel.id },
        data: {
          tradesToday: { increment: 1 },
          totalCopied: { increment: 1 },
        },
      }),
      prisma.pendingCopyTrade.update({
        where: { id: pendingId },
        data: { status: 'APPROVED', processedAt: new Date() },
      }),
    ]);

    await prisma.copiedTrade.create({
      data: {
        followerId: pending.followerRel.id,
        leaderId: pending.followerRel.leader.id,
        originalTradeId: pending.originalTradeId,
        copiedTradeId: copiedTrade.id,
        amount: pending.suggestedAmount,
      },
    });

    this.scheduleTradeSettlement(
      copiedTrade.id,
      remainingDuration,
      pending.followerRel.id,
      pending.followerRel.leader.id
    );

    logger.info('Manual copy trade approved', {
      userId,
      copiedTradeId: copiedTrade.id,
      pendingId,
    });

    return { tradeId: copiedTrade.id };
  }

  async rejectPendingTrade(pendingId: string, userId: string): Promise<void> {
    const pending = await prisma.pendingCopyTrade.findUnique({
      where: { id: pendingId },
      include: {
        followerRel: {
          include: {
            follower: { select: { id: true } },
          },
        },
      },
    });

    if (!pending) {
      throw new CopyExecutionServiceError('Pending trade not found', 404);
    }

    if (pending.followerRel.follower.id !== userId) {
      throw new CopyExecutionServiceError('Not authorized', 403);
    }

    if (pending.status !== 'PENDING') {
      throw new CopyExecutionServiceError('Trade already processed', 400);
    }

    await prisma.pendingCopyTrade.update({
      where: { id: pendingId },
      data: { status: 'REJECTED', processedAt: new Date() },
    });

    logger.info('Manual copy trade rejected', { userId, pendingId });
  }

  async expirePendingTrades(): Promise<number> {
    const result = await prisma.pendingCopyTrade.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
        processedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.info('Expired pending copy trades', { count: result.count });
    }

    return result.count;
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
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade || trade.status !== 'CLOSED') {
      return;
    }

    const profit = trade.profit ?? 0;

    await prisma.$transaction([
      prisma.copiedTrade.updateMany({
        where: { copiedTradeId: tradeId },
        data: { profit },
      }),
      prisma.copyTradingFollower.update({
        where: { id: followRelationId },
        data: {
          totalProfit: { increment: profit },
        },
      }),
    ]);
  }

  async updateLeaderStats(leaderId: string): Promise<void> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
      select: { userId: true },
    });

    if (!leader) return;

    const trades = await prisma.trade.findMany({
      where: {
        userId: leader.userId,
        status: 'CLOSED',
        isCopyTrade: false,
      },
      select: { result: true, profit: true },
    });

    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.result === 'WON').length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit ?? 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: {
        totalTrades,
        winningTrades,
        totalProfit,
        winRate,
      },
    });

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
    const skip = (page - 1) * limit;

    const followerRelations = await prisma.copyTradingFollower.findMany({
      where: { followerId: userId },
      select: { id: true },
    });

    const followerIds = followerRelations.map((f) => f.id);

    if (followerIds.length === 0) {
      return { history: [], total: 0 };
    }

    const [history, total] = await Promise.all([
      prisma.copiedTrade.findMany({
        where: { followerId: { in: followerIds } },
        include: {
          originalTrade: {
            select: { id: true, symbol: true, direction: true, result: true },
          },
          copiedTrade: {
            select: { id: true, symbol: true, direction: true, result: true, status: true },
          },
          leader: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.copiedTrade.count({ where: { followerId: { in: followerIds } } }),
    ]);

    return {
      history: history.map((h) => ({
        id: h.id,
        amount: h.amount,
        profit: h.profit,
        createdAt: h.createdAt,
        originalTrade: h.originalTrade,
        copiedTrade: h.copiedTrade,
        leader: h.leader,
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
    const followerRelations = await prisma.copyTradingFollower.findMany({
      where: { followerId: userId },
      select: { id: true, totalCopied: true, totalProfit: true },
    });

    const followerIds = followerRelations.map((f) => f.id);

    if (followerIds.length === 0) {
      return {
        totalCopied: 0,
        totalProfit: 0,
        winRate: 0,
        leadersFollowing: 0,
      };
    }

    const copiedTrades = await prisma.copiedTrade.findMany({
      where: { followerId: { in: followerIds } },
      include: {
        copiedTrade: { select: { result: true } },
      },
    });

    const totalCopied = copiedTrades.length;
    const wonTrades = copiedTrades.filter((ct) => ct.copiedTrade.result === 'WON').length;
    const totalProfit = followerRelations.reduce((sum, f) => sum + f.totalProfit, 0);
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
