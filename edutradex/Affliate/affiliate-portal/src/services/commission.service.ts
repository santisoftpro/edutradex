import { db } from "@/lib/db";
import { NotFoundError, BusinessError } from "@/lib/errors";
import { getLevelRate } from "@/lib/constants";
import { PartnerService } from "./partner.service";
import type { CommissionStatus, Prisma } from "@prisma/client";

/**
 * Commission Service
 * Handles commission calculation, tracking, and settlement
 */
export class CommissionService {
  /**
   * Calculate commission for a trade/deposit
   */
  static calculateCommission(
    basis: number,
    revenueShareRate: number
  ): number {
    // Commission = basis (loss/revenue) * partner's revenue share rate
    const commission = basis * revenueShareRate;
    // Round to 2 decimal places
    return Math.round(commission * 100) / 100;
  }

  /**
   * Create a commission record
   */
  static async createCommission(data: {
    partnerId: string;
    traderId: string;
    amount: number;
    basis: number;
    periodStart: Date;
    periodEnd: Date;
  }) {
    // Get partner's current level and rate
    const partner = await db.partner.findUnique({
      where: { id: data.partnerId },
      select: { level: true, status: true },
    });

    if (!partner) {
      throw new NotFoundError("Partner");
    }

    if (partner.status !== "ACTIVE") {
      throw new BusinessError(
        "Cannot create commission for inactive partner",
        "PARTNER_INACTIVE"
      );
    }

    const rate = getLevelRate(partner.level);

    const commission = await db.commission.create({
      data: {
        partnerId: data.partnerId,
        traderId: data.traderId,
        amount: data.amount,
        basis: data.basis,
        rate,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        status: "PENDING",
      },
    });

    // Add to partner's pending balance
    await PartnerService.addPendingCommission(data.partnerId, data.amount);

    return commission;
  }

  /**
   * Process revenue share from trader activity
   */
  static async processRevenueShare(data: {
    traderId: string;
    basis: number; // The loss/revenue amount
    periodStart: Date;
    periodEnd: Date;
  }) {
    // Get trader and their partner
    const trader = await db.trader.findUnique({
      where: { id: data.traderId },
      include: {
        partner: {
          select: { id: true, level: true, status: true },
        },
      },
    });

    if (!trader || !trader.partner) {
      throw new NotFoundError("Trader");
    }

    if (trader.partner.status !== "ACTIVE") {
      return null; // Don't process commission for inactive partners
    }

    const rate = getLevelRate(trader.partner.level);
    const commissionAmount = this.calculateCommission(data.basis, rate);

    if (commissionAmount <= 0) {
      return null;
    }

    return this.createCommission({
      partnerId: trader.partner.id,
      traderId: data.traderId,
      amount: commissionAmount,
      basis: data.basis,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    });
  }

  /**
   * Get partner's commissions
   */
  static async getPartnerCommissions(
    partnerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: CommissionStatus;
      from?: Date;
      to?: Date;
    }
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CommissionWhereInput = {
      partnerId,
      ...(options?.status && { status: options.status }),
      ...(options?.from || options?.to
        ? {
            createdAt: {
              ...(options?.from && { gte: options.from }),
              ...(options?.to && { lte: options.to }),
            },
          }
        : {}),
    };

    const [commissions, total, aggregations] = await Promise.all([
      db.commission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          trader: {
            select: {
              tradingUid: true,
              country: true,
            },
          },
        },
      }),
      db.commission.count({ where }),
      db.commission.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      data: commissions,
      total,
      totalAmount: aggregations._sum?.amount || 0,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get commission summary for partner
   */
  static async getCommissionSummary(
    partnerId: string,
    dateRange?: { from: Date; to: Date }
  ) {
    const where: Prisma.CommissionWhereInput = {
      partnerId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }),
    };

    const [pending, credited, total] = await Promise.all([
      db.commission.aggregate({
        where: { ...where, status: "PENDING" },
        _sum: { amount: true },
        _count: true,
      }),
      db.commission.aggregate({
        where: { ...where, status: "CREDITED" },
        _sum: { amount: true },
        _count: true,
      }),
      db.commission.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      pending: {
        amount: pending._sum?.amount || 0,
        count: pending._count,
      },
      credited: {
        amount: credited._sum?.amount || 0,
        count: credited._count,
      },
      total: {
        amount: total._sum?.amount || 0,
        count: total._count,
      },
    };
  }

  /**
   * Run daily settlement process
   * Called by a cron job at 00:00 UTC
   */
  static async runDailySettlement() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all pending commissions from yesterday
    const pendingCommissions = await db.commission.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
      include: {
        partner: {
          select: { id: true, level: true, status: true },
        },
      },
    });

    // Group by partner
    const partnerCommissions = new Map<string, typeof pendingCommissions>();
    for (const commission of pendingCommissions) {
      const partnerId = commission.partnerId;
      if (!partnerCommissions.has(partnerId)) {
        partnerCommissions.set(partnerId, []);
      }
      partnerCommissions.get(partnerId)!.push(commission);
    }

    const settlements: Array<{
      partnerId: string;
      amount: number;
      commissionCount: number;
    }> = [];

    // Process each partner's commissions
    for (const [partnerId, commissions] of partnerCommissions) {
      const partner = commissions[0].partner;
      if (partner.status !== "ACTIVE") continue;

      const totalAmount = commissions.reduce(
        (sum: number, c) => sum + Number(c.amount),
        0
      );
      const commissionIds = commissions.map((c) => c.id);

      // Create settlement record
      const settlement = await db.settlement.create({
        data: {
          partnerId,
          amount: totalAmount,
          commissionCount: commissions.length,
          level: partner.level,
          rate: getLevelRate(partner.level),
          periodDate: yesterday,
          status: "CREDITED",
        },
      });

      // Update commissions to credited with settlement reference
      await db.commission.updateMany({
        where: { id: { in: commissionIds } },
        data: {
          status: "CREDITED",
          settlementId: settlement.id,
          creditedAt: new Date(),
        },
      });

      // Settle partner's pending balance
      await PartnerService.settlePendingBalance(partnerId, totalAmount);

      settlements.push({
        partnerId,
        amount: totalAmount,
        commissionCount: commissions.length,
      });
    }

    return {
      date: yesterday,
      settlementsProcessed: settlements.length,
      totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
      details: settlements,
    };
  }

  /**
   * Get partner's settlements
   */
  static async getPartnerSettlements(
    partnerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      from?: Date;
      to?: Date;
    }
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SettlementWhereInput = {
      partnerId,
      ...(options?.from || options?.to
        ? {
            periodDate: {
              ...(options?.from && { gte: options.from }),
              ...(options?.to && { lte: options.to }),
            },
          }
        : {}),
    };

    const [settlements, total] = await Promise.all([
      db.settlement.findMany({
        where,
        orderBy: { periodDate: "desc" },
        skip,
        take: pageSize,
      }),
      db.settlement.count({ where }),
    ]);

    return {
      data: settlements,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
