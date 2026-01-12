import { db } from "@/lib/db";
import type { Prisma, PartnerLevel, PartnerStatus } from "@prisma/client";

export class AdminPartnersService {
  /**
   * Get all partners with pagination and filtering
   */
  static async getPartners(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: PartnerStatus;
    level?: PartnerLevel;
    sortBy?: "createdAt" | "totalFTD" | "totalEarned" | "availableBalance";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PartnerWhereInput = {
      ...(options?.search && {
        OR: [
          { email: { contains: options.search, mode: "insensitive" } },
          { firstName: { contains: options.search, mode: "insensitive" } },
          { lastName: { contains: options.search, mode: "insensitive" } },
        ],
      }),
      ...(options?.status && { status: options.status }),
      ...(options?.level && { level: options.level }),
    };

    const orderBy: Prisma.PartnerOrderByWithRelationInput = {
      [options?.sortBy || "createdAt"]: options?.sortOrder || "desc",
    };

    const [partners, total] = await Promise.all([
      db.partner.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
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
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      db.partner.count({ where }),
    ]);

    return {
      data: partners.map((p) => ({
        ...p,
        availableBalance: Number(p.availableBalance),
        pendingBalance: Number(p.pendingBalance),
        totalEarned: Number(p.totalEarned),
        createdAt: p.createdAt.toISOString(),
        lastLoginAt: p.lastLoginAt?.toISOString() || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get single partner by ID with full details
   */
  static async getPartnerById(id: string) {
    const partner = await db.partner.findUnique({
      where: { id },
      include: {
        referredTraders: {
          orderBy: { registeredAt: "desc" },
          take: 10,
          select: {
            id: true,
            tradingUid: true,
            country: true,
            totalDeposits: true,
            hasFTD: true,
            registeredAt: true,
          },
        },
        withdrawals: {
          orderBy: { requestedAt: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            requestedAt: true,
          },
        },
        trackingLinks: {
          take: 10,
          select: {
            id: true,
            code: true,
            clickCount: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            referredTraders: true,
            withdrawals: true,
            trackingLinks: true,
            commissions: true,
          },
        },
      },
    });

    if (!partner) return null;

    return {
      ...partner,
      availableBalance: Number(partner.availableBalance),
      pendingBalance: Number(partner.pendingBalance),
      totalEarned: Number(partner.totalEarned),
      totalWithdrawn: Number(partner.totalWithdrawn),
      totalDeposits: Number(partner.totalDeposits),
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
      lastLoginAt: partner.lastLoginAt?.toISOString() || null,
      emailVerifiedAt: partner.emailVerifiedAt?.toISOString() || null,
      referredTraders: partner.referredTraders.map((t) => ({
        ...t,
        totalDeposits: Number(t.totalDeposits),
        registeredAt: t.registeredAt.toISOString(),
      })),
      withdrawals: partner.withdrawals.map((w) => ({
        ...w,
        amount: Number(w.amount),
        requestedAt: w.requestedAt.toISOString(),
      })),
    };
  }

  /**
   * Update partner status
   */
  static async updatePartnerStatus(id: string, status: PartnerStatus) {
    const partner = await db.partner.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        entityType: "partner",
        entityId: id,
        action: "status_change",
        performedBy: "admin",
        performerType: "admin",
        newValue: { status },
      },
    });

    return partner;
  }

  /**
   * Update partner level
   */
  static async updatePartnerLevel(id: string, level: PartnerLevel) {
    const partner = await db.partner.update({
      where: { id },
      data: { level },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        level: true,
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        entityType: "partner",
        entityId: id,
        action: "level_change",
        performedBy: "admin",
        performerType: "admin",
        newValue: { level },
      },
    });

    return partner;
  }
}
