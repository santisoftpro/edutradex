import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

/**
 * Statistics Service
 * Handles analytics and statistics for partners
 */
export class StatisticsService {
  /**
   * Get partner's referred traders with stats
   */
  static async getPartnerTraders(
    partnerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      from?: Date;
      to?: Date;
      hasFTD?: boolean;
      sortBy?: "totalDeposits" | "profit" | "loss" | "registeredAt";
      sortOrder?: "asc" | "desc";
    }
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TraderWhereInput = {
      partnerId,
      ...(options?.search && {
        OR: [
          { tradingUid: { contains: options.search, mode: "insensitive" } },
          { country: { contains: options.search, mode: "insensitive" } },
        ],
      }),
      ...(options?.hasFTD !== undefined && { hasFTD: options.hasFTD }),
      ...(options?.from || options?.to
        ? {
            registeredAt: {
              ...(options?.from && { gte: options.from }),
              ...(options?.to && { lte: options.to }),
            },
          }
        : {}),
    };

    const orderBy: Prisma.TraderOrderByWithRelationInput = {
      [options?.sortBy || "registeredAt"]: options?.sortOrder || "desc",
    };

    const [traders, total] = await Promise.all([
      db.trader.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          tradingUid: true,
          country: true,
          balance: true,
          depositCount: true,
          totalDeposits: true,
          profit: true,
          loss: true,
          totalWithdrawals: true,
          hasFTD: true,
          registeredAt: true,
        },
      }),
      db.trader.count({ where }),
    ]);

    return {
      data: traders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get performance data for charts
   */
  static async getPerformanceData(
    partnerId: string,
    options?: {
      from?: Date;
      to?: Date;
      granularity?: "day" | "week" | "month";
    }
  ) {
    const from = options?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = options?.to || new Date();

    // Get daily aggregated data
    const traders = await db.trader.findMany({
      where: {
        partnerId,
        registeredAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        registeredAt: true,
        hasFTD: true,
        totalDeposits: true,
      },
    });

    const commissions = await db.commission.findMany({
      where: {
        partnerId,
        createdAt: {
          gte: from,
          lte: to,
        },
        status: "CREDITED",
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    // Group by date
    const dataByDate = new Map<
      string,
      {
        registrations: number;
        ftdCount: number;
        deposits: number;
        commissions: number;
      }
    >();

    // Initialize date range
    const currentDate = new Date(from);
    while (currentDate <= to) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dataByDate.set(dateKey, {
        registrations: 0,
        ftdCount: 0,
        deposits: 0,
        commissions: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate traders
    for (const trader of traders) {
      const dateKey = trader.registeredAt.toISOString().split("T")[0];
      const data = dataByDate.get(dateKey);
      if (data) {
        data.registrations++;
        if (trader.hasFTD) {
          data.ftdCount++;
          data.deposits += Number(trader.totalDeposits);
        }
      }
    }

    // Aggregate commissions
    for (const commission of commissions) {
      const dateKey = commission.createdAt.toISOString().split("T")[0];
      const data = dataByDate.get(dateKey);
      if (data) {
        data.commissions += Number(commission.amount);
      }
    }

    // Convert to array
    const performanceData = Array.from(dataByDate.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return performanceData;
  }

  /**
   * Get KPI summary for dashboard
   */
  static async getKPISummary(
    partnerId: string,
    dateRange?: { from: Date; to: Date }
  ) {
    const where: Prisma.TraderWhereInput = {
      partnerId,
      ...(dateRange && {
        registeredAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }),
    };

    const [partner, traderCount, ftdCount, depositSum, commissionAggregation] =
      await Promise.all([
        db.partner.findUnique({
          where: { id: partnerId },
          select: {
            availableBalance: true,
            pendingBalance: true,
            totalEarned: true,
            totalFTD: true,
          },
        }),
        db.trader.count({ where }),
        db.trader.count({
          where: { ...where, hasFTD: true },
        }),
        db.trader.aggregate({
          where,
          _sum: { totalDeposits: true },
        }),
        db.commission.aggregate({
          where: {
            partnerId,
            status: "CREDITED",
            ...(dateRange && {
              createdAt: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            }),
          },
          _sum: { amount: true },
        }),
      ]);

    if (!partner) {
      throw new NotFoundError("Partner");
    }

    return {
      registrations: traderCount,
      ftdCount,
      totalDeposits: Number(depositSum._sum?.totalDeposits || 0),
      commissionsEarned: Number(commissionAggregation._sum?.amount || 0),
      availableBalance: Number(partner.availableBalance),
      pendingBalance: Number(partner.pendingBalance),
      totalEarned: Number(partner.totalEarned),
      conversionRate:
        traderCount > 0 ? ((ftdCount / traderCount) * 100).toFixed(2) : "0.00",
    };
  }

  /**
   * Get top 10 leaderboard
   */
  static async getLeaderboard(currentPartnerId?: string) {
    const topPartners = await db.partner.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [{ totalFTD: "desc" }, { totalEarned: "desc" }],
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalFTD: true,
        totalEarned: true,
        totalDeposits: true,
        level: true,
      },
    });

    const leaderboard = topPartners.map((partner, index) => ({
      rank: index + 1,
      id: partner.id,
      displayName: `${partner.firstName} ${partner.lastName.charAt(0)}.`,
      ftdCount: partner.totalFTD,
      deposits: Number(partner.totalDeposits),
      commission: Number(partner.totalEarned),
      level: partner.level,
      isCurrentPartner: partner.id === currentPartnerId,
    }));

    // Check if current partner is in top 10
    let currentPartnerRank = null;
    if (
      currentPartnerId &&
      !leaderboard.some((p) => p.isCurrentPartner)
    ) {
      const currentPartner = await db.partner.findUnique({
        where: { id: currentPartnerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          totalFTD: true,
          totalEarned: true,
        },
      });

      if (currentPartner) {
        // Count how many partners have more FTDs
        const higherRanked = await db.partner.count({
          where: {
            status: "ACTIVE",
            totalFTD: { gt: currentPartner.totalFTD },
          },
        });

        currentPartnerRank = {
          rank: higherRanked + 1,
          id: currentPartner.id,
          displayName: `${currentPartner.firstName} ${currentPartner.lastName.charAt(0)}.`,
          ftdCount: currentPartner.totalFTD,
          commission: Number(currentPartner.totalEarned),
          isCurrentPartner: true,
        };
      }
    }

    return {
      leaderboard,
      currentPartnerRank,
    };
  }

  /**
   * Get country breakdown
   */
  static async getCountryBreakdown(partnerId: string) {
    const traders = await db.trader.groupBy({
      by: ["country"],
      where: {
        partnerId,
        country: { not: null },
      },
      _count: true,
      _sum: {
        totalDeposits: true,
      },
    });

    return traders
      .filter((t) => t.country)
      .map((t) => ({
        country: t.country!,
        traderCount: t._count,
        deposits: Number(t._sum?.totalDeposits || 0),
      }))
      .sort((a, b) => b.traderCount - a.traderCount);
  }

  /**
   * Get link performance breakdown
   */
  static async getLinkPerformanceBreakdown(partnerId: string) {
    const links = await db.trackingLink.findMany({
      where: { partnerId },
      include: {
        _count: {
          select: { traders: true },
        },
      },
    });

    const linksWithStats = await Promise.all(
      links.map(async (link) => {
        const ftdCount = await db.trader.count({
          where: { linkId: link.id, hasFTD: true },
        });

        const deposits = await db.trader.aggregate({
          where: { linkId: link.id },
          _sum: { totalDeposits: true },
        });

        return {
          id: link.id,
          code: link.code,
          comment: link.comment,
          clicks: link.clickCount,
          registrations: link._count.traders,
          ftdCount,
          deposits: Number(deposits._sum?.totalDeposits || 0),
          conversionRate:
            link.clickCount > 0
              ? ((link._count.traders / link.clickCount) * 100).toFixed(2)
              : "0.00",
        };
      })
    );

    return linksWithStats.sort((a, b) => b.ftdCount - a.ftdCount);
  }
}
