import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

interface BecomeLeaderInput {
  displayName: string;
  description?: string;
}

interface FollowLeaderInput {
  copyMode: 'AUTOMATIC' | 'MANUAL';
  fixedAmount: number;
  maxDailyTrades?: number;
}

interface UpdateFollowSettingsInput {
  copyMode?: 'AUTOMATIC' | 'MANUAL';
  fixedAmount?: number;
  maxDailyTrades?: number;
  isActive?: boolean;
}

interface DiscoverLeadersOptions {
  page?: number;
  limit?: number;
  sortBy?: 'winRate' | 'totalTrades' | 'totalProfit' | 'followers';
  sortOrder?: 'asc' | 'desc';
  minWinRate?: number;
  minTrades?: number;
  userId?: string;
}

interface LeaderProfile {
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
  followerCount: number;
  createdAt: Date;
  user?: {
    name: string;
  };
  isFollowing?: boolean;
}

interface FollowerInfo {
  id: string;
  followerId: string;
  copyMode: string;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: Date;
  follower: {
    id: string;
    name: string;
    email: string;
  };
}

interface FollowingInfo {
  id: string;
  leaderId: string;
  copyMode: string;
  fixedAmount: number;
  maxDailyTrades: number;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: Date;
  leader: LeaderProfile;
}

class CopyTradingServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CopyTradingServiceError';
  }
}

export class CopyTradingService {
  async becomeLeader(userId: string, data: BecomeLeaderInput): Promise<LeaderProfile> {
    const existingProfile = await prisma.copyTradingLeader.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new CopyTradingServiceError(
        'You already have a leader profile. Status: ' + existingProfile.status,
        409
      );
    }

    const leader = await prisma.copyTradingLeader.create({
      data: {
        userId,
        displayName: data.displayName,
        description: data.description,
        status: 'PENDING',
      },
      include: {
        user: { select: { name: true } },
        _count: { select: { followers: true } },
      },
    });

    logger.info('New leader application submitted', { userId, leaderId: leader.id });

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
      followerCount: leader._count.followers,
      createdAt: leader.createdAt,
      user: leader.user,
    };
  }

  async getMyLeaderProfile(userId: string): Promise<LeaderProfile | null> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true } },
        _count: { select: { followers: true } },
      },
    });

    if (!leader) return null;

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
      followerCount: leader._count.followers,
      createdAt: leader.createdAt,
      user: leader.user,
    };
  }

  async updateMyLeaderProfile(
    userId: string,
    data: { displayName?: string; description?: string; isPublic?: boolean }
  ): Promise<LeaderProfile> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { userId },
    });

    if (!leader) {
      throw new CopyTradingServiceError('Leader profile not found', 404);
    }

    const updated = await prisma.copyTradingLeader.update({
      where: { userId },
      data: {
        displayName: data.displayName,
        description: data.description,
        isPublic: data.isPublic,
      },
      include: {
        user: { select: { name: true } },
        _count: { select: { followers: true } },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      displayName: updated.displayName,
      description: updated.description,
      avatarUrl: updated.avatarUrl,
      status: updated.status,
      totalTrades: updated.totalTrades,
      winningTrades: updated.winningTrades,
      totalProfit: updated.totalProfit,
      winRate: updated.winRate,
      maxFollowers: updated.maxFollowers,
      isPublic: updated.isPublic,
      followerCount: updated._count.followers,
      createdAt: updated.createdAt,
      user: updated.user,
    };
  }

  async getLeaderProfile(leaderId: string): Promise<LeaderProfile | null> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
      include: {
        user: { select: { name: true } },
        _count: { select: { followers: true } },
      },
    });

    if (!leader) return null;

    if (leader.status !== 'APPROVED' && !leader.isPublic) {
      return null;
    }

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
      followerCount: leader._count.followers,
      createdAt: leader.createdAt,
      user: leader.user,
    };
  }

  async discoverLeaders(
    options: DiscoverLeadersOptions = {}
  ): Promise<{ leaders: LeaderProfile[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'winRate',
      sortOrder = 'desc',
      minWinRate,
      minTrades,
      userId,
    } = options;

    const skip = (page - 1) * limit;

    const where: {
      status: string;
      isPublic: boolean;
      winRate?: { gte: number };
      totalTrades?: { gte: number };
    } = {
      status: 'APPROVED',
      isPublic: true,
    };

    if (minWinRate !== undefined) {
      where.winRate = { gte: minWinRate };
    }

    if (minTrades !== undefined) {
      where.totalTrades = { gte: minTrades };
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (sortBy === 'followers') {
      // Will be sorted after fetching
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [leaders, total] = await Promise.all([
      prisma.copyTradingLeader.findMany({
        where,
        orderBy: sortBy !== 'followers' ? orderBy : undefined,
        skip,
        take: limit,
        include: {
          user: { select: { name: true } },
          _count: { select: { followers: true } },
        },
      }),
      prisma.copyTradingLeader.count({ where }),
    ]);

    // Get user's following list if userId is provided
    let followingLeaderIds: Set<string> = new Set();
    if (userId) {
      const userFollowing = await prisma.copyTradingFollower.findMany({
        where: { followerId: userId },
        select: { leaderId: true },
      });
      followingLeaderIds = new Set(userFollowing.map((f) => f.leaderId));
    }

    let result: LeaderProfile[] = leaders.map((leader) => ({
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
      followerCount: leader._count.followers,
      createdAt: leader.createdAt,
      user: leader.user,
      isFollowing: followingLeaderIds.has(leader.id),
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

  async followLeader(
    followerId: string,
    leaderId: string,
    settings: FollowLeaderInput
  ): Promise<FollowingInfo> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { id: leaderId },
      include: {
        user: { select: { name: true } },
        _count: { select: { followers: true } },
      },
    });

    if (!leader) {
      throw new CopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status !== 'APPROVED') {
      throw new CopyTradingServiceError('Cannot follow a leader that is not approved', 400);
    }

    if (leader.userId === followerId) {
      throw new CopyTradingServiceError('You cannot follow yourself', 400);
    }

    if (leader._count.followers >= leader.maxFollowers) {
      throw new CopyTradingServiceError('This leader has reached maximum followers', 400);
    }

    const existingFollow = await prisma.copyTradingFollower.findUnique({
      where: {
        followerId_leaderId: {
          followerId,
          leaderId,
        },
      },
    });

    if (existingFollow) {
      throw new CopyTradingServiceError('You are already following this leader', 409);
    }

    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { demoBalance: true },
    });

    if (!follower) {
      throw new CopyTradingServiceError('User not found', 404);
    }

    if (settings.fixedAmount > follower.demoBalance) {
      throw new CopyTradingServiceError(
        'Fixed amount cannot be greater than your current balance',
        400
      );
    }

    const follow = await prisma.copyTradingFollower.create({
      data: {
        followerId,
        leaderId,
        copyMode: settings.copyMode,
        fixedAmount: settings.fixedAmount,
        maxDailyTrades: settings.maxDailyTrades ?? 50,
      },
      include: {
        leader: {
          include: {
            user: { select: { name: true } },
            _count: { select: { followers: true } },
          },
        },
      },
    });

    logger.info('User followed leader', { followerId, leaderId });

    return {
      id: follow.id,
      leaderId: follow.leaderId,
      copyMode: follow.copyMode,
      fixedAmount: follow.fixedAmount,
      maxDailyTrades: follow.maxDailyTrades,
      isActive: follow.isActive,
      totalCopied: follow.totalCopied,
      totalProfit: follow.totalProfit,
      createdAt: follow.createdAt,
      leader: {
        id: follow.leader.id,
        userId: follow.leader.userId,
        displayName: follow.leader.displayName,
        description: follow.leader.description,
        avatarUrl: follow.leader.avatarUrl,
        status: follow.leader.status,
        totalTrades: follow.leader.totalTrades,
        winningTrades: follow.leader.winningTrades,
        totalProfit: follow.leader.totalProfit,
        winRate: follow.leader.winRate,
        maxFollowers: follow.leader.maxFollowers,
        isPublic: follow.leader.isPublic,
        followerCount: follow.leader._count.followers,
        createdAt: follow.leader.createdAt,
        user: follow.leader.user,
      },
    };
  }

  async unfollowLeader(followerId: string, leaderId: string): Promise<void> {
    const follow = await prisma.copyTradingFollower.findUnique({
      where: {
        followerId_leaderId: {
          followerId,
          leaderId,
        },
      },
    });

    if (!follow) {
      throw new CopyTradingServiceError('You are not following this leader', 404);
    }

    await prisma.copyTradingFollower.delete({
      where: { id: follow.id },
    });

    logger.info('User unfollowed leader', { followerId, leaderId });
  }

  async updateFollowSettings(
    followerId: string,
    leaderId: string,
    settings: UpdateFollowSettingsInput
  ): Promise<FollowingInfo> {
    const follow = await prisma.copyTradingFollower.findUnique({
      where: {
        followerId_leaderId: {
          followerId,
          leaderId,
        },
      },
    });

    if (!follow) {
      throw new CopyTradingServiceError('You are not following this leader', 404);
    }

    if (settings.fixedAmount !== undefined) {
      const user = await prisma.user.findUnique({
        where: { id: followerId },
        select: { demoBalance: true },
      });

      if (user && settings.fixedAmount > user.demoBalance) {
        throw new CopyTradingServiceError(
          'Fixed amount cannot be greater than your current balance',
          400
        );
      }
    }

    const updated = await prisma.copyTradingFollower.update({
      where: { id: follow.id },
      data: {
        copyMode: settings.copyMode,
        fixedAmount: settings.fixedAmount,
        maxDailyTrades: settings.maxDailyTrades,
        isActive: settings.isActive,
      },
      include: {
        leader: {
          include: {
            user: { select: { name: true } },
            _count: { select: { followers: true } },
          },
        },
      },
    });

    return {
      id: updated.id,
      leaderId: updated.leaderId,
      copyMode: updated.copyMode,
      fixedAmount: updated.fixedAmount,
      maxDailyTrades: updated.maxDailyTrades,
      isActive: updated.isActive,
      totalCopied: updated.totalCopied,
      totalProfit: updated.totalProfit,
      createdAt: updated.createdAt,
      leader: {
        id: updated.leader.id,
        userId: updated.leader.userId,
        displayName: updated.leader.displayName,
        description: updated.leader.description,
        avatarUrl: updated.leader.avatarUrl,
        status: updated.leader.status,
        totalTrades: updated.leader.totalTrades,
        winningTrades: updated.leader.winningTrades,
        totalProfit: updated.leader.totalProfit,
        winRate: updated.leader.winRate,
        maxFollowers: updated.leader.maxFollowers,
        isPublic: updated.leader.isPublic,
        followerCount: updated.leader._count.followers,
        createdAt: updated.leader.createdAt,
        user: updated.leader.user,
      },
    };
  }

  async getMyFollowing(
    followerId: string
  ): Promise<{ following: FollowingInfo[]; total: number }> {
    const [following, total] = await Promise.all([
      prisma.copyTradingFollower.findMany({
        where: { followerId },
        include: {
          leader: {
            include: {
              user: { select: { name: true } },
              _count: { select: { followers: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.copyTradingFollower.count({ where: { followerId } }),
    ]);

    return {
      following: following.map((f) => ({
        id: f.id,
        leaderId: f.leaderId,
        copyMode: f.copyMode,
        fixedAmount: f.fixedAmount,
        maxDailyTrades: f.maxDailyTrades,
        isActive: f.isActive,
        totalCopied: f.totalCopied,
        totalProfit: f.totalProfit,
        createdAt: f.createdAt,
        leader: {
          id: f.leader.id,
          userId: f.leader.userId,
          displayName: f.leader.displayName,
          description: f.leader.description,
          avatarUrl: f.leader.avatarUrl,
          status: f.leader.status,
          totalTrades: f.leader.totalTrades,
          winningTrades: f.leader.winningTrades,
          totalProfit: f.leader.totalProfit,
          winRate: f.leader.winRate,
          maxFollowers: f.leader.maxFollowers,
          isPublic: f.leader.isPublic,
          followerCount: f.leader._count.followers,
          createdAt: f.leader.createdAt,
          user: f.leader.user,
        },
      })),
      total,
    };
  }

  async getMyFollowers(userId: string): Promise<{ followers: FollowerInfo[]; total: number }> {
    const leader = await prisma.copyTradingLeader.findUnique({
      where: { userId },
    });

    if (!leader) {
      throw new CopyTradingServiceError('You are not a leader', 404);
    }

    const [followers, total] = await Promise.all([
      prisma.copyTradingFollower.findMany({
        where: { leaderId: leader.id },
        include: {
          follower: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.copyTradingFollower.count({ where: { leaderId: leader.id } }),
    ]);

    return {
      followers: followers.map((f) => ({
        id: f.id,
        followerId: f.followerId,
        copyMode: f.copyMode,
        fixedAmount: f.fixedAmount,
        maxDailyTrades: f.maxDailyTrades,
        isActive: f.isActive,
        totalCopied: f.totalCopied,
        totalProfit: f.totalProfit,
        createdAt: f.createdAt,
        follower: f.follower,
      })),
      total,
    };
  }

  async isFollowing(followerId: string, leaderId: string): Promise<boolean> {
    const follow = await prisma.copyTradingFollower.findUnique({
      where: {
        followerId_leaderId: {
          followerId,
          leaderId,
        },
      },
    });

    return !!follow;
  }

  async getFollowRelation(followerId: string, leaderId: string) {
    return prisma.copyTradingFollower.findUnique({
      where: {
        followerId_leaderId: {
          followerId,
          leaderId,
        },
      },
    });
  }
}

export const copyTradingService = new CopyTradingService();
export { CopyTradingServiceError };
