import { query, queryOne, queryMany } from '../../config/db.js';
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
  adminNote: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TradeRow {
  id: string;
  symbol: string;
  direction: string;
  amount: number;
  result: string | null;
  profit: number | null;
  openedAt: Date;
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

    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND l.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (l."displayName" ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countParams = [...params];

    let orderByClause = '';
    if (sortBy !== 'followers') {
      const sortColumn = sortBy === 'createdAt' ? 'l."createdAt"' :
                        sortBy === 'winRate' ? 'l."winRate"' : 'l."totalTrades"';
      orderByClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    }

    params.push(limit, offset);

    const [leaders, countResult] = await Promise.all([
      queryMany<LeaderRow & { userName: string; userEmail: string; followerCount: string }>(
        `SELECT l.*, u.name as "userName", u.email as "userEmail",
         (SELECT COUNT(*) FROM "CopyTradingFollower" WHERE "leaderId" = l.id) as "followerCount"
         FROM "CopyTradingLeader" l
         JOIN "User" u ON u.id = l."userId"
         WHERE ${whereClause}
         ${orderByClause}
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "CopyTradingLeader" l
         JOIN "User" u ON u.id = l."userId"
         WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    let result = leaders.map((leader) => ({
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
      adminNote: leader.adminNote,
      approvedAt: leader.approvedAt,
      rejectedAt: leader.rejectedAt,
      suspendedAt: leader.suspendedAt,
      createdAt: leader.createdAt,
      updatedAt: leader.updatedAt,
      followerCount: parseInt(leader.followerCount || '0', 10),
      user: {
        id: leader.userId,
        name: leader.userName,
        email: leader.userEmail,
      },
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
    const leader = await queryOne<LeaderRow & { userName: string; userEmail: string; followerCount: string }>(
      `SELECT l.*, u.name as "userName", u.email as "userEmail",
       (SELECT COUNT(*) FROM "CopyTradingFollower" WHERE "leaderId" = l.id) as "followerCount"
       FROM "CopyTradingLeader" l
       JOIN "User" u ON u.id = l."userId"
       WHERE l.id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    const recentTrades = await queryMany<TradeRow>(
      `SELECT id, symbol, direction, amount, result, profit, "openedAt"
       FROM "Trade"
       WHERE "userId" = $1 AND "isCopyTrade" = false
       ORDER BY "openedAt" DESC
       LIMIT 10`,
      [leader.userId]
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
      adminNote: leader.adminNote,
      approvedAt: leader.approvedAt,
      rejectedAt: leader.rejectedAt,
      suspendedAt: leader.suspendedAt,
      createdAt: leader.createdAt,
      updatedAt: leader.updatedAt,
      followerCount: parseInt(leader.followerCount || '0', 10),
      user: {
        id: leader.userId,
        name: leader.userName,
        email: leader.userEmail,
      },
      recentTrades: recentTrades.map(t => ({
        id: t.id,
        symbol: t.symbol,
        direction: t.direction,
        amount: Number(t.amount),
        result: t.result,
        profit: t.profit !== null ? Number(t.profit) : null,
        openedAt: t.openedAt,
      })),
    };
  }

  async approveLeader(leaderId: string, adminNote?: string): Promise<LeaderDetail> {
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status === 'APPROVED') {
      throw new AdminCopyTradingServiceError('Leader is already approved', 400);
    }

    const now = new Date();

    await query(
      `UPDATE "CopyTradingLeader" SET status = 'APPROVED', "adminNote" = $1, "approvedAt" = $2,
       "rejectedAt" = NULL, "suspendedAt" = NULL, "updatedAt" = $2
       WHERE id = $3`,
      [adminNote, now, leaderId]
    );

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
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status === 'REJECTED') {
      throw new AdminCopyTradingServiceError('Leader is already rejected', 400);
    }

    const now = new Date();

    await query(
      `UPDATE "CopyTradingLeader" SET status = 'REJECTED', "adminNote" = $1, "rejectedAt" = $2, "updatedAt" = $2
       WHERE id = $3`,
      [adminNote, now, leaderId]
    );

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
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status === 'SUSPENDED') {
      throw new AdminCopyTradingServiceError('Leader is already suspended', 400);
    }

    if (leader.status !== 'APPROVED') {
      throw new AdminCopyTradingServiceError('Can only suspend approved leaders', 400);
    }

    const now = new Date();

    await query(
      `UPDATE "CopyTradingLeader" SET status = 'SUSPENDED', "adminNote" = $1, "suspendedAt" = $2, "updatedAt" = $2
       WHERE id = $3`,
      [reason, now, leaderId]
    );

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
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    if (leader.status !== 'SUSPENDED') {
      throw new AdminCopyTradingServiceError('Leader is not suspended', 400);
    }

    const now = new Date();

    await query(
      `UPDATE "CopyTradingLeader" SET status = 'APPROVED', "suspendedAt" = NULL, "updatedAt" = $1
       WHERE id = $2`,
      [now, leaderId]
    );

    logger.info('Leader reinstated', { leaderId });

    return this.getLeaderDetail(leaderId);
  }

  async updateLeaderSettings(
    leaderId: string,
    data: { maxFollowers?: number; isPublic?: boolean }
  ): Promise<LeaderDetail> {
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.maxFollowers !== undefined) {
      updates.push(`"maxFollowers" = $${paramIndex++}`);
      params.push(data.maxFollowers);
    }
    if (data.isPublic !== undefined) {
      updates.push(`"isPublic" = $${paramIndex++}`);
      params.push(data.isPublic);
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = $${paramIndex++}`);
      params.push(new Date());
      params.push(leaderId);

      await query(
        `UPDATE "CopyTradingLeader" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
    }

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
    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    // Validate win rate is between 0 and 100
    if (data.winRate !== undefined && (data.winRate < 0 || data.winRate > 100)) {
      throw new AdminCopyTradingServiceError('Win rate must be between 0 and 100', 400);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.winRate !== undefined) {
      updates.push(`"winRate" = $${paramIndex++}`);
      params.push(data.winRate);
    }
    if (data.totalTrades !== undefined) {
      updates.push(`"totalTrades" = $${paramIndex++}`);
      params.push(data.totalTrades);
    }
    if (data.winningTrades !== undefined) {
      updates.push(`"winningTrades" = $${paramIndex++}`);
      params.push(data.winningTrades);
    }
    if (data.totalProfit !== undefined) {
      updates.push(`"totalProfit" = $${paramIndex++}`);
      params.push(data.totalProfit);
    }

    if (updates.length === 0) {
      return this.getLeaderDetail(leaderId);
    }

    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(new Date());
    params.push(leaderId);

    await query(
      `UPDATE "CopyTradingLeader" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    logger.info(`Admin updated leader stats`, { leaderId, updates: data });

    return this.getLeaderDetail(leaderId);
  }

  async getCopyTradingStats(): Promise<CopyTradingPlatformStats> {
    // Optimized: 2 queries instead of 6
    const [leaderStats, copiedTradesAgg] = await Promise.all([
      queryOne<{
        total: string;
        pending: string;
        approved: string;
        suspended: string;
        followers: string;
      }>(`
        SELECT
          (SELECT COUNT(*) FROM "CopyTradingLeader") as total,
          (SELECT COUNT(*) FROM "CopyTradingLeader" WHERE status = 'PENDING') as pending,
          (SELECT COUNT(*) FROM "CopyTradingLeader" WHERE status = 'APPROVED') as approved,
          (SELECT COUNT(*) FROM "CopyTradingLeader" WHERE status = 'SUSPENDED') as suspended,
          (SELECT COUNT(*) FROM "CopyTradingFollower") as followers
      `),
      queryOne<{ count: string; totalAmount: number; totalProfit: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as "totalAmount", COALESCE(SUM(profit), 0) as "totalProfit"
         FROM "CopiedTrade"`
      ),
    ]);

    return {
      totalLeaders: parseInt(leaderStats?.total || '0', 10),
      pendingLeaders: parseInt(leaderStats?.pending || '0', 10),
      approvedLeaders: parseInt(leaderStats?.approved || '0', 10),
      suspendedLeaders: parseInt(leaderStats?.suspended || '0', 10),
      totalFollowers: parseInt(leaderStats?.followers || '0', 10),
      totalCopiedTrades: parseInt(copiedTradesAgg?.count || '0', 10),
      totalCopyVolume: Number(copiedTradesAgg?.totalAmount || 0),
      totalCopyProfit: Number(copiedTradesAgg?.totalProfit || 0),
    };
  }

  async getRecentActivity(limit: number = 20): Promise<RecentCopyActivity[]> {
    const activities: RecentCopyActivity[] = [];

    const recentLeaders = await queryMany<LeaderRow & { userName: string }>(
      `SELECT l.*, u.name as "userName"
       FROM "CopyTradingLeader" l
       JOIN "User" u ON u.id = l."userId"
       ORDER BY l."createdAt" DESC
       LIMIT $1`,
      [limit]
    );

    for (const leader of recentLeaders) {
      if (leader.status === 'PENDING') {
        activities.push({
          id: `leader-app-${leader.id}`,
          type: 'leader_application',
          description: `${leader.userName} applied to become a leader`,
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

    const recentCopiedTrades = await queryMany<{
      id: string;
      amount: number;
      createdAt: Date;
      leaderDisplayName: string;
      followerName: string;
      copiedSymbol: string;
      copiedResult: string | null;
    }>(
      `SELECT ct.id, ct.amount, ct."createdAt",
              l."displayName" as "leaderDisplayName",
              u.name as "followerName",
              t.symbol as "copiedSymbol",
              t.result as "copiedResult"
       FROM "CopiedTrade" ct
       JOIN "CopyTradingLeader" l ON l.id = ct."leaderId"
       JOIN "CopyTradingFollower" f ON f.id = ct."followerId"
       JOIN "User" u ON u.id = f."followerId"
       JOIN "Trade" t ON t.id = ct."copiedTradeId"
       ORDER BY ct."createdAt" DESC
       LIMIT $1`,
      [limit]
    );

    for (const ct of recentCopiedTrades) {
      activities.push({
        id: `copy-trade-${ct.id}`,
        type: 'copy_trade',
        description: `${ct.followerName} copied ${ct.leaderDisplayName}'s trade on ${ct.copiedSymbol}`,
        timestamp: ct.createdAt,
        data: {
          copiedTradeId: ct.id,
          symbol: ct.copiedSymbol,
          result: ct.copiedResult,
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
    const offset = (page - 1) * limit;

    const leader = await queryOne<LeaderRow>(
      `SELECT * FROM "CopyTradingLeader" WHERE id = $1`,
      [leaderId]
    );

    if (!leader) {
      throw new AdminCopyTradingServiceError('Leader not found', 404);
    }

    const [followers, countResult] = await Promise.all([
      queryMany<{
        id: string;
        followerId: string;
        copyMode: string;
        fixedAmount: number;
        isActive: boolean;
        totalCopied: number;
        totalProfit: number;
        createdAt: Date;
        userName: string;
        userEmail: string;
      }>(
        `SELECT f.*, u.name as "userName", u.email as "userEmail"
         FROM "CopyTradingFollower" f
         JOIN "User" u ON u.id = f."followerId"
         WHERE f."leaderId" = $1
         ORDER BY f."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [leaderId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "CopyTradingFollower" WHERE "leaderId" = $1`,
        [leaderId]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      followers: followers.map((f) => ({
        id: f.id,
        followerId: f.followerId,
        copyMode: f.copyMode,
        fixedAmount: Number(f.fixedAmount),
        isActive: f.isActive,
        totalCopied: f.totalCopied,
        totalProfit: Number(f.totalProfit),
        createdAt: f.createdAt,
        user: {
          id: f.followerId,
          name: f.userName,
          email: f.userEmail,
        },
      })),
      total,
    };
  }
}

export const adminCopyTradingService = new AdminCopyTradingService();
export { AdminCopyTradingServiceError };
