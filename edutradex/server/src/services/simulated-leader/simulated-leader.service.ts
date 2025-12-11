import { PrismaClient, SimulatedLeader, SimulatedLeaderFollower } from '@prisma/client';

const prisma = new PrismaClient();

// Realistic trader names for auto-generation
const TRADER_FIRST_NAMES = [
  'Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Blake', 'Cameron', 'Dakota', 'Emery', 'Finley', 'Harper', 'Jamie', 'Kennedy',
  'Logan', 'Madison', 'Noah', 'Parker', 'Reese', 'Sage', 'Skyler', 'Tyler',
];

const TRADER_SUFFIXES = [
  'Trades', 'FX', 'Pro', 'Capital', 'Trading', 'Signals', 'Crypto', 'Markets',
  'Invest', 'Wealth', 'Alpha', 'Beta', 'Prime', 'Elite', 'Master', 'Expert',
];

const DESCRIPTIONS = [
  'Focused on consistent gains with risk management.',
  'Specializing in forex and crypto markets.',
  'Long-term value investor with steady returns.',
  'Technical analysis expert with high accuracy.',
  'Day trader focusing on major currency pairs.',
  'Swing trader with disciplined approach.',
  'Diversified portfolio manager.',
  'Momentum trader capturing market trends.',
  'Conservative strategy with capital preservation.',
  'Aggressive growth strategy for experienced followers.',
];

export interface CreateSimulatedLeaderInput {
  displayName: string;
  description?: string;
  avatarUrl?: string;
  winRate?: number;
  totalProfit?: number;
  totalTrades?: number;
  followerCount?: number;
  winRateMin?: number;
  winRateMax?: number;
  profitMin?: number;
  profitMax?: number;
  followerMin?: number;
  followerMax?: number;
  tradesMin?: number;
  tradesMax?: number;
  tradeFrequency?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateSimulatedLeaderInput {
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  winRate?: number;
  totalProfit?: number;
  totalTrades?: number;
  followerCount?: number;
  winRateMin?: number;
  winRateMax?: number;
  profitMin?: number;
  profitMax?: number;
  followerMin?: number;
  followerMax?: number;
  tradesMin?: number;
  tradesMax?: number;
  tradeFrequency?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface SimulatedLeaderForDisplay {
  id: string;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
  winRate: number;
  totalProfit: number;
  totalTrades: number;
  followerCount: number;
  isSimulated: true;
  tradeFrequency: number;
  // Variation bounds for client-side animation
  bounds: {
    winRate: { min: number; max: number };
    profit: { min: number; max: number };
    followers: { min: number; max: number };
    trades: { min: number; max: number };
  };
}

class SimulatedLeaderService {
  /**
   * Get all simulated leaders (admin)
   */
  async getAll(): Promise<SimulatedLeader[]> {
    return prisma.simulatedLeader.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get active simulated leaders for display (public)
   */
  async getActiveForDisplay(): Promise<SimulatedLeaderForDisplay[]> {
    const leaders = await prisma.simulatedLeader.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        displayName: true,
        description: true,
        avatarUrl: true,
        winRate: true,
        totalProfit: true,
        totalTrades: true,
        followerCount: true,
        winRateMin: true,
        winRateMax: true,
        profitMin: true,
        profitMax: true,
        followerMin: true,
        followerMax: true,
        tradesMin: true,
        tradesMax: true,
        tradeFrequency: true,
      },
    });

    return leaders.map((leader) => ({
      id: leader.id,
      displayName: leader.displayName,
      description: leader.description,
      avatarUrl: leader.avatarUrl,
      winRate: leader.winRate,
      totalProfit: leader.totalProfit,
      totalTrades: leader.totalTrades,
      followerCount: leader.followerCount,
      isSimulated: true as const,
      tradeFrequency: leader.tradeFrequency,
      bounds: {
        winRate: { min: leader.winRateMin, max: leader.winRateMax },
        profit: { min: leader.profitMin, max: leader.profitMax },
        followers: { min: leader.followerMin, max: leader.followerMax },
        trades: { min: leader.tradesMin, max: leader.tradesMax },
      },
    }));
  }

  /**
   * Get single simulated leader by ID
   */
  async getById(id: string): Promise<SimulatedLeader | null> {
    return prisma.simulatedLeader.findUnique({ where: { id } });
  }

  /**
   * Create a new simulated leader
   */
  async create(data: CreateSimulatedLeaderInput): Promise<SimulatedLeader> {
    return prisma.simulatedLeader.create({ data });
  }

  /**
   * Update a simulated leader
   */
  async update(id: string, data: UpdateSimulatedLeaderInput): Promise<SimulatedLeader> {
    return prisma.simulatedLeader.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a simulated leader
   */
  async delete(id: string): Promise<void> {
    await prisma.simulatedLeader.delete({ where: { id } });
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<SimulatedLeader> {
    const leader = await prisma.simulatedLeader.findUnique({ where: { id } });
    if (!leader) {
      throw new Error('Simulated leader not found');
    }

    return prisma.simulatedLeader.update({
      where: { id },
      data: { isActive: !leader.isActive },
    });
  }

  /**
   * Auto-generate multiple simulated leaders with realistic data
   */
  async autoGenerate(count: number): Promise<SimulatedLeader[]> {
    const leaders: SimulatedLeader[] = [];
    const existingCount = await prisma.simulatedLeader.count();

    for (let i = 0; i < count; i++) {
      const firstName = TRADER_FIRST_NAMES[Math.floor(Math.random() * TRADER_FIRST_NAMES.length)];
      const suffix = TRADER_SUFFIXES[Math.floor(Math.random() * TRADER_SUFFIXES.length)];
      const displayName = `${firstName}_${suffix}`;

      // Generate realistic stats
      const baseWinRate = this.randomFloat(58, 82);
      const baseTotalTrades = this.randomInt(80, 600);
      const baseProfit = this.randomFloat(500, 15000);
      const baseFollowers = this.randomInt(15, 350);

      const leader = await prisma.simulatedLeader.create({
        data: {
          displayName,
          description: DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)],
          winRate: baseWinRate,
          totalProfit: baseProfit,
          totalTrades: baseTotalTrades,
          followerCount: baseFollowers,
          winRateMin: Math.max(50, baseWinRate - 10),
          winRateMax: Math.min(95, baseWinRate + 10),
          profitMin: Math.max(0, baseProfit - 2000),
          profitMax: baseProfit + 5000,
          followerMin: Math.max(5, baseFollowers - 30),
          followerMax: baseFollowers + 100,
          tradesMin: Math.max(20, baseTotalTrades - 50),
          tradesMax: baseTotalTrades + 200,
          tradeFrequency: this.randomInt(3, 12),
          isActive: true,
          displayOrder: existingCount + i,
        },
      });

      leaders.push(leader);
    }

    return leaders;
  }

  /**
   * Get stats summary
   */
  async getStats(): Promise<{ total: number; active: number; inactive: number }> {
    const [total, active] = await Promise.all([
      prisma.simulatedLeader.count(),
      prisma.simulatedLeader.count({ where: { isActive: true } }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  /**
   * Bulk update display order
   */
  async updateDisplayOrder(orderMap: { id: string; order: number }[]): Promise<void> {
    await prisma.$transaction(
      orderMap.map(({ id, order }) =>
        prisma.simulatedLeader.update({
          where: { id },
          data: { displayOrder: order },
        })
      )
    );
  }

  // ==========================================
  // Follower Management (Visual Only)
  // ==========================================

  /**
   * Follow a simulated leader (visual only, no real trades)
   */
  async followLeader(
    userId: string,
    simulatedLeaderId: string,
    settings: {
      copyMode?: string;
      fixedAmount?: number;
      maxDailyTrades?: number;
    }
  ): Promise<SimulatedLeaderFollower> {
    const leader = await prisma.simulatedLeader.findUnique({
      where: { id: simulatedLeaderId },
    });

    if (!leader) {
      throw new Error('Simulated leader not found');
    }

    if (!leader.isActive) {
      throw new Error('This leader is not available');
    }

    // Check if already following
    const existing = await prisma.simulatedLeaderFollower.findUnique({
      where: {
        userId_simulatedLeaderId: { userId, simulatedLeaderId },
      },
    });

    if (existing) {
      throw new Error('Already following this leader');
    }

    // Create follower record
    const follower = await prisma.simulatedLeaderFollower.create({
      data: {
        userId,
        simulatedLeaderId,
        copyMode: settings.copyMode || 'AUTOMATIC',
        fixedAmount: settings.fixedAmount || 10,
        maxDailyTrades: settings.maxDailyTrades || 50,
        isActive: true,
      },
    });

    // Increment follower count on leader
    await prisma.simulatedLeader.update({
      where: { id: simulatedLeaderId },
      data: {
        followerCount: { increment: 1 },
        followerMin: { increment: 1 },
        followerMax: { increment: 1 },
      },
    });

    return follower;
  }

  /**
   * Unfollow a simulated leader
   */
  async unfollowLeader(userId: string, simulatedLeaderId: string): Promise<void> {
    const follower = await prisma.simulatedLeaderFollower.findUnique({
      where: {
        userId_simulatedLeaderId: { userId, simulatedLeaderId },
      },
    });

    if (!follower) {
      throw new Error('Not following this leader');
    }

    await prisma.simulatedLeaderFollower.delete({
      where: { id: follower.id },
    });

    // Decrement follower count on leader
    await prisma.simulatedLeader.update({
      where: { id: simulatedLeaderId },
      data: {
        followerCount: { decrement: 1 },
        followerMin: { decrement: 1 },
        followerMax: { decrement: 1 },
      },
    });
  }

  /**
   * Update follow settings for a simulated leader
   */
  async updateFollowSettings(
    userId: string,
    simulatedLeaderId: string,
    settings: {
      copyMode?: string;
      fixedAmount?: number;
      maxDailyTrades?: number;
      isActive?: boolean;
    }
  ): Promise<SimulatedLeaderFollower> {
    const follower = await prisma.simulatedLeaderFollower.findUnique({
      where: {
        userId_simulatedLeaderId: { userId, simulatedLeaderId },
      },
    });

    if (!follower) {
      throw new Error('Not following this leader');
    }

    return prisma.simulatedLeaderFollower.update({
      where: { id: follower.id },
      data: settings,
    });
  }

  /**
   * Check if user is following a simulated leader
   */
  async isFollowing(userId: string, simulatedLeaderId: string): Promise<boolean> {
    const follower = await prisma.simulatedLeaderFollower.findUnique({
      where: {
        userId_simulatedLeaderId: { userId, simulatedLeaderId },
      },
    });
    return !!follower;
  }

  /**
   * Get all simulated leaders a user is following
   */
  async getUserFollowing(userId: string): Promise<(SimulatedLeaderFollower & { simulatedLeader: SimulatedLeader })[]> {
    return prisma.simulatedLeaderFollower.findMany({
      where: { userId },
      include: { simulatedLeader: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get IDs of simulated leaders user is following
   */
  async getUserFollowingIds(userId: string): Promise<string[]> {
    const following = await prisma.simulatedLeaderFollower.findMany({
      where: { userId },
      select: { simulatedLeaderId: true },
    });
    return following.map((f) => f.simulatedLeaderId);
  }

  private randomFloat(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export const simulatedLeaderService = new SimulatedLeaderService();
