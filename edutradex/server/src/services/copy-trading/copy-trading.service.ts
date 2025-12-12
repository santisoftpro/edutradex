import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';

interface BecomeLeaderInput {
  displayName: string;
  description?: string;
}

interface FollowLeaderInput {
  copyMode: 'PERCENTAGE' | 'FIXED_AMOUNT';
  percentageAmount?: number;
  fixedAmount?: number;
  dailyLossLimit?: number | null;
  dailyProfitLimit?: number | null;
  maxDailyTrades?: number | null;
  unlimitedTrades?: boolean;
}

interface UpdateFollowSettingsInput {
  copyMode?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  percentageAmount?: number;
  fixedAmount?: number;
  dailyLossLimit?: number | null;
  dailyProfitLimit?: number | null;
  maxDailyTrades?: number | null;
  unlimitedTrades?: boolean;
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
  percentageAmount: number;
  fixedAmount: number;
  dailyLossLimit: number | null;
  dailyProfitLimit: number | null;
  maxDailyTrades: number | null;
  unlimitedTrades: boolean;
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
  percentageAmount: number;
  fixedAmount: number;
  dailyLossLimit: number | null;
  dailyProfitLimit: number | null;
  maxDailyTrades: number | null;
  unlimitedTrades: boolean;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  createdAt: Date;
  leader?: LeaderProfile;
}

interface LeaderRow {
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
  createdAt: Date;
  updatedAt: Date;
}

interface FollowerRow {
  id: string;
  followerId: string;
  leaderId: string;
  copyMode: string;
  percentageAmount: number;
  fixedAmount: number;
  dailyLossLimit: number | null;
  dailyProfitLimit: number | null;
  dailyLoss: number;
  dailyProfit: number;
  maxDailyTrades: number | null;
  unlimitedTrades: boolean;
  isActive: boolean;
  totalCopied: number;
  totalProfit: number;
  tradesToday: number;
  lastTradeDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
    const existingProfile = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE "userId" = $1`,
      [userId]
    );

    if (existingProfile) {
      throw new CopyTradingServiceError(
        'You already have a leader profile. Status: ' + existingProfile.status,
        409
      );
    }

    const id = randomUUID();
    const now = new Date();

    const leader = await queryOne<LeaderRow>(
      `INSERT INTO "CopyTradingLeader" (
        id, "userId", "displayName", description, status, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [id, userId, data.displayName, data.description || null, 'PENDING', now, now]
    );

    const user = await queryOne<{ name: string }>(
      `SELECT name FROM "User" WHERE id = $1`,
      [userId]
    );

    const followerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [id]
    );

    logger.info('New leader application submitted', { userId, leaderId: id });

    return {
      id: leader!.id,
      userId: leader!.userId,
      displayName: leader!.displayName,
      description: leader!.description,
      avatarUrl: leader!.avatarUrl,
      status: leader!.status,
      totalTrades: leader!.totalTrades,
      winningTrades: leader!.winningTrades,
      totalProfit: Number(leader!.totalProfit),
      winRate: Number(leader!.winRate),
      maxFollowers: leader!.maxFollowers,
      isPublic: leader!.isPublic,
      followerCount: parseInt(followerCount?.count || '0', 10),
      createdAt: leader!.createdAt,
      user: user || undefined,
    };
  }

  async getMyLeaderProfile(userId: string): Promise<LeaderProfile | null> {
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE "userId" = $1`,
      [userId]
    );

    if (!leader) return null;

    const user = await queryOne<{ name: string }>(
      `SELECT name FROM "User" WHERE id = $1`,
      [userId]
    );

    const followerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [leader.id]
    );

    return {
      id: leader.id,
      userId: leader.userId,
      displayName: leader.displayName,
      description: leader.description,
      avatarUrl: leader.avatarUrl,
      status: leader.status,
      totalTrades: leader.totalTrades,
      winningTrades: leader.winningTrades,
      totalProfit: Number(leader.totalProfit),
      winRate: Number(leader.winRate),
      maxFollowers: leader.maxFollowers,
      isPublic: leader.isPublic,
      followerCount: parseInt(followerCount?.count || '0', 10),
      createdAt: leader.createdAt,
      user: user || undefined,
    };
  }

  async updateMyLeaderProfile(
    userId: string,
    data: { displayName?: string; description?: string; isPublic?: boolean }
  ): Promise<LeaderProfile> {
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE "userId" = $1`,
      [userId]
    );

    if (!leader) {
      throw new CopyTradingServiceError('Leader profile not found', 404);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      updates.push(`"displayName" = $${paramIndex++}`);
      params.push(data.displayName);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.isPublic !== undefined) {
      updates.push(`"isPublic" = $${paramIndex++}`);
      params.push(data.isPublic);
    }

    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(new Date());
    params.push(userId);

    const updated = await queryOne<LeaderRow>(
      `UPDATE "CopyTradingLeader" SET ${updates.join(', ')} WHERE "userId" = $${paramIndex} RETURNING *`,
      params
    );

    const user = await queryOne<{ name: string }>(
      `SELECT name FROM "User" WHERE id = $1`,
      [userId]
    );

    const followerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [updated!.id]
    );

    return {
      id: updated!.id,
      userId: updated!.userId,
      displayName: updated!.displayName,
      description: updated!.description,
      avatarUrl: updated!.avatarUrl,
      status: updated!.status,
      totalTrades: updated!.totalTrades,
      winningTrades: updated!.winningTrades,
      totalProfit: Number(updated!.totalProfit),
      winRate: Number(updated!.winRate),
      maxFollowers: updated!.maxFollowers,
      isPublic: updated!.isPublic,
      followerCount: parseInt(followerCount?.count || '0', 10),
      createdAt: updated!.createdAt,
      user: user || undefined,
    };
  }

  async getLeaderProfile(leaderId: string): Promise<LeaderProfile | null> {
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) return null;

    if (leader.status !== 'APPROVED' && !leader.isPublic) {
      return null;
    }

    const user = await queryOne<{ name: string }>(
      `SELECT name FROM "User" WHERE id = $1`,
      [leader.userId]
    );

    const followerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [leaderId]
    );

    return {
      id: leader.id,
      userId: leader.userId,
      displayName: leader.displayName,
      description: leader.description,
      avatarUrl: leader.avatarUrl,
      status: leader.status,
      totalTrades: leader.totalTrades,
      winningTrades: leader.winningTrades,
      totalProfit: Number(leader.totalProfit),
      winRate: Number(leader.winRate),
      maxFollowers: leader.maxFollowers,
      isPublic: leader.isPublic,
      followerCount: parseInt(followerCount?.count || '0', 10),
      createdAt: leader.createdAt,
      user: user || undefined,
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

    const offset = (page - 1) * limit;

    let whereClause = `status = 'APPROVED' AND "isPublic" = true`;
    const params: any[] = [];
    let paramIndex = 1;

    if (minWinRate !== undefined) {
      whereClause += ` AND "winRate" >= $${paramIndex++}`;
      params.push(minWinRate);
    }

    if (minTrades !== undefined) {
      whereClause += ` AND "totalTrades" >= $${paramIndex++}`;
      params.push(minTrades);
    }

    const countParams = [...params];

    let orderByClause = '';
    if (sortBy !== 'followers') {
      const sortColumn = sortBy === 'winRate' ? '"winRate"' :
                        sortBy === 'totalTrades' ? '"totalTrades"' : '"totalProfit"';
      orderByClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    }

    params.push(limit, offset);

    const [leaders, countResult] = await Promise.all([
      queryMany<LeaderRow & { userName: string; followerCount: string }>(
        `SELECT l.*, u.name as "userName",
         (SELECT COUNT(*) FROM "CopyTradingFollower" WHERE "leaderId" = l.id) as "followerCount"
         FROM "CopyTradingLeader" l
         JOIN "User" u ON u.id = l."userId"
         WHERE ${whereClause}
         ${orderByClause}
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "CopyTradingLeader" WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    let followingLeaderIds: Set<string> = new Set();
    if (userId) {
      const userFollowing = await queryMany<{ leaderId: string }>(
        `SELECT "leaderId" FROM "CopyTradingFollower" WHERE "followerId" = $1`,
        [userId]
      );
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
      totalProfit: Number(leader.totalProfit),
      winRate: Number(leader.winRate),
      maxFollowers: leader.maxFollowers,
      isPublic: leader.isPublic,
      followerCount: parseInt(leader.followerCount || '0', 10),
      createdAt: leader.createdAt,
      user: { name: leader.userName },
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
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new CopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status !== 'APPROVED') {
      throw new CopyTradingServiceError('Cannot follow a leader that is not approved', 400);
    }

    if (leader.userId === followerId) {
      throw new CopyTradingServiceError('You cannot follow yourself', 400);
    }

    const followerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [leaderId]
    );

    if (parseInt(followerCount?.count || '0', 10) >= leader.maxFollowers) {
      throw new CopyTradingServiceError('This leader has reached maximum followers', 400);
    }

    const existingFollow = await queryOne<FollowerRow>(
      `SELECT * FROM "CopyTradingFollower" WHERE "followerId" = $1 AND "leaderId" = $2`,
      [followerId, leaderId]
    );

    if (existingFollow) {
      throw new CopyTradingServiceError('You are already following this leader', 409);
    }

    const followerUser = await queryOne<{ demoBalance: number }>(
      `SELECT "demoBalance" FROM "User" WHERE id = $1`,
      [followerId]
    );

    if (!followerUser) {
      throw new CopyTradingServiceError('User not found', 404);
    }

    // Validate fixed amount for FIXED_AMOUNT mode
    if (settings.copyMode === 'FIXED_AMOUNT' && settings.fixedAmount !== undefined) {
      if (settings.fixedAmount > followerUser.demoBalance) {
        throw new CopyTradingServiceError(
          'Fixed amount cannot be greater than your current balance',
          400
        );
      }
    }

    const id = randomUUID();
    const now = new Date();

    const follow = await queryOne<FollowerRow>(
      `INSERT INTO "CopyTradingFollower" (
        id, "followerId", "leaderId", "copyMode", "percentageAmount", "fixedAmount",
        "dailyLossLimit", "dailyProfitLimit", "maxDailyTrades", "unlimitedTrades",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        followerId,
        leaderId,
        settings.copyMode,
        settings.percentageAmount ?? 100,
        settings.fixedAmount ?? 10,
        settings.dailyLossLimit ?? null,
        settings.dailyProfitLimit ?? null,
        settings.unlimitedTrades ? null : (settings.maxDailyTrades ?? 50),
        settings.unlimitedTrades ?? false,
        now,
        now
      ]
    );

    const leaderUser = await queryOne<{ name: string }>(
      `SELECT name FROM "User" WHERE id = $1`,
      [leader.userId]
    );

    const newFollowerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [leaderId]
    );

    logger.info('User followed leader', { followerId, leaderId });

    return {
      id: follow!.id,
      leaderId: follow!.leaderId,
      copyMode: follow!.copyMode,
      percentageAmount: Number(follow!.percentageAmount),
      fixedAmount: Number(follow!.fixedAmount),
      dailyLossLimit: follow!.dailyLossLimit ? Number(follow!.dailyLossLimit) : null,
      dailyProfitLimit: follow!.dailyProfitLimit ? Number(follow!.dailyProfitLimit) : null,
      maxDailyTrades: follow!.maxDailyTrades,
      unlimitedTrades: follow!.unlimitedTrades,
      isActive: follow!.isActive,
      totalCopied: follow!.totalCopied,
      totalProfit: Number(follow!.totalProfit),
      createdAt: follow!.createdAt,
      leader: {
        id: leader.id,
        userId: leader.userId,
        displayName: leader.displayName,
        description: leader.description,
        avatarUrl: leader.avatarUrl,
        status: leader.status,
        totalTrades: leader.totalTrades,
        winningTrades: leader.winningTrades,
        totalProfit: Number(leader.totalProfit),
        winRate: Number(leader.winRate),
        maxFollowers: leader.maxFollowers,
        isPublic: leader.isPublic,
        followerCount: parseInt(newFollowerCount?.count || '0', 10),
        createdAt: leader.createdAt,
        user: leaderUser || undefined,
      },
    };
  }

  async unfollowLeader(followerId: string, leaderId: string): Promise<void> {
    const follow = await queryOne<FollowerRow>(
      `SELECT * FROM "CopyTradingFollower" WHERE "followerId" = $1 AND "leaderId" = $2`,
      [followerId, leaderId]
    );

    if (!follow) {
      throw new CopyTradingServiceError('You are not following this leader', 404);
    }

    await query(
      `DELETE FROM "CopyTradingFollower" WHERE id = $1`,
      [follow.id]
    );

    logger.info('User unfollowed leader', { followerId, leaderId });
  }

  async updateFollowSettings(
    followerId: string,
    leaderId: string,
    settings: UpdateFollowSettingsInput
  ): Promise<FollowingInfo> {
    const follow = await queryOne<FollowerRow>(
      `SELECT * FROM "CopyTradingFollower" WHERE "followerId" = $1 AND "leaderId" = $2`,
      [followerId, leaderId]
    );

    if (!follow) {
      throw new CopyTradingServiceError('You are not following this leader', 404);
    }

    if (settings.fixedAmount !== undefined) {
      const user = await queryOne<{ demoBalance: number }>(
        `SELECT "demoBalance" FROM "User" WHERE id = $1`,
        [followerId]
      );

      if (user && settings.fixedAmount > user.demoBalance) {
        throw new CopyTradingServiceError(
          'Fixed amount cannot be greater than your current balance',
          400
        );
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (settings.copyMode !== undefined) {
      updates.push(`"copyMode" = $${paramIndex++}`);
      params.push(settings.copyMode);
    }
    if (settings.percentageAmount !== undefined) {
      updates.push(`"percentageAmount" = $${paramIndex++}`);
      params.push(settings.percentageAmount);
    }
    if (settings.fixedAmount !== undefined) {
      updates.push(`"fixedAmount" = $${paramIndex++}`);
      params.push(settings.fixedAmount);
    }
    if (settings.dailyLossLimit !== undefined) {
      updates.push(`"dailyLossLimit" = $${paramIndex++}`);
      params.push(settings.dailyLossLimit);
    }
    if (settings.dailyProfitLimit !== undefined) {
      updates.push(`"dailyProfitLimit" = $${paramIndex++}`);
      params.push(settings.dailyProfitLimit);
    }
    if (settings.maxDailyTrades !== undefined) {
      updates.push(`"maxDailyTrades" = $${paramIndex++}`);
      params.push(settings.maxDailyTrades);
    }
    if (settings.unlimitedTrades !== undefined) {
      updates.push(`"unlimitedTrades" = $${paramIndex++}`);
      params.push(settings.unlimitedTrades);
    }
    if (settings.isActive !== undefined) {
      updates.push(`"isActive" = $${paramIndex++}`);
      params.push(settings.isActive);
    }

    // Always update the updatedAt timestamp
    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(new Date());

    params.push(follow.id);

    const updated = await queryOne<FollowerRow>(
      `UPDATE "CopyTradingFollower" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    const leaderUser = await queryOne<{ name: string }>(
      `SELECT name FROM "User" WHERE id = $1`,
      [leader!.userId]
    );

    const followerCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
      [leaderId]
    );

    return {
      id: updated!.id,
      leaderId: updated!.leaderId,
      copyMode: updated!.copyMode,
      percentageAmount: Number(updated!.percentageAmount),
      fixedAmount: Number(updated!.fixedAmount),
      dailyLossLimit: updated!.dailyLossLimit ? Number(updated!.dailyLossLimit) : null,
      dailyProfitLimit: updated!.dailyProfitLimit ? Number(updated!.dailyProfitLimit) : null,
      maxDailyTrades: updated!.maxDailyTrades,
      unlimitedTrades: updated!.unlimitedTrades,
      isActive: updated!.isActive,
      totalCopied: updated!.totalCopied,
      totalProfit: Number(updated!.totalProfit),
      createdAt: updated!.createdAt,
      leader: {
        id: leader!.id,
        userId: leader!.userId,
        displayName: leader!.displayName,
        description: leader!.description,
        avatarUrl: leader!.avatarUrl,
        status: leader!.status,
        totalTrades: leader!.totalTrades,
        winningTrades: leader!.winningTrades,
        totalProfit: Number(leader!.totalProfit),
        winRate: Number(leader!.winRate),
        maxFollowers: leader!.maxFollowers,
        isPublic: leader!.isPublic,
        followerCount: parseInt(followerCount?.count || '0', 10),
        createdAt: leader!.createdAt,
        user: leaderUser || undefined,
      },
    };
  }

  async getMyFollowing(
    followerId: string
  ): Promise<{ following: FollowingInfo[]; total: number }> {
    const [following, countResult] = await Promise.all([
      queryMany<FollowerRow>(
        `SELECT * FROM "CopyTradingFollower" WHERE "followerId" = $1 ORDER BY "createdAt" DESC`,
        [followerId]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "followerId" = $1`,
        [followerId]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);
    if (following.length === 0) {
      return { following: [], total };
    }

    const leaderIds = following.map(f => f.leaderId);

    // Fetch leader info in bulk
    const leaders = await queryMany<LeaderRow & { userName: string }>(
      `SELECT l.*, u.name as "userName"
       FROM "CopyTradingLeader" l
       JOIN "User" u ON u.id = l."userId"
       WHERE l.id = ANY($1)`,
      [leaderIds]
    );
    const leaderMap = new Map(leaders.map(l => [l.id, l]));

    // Fetch follower counts in bulk
    const followerCounts = await queryMany<{ leaderId: string; count: string }>(
      `SELECT "leaderId", COUNT(*)::text as count FROM "CopyTradingFollower"
       WHERE "leaderId" = ANY($1)
       GROUP BY "leaderId"`,
      [leaderIds]
    );
    const followerCountMap = new Map(followerCounts.map(c => [c.leaderId, c.count]));

    const result: FollowingInfo[] = following.map((f) => {
      const leader = leaderMap.get(f.leaderId);
      return {
        id: f.id,
        leaderId: f.leaderId,
        copyMode: f.copyMode,
        percentageAmount: Number(f.percentageAmount ?? 100),
        fixedAmount: Number(f.fixedAmount),
        dailyLossLimit: f.dailyLossLimit ? Number(f.dailyLossLimit) : null,
        dailyProfitLimit: f.dailyProfitLimit ? Number(f.dailyProfitLimit) : null,
        maxDailyTrades: f.maxDailyTrades,
        unlimitedTrades: f.unlimitedTrades ?? false,
        isActive: f.isActive,
        totalCopied: f.totalCopied,
        totalProfit: Number(f.totalProfit),
        createdAt: f.createdAt,
        leader: leader
          ? {
              id: leader.id,
              userId: leader.userId,
              displayName: leader.displayName,
              description: leader.description,
              avatarUrl: leader.avatarUrl,
              status: leader.status,
              totalTrades: leader.totalTrades,
              winningTrades: leader.winningTrades,
              totalProfit: Number(leader.totalProfit),
              winRate: Number(leader.winRate),
              maxFollowers: leader.maxFollowers,
              isPublic: leader.isPublic,
              followerCount: parseInt(followerCountMap.get(leader.id) || '0', 10),
              createdAt: leader.createdAt,
              user: { name: leader.userName },
            }
          : undefined,
      };
    });

    return { following: result, total };
  }

  async getMyFollowers(userId: string): Promise<{ followers: FollowerInfo[]; total: number }> {
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE "userId" = $1`,
      [userId]
    );

    if (!leader) {
      throw new CopyTradingServiceError('You are not a leader', 404);
    }

    const [followers, countResult] = await Promise.all([
      queryMany<FollowerRow & { followerName: string; followerEmail: string }>(
        `SELECT f.*, u.name as "followerName", u.email as "followerEmail"
         FROM "CopyTradingFollower" f
         JOIN "User" u ON u.id = f."followerId"
         WHERE f."leaderId" = $1
         ORDER BY f."createdAt" DESC`,
        [leader.id]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
        [leader.id]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      followers: followers.map((f) => ({
        id: f.id,
        followerId: f.followerId,
        copyMode: f.copyMode,
        percentageAmount: Number(f.percentageAmount ?? 100),
        fixedAmount: Number(f.fixedAmount),
        dailyLossLimit: f.dailyLossLimit ? Number(f.dailyLossLimit) : null,
        dailyProfitLimit: f.dailyProfitLimit ? Number(f.dailyProfitLimit) : null,
        maxDailyTrades: f.maxDailyTrades,
        unlimitedTrades: f.unlimitedTrades ?? false,
        isActive: f.isActive,
        totalCopied: f.totalCopied,
        totalProfit: Number(f.totalProfit),
        createdAt: f.createdAt,
        follower: {
          id: f.followerId,
          name: f.followerName,
          email: f.followerEmail,
        },
      })),
      total,
    };
  }

  async isFollowing(followerId: string, leaderId: string): Promise<boolean> {
    const follow = await queryOne<FollowerRow>(
      `SELECT * FROM "CopyTradingFollower" WHERE "followerId" = $1 AND "leaderId" = $2`,
      [followerId, leaderId]
    );

    return !!follow;
  }

  async getFollowRelation(followerId: string, leaderId: string) {
    return queryOne<FollowerRow>(
      `SELECT * FROM "CopyTradingFollower" WHERE "followerId" = $1 AND "leaderId" = $2`,
      [followerId, leaderId]
    );
  }
}

export const copyTradingService = new CopyTradingService();
export { CopyTradingServiceError };
