import { db } from "@/lib/db";

export class AdminDashboardService {
  /**
   * Get overview statistics for admin dashboard
   */
  static async getOverviewStats() {
    const [
      totalPartners,
      activePartners,
      pendingWithdrawals,
      openTickets,
      pendingLevelReviews,
      totalCommissionsPaid,
      recentPartners,
      recentWithdrawals,
    ] = await Promise.all([
      // Total partners
      db.partner.count(),

      // Active partners
      db.partner.count({ where: { status: "ACTIVE" } }),

      // Pending withdrawals
      db.withdrawal.count({ where: { status: "PENDING" } }),

      // Open tickets
      db.supportTicket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),

      // Pending level reviews
      db.levelReviewRequest.count({ where: { status: "PENDING" } }),

      // Total commissions paid
      db.settlement.aggregate({
        where: { status: "CREDITED" },
        _sum: { amount: true },
      }),

      // Recent partners (last 5)
      db.partner.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          level: true,
          status: true,
          createdAt: true,
        },
      }),

      // Recent pending withdrawals
      db.withdrawal.findMany({
        where: { status: "PENDING" },
        orderBy: { requestedAt: "desc" },
        take: 5,
        include: {
          partner: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      stats: {
        totalPartners,
        activePartners,
        pendingWithdrawals,
        openTickets,
        pendingLevelReviews,
        totalCommissionsPaid: Number(totalCommissionsPaid._sum?.amount || 0),
      },
      recentPartners: recentPartners.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      recentWithdrawals: recentWithdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        method: w.method,
        status: w.status,
        requestedAt: w.requestedAt.toISOString(),
        partner: {
          name: `${w.partner.firstName} ${w.partner.lastName}`,
          email: w.partner.email,
        },
      })),
    };
  }

  /**
   * Get partner stats by level
   */
  static async getPartnersByLevel() {
    const partnersByLevel = await db.partner.groupBy({
      by: ["level"],
      _count: true,
    });

    return partnersByLevel.map((p) => ({
      level: p.level,
      count: p._count,
    }));
  }

  /**
   * Get withdrawal stats
   */
  static async getWithdrawalStats() {
    const [pending, processing, completed, rejected] = await Promise.all([
      db.withdrawal.aggregate({
        where: { status: "PENDING" },
        _count: true,
        _sum: { amount: true },
      }),
      db.withdrawal.aggregate({
        where: { status: "PROCESSING" },
        _count: true,
        _sum: { amount: true },
      }),
      db.withdrawal.aggregate({
        where: { status: "COMPLETED" },
        _count: true,
        _sum: { amount: true },
      }),
      db.withdrawal.aggregate({
        where: { status: "REJECTED" },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      pending: { count: pending._count, amount: Number(pending._sum?.amount || 0) },
      processing: { count: processing._count, amount: Number(processing._sum?.amount || 0) },
      completed: { count: completed._count, amount: Number(completed._sum?.amount || 0) },
      rejected: { count: rejected._count, amount: Number(rejected._sum?.amount || 0) },
    };
  }
}
