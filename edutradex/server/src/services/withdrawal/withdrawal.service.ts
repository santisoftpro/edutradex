import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { emailService } from '../email/email.service.js';

export type WithdrawalMethod = 'MOBILE_MONEY' | 'CRYPTO';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CreateMobileMoneyWithdrawal {
  userId: string;
  amount: number;
  phoneNumber: string;
  mobileProvider: string;
}

interface CreateCryptoWithdrawal {
  userId: string;
  amount: number;
  cryptoCurrency: string;
  walletAddress: string;
}

interface WithdrawalFilters {
  status?: WithdrawalStatus;
  method?: WithdrawalMethod;
  userId?: string;
  page?: number;
  limit?: number;
}

class WithdrawalServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'WithdrawalServiceError';
  }
}

export class WithdrawalService {
  async createMobileMoneyWithdrawal(data: CreateMobileMoneyWithdrawal) {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new WithdrawalServiceError('User not found', 404);
    }

    if (user.demoBalance < data.amount) {
      throw new WithdrawalServiceError('Insufficient balance', 400);
    }

    // Create withdrawal and deduct balance immediately (hold funds)
    const [withdrawal] = await prisma.$transaction([
      prisma.withdrawal.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          method: 'MOBILE_MONEY',
          status: 'PENDING',
          phoneNumber: data.phoneNumber,
          mobileProvider: data.mobileProvider,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: data.userId },
        data: {
          demoBalance: {
            decrement: data.amount,
          },
        },
      }),
    ]);

    logger.info('Mobile money withdrawal request created (balance held)', {
      withdrawalId: withdrawal.id,
      userId: data.userId,
      amount: data.amount,
      provider: data.mobileProvider,
    });

    return withdrawal;
  }

  async createCryptoWithdrawal(data: CreateCryptoWithdrawal) {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new WithdrawalServiceError('User not found', 404);
    }

    if (user.demoBalance < data.amount) {
      throw new WithdrawalServiceError('Insufficient balance', 400);
    }

    // Create withdrawal and deduct balance immediately (hold funds)
    const [withdrawal] = await prisma.$transaction([
      prisma.withdrawal.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          method: 'CRYPTO',
          status: 'PENDING',
          cryptoCurrency: data.cryptoCurrency,
          walletAddress: data.walletAddress,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: data.userId },
        data: {
          demoBalance: {
            decrement: data.amount,
          },
        },
      }),
    ]);

    logger.info('Crypto withdrawal request created (balance held)', {
      withdrawalId: withdrawal.id,
      userId: data.userId,
      amount: data.amount,
      currency: data.cryptoCurrency,
    });

    return withdrawal;
  }

  async getUserWithdrawals(userId: string, filters?: { status?: WithdrawalStatus; limit?: number }) {
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });

    return withdrawals;
  }

  async getWithdrawalById(withdrawalId: string, userId?: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!withdrawal) {
      throw new WithdrawalServiceError('Withdrawal not found', 404);
    }

    if (userId && withdrawal.userId !== userId) {
      throw new WithdrawalServiceError('Unauthorized', 403);
    }

    return withdrawal;
  }

  // Admin methods
  async getAllWithdrawals(filters: WithdrawalFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.userId) where.userId = filters.userId;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return {
      data: withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPendingWithdrawalsCount() {
    return prisma.withdrawal.count({
      where: { status: 'PENDING' },
    });
  }

  async approveWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new WithdrawalServiceError('Withdrawal not found', 404);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new WithdrawalServiceError('Withdrawal has already been processed', 400);
    }

    // Balance was already deducted when withdrawal was created
    // Just update the withdrawal status to APPROVED
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'APPROVED',
        adminNote,
        processedBy: adminId,
        processedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Withdrawal approved', {
      withdrawalId,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      approvedBy: adminId,
    });

    // Send real-time notification to user
    wsManager.notifyWithdrawalUpdate(withdrawal.userId, {
      id: withdrawalId,
      amount: withdrawal.amount,
      status: 'APPROVED',
      method: withdrawal.method,
      adminNote,
    });

    // Send email notification
    if (updatedWithdrawal.user) {
      emailService.sendWithdrawalApproved(
        updatedWithdrawal.user.email,
        updatedWithdrawal.user.name,
        withdrawal.amount,
        withdrawal.method
      ).catch(err => logger.error('Failed to send withdrawal approved email', { error: err }));
    }

    return updatedWithdrawal;
  }

  async rejectWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new WithdrawalServiceError('Withdrawal not found', 404);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new WithdrawalServiceError('Withdrawal has already been processed', 400);
    }

    // Reject withdrawal and refund balance to user (balance was held at creation)
    const [updatedWithdrawal] = await prisma.$transaction([
      prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          adminNote,
          processedBy: adminId,
          processedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: withdrawal.userId },
        data: {
          demoBalance: {
            increment: withdrawal.amount,
          },
        },
      }),
    ]);

    logger.info('Withdrawal rejected (balance refunded)', {
      withdrawalId,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      rejectedBy: adminId,
      reason: adminNote,
    });

    // Send real-time notification to user
    wsManager.notifyWithdrawalUpdate(withdrawal.userId, {
      id: withdrawalId,
      amount: withdrawal.amount,
      status: 'REJECTED',
      method: withdrawal.method,
      adminNote,
    });

    // Send email notification
    if (updatedWithdrawal.user) {
      emailService.sendWithdrawalRejected(
        updatedWithdrawal.user.email,
        updatedWithdrawal.user.name,
        withdrawal.amount,
        adminNote
      ).catch(err => logger.error('Failed to send withdrawal rejected email', { error: err }));
    }

    return updatedWithdrawal;
  }

  async getWithdrawalStats() {
    const [pending, approved, rejected, totalVolume] = await Promise.all([
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.count({ where: { status: 'APPROVED' } }),
      prisma.withdrawal.count({ where: { status: 'REJECTED' } }),
      prisma.withdrawal.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      totalVolume: totalVolume._sum.amount || 0,
    };
  }
}

export const withdrawalService = new WithdrawalService();
export { WithdrawalServiceError };
