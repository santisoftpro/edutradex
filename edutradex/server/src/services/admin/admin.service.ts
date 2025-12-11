import { query, queryOne, queryMany } from '../../config/db.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { marketService } from '../market/market.service.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { randomUUID } from 'crypto';

interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  demoBalance: number;
  isActive: boolean;
  createdAt: Date;
  tradesCount: number;
}

interface UserListResult {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UserDetail extends UserListItem {
  updatedAt: Date;
  stats: {
    totalTrades: number;
    wonTrades: number;
    lostTrades: number;
    winRate: number;
    totalProfit: number;
  };
  recentTrades: {
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    profit: number | null;
    status: string;
    openedAt: Date;
  }[];
}

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  activeTrades: number;
  platformWinRate: number;
  totalVolume: number;
  todayTrades: number;
  todayVolume: number;
  usersByRole: { role: string; count: number }[];
  tradesByStatus: { status: string; count: number }[];
}

interface MarketConfigData {
  id: string;
  symbol: string;
  marketType: string;
  name: string;
  isActive: boolean;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  volatilityMode: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

class AdminServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

class AdminService {
  async getAllUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<UserListResult> {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND u.role = $${paramIndex++}`;
      params.push(role);
    }

    if (typeof isActive === 'boolean') {
      whereClause += ` AND u."isActive" = $${paramIndex++}`;
      params.push(isActive);
    }

    if (search) {
      whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const validSortColumns = ['createdAt', 'email', 'name', 'demoBalance'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countParams = [...params];
    params.push(limit, offset);

    const [users, countResult] = await Promise.all([
      queryMany<{
        id: string;
        email: string;
        name: string;
        role: string;
        demoBalance: number;
        isActive: boolean;
        createdAt: Date;
        tradesCount: string;
      }>(
        `SELECT u.id, u.email, u.name, u.role, u."demoBalance", u."isActive", u."createdAt",
                COUNT(t.id) as "tradesCount"
         FROM "User" u
         LEFT JOIN "Trade" t ON t."userId" = u.id
         WHERE ${whereClause}
         GROUP BY u.id
         ORDER BY u."${sortColumn}" ${sortDir}
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "User" u WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        demoBalance: Number(user.demoBalance),
        isActive: user.isActive,
        createdAt: user.createdAt,
        tradesCount: parseInt(user.tradesCount, 10),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string): Promise<UserDetail> {
    const user = await queryOne<{
      id: string;
      email: string;
      name: string;
      role: string;
      demoBalance: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>(
      `SELECT id, email, name, role, "demoBalance", "isActive", "createdAt", "updatedAt"
       FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    const [stats, recentTrades] = await Promise.all([
      this.getUserStats(userId),
      queryMany<{
        id: string;
        symbol: string;
        direction: string;
        amount: number;
        profit: number | null;
        status: string;
        openedAt: Date;
      }>(
        `SELECT id, symbol, direction, amount, profit, status, "openedAt"
         FROM "Trade" WHERE "userId" = $1
         ORDER BY "openedAt" DESC LIMIT 10`,
        [userId]
      ),
    ]);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      demoBalance: Number(user.demoBalance),
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tradesCount: stats.totalTrades,
      stats,
      recentTrades: recentTrades.map((trade) => ({
        ...trade,
        amount: Number(trade.amount),
        profit: trade.profit ? Number(trade.profit) : null,
      })),
    };
  }

  private async getUserStats(userId: string) {
    const result = await queryOne<{
      totalTrades: string;
      wonTrades: string;
      lostTrades: string;
      totalProfit: number;
    }>(
      `SELECT
        COUNT(*) as "totalTrades",
        COUNT(*) FILTER (WHERE result = 'WON') as "wonTrades",
        COUNT(*) FILTER (WHERE result = 'LOST') as "lostTrades",
        COALESCE(SUM(profit) FILTER (WHERE status = 'CLOSED'), 0) as "totalProfit"
       FROM "Trade" WHERE "userId" = $1`,
      [userId]
    );

    const totalTrades = parseInt(result?.totalTrades || '0', 10);
    const wonTrades = parseInt(result?.wonTrades || '0', 10);
    const lostTrades = parseInt(result?.lostTrades || '0', 10);
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
    const totalProfit = Number(result?.totalProfit || 0);

    return {
      totalTrades,
      wonTrades,
      lostTrades,
      winRate: Number(winRate.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean }> {
    const user = await queryOne<{ role: string }>(
      `SELECT role FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AdminServiceError('Cannot modify admin user status', 403);
    }

    await query(
      `UPDATE "User" SET "isActive" = $1, "updatedAt" = $2 WHERE id = $3`,
      [isActive, new Date(), userId]
    );

    logger.info('User status updated', { userId, isActive });

    return { success: true };
  }

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean }> {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new AdminServiceError('Invalid role', 400);
    }

    const user = await queryOne<{ id: string }>(
      `SELECT id FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    await query(
      `UPDATE "User" SET role = $1, "updatedAt" = $2 WHERE id = $3`,
      [role, new Date(), userId]
    );

    logger.info('User role updated', { userId, role });

    return { success: true };
  }

  async resetUserBalance(userId: string, newBalance?: number): Promise<{ demoBalance: number }> {
    const user = await queryOne<{ id: string }>(
      `SELECT id FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    const balance = newBalance ?? config.trading.defaultDemoBalance;

    const updated = await queryOne<{ demoBalance: number }>(
      `UPDATE "User" SET "demoBalance" = $1, "updatedAt" = $2 WHERE id = $3 RETURNING "demoBalance"`,
      [balance, new Date(), userId]
    );

    logger.info('User balance reset by admin', { userId, newBalance: balance });

    return { demoBalance: Number(updated?.demoBalance || 0) };
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    const user = await queryOne<{ role: string }>(
      `SELECT role FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AdminServiceError('Cannot delete admin user', 403);
    }

    await query(`DELETE FROM "User" WHERE id = $1`, [userId]);

    logger.info('User deleted by admin', { userId });

    return { success: true };
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [stats, usersByRole, tradesByStatus] = await Promise.all([
      queryOne<{
        totalUsers: string;
        activeUsers: string;
        totalTrades: string;
        activeTrades: string;
        wonTrades: string;
        totalVolume: number;
        todayTrades: string;
        todayVolume: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM "User") as "totalUsers",
          (SELECT COUNT(*) FROM "User" WHERE "isActive" = true) as "activeUsers",
          (SELECT COUNT(*) FROM "Trade") as "totalTrades",
          (SELECT COUNT(*) FROM "Trade" WHERE status = 'OPEN') as "activeTrades",
          (SELECT COUNT(*) FROM "Trade" WHERE result = 'WON') as "wonTrades",
          (SELECT COALESCE(SUM(amount), 0) FROM "Trade") as "totalVolume",
          (SELECT COUNT(*) FROM "Trade" WHERE "openedAt" >= $1) as "todayTrades",
          (SELECT COALESCE(SUM(amount), 0) FROM "Trade" WHERE "openedAt" >= $1) as "todayVolume"`,
        [todayStart]
      ),
      queryMany<{ role: string; count: string }>(
        `SELECT role, COUNT(*) as count FROM "User" GROUP BY role`
      ),
      queryMany<{ status: string; count: string }>(
        `SELECT status, COUNT(*) as count FROM "Trade" GROUP BY status`
      ),
    ]);

    const totalTrades = parseInt(stats?.totalTrades || '0', 10);
    const wonTrades = parseInt(stats?.wonTrades || '0', 10);
    const platformWinRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;

    return {
      totalUsers: parseInt(stats?.totalUsers || '0', 10),
      activeUsers: parseInt(stats?.activeUsers || '0', 10),
      totalTrades,
      activeTrades: parseInt(stats?.activeTrades || '0', 10),
      platformWinRate: Number(platformWinRate.toFixed(2)),
      totalVolume: Number(stats?.totalVolume || 0),
      todayTrades: parseInt(stats?.todayTrades || '0', 10),
      todayVolume: Number(stats?.todayVolume || 0),
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: parseInt(item.count, 10),
      })),
      tradesByStatus: tradesByStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count, 10),
      })),
    };
  }

  async getAllMarketConfigs(): Promise<MarketConfigData[]> {
    const configs = await queryMany<MarketConfigData>(
      `SELECT * FROM "MarketConfig" ORDER BY "marketType" ASC, symbol ASC`
    );

    return configs.map((config) => ({
      ...config,
      payoutPercent: Number(config.payoutPercent),
      minTradeAmount: Number(config.minTradeAmount),
      maxTradeAmount: Number(config.maxTradeAmount),
    }));
  }

  async getMarketConfig(symbol: string): Promise<MarketConfigData | null> {
    const config = await queryOne<MarketConfigData>(
      `SELECT * FROM "MarketConfig" WHERE symbol = $1`,
      [symbol]
    );

    if (!config) {
      return null;
    }

    return {
      ...config,
      payoutPercent: Number(config.payoutPercent),
      minTradeAmount: Number(config.minTradeAmount),
      maxTradeAmount: Number(config.maxTradeAmount),
    };
  }

  async updateMarketConfig(
    symbol: string,
    data: {
      isActive?: boolean;
      payoutPercent?: number;
      minTradeAmount?: number;
      maxTradeAmount?: number;
      volatilityMode?: string;
    }
  ): Promise<MarketConfigData> {
    let config = await queryOne<MarketConfigData>(
      `SELECT * FROM "MarketConfig" WHERE symbol = $1`,
      [symbol]
    );

    const now = new Date();

    if (!config) {
      const asset = marketService.getAsset(symbol);
      if (!asset) {
        throw new AdminServiceError('Market symbol not found', 404);
      }

      config = await queryOne<MarketConfigData>(
        `INSERT INTO "MarketConfig" (
          id, symbol, "marketType", name, "isActive", "payoutPercent",
          "minTradeAmount", "maxTradeAmount", "volatilityMode", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          randomUUID(),
          symbol,
          asset.marketType.toUpperCase(),
          asset.name,
          data.isActive ?? true,
          data.payoutPercent ?? asset.payoutPercent,
          data.minTradeAmount ?? 1,
          data.maxTradeAmount ?? 1000,
          data.volatilityMode ?? 'MEDIUM',
          now,
          now,
        ]
      );
    } else {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.isActive !== undefined) {
        updates.push(`"isActive" = $${paramIndex++}`);
        params.push(data.isActive);
      }
      if (data.payoutPercent !== undefined) {
        updates.push(`"payoutPercent" = $${paramIndex++}`);
        params.push(data.payoutPercent);
      }
      if (data.minTradeAmount !== undefined) {
        updates.push(`"minTradeAmount" = $${paramIndex++}`);
        params.push(data.minTradeAmount);
      }
      if (data.maxTradeAmount !== undefined) {
        updates.push(`"maxTradeAmount" = $${paramIndex++}`);
        params.push(data.maxTradeAmount);
      }
      if (data.volatilityMode !== undefined) {
        updates.push(`"volatilityMode" = $${paramIndex++}`);
        params.push(data.volatilityMode);
      }

      if (updates.length > 0) {
        updates.push(`"updatedAt" = $${paramIndex++}`);
        params.push(now);
        params.push(symbol);

        config = await queryOne<MarketConfigData>(
          `UPDATE "MarketConfig" SET ${updates.join(', ')} WHERE symbol = $${paramIndex} RETURNING *`,
          params
        );
      }
    }

    logger.info('Market config updated', { symbol, data });

    return {
      ...config!,
      payoutPercent: Number(config!.payoutPercent),
      minTradeAmount: Number(config!.minTradeAmount),
      maxTradeAmount: Number(config!.maxTradeAmount),
    };
  }

  async initializeMarketConfigs(): Promise<{ created: number }> {
    const assets = marketService.getAllAssets();
    let created = 0;
    const now = new Date();

    for (const asset of assets) {
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "MarketConfig" WHERE symbol = $1`,
        [asset.symbol]
      );

      if (!existing) {
        await query(
          `INSERT INTO "MarketConfig" (
            id, symbol, "marketType", name, "isActive", "payoutPercent",
            "minTradeAmount", "maxTradeAmount", "volatilityMode", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            randomUUID(),
            asset.symbol,
            asset.marketType.toUpperCase(),
            asset.name,
            asset.isActive,
            asset.payoutPercent,
            1,
            1000,
            'MEDIUM',
            now,
            now,
          ]
        );
        created++;
      }
    }

    logger.info('Market configs initialized', { created });

    return { created };
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    return queryMany<SystemSetting>(
      `SELECT * FROM "SystemConfig" ORDER BY key ASC`
    );
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const setting = await queryOne<{ value: string }>(
      `SELECT value FROM "SystemConfig" WHERE key = $1`,
      [key]
    );

    return setting?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const now = new Date();
    const setting = await queryOne<SystemSetting>(
      `INSERT INTO "SystemConfig" (id, key, value, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE SET value = $3, "updatedAt" = $5
       RETURNING *`,
      [randomUUID(), key, value, now, now]
    );

    logger.info('System setting updated', { key, value });

    return setting!;
  }

  async deleteSystemSetting(key: string): Promise<{ success: boolean }> {
    const result = await query(
      `DELETE FROM "SystemConfig" WHERE key = $1`,
      [key]
    );

    if (result.rowCount === 0) {
      throw new AdminServiceError('Setting not found', 404);
    }

    logger.info('System setting deleted', { key });

    return { success: true };
  }

  async getRecentActivity(limit: number = 20): Promise<{
    recentTrades: {
      id: string;
      userId: string;
      userName: string;
      symbol: string;
      direction: string;
      amount: number;
      status: string;
      openedAt: Date;
    }[];
    recentUsers: {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
    }[];
  }> {
    const [recentTrades, recentUsers] = await Promise.all([
      queryMany<{
        id: string;
        userId: string;
        userName: string;
        symbol: string;
        direction: string;
        amount: number;
        status: string;
        openedAt: Date;
      }>(
        `SELECT t.id, t."userId", u.name as "userName", t.symbol, t.direction, t.amount, t.status, t."openedAt"
         FROM "Trade" t
         JOIN "User" u ON u.id = t."userId"
         ORDER BY t."openedAt" DESC LIMIT $1`,
        [limit]
      ),
      queryMany<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
      }>(
        `SELECT id, name, email, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT $1`,
        [limit]
      ),
    ]);

    return {
      recentTrades: recentTrades.map((trade) => ({
        ...trade,
        amount: Number(trade.amount),
      })),
      recentUsers,
    };
  }

  // Get online users with their details
  async getOnlineUsers(): Promise<{
    count: number;
    users: {
      id: string;
      name: string;
      email: string;
      connectionCount: number;
      liveBalance: number;
      demoBalance: number;
      activeAccountType: string;
    }[];
  }> {
    const onlineUsersInfo = wsManager.getOnlineUsersInfo();

    if (onlineUsersInfo.length === 0) {
      return { count: 0, users: [] };
    }

    const userIds = onlineUsersInfo.map(u => u.userId);
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');

    const users = await queryMany<{
      id: string;
      name: string;
      email: string;
      liveBalance: number;
      demoBalance: number;
      activeAccountType: string;
    }>(
      `SELECT id, name, email, "liveBalance", "demoBalance", "activeAccountType"
       FROM "User" WHERE id IN (${placeholders})`,
      userIds
    );

    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      count: onlineUsersInfo.length,
      users: onlineUsersInfo
        .map(online => {
          const user = userMap.get(online.userId);
          if (!user) return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            connectionCount: online.connectionCount,
            liveBalance: Number(user.liveBalance),
            demoBalance: Number(user.demoBalance),
            activeAccountType: user.activeAccountType,
          };
        })
        .filter((u): u is NonNullable<typeof u> => u !== null),
    };
  }

  // Check if specific user is online
  isUserOnline(userId: string): boolean {
    return wsManager.isUserOnline(userId);
  }

  // Get user's live (open) trades
  async getUserLiveTrades(userId: string): Promise<{
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    entryPrice: number;
    duration: number;
    payoutPercent: number;
    accountType: string;
    openedAt: Date;
    expiresAt: Date;
  }[]> {
    const trades = await queryMany<{
      id: string;
      symbol: string;
      direction: string;
      amount: number;
      entryPrice: number;
      duration: number;
      payoutPercent: number;
      accountType: string;
      openedAt: Date;
      expiresAt: Date;
    }>(
      `SELECT id, symbol, direction, amount, "entryPrice", duration, "payoutPercent", "accountType", "openedAt", "expiresAt"
       FROM "Trade"
       WHERE "userId" = $1 AND status = 'OPEN'
       ORDER BY "openedAt" DESC`,
      [userId]
    );

    return trades.map(t => ({
      ...t,
      amount: Number(t.amount),
      entryPrice: Number(t.entryPrice),
      payoutPercent: Number(t.payoutPercent),
    }));
  }

  // Get user's transaction history (deposits and withdrawals)
  async getUserTransactions(userId: string, options: {
    page?: number;
    limit?: number;
    type?: 'deposit' | 'withdrawal' | 'all';
  } = {}): Promise<{
    transactions: {
      id: string;
      type: 'deposit' | 'withdrawal';
      amount: number;
      status: string;
      method: string;
      createdAt: Date;
      processedAt?: Date;
    }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, type = 'all' } = options;
    const offset = (page - 1) * limit;

    let deposits: any[] = [];
    let withdrawals: any[] = [];
    let depositCount = 0;
    let withdrawalCount = 0;

    if (type === 'all' || type === 'deposit') {
      const [dRows, dCount] = await Promise.all([
        queryMany<{
          id: string;
          amount: number;
          status: string;
          method: string;
          createdAt: Date;
          processedAt: Date | null;
        }>(
          `SELECT id, amount, status, method, "createdAt", "processedAt"
           FROM "Deposit" WHERE "userId" = $1
           ORDER BY "createdAt" DESC`,
          [userId]
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "Deposit" WHERE "userId" = $1`,
          [userId]
        ),
      ]);
      deposits = dRows.map(d => ({
        ...d,
        type: 'deposit' as const,
        amount: Number(d.amount),
      }));
      depositCount = parseInt(dCount?.count || '0', 10);
    }

    if (type === 'all' || type === 'withdrawal') {
      const [wRows, wCount] = await Promise.all([
        queryMany<{
          id: string;
          amount: number;
          status: string;
          method: string;
          createdAt: Date;
          processedAt: Date | null;
        }>(
          `SELECT id, amount, status, method, "createdAt", "processedAt"
           FROM "Withdrawal" WHERE "userId" = $1
           ORDER BY "createdAt" DESC`,
          [userId]
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "Withdrawal" WHERE "userId" = $1`,
          [userId]
        ),
      ]);
      withdrawals = wRows.map(w => ({
        ...w,
        type: 'withdrawal' as const,
        amount: Number(w.amount),
      }));
      withdrawalCount = parseInt(wCount?.count || '0', 10);
    }

    // Combine and sort by date
    const allTransactions = [...deposits, ...withdrawals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = type === 'all' ? depositCount + withdrawalCount : (type === 'deposit' ? depositCount : withdrawalCount);
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    return {
      transactions: paginatedTransactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get comprehensive user detail with all info
  async getUserFullDetail(userId: string): Promise<{
    user: UserDetail;
    isOnline: boolean;
    liveTrades: {
      id: string;
      symbol: string;
      direction: string;
      amount: number;
      entryPrice: number;
      duration: number;
      payoutPercent: number;
      accountType: string;
      openedAt: Date;
      expiresAt: Date;
    }[];
    accountStats: {
      liveBalance: number;
      demoBalance: number;
      activeAccountType: string;
      totalDeposits: number;
      totalWithdrawals: number;
      pendingDeposits: number;
      pendingWithdrawals: number;
    };
  }> {
    const user = await this.getUserDetail(userId);
    const isOnline = this.isUserOnline(userId);
    const liveTrades = await this.getUserLiveTrades(userId);

    // Get account stats
    const [accountInfo, depositStats, withdrawalStats] = await Promise.all([
      queryOne<{
        liveBalance: number;
        demoBalance: number;
        activeAccountType: string;
      }>(
        `SELECT "liveBalance", "demoBalance", "activeAccountType" FROM "User" WHERE id = $1`,
        [userId]
      ),
      queryOne<{ total: number; pending: number }>(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) as total,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending
         FROM "Deposit" WHERE "userId" = $1`,
        [userId]
      ),
      queryOne<{ total: number; pending: number }>(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) as total,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending
         FROM "Withdrawal" WHERE "userId" = $1`,
        [userId]
      ),
    ]);

    return {
      user,
      isOnline,
      liveTrades,
      accountStats: {
        liveBalance: Number(accountInfo?.liveBalance || 0),
        demoBalance: Number(accountInfo?.demoBalance || 0),
        activeAccountType: accountInfo?.activeAccountType || 'DEMO',
        totalDeposits: Number(depositStats?.total || 0),
        totalWithdrawals: Number(withdrawalStats?.total || 0),
        pendingDeposits: Number(depositStats?.pending || 0),
        pendingWithdrawals: Number(withdrawalStats?.pending || 0),
      },
    };
  }

  // Get platform-wide recent trades with user info
  async getRecentPlatformTrades(limit: number = 20): Promise<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    symbol: string;
    direction: string;
    amount: number;
    profit: number | null;
    status: string;
    result: string | null;
    accountType: string;
    openedAt: Date;
    closedAt: Date | null;
  }[]> {
    const trades = await queryMany<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      symbol: string;
      direction: string;
      amount: number;
      profit: number | null;
      status: string;
      result: string | null;
      accountType: string;
      openedAt: Date;
      closedAt: Date | null;
    }>(
      `SELECT t.id, t."userId", u.name as "userName", u.email as "userEmail",
              t.symbol, t.direction, t.amount, t.profit, t.status, t.result,
              t."accountType", t."openedAt", t."closedAt"
       FROM "Trade" t
       JOIN "User" u ON u.id = t."userId"
       ORDER BY t."openedAt" DESC LIMIT $1`,
      [limit]
    );

    return trades.map(t => ({
      ...t,
      amount: Number(t.amount),
      profit: t.profit ? Number(t.profit) : null,
    }));
  }
}

export const adminService = new AdminService();
export { AdminServiceError };
