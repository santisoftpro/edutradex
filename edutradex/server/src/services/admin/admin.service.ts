import { prisma } from '../../config/database.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { marketService } from '../market/market.service.js';

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

    const skip = (page - 1) * limit;

    const where: {
      role?: string;
      isActive?: boolean;
      OR?: { email?: { contains: string }; name?: { contains: string } }[];
    } = {};

    if (role) {
      where.role = role;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          demoBalance: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { trades: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        demoBalance: Number(user.demoBalance),
        isActive: user.isActive,
        createdAt: user.createdAt,
        tradesCount: user._count.trades,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string): Promise<UserDetail> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        demoBalance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        trades: {
          take: 10,
          orderBy: { openedAt: 'desc' },
          select: {
            id: true,
            symbol: true,
            direction: true,
            amount: true,
            profit: true,
            status: true,
            openedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    const stats = await this.getUserStats(userId);

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
      recentTrades: user.trades.map((trade) => ({
        ...trade,
        amount: Number(trade.amount),
        profit: trade.profit ? Number(trade.profit) : null,
      })),
    };
  }

  private async getUserStats(userId: string) {
    const [totalTrades, wonTrades, lostTrades, profitResult] = await Promise.all([
      prisma.trade.count({ where: { userId } }),
      prisma.trade.count({ where: { userId, result: 'WON' } }),
      prisma.trade.count({ where: { userId, result: 'LOST' } }),
      prisma.trade.aggregate({
        where: { userId, status: 'CLOSED' },
        _sum: { profit: true },
      }),
    ]);

    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
    const totalProfit = Number(profitResult._sum.profit || 0);

    return {
      totalTrades,
      wonTrades,
      lostTrades,
      winRate: Number(winRate.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AdminServiceError('Cannot modify admin user status', 403);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    logger.info('User status updated', { userId, isActive });

    return { success: true };
  }

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean }> {
    if (!['USER', 'ADMIN'].includes(role)) {
      throw new AdminServiceError('Invalid role', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    logger.info('User role updated', { userId, role });

    return { success: true };
  }

  async resetUserBalance(
    userId: string,
    newBalance?: number
  ): Promise<{ demoBalance: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    const balance = newBalance ?? config.trading.defaultDemoBalance;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { demoBalance: balance },
      select: { demoBalance: true },
    });

    logger.info('User balance reset by admin', { userId, newBalance: balance });

    return { demoBalance: Number(updated.demoBalance) };
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new AdminServiceError('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AdminServiceError('Cannot delete admin user', 403);
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('User deleted by admin', { userId });

    return { success: true };
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      totalTrades,
      activeTrades,
      wonTrades,
      totalVolume,
      todayTrades,
      todayVolumeResult,
      usersByRole,
      tradesByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.trade.count(),
      prisma.trade.count({ where: { status: 'OPEN' } }),
      prisma.trade.count({ where: { result: 'WON' } }),
      prisma.trade.aggregate({ _sum: { amount: true } }),
      prisma.trade.count({ where: { openedAt: { gte: todayStart } } }),
      prisma.trade.aggregate({
        where: { openedAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.trade.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const platformWinRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      totalTrades,
      activeTrades,
      platformWinRate: Number(platformWinRate.toFixed(2)),
      totalVolume: Number(totalVolume._sum.amount || 0),
      todayTrades,
      todayVolume: Number(todayVolumeResult._sum.amount || 0),
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count.id,
      })),
      tradesByStatus: tradesByStatus.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
    };
  }

  async getAllMarketConfigs(): Promise<MarketConfigData[]> {
    const configs = await prisma.marketConfig.findMany({
      orderBy: [{ marketType: 'asc' }, { symbol: 'asc' }],
    });

    return configs.map((config) => ({
      ...config,
      payoutPercent: Number(config.payoutPercent),
      minTradeAmount: Number(config.minTradeAmount),
      maxTradeAmount: Number(config.maxTradeAmount),
    }));
  }

  async getMarketConfig(symbol: string): Promise<MarketConfigData | null> {
    const config = await prisma.marketConfig.findUnique({
      where: { symbol },
    });

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
    let config = await prisma.marketConfig.findUnique({
      where: { symbol },
    });

    if (!config) {
      const asset = marketService.getAsset(symbol);
      if (!asset) {
        throw new AdminServiceError('Market symbol not found', 404);
      }

      config = await prisma.marketConfig.create({
        data: {
          symbol,
          marketType: asset.marketType.toUpperCase(),
          name: asset.name,
          isActive: data.isActive ?? true,
          payoutPercent: data.payoutPercent ?? asset.payoutPercent,
          minTradeAmount: data.minTradeAmount ?? 1,
          maxTradeAmount: data.maxTradeAmount ?? 1000,
          volatilityMode: data.volatilityMode ?? 'MEDIUM',
        },
      });
    } else {
      config = await prisma.marketConfig.update({
        where: { symbol },
        data,
      });
    }

    logger.info('Market config updated', { symbol, data });

    return {
      ...config,
      payoutPercent: Number(config.payoutPercent),
      minTradeAmount: Number(config.minTradeAmount),
      maxTradeAmount: Number(config.maxTradeAmount),
    };
  }

  async initializeMarketConfigs(): Promise<{ created: number }> {
    const assets = marketService.getAllAssets();
    let created = 0;

    for (const asset of assets) {
      const existing = await prisma.marketConfig.findUnique({
        where: { symbol: asset.symbol },
      });

      if (!existing) {
        await prisma.marketConfig.create({
          data: {
            symbol: asset.symbol,
            marketType: asset.marketType.toUpperCase(),
            name: asset.name,
            isActive: asset.isActive,
            payoutPercent: asset.payoutPercent,
            minTradeAmount: 1,
            maxTradeAmount: 1000,
            volatilityMode: 'MEDIUM',
          },
        });
        created++;
      }
    }

    logger.info('Market configs initialized', { created });

    return { created };
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    return prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const setting = await prisma.systemConfig.findUnique({
      where: { key },
    });

    return setting?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const setting = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    logger.info('System setting updated', { key, value });

    return setting;
  }

  async deleteSystemSetting(key: string): Promise<{ success: boolean }> {
    const setting = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new AdminServiceError('Setting not found', 404);
    }

    await prisma.systemConfig.delete({
      where: { key },
    });

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
      prisma.trade.findMany({
        take: limit,
        orderBy: { openedAt: 'desc' },
        select: {
          id: true,
          userId: true,
          user: { select: { name: true } },
          symbol: true,
          direction: true,
          amount: true,
          status: true,
          openedAt: true,
        },
      }),
      prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      recentTrades: recentTrades.map((trade) => ({
        id: trade.id,
        userId: trade.userId,
        userName: trade.user.name,
        symbol: trade.symbol,
        direction: trade.direction,
        amount: Number(trade.amount),
        status: trade.status,
        openedAt: trade.openedAt,
      })),
      recentUsers,
    };
  }
}

export const adminService = new AdminService();
export { AdminServiceError };
