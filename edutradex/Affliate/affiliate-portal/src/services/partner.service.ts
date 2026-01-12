import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { NotFoundError, ConflictError, BusinessError } from "@/lib/errors";
import { getEligibleLevel, getLevelConfig } from "@/lib/constants";
import type { PartnerLevel, PartnerStatus, Prisma } from "@prisma/client";

/**
 * Partner Service
 * Handles all partner-related business logic
 */
export class PartnerService {
  /**
   * Get partner by ID
   */
  static async getById(partnerId: string) {
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        level: true,
        status: true,
        availableBalance: true,
        pendingBalance: true,
        totalEarned: true,
        totalFTD: true,
        totalTraders: true,
        totalDeposits: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!partner) {
      throw new NotFoundError("Partner");
    }

    return partner;
  }

  /**
   * Get partner by email
   */
  static async getByEmail(email: string) {
    return db.partner.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Create a new partner
   */
  static async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    marketingMethods?: string[];
  }) {
    const existingPartner = await this.getByEmail(data.email);

    if (existingPartner) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);

    // Create partner with marketing methods
    const partner = await db.partner.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        level: "STARTER",
        status: "PENDING",
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalFTD: 0,
        totalTraders: 0,
        totalDeposits: 0,
        // Create marketing methods if provided
        ...(data.marketingMethods && data.marketingMethods.length > 0
          ? {
              marketingMethods: {
                create: data.marketingMethods.map((method) => ({
                  method: method as Prisma.PartnerMarketingMethodCreateInput["method"],
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        level: true,
        status: true,
      },
    });

    return partner;
  }

  /**
   * Update partner profile
   */
  static async updateProfile(
    partnerId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      country: string;
    }>
  ) {
    const partner = await db.partner.update({
      where: { id: partnerId },
      data: {
        ...(data.firstName && { firstName: data.firstName.trim() }),
        ...(data.lastName && { lastName: data.lastName.trim() }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.country && { country: data.country }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
      },
    });

    return partner;
  }

  /**
   * Update partner password
   */
  static async updatePassword(partnerId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);

    await db.partner.update({
      where: { id: partnerId },
      data: { passwordHash },
    });
  }

  /**
   * Get partner dashboard summary
   */
  static async getDashboardSummary(partnerId: string) {
    const partner = await this.getById(partnerId);
    const levelConfig = getLevelConfig(partner.level);

    // Get recent performance data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentCommissions, recentTraders, pendingWithdrawals] =
      await Promise.all([
        db.commission.aggregate({
          where: {
            partnerId,
            createdAt: { gte: thirtyDaysAgo },
            status: "CREDITED",
          },
          _sum: { amount: true },
          _count: true,
        }),
        db.trader.count({
          where: {
            partnerId,
            registeredAt: { gte: thirtyDaysAgo },
          },
        }),
        db.withdrawal.count({
          where: {
            partnerId,
            status: "PENDING",
          },
        }),
      ]);

    return {
      availableBalance: partner.availableBalance,
      pendingBalance: partner.pendingBalance,
      totalEarned: partner.totalEarned,
      level: partner.level,
      levelName: levelConfig.name,
      revenueShareRate: levelConfig.rate,
      totalFTD: partner.totalFTD,
      recentStats: {
        commissionsEarned: recentCommissions._sum?.amount || 0,
        tradersReferred: recentTraders,
        pendingWithdrawals,
      },
    };
  }

  /**
   * Check and update partner level based on performance
   */
  static async evaluateLevel(partnerId: string): Promise<{
    previousLevel: PartnerLevel;
    newLevel: PartnerLevel;
    upgraded: boolean;
  }> {
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      include: {
        socialChannels: {
          where: { status: "VERIFIED" },
        },
      },
    });

    if (!partner) {
      throw new NotFoundError("Partner");
    }

    const hasVerifiedSocial = partner.socialChannels.some(
      (ch: { status: string }) => ch.status === "VERIFIED"
    );
    const socialChannelCount = partner.socialChannels.length;

    const eligibleLevel = getEligibleLevel(
      partner.totalFTD,
      hasVerifiedSocial,
      socialChannelCount
    );

    // Only upgrade, never downgrade automatically
    const levelOrder: PartnerLevel[] = [
      "STARTER",
      "BUILDER",
      "GROWTH",
      "ADVANCED",
      "PRO",
      "AMBASSADOR",
    ];
    const currentLevelIndex = levelOrder.indexOf(partner.level);
    const eligibleLevelIndex = levelOrder.indexOf(eligibleLevel);

    if (eligibleLevelIndex > currentLevelIndex) {
      await db.partner.update({
        where: { id: partnerId },
        data: { level: eligibleLevel },
      });

      // Create notification for level upgrade
      await db.notification.create({
        data: {
          partnerId,
          title: "Level Upgrade!",
          message: `Congratulations! You've been upgraded to ${getLevelConfig(eligibleLevel).name} level.`,
          type: "LEVEL_CHANGE",
        },
      });

      return {
        previousLevel: partner.level,
        newLevel: eligibleLevel,
        upgraded: true,
      };
    }

    return {
      previousLevel: partner.level,
      newLevel: partner.level,
      upgraded: false,
    };
  }

  /**
   * Get partner's level progress
   */
  static async getLevelProgress(partnerId: string) {
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      include: {
        socialChannels: {
          where: { status: "VERIFIED" },
        },
      },
    });

    if (!partner) {
      throw new NotFoundError("Partner");
    }

    const currentConfig = getLevelConfig(partner.level);
    const levelOrder: PartnerLevel[] = [
      "STARTER",
      "BUILDER",
      "GROWTH",
      "ADVANCED",
      "PRO",
      "AMBASSADOR",
    ];
    const currentIndex = levelOrder.indexOf(partner.level);
    const nextLevel =
      currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;
    const nextConfig = nextLevel ? getLevelConfig(nextLevel) : null;

    return {
      currentLevel: partner.level,
      currentRate: currentConfig.rate,
      nextLevel,
      nextRate: nextConfig?.rate || null,
      ftdProgress: {
        current: partner.totalFTD,
        required: nextConfig?.ftdRequired || currentConfig.ftdRequired,
        percentage: nextConfig
          ? Math.min(100, (partner.totalFTD / nextConfig.ftdRequired) * 100)
          : 100,
      },
      socialProgress: {
        channelCount: partner.socialChannels.length,
        isRequired: nextConfig?.socialRequired || false,
        status:
          partner.socialChannels.length > 0
            ? "VERIFIED"
            : nextConfig?.socialRequired
              ? "REQUIRED"
              : "OPTIONAL",
      },
      withdrawalSchedule: {
        frequency: currentConfig.withdrawalFrequency,
        days: currentConfig.withdrawalDays,
      },
    };
  }

  /**
   * Increment FTD count for a partner
   */
  static async incrementFtdCount(partnerId: string) {
    await db.partner.update({
      where: { id: partnerId },
      data: {
        totalFTD: { increment: 1 },
      },
    });

    // Evaluate level after FTD increment
    return this.evaluateLevel(partnerId);
  }

  /**
   * Add commission to partner's pending balance
   */
  static async addPendingCommission(partnerId: string, amount: number) {
    await db.partner.update({
      where: { id: partnerId },
      data: {
        pendingBalance: { increment: amount },
      },
    });
  }

  /**
   * Settle pending balance to available balance
   */
  static async settlePendingBalance(partnerId: string, amount: number) {
    await db.partner.update({
      where: { id: partnerId },
      data: {
        pendingBalance: { decrement: amount },
        availableBalance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });
  }

  /**
   * Increment total traders count
   */
  static async incrementTraderCount(partnerId: string) {
    await db.partner.update({
      where: { id: partnerId },
      data: {
        totalTraders: { increment: 1 },
      },
    });
  }

  /**
   * Update total deposits for partner
   */
  static async addToTotalDeposits(partnerId: string, amount: number) {
    await db.partner.update({
      where: { id: partnerId },
      data: {
        totalDeposits: { increment: amount },
      },
    });
  }
}
