import { db } from "@/lib/db";
import { NotFoundError, BusinessError, ValidationError } from "@/lib/errors";
import { WITHDRAWAL_CONFIG, canWithdrawToday, getLevelConfig } from "@/lib/constants";
import type { WithdrawalStatus, PayoutMethod, Prisma } from "@prisma/client";

/**
 * Withdrawal Service
 * Handles withdrawal requests and processing
 */
export class WithdrawalService {
  /**
   * Create a withdrawal request
   */
  static async createRequest(
    partnerId: string,
    data: {
      amount: number;
      method: PayoutMethod;
      coin?: string;
      network?: string;
      address?: string;
      tradingUid?: string;
    }
  ) {
    // Get partner
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        level: true,
        status: true,
        availableBalance: true,
      },
    });

    if (!partner) {
      throw new NotFoundError("Partner");
    }

    // Validate partner status
    if (partner.status !== "ACTIVE") {
      throw new BusinessError(
        "Your account must be active to request withdrawals",
        "ACCOUNT_NOT_ACTIVE"
      );
    }

    // Validate withdrawal day
    if (!canWithdrawToday(partner.level)) {
      const config = getLevelConfig(partner.level);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const allowedDays = config.withdrawalDays.map((d: number) => dayNames[d]).join(" and ");
      throw new BusinessError(
        `Withdrawals for ${config.name} level are only available on ${config.withdrawalFrequency === "daily" ? "any day" : allowedDays}`,
        "WITHDRAWAL_NOT_ALLOWED_TODAY"
      );
    }

    // Validate minimum amount
    if (data.amount < WITHDRAWAL_CONFIG.MIN_AMOUNT) {
      throw new ValidationError({
        amount: [`Minimum withdrawal amount is $${WITHDRAWAL_CONFIG.MIN_AMOUNT}`],
      });
    }

    // Validate balance
    if (data.amount > Number(partner.availableBalance)) {
      throw new BusinessError(
        "Insufficient balance for this withdrawal",
        "INSUFFICIENT_BALANCE"
      );
    }

    // Validate crypto details if crypto method
    if (data.method === "CRYPTO") {
      if (!data.coin || !data.network || !data.address) {
        throw new ValidationError({
          _error: ["Coin, network, and address are required for crypto withdrawals"],
        });
      }

      // Validate supported coin
      const supportedCoin = WITHDRAWAL_CONFIG.SUPPORTED_COINS.find(
        (c) => c.symbol === data.coin
      );
      if (!supportedCoin) {
        throw new ValidationError({
          coin: ["Unsupported cryptocurrency"],
        });
      }

      // Validate network for coin
      if (!(supportedCoin.networks as readonly string[]).includes(data.network)) {
        throw new ValidationError({
          network: [`Invalid network for ${data.coin}`],
        });
      }
    }

    // Validate internal transfer details
    if (data.method === "INTERNAL_TRANSFER") {
      if (!data.tradingUid) {
        throw new ValidationError({
          tradingUid: ["Trading UID is required for internal transfers"],
        });
      }
    }

    // Check for pending withdrawal
    const pendingWithdrawal = await db.withdrawal.findFirst({
      where: {
        partnerId,
        status: "PENDING",
      },
    });

    if (pendingWithdrawal) {
      throw new BusinessError(
        "You already have a pending withdrawal request",
        "PENDING_WITHDRAWAL_EXISTS"
      );
    }

    // Calculate fee (0 for now, can be configured)
    const fee = 0;
    const netAmount = data.amount - fee;

    // Create withdrawal request
    const withdrawal = await db.withdrawal.create({
      data: {
        partnerId,
        amount: data.amount,
        fee,
        netAmount,
        method: data.method,
        coin: data.coin || null,
        network: data.network || null,
        address: data.address || null,
        tradingUid: data.tradingUid || null,
        status: "PENDING",
      },
    });

    // Deduct from balance
    await db.partner.update({
      where: { id: partnerId },
      data: {
        availableBalance: { decrement: data.amount },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        partnerId,
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal request for $${data.amount.toFixed(2)} has been submitted and is being processed.`,
        type: "PAYOUT_UPDATE",
        linkType: "withdrawal",
        linkId: withdrawal.id,
      },
    });

    return withdrawal;
  }

  /**
   * Cancel a pending withdrawal request
   */
  static async cancelRequest(withdrawalId: string, partnerId: string) {
    const withdrawal = await db.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        partnerId,
      },
    });

    if (!withdrawal) {
      throw new NotFoundError("Withdrawal");
    }

    if (withdrawal.status !== "PENDING") {
      throw new BusinessError(
        "Only pending withdrawals can be cancelled",
        "CANNOT_CANCEL_WITHDRAWAL"
      );
    }

    // Update withdrawal status
    await db.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "CANCELLED" },
    });

    // Refund balance
    await db.partner.update({
      where: { id: partnerId },
      data: {
        availableBalance: { increment: Number(withdrawal.amount) },
      },
    });

    return { success: true };
  }

  /**
   * Get partner's withdrawal history
   */
  static async getPartnerWithdrawals(
    partnerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: WithdrawalStatus;
      from?: Date;
      to?: Date;
    }
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.WithdrawalWhereInput = {
      partnerId,
      ...(options?.status && { status: options.status }),
      ...(options?.from || options?.to
        ? {
            requestedAt: {
              ...(options?.from && { gte: options.from }),
              ...(options?.to && { lte: options.to }),
            },
          }
        : {}),
    };

    const [withdrawals, total, summary] = await Promise.all([
      db.withdrawal.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.withdrawal.count({ where }),
      db.withdrawal.aggregate({
        where: { partnerId, status: "COMPLETED" },
        _sum: { netAmount: true },
        _count: true,
      }),
    ]);

    return {
      data: withdrawals,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        totalWithdrawn: summary._sum?.netAmount || 0,
        completedCount: summary._count,
      },
    };
  }

  /**
   * Get withdrawal by ID (with partner verification)
   */
  static async getWithdrawalById(withdrawalId: string, partnerId: string) {
    const withdrawal = await db.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        partnerId,
      },
    });

    if (!withdrawal) {
      throw new NotFoundError("Withdrawal");
    }

    return withdrawal;
  }

  /**
   * Admin: Approve withdrawal (move to processing)
   */
  static async approveWithdrawal(withdrawalId: string) {
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundError("Withdrawal");
    }

    if (withdrawal.status !== "PENDING") {
      throw new BusinessError(
        "Only pending withdrawals can be approved",
        "INVALID_WITHDRAWAL_STATUS"
      );
    }

    const updated = await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "PROCESSING",
        processedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Admin: Complete withdrawal
   */
  static async completeWithdrawal(withdrawalId: string, txId?: string) {
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { partner: { select: { id: true } } },
    });

    if (!withdrawal) {
      throw new NotFoundError("Withdrawal");
    }

    if (withdrawal.status !== "PROCESSING") {
      throw new BusinessError(
        "Only processing withdrawals can be completed",
        "INVALID_WITHDRAWAL_STATUS"
      );
    }

    const updated = await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "COMPLETED",
        txId: txId || null,
        completedAt: new Date(),
      },
    });

    // Update partner's total withdrawn
    await db.partner.update({
      where: { id: withdrawal.partnerId },
      data: {
        totalWithdrawn: { increment: Number(withdrawal.netAmount) },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        partnerId: withdrawal.partnerId,
        title: "Withdrawal Completed",
        message: `Your withdrawal of $${Number(withdrawal.netAmount).toFixed(2)} has been completed.${txId ? ` Transaction ID: ${txId}` : ""}`,
        type: "PAYOUT_UPDATE",
        linkType: "withdrawal",
        linkId: withdrawal.id,
      },
    });

    return updated;
  }

  /**
   * Admin: Reject withdrawal
   */
  static async rejectWithdrawal(withdrawalId: string, reason: string) {
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundError("Withdrawal");
    }

    if (!["PENDING", "PROCESSING"].includes(withdrawal.status)) {
      throw new BusinessError(
        "This withdrawal cannot be rejected",
        "INVALID_WITHDRAWAL_STATUS"
      );
    }

    // Update withdrawal status
    await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        processedAt: new Date(),
      },
    });

    // Refund balance
    await db.partner.update({
      where: { id: withdrawal.partnerId },
      data: {
        availableBalance: { increment: Number(withdrawal.amount) },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        partnerId: withdrawal.partnerId,
        title: "Withdrawal Rejected",
        message: `Your withdrawal request for $${Number(withdrawal.amount).toFixed(2)} has been rejected. Reason: ${reason}`,
        type: "PAYOUT_UPDATE",
        linkType: "withdrawal",
        linkId: withdrawal.id,
      },
    });

    return { success: true };
  }

  /**
   * Get withdrawal method options for partner
   */
  static getWithdrawalMethods() {
    return {
      crypto: {
        coins: WITHDRAWAL_CONFIG.SUPPORTED_COINS,
        minAmount: WITHDRAWAL_CONFIG.MIN_AMOUNT,
      },
      internalTransfer: {
        minAmount: WITHDRAWAL_CONFIG.MIN_AMOUNT,
        description: "Transfer to your broker trading account",
      },
    };
  }
}
