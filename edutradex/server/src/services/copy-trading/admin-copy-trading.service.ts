import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';

interface LeaderListOptions {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: 'createdAt' | 'winRate' | 'totalTrades' | 'followers';
  sortOrder?: 'asc' | 'desc';
}

interface LeaderDetail {
  id: string;
  userId: string;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  totalTrades: number;
  winningTrades: number;
  totalProfit: number;
  winRate: number;
  maxFollowers: number;
  isPublic: boolean;
  adminNote: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  followerCount: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  recentTrades: Array<{
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    result: string | null;
    profit: number | null;
    openedAt: Date;
  }>;
}

interface CopyTradingPlatformStats {
  totalLeaders: number;
  pendingLeaders: number;
  approvedLeaders: number;
  suspendedLeaders: number;
  totalFollowers: number;
  totalCopiedTrades: number;
  totalCopyVolume: number;
  totalCopyProfit: number;
}

interface RecentCopyActivity {
  id: string;
  type: 'leader_application' | 'leader_approved' | 'leader_suspended' | 'copy_trade';
  description: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

class AdminCopyTradingServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AdminCopyTradingServiceError';
  }
}

export class AdminCopyTradingService {
  async getPendingLeaders(
    options: { page?: number; limit?: number } = {}
  ): Promise<{ leaders: LeaderDetail[]; total: number }> {
    return this.getAllLeaders({ ...options, status: 'PENDING' });
  }

  async getAllLeaders(
    options: LeaderListOptions = {}
  ): Promise<{ leaders: LeaderDetail[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: {
      status?: string;
      OR?: Array<{
        displayName?: { contains: string };
        user?: { OR: Array<{ name?: { contains: string }; email?: { contains: string } }> };
      }>;
    } = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search } },
        {
          user: {
            OR: [{ name: { contains: search } }, { email: { contains: search } }],
          },
        },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (sortBy !== 'followers') {
      orderBy[sortBy] = sortOrder;
    }

    const [leaders, total] = await Promise.all([
      prisma.copyTradingLeader.findMany({
        where,
        orderBy: sortBy !== 'followers' ? orderBy : undefined,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { followers: true } },
        },
      }),
      prisma.copyTradingLeader.count({ where }),
    ]);

    let result = leaders.map((leader) => ({
      id: leader.id,
      userId: leader.userId,
      displayName: leader.displayName,
      description: leader.description,
      avatarUrl: leader.avatarUrl,
      status: leader.status,
      totalTrades: leader.totalTrades,
      winningTrades: leader.winningTrades,
      totalProfit: leader.totalProfit,
      winRate: leader.winRate,
      maxFollowers: leader.maxFollowers,
      isPublic: leader.isPublic,
      adminNote: leader.adminNote,
      approvedAt: leader.approvedAt,
      rejectedAt: leader.rejectedAt,
      suspendedAt: leader.suspendedAt,
      createdAt: leader.createdAt,
      updatedAt: leader.updatedAt,
      followerCount: leader._count.followers,
      user: leader.user,
      recentTrades: [],
    }));

    if (sortBy === 'followers') {
      result.sort((a, b) =>
        sortOrder === 'desc'
          ? b.followerCount - a.followerCount
          : a.followerCount - b.followerCount
      );
    }

    return { leaders: result, total };
  }

  async getLeaderDetail(leaderId: string): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { followers: true } },
      },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    const recentTrades = await prisma.trade.findMany({
      where: {
        userId: leader.userId,
        isCopyTrade: false,
      },
      select: {
        id: true,
        symbol: true,
        direction: true,
        amount: true,
        result: true,
        profit: true,
        openedAt: true,
      },
      orderBy: { openedAt: 'desc' },
      take: 10,
    });

    return {
      id: leader.id,
      userId: leader.userId,
      displayName: leader.displayName,
      description: leader.description,
      avatarUrl: leader.avatarUrl,
      status: leader.status,
      totalTrades: leader.totalTrades,
      winningTrades: leader.winningTrades,
      totalProfit: leader.totalProfit,
      winRate: leader.winRate,
      maxFollowers: leader.maxFollowers,
      isPublic: leader.isPublic,
      adminNote: leader.adminNote,
      approvedAt: leader.approvedAt,
      rejectedAt: leader.rejectedAt,
      suspendedAt: leader.suspendedAt,
      createdAt: leader.createdAt,
      updatedAt: leader.updatedAt,
      followerCount: leader._count.followers,
      user: leader.user,
      recentTrades,
    };
  }

  async approveLeader(leaderId: string, adminNote?: string): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status === 'APPROVED') {
      throw new AdminCopyTradingServiceError('Leader is already approved', 400);
    }

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: {
        status: 'APPROVED',
        adminNote,
        approvedAt: new Date(),
        rejectedAt: null,
        suspendedAt: null,
      },
    });

    // Notify user via WebSocket
    wsManager.notifyLeaderStatusChange(leader.userId, {
      leaderId,
      status: 'APPROVED',
      adminNote,
    });

    logger.info('Leader approved', { leaderId, adminNote });

    return this.getLeaderDetail(leaderId);
  }

  async rejectLeader(leaderId: string, adminNote?: string): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status === 'REJECTED') {
      throw new AdminCopyTradingServiceError('Leader is already rejected', 400);
    }

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: {
        status: 'REJECTED',
        adminNote,
        rejectedAt: new Date(),
      },
    });

    // Notify user via WebSocket
    wsManager.notifyLeaderStatusChange(leader.userId, {
      leaderId,
      status: 'REJECTED',
      adminNote,
    });

    logger.info('Leader rejected', { leaderId, adminNote });

    return this.getLeaderDetail(leaderId);
  }

  async suspendLeader(leaderId: string, reason?: string): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status === 'SUSPENDED') {
      throw new AdminCopyTradingServiceError('Leader is already suspended', 400);
    }

    if (leader.status !== 'APPROVED') {
      throw new AdminCopyTradingServiceError('Can only suspend approved leaders', 400);
    }

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: {
        status: 'SUSPENDED',
        adminNote: reason,
        suspendedAt: new Date(),
      },
    });

    // Notify user via WebSocket
    wsManager.notifyLeaderStatusChange(leader.userId, {
      leaderId,
      status: 'SUSPENDED',
      adminNote: reason,
    });

    logger.info('Leader suspended', { leaderId, reason });

    return this.getLeaderDetail(leaderId);
  }

  async reinstateLeader(leaderId: string): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status !== 'SUSPENDED') {
      throw new AdminCopyTradingServiceError('Leader is not suspended', 400);
    }

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: {
        status: 'APPROVED',
        suspendedAt: null,
      },
    });

    logger.info('Leader reinstated', { leaderId });

    return this.getLeaderDetail(leaderId);
  }

  async updateLeaderSettings(
    leaderId: string,
    data: { maxFollowers?: number; isPublic?: boolean }
  ): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: {
        maxFollowers: data.maxFollowers,
        isPublic: data.isPublic,
      },
    });

    return this.getLeaderDetail(leaderId);
  }

  async updateLeaderStats(
    leaderId: string,
    data: {
      winRate?: number;
      totalTrades?: number;
      winningTrades?: number;
      totalProfit?: number;
    }
  ): Promise<LeaderDetail> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    // Validate win rate is between 0 and 100
    if (data.winRate !== undefined && (data.winRate < 0 || data.winRate > 100)) {
      throw new AdminCopyTradingServiceError('Win rate must be between 0 and 100', 400);
    }

    // Build update data only for provided fields
    const updateData: {
      winRate?: number;
      totalTrades?: number;
      winningTrades?: number;
      totalProfit?: number;
    } = {};

    if (data.winRate !== undefined) updateData.winRate = data.winRate;
    if (data.totalTrades !== undefined) updateData.totalTrades = data.totalTrades;
    if (data.winningTrades !== undefined) updateData.winningTrades = data.winningTrades;
    if (data.totalProfit !== undefined) updateData.totalProfit = data.totalProfit;

    if (Object.keys(updateData).length === 0) {
      return this.getLeaderDetail(leaderId);
    }

    await prisma.copyTradingLeader.update({
      where: { id: leaderId },
      data: updateData,
    });

    logger.info(`Admin updated leader stats`, { leaderId, updates: updateData });

    return this.getLeaderDetail(leaderId);
  }

  async getCopyTradingStats(): Promise<CopyTradingPlatformStats> {
    const [
      totalLeaders,
      pendingLeaders,
      approvedLeaders,
      suspendedLeaders,
      totalFollowers,
      copiedTradesAgg,
    ] = await Promise.all([
      prisma.copyTradingLeader.count(),
      prisma.copyTradingLeader.count({ where: { status: 'PENDING' } }),
      prisma.copyTradingLeader.count({ where: { status: 'APPROVED' } }),
      prisma.copyTradingLeader.count({ where: { status: 'SUSPENDED' } }),
      prisma.copyTradingFollower.count(),
      prisma.copiedTrade.aggregate({
        _count: true,
        _sum: { amount: true, profit: true },
      }),
    ]);

    return {
      totalLeaders,
      pendingLeaders,
      approvedLeaders,
      suspendedLeaders,
      totalFollowers,
      totalCopiedTrades: copiedTradesAgg._count,
      totalCopyVolume: copiedTradesAgg._sum.amount ?? 0,
      totalCopyProfit: copiedTradesAgg._sum.profit ?? 0,
    };
  }

  async getRecentActivity(limit: number = 20): Promise<RecentCopyActivity[]> {
    const activities: RecentCopyActivity[] = [];

    const recentLeaders = await prisma.copyTradingLeader.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
      },
    });

    for (const leader of recentLeaders) {
      if (leader.status === 'PENDING') {
        activities.push({
          id: `leader-app-${leader.id}`,
          type: 'leader_application',
          description: `${leader.user.name} applied to become a leader`,
          timestamp: leader.createdAt,
          data: { leaderId: leader.id, displayName: leader.displayName },
        });
      }
      if (leader.approvedAt) {
        activities.push({
          id: `leader-approved-${leader.id}`,
          type: 'leader_approved',
          description: `${leader.displayName} was approved as a leader`,
          timestamp: leader.approvedAt,
          data: { leaderId: leader.id, displayName: leader.displayName },
        });
      }
      if (leader.suspendedAt) {
        activities.push({
          id: `leader-suspended-${leader.id}`,
          type: 'leader_suspended',
          description: `${leader.displayName} was suspended`,
          timestamp: leader.suspendedAt,
          data: { leaderId: leader.id, displayName: leader.displayName },
        });
      }
    }

    const recentCopiedTrades = await prisma.copiedTrade.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        leader: { select: { displayName: true } },
        follower: {
          include: {
            follower: { select: { name: true } },
          },
        },
        copiedTrade: { select: { symbol: true, result: true } },
      },
    });

    for (const ct of recentCopiedTrades) {
      activities.push({
        id: `copy-trade-${ct.id}`,
        type: 'copy_trade',
        description: `${ct.follower.follower.name} copied ${ct.leader.displayName}'s trade on ${ct.copiedTrade.symbol}`,
        timestamp: ct.createdAt,
        data: {
          copiedTradeId: ct.id,
          symbol: ct.copiedTrade.symbol,
          result: ct.copiedTrade.result,
          amount: ct.amount,
        },
      });
    }

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  async getLeaderFollowers(
    leaderId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    followers: Array<{
      id: string;
      followerId: string;
      copyMode: string;
      fixedAmount: number;
      isActive: boolean;
      totalCopied: number;
      totalProfit: number;
      createdAt: Date;
      user: { id: string; name: string; email: string };
    }>;
    total: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    const [followers, total] = await Promise.all([
      prisma.copyTradingFollower.findMany({
        where: { leaderId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.copyTradingFollower.count({ where: { leaderId } }),
    ]);

    return {
      followers: followers.map((f) => ({
        id: f.id,
        followerId: f.followerId,
        copyMode: f.copyMode,
        fixedAmount: f.fixedAmount,
        isActive: f.isActive,
        totalCopied: f.totalCopied,
        totalProfit: f.totalProfit,
        createdAt: f.createdAt,
        user: f.follower,
      })),
      total,
    };
  }
}

export const adminCopyTradingService = new AdminCopyTradingService();
export { AdminCopyTradingServiceError };
