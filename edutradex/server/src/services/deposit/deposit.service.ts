import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { emailService } from '../email/email.service.js';

export type DepositMethod = 'MOBILE_MONEY' | 'CRYPTO';
export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CreateMobileMoneyDeposit {
  userId: string;
  amount: number;
  phoneNumber: string;
  mobileProvider: string;
}

interface CreateCryptoDeposit {
  userId: string;
  amount: number;
  cryptoCurrency: string;
}

interface DepositFilters {
  status?: DepositStatus;
  method?: DepositMethod;
  userId?: string;
  page?: number;
  limit?: number;
}

class DepositServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DepositServiceError';
  }
}

export class DepositService {
  async createMobileMoneyDeposit(data: CreateMobileMoneyDeposit) {
    const deposit = await prisma.deposit.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        method: 'MOBILE_MONEY',
        status: 'PENDING',
        phoneNumber: data.phoneNumber,
        mobileProvider: data.mobileProvider,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info('Mobile money deposit request created', {
      depositId: deposit.id,
      userId: data.userId,
      amount: data.amount,
      provider: data.mobileProvider,
    });

    return deposit;
  }

  async createCryptoDeposit(data: CreateCryptoDeposit) {
    const deposit = await prisma.deposit.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        method: 'CRYPTO',
        status: 'PENDING',
        cryptoCurrency: data.cryptoCurrency,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info('Crypto deposit request created', {
      depositId: deposit.id,
      userId: data.userId,
      amount: data.amount,
      currency: data.cryptoCurrency,
    });

    return deposit;
  }

  async getUserDeposits(userId: string, filters?: { status?: DepositStatus; limit?: number }) {
    return prisma.deposit.findMany({
      where: { userId, ...(filters?.status && { status: filters.status }) },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });
  }

  async getDepositById(depositId: string, userId?: string) {
    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!deposit) throw new DepositServiceError('Deposit not found', 404);
    if (userId && deposit.userId !== userId) throw new DepositServiceError('Unauthorized', 403);

    return deposit;
  }

  async getAllDeposits(filters: DepositFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.userId) where.userId = filters.userId;

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deposit.count({ where }),
    ]);

    return {
      data: deposits,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPendingDepositsCount() {
    return prisma.deposit.count({ where: { status: 'PENDING' } });
  }

  async approveDeposit(depositId: string, adminId: string, adminNote?: string) {
    const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });

    if (!deposit) throw new DepositServiceError('Deposit not found', 404);
    if (deposit.status !== 'PENDING') throw new DepositServiceError('Deposit has already been processed', 400);

    const [updatedDeposit] = await prisma.$transaction([
      prisma.deposit.update({
        where: { id: depositId },
        data: { status: 'APPROVED', adminNote, processedBy: adminId, processedAt: new Date() },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.user.update({
        where: { id: deposit.userId },
        data: { demoBalance: { increment: deposit.amount } },
      }),
    ]);

    logger.info('Deposit approved', { depositId, userId: deposit.userId, amount: deposit.amount, approvedBy: adminId });

    wsManager.notifyDepositUpdate(deposit.userId, {
      id: depositId,
      amount: deposit.amount,
      status: 'APPROVED',
      method: deposit.method,
      adminNote,
    });

    // Send email notification
    if (updatedDeposit.user) {
      emailService.sendDepositApproved(
        updatedDeposit.user.email,
        updatedDeposit.user.name,
        deposit.amount,
        deposit.method
      ).catch(err => logger.error('Failed to send deposit approved email', { error: err }));
    }

    return updatedDeposit;
  }

  async rejectDeposit(depositId: string, adminId: string, adminNote?: string) {
    const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });

    if (!deposit) throw new DepositServiceError('Deposit not found', 404);
    if (deposit.status !== 'PENDING') throw new DepositServiceError('Deposit has already been processed', 400);

    const updatedDeposit = await prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'REJECTED', adminNote, processedBy: adminId, processedAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    logger.info('Deposit rejected', { depositId, userId: deposit.userId, amount: deposit.amount, rejectedBy: adminId, reason: adminNote });

    wsManager.notifyDepositUpdate(deposit.userId, {
      id: depositId,
      amount: deposit.amount,
      status: 'REJECTED',
      method: deposit.method,
      adminNote,
    });

    // Send email notification
    if (updatedDeposit.user) {
      emailService.sendDepositRejected(
        updatedDeposit.user.email,
        updatedDeposit.user.name,
        deposit.amount,
        adminNote
      ).catch(err => logger.error('Failed to send deposit rejected email', { error: err }));
    }

    return updatedDeposit;
  }

  async getDepositStats() {
    const [pending, approved, rejected, totalVolume] = await Promise.all([
      prisma.deposit.count({ where: { status: 'PENDING' } }),
      prisma.deposit.count({ where: { status: 'APPROVED' } }),
      prisma.deposit.count({ where: { status: 'REJECTED' } }),
      prisma.deposit.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
    ]);

    return { pending, approved, rejected, totalVolume: totalVolume._sum.amount || 0 };
  }
}

export const depositService = new DepositService();
export { DepositServiceError };
