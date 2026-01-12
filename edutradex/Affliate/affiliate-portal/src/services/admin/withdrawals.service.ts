import { db } from "@/lib/db";
import type { WithdrawalStatus, Prisma } from "@prisma/client";

export class AdminWithdrawalsService {
  /**
   * Get all withdrawals with pagination and filtering
   */
  static async getWithdrawals(options?: {
    page?: number;
    pageSize?: number;
    status?: WithdrawalStatus;
    sortBy?: "requestedAt" | "amount";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.WithdrawalWhereInput = {
      ...(options?.status && { status: options.status }),
    };

    const orderBy: Prisma.WithdrawalOrderByWithRelationInput = {
      [options?.sortBy || "requestedAt"]: options?.sortOrder || "desc",
    };

    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              level: true,
            },
          },
        },
      }),
      db.withdrawal.count({ where }),
    ]);

    return {
      data: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        fee: Number(w.fee),
        netAmount: Number(w.netAmount),
        method: w.method,
        coin: w.coin,
        network: w.network,
        address: w.address,
        tradingUid: w.tradingUid,
        status: w.status,
        txId: w.txId,
        rejectionReason: w.rejectionReason,
        requestedAt: w.requestedAt.toISOString(),
        processedAt: w.processedAt?.toISOString() || null,
        completedAt: w.completedAt?.toISOString() || null,
        partner: {
          id: w.partner.id,
          name: `${w.partner.firstName} ${w.partner.lastName}`,
          email: w.partner.email,
          level: w.partner.level,
        },
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Approve withdrawal
   */
  static async approveWithdrawal(id: string, txId?: string) {
    const withdrawal = await db.withdrawal.update({
      where: { id },
      data: {
        status: "PROCESSING",
        processedAt: new Date(),
        ...(txId && { txId }),
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "withdrawal",
        entityId: id,
        action: "approved",
        performedBy: "admin",
        performerType: "admin",
      },
    });

    return withdrawal;
  }

  /**
   * Complete withdrawal
   */
  static async completeWithdrawal(id: string, txId: string) {
    const withdrawal = await db.withdrawal.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        txId,
      },
    });

    // Deduct from partner balance
    await db.partner.update({
      where: { id: withdrawal.partnerId },
      data: {
        availableBalance: { decrement: withdrawal.amount },
        totalWithdrawn: { increment: withdrawal.netAmount },
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "withdrawal",
        entityId: id,
        action: "completed",
        performedBy: "admin",
        performerType: "admin",
        newValue: { txId },
      },
    });

    return withdrawal;
  }

  /**
   * Reject withdrawal
   */
  static async rejectWithdrawal(id: string, reason: string) {
    const withdrawal = await db.withdrawal.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        processedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "withdrawal",
        entityId: id,
        action: "rejected",
        performedBy: "admin",
        performerType: "admin",
        newValue: { reason },
      },
    });

    return withdrawal;
  }
}
