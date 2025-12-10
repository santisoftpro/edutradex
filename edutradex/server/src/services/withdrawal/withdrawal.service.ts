import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { emailService } from '../email/email.service.js';
import { randomUUID } from 'crypto';

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
  network: string;
}

interface WithdrawalFilters {
  status?: WithdrawalStatus;
  method?: WithdrawalMethod;
  userId?: string;
  page?: number;
  limit?: number;
}

interface WithdrawalRow {
  id: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  phoneNumber: string | null;
  mobileProvider: string | null;
  cryptoCurrency: string | null;
  walletAddress: string | null;
  network: string | null;
  adminNote: string | null;
  processedBy: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WithdrawalWithUser extends WithdrawalRow {
  userName: string | null;
  userEmail: string | null;
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
    const user = await queryOne<{ demoBalance: number }>(
      `SELECT "demoBalance" FROM "User" WHERE id = $1`,
      [data.userId]
    );

    if (!user) {
      throw new WithdrawalServiceError('User not found', 404);
    }

    if (user.demoBalance < data.amount) {
      throw new WithdrawalServiceError('Insufficient balance', 400);
    }

    const id = randomUUID();
    const now = new Date();

    // Create withdrawal and deduct balance immediately (hold funds)
    const withdrawal = await transaction(async (client) => {
      const withdrawalResult = await client.query<WithdrawalRow>(
        `INSERT INTO "Withdrawal" (
          id, "userId", amount, method, status, "phoneNumber", "mobileProvider",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [id, data.userId, data.amount, 'MOBILE_MONEY', 'PENDING', data.phoneNumber, data.mobileProvider, now, now]
      );

      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" - $1, "updatedAt" = $2 WHERE id = $3`,
        [data.amount, now, data.userId]
      );

      const userResult = await client.query<{ name: string; email: string }>(
        `SELECT name, email FROM "User" WHERE id = $1`,
        [data.userId]
      );

      return { ...withdrawalResult.rows[0], user: userResult.rows[0] };
    });

    logger.info('Mobile money withdrawal request created (balance held)', {
      withdrawalId: id,
      userId: data.userId,
      amount: data.amount,
      provider: data.mobileProvider,
    });

    return withdrawal;
  }

  async createCryptoWithdrawal(data: CreateCryptoWithdrawal) {
    const user = await queryOne<{ demoBalance: number }>(
      `SELECT "demoBalance" FROM "User" WHERE id = $1`,
      [data.userId]
    );

    if (!user) {
      throw new WithdrawalServiceError('User not found', 404);
    }

    if (user.demoBalance < data.amount) {
      throw new WithdrawalServiceError('Insufficient balance', 400);
    }

    const id = randomUUID();
    const now = new Date();

    // Create withdrawal and deduct balance immediately (hold funds)
    const withdrawal = await transaction(async (client) => {
      const withdrawalResult = await client.query<WithdrawalRow>(
        `INSERT INTO "Withdrawal" (
          id, "userId", amount, method, status, "cryptoCurrency", "walletAddress", network,
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [id, data.userId, data.amount, 'CRYPTO', 'PENDING', data.cryptoCurrency, data.walletAddress, data.network, now, now]
      );

      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" - $1, "updatedAt" = $2 WHERE id = $3`,
        [data.amount, now, data.userId]
      );

      const userResult = await client.query<{ name: string; email: string }>(
        `SELECT name, email FROM "User" WHERE id = $1`,
        [data.userId]
      );

      return { ...withdrawalResult.rows[0], user: userResult.rows[0] };
    });

    logger.info('Crypto withdrawal request created (balance held)', {
      withdrawalId: id,
      userId: data.userId,
      amount: data.amount,
      currency: data.cryptoCurrency,
      network: data.network,
    });

    return withdrawal;
  }

  async getUserWithdrawals(userId: string, filters?: { status?: WithdrawalStatus; limit?: number }) {
    let sql = `SELECT * FROM "Withdrawal" WHERE "userId" = $1`;
    const params: any[] = [userId];

    if (filters?.status) {
      sql += ` AND status = $2`;
      params.push(filters.status);
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`;
    params.push(filters?.limit || 50);

    return queryMany<WithdrawalRow>(sql, params);
  }

  async getWithdrawalById(withdrawalId: string, userId?: string) {
    const withdrawal = await queryOne<WithdrawalWithUser>(
      `SELECT w.*, u.name as "userName", u.email as "userEmail"
       FROM "Withdrawal" w
       JOIN "User" u ON u.id = w."userId"
       WHERE w.id = $1`,
      [withdrawalId]
    );

    if (!withdrawal) {
      throw new WithdrawalServiceError('Withdrawal not found', 404);
    }

    if (userId && withdrawal.userId !== userId) {
      throw new WithdrawalServiceError('Unauthorized', 403);
    }

    return {
      ...withdrawal,
      user: { id: withdrawal.userId, name: withdrawal.userName, email: withdrawal.userEmail }
    };
  }

  // Admin methods
  async getAllWithdrawals(filters: WithdrawalFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClause += ` AND w.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.method) {
      whereClause += ` AND w.method = $${paramIndex++}`;
      params.push(filters.method);
    }
    if (filters.userId) {
      whereClause += ` AND w."userId" = $${paramIndex++}`;
      params.push(filters.userId);
    }

    const countParams = [...params];
    params.push(limit, offset);

    const [withdrawals, countResult] = await Promise.all([
      queryMany<WithdrawalWithUser>(
        `SELECT w.*, u.name as "userName", u.email as "userEmail"
         FROM "Withdrawal" w
         JOIN "User" u ON u.id = w."userId"
         WHERE ${whereClause}
         ORDER BY w."createdAt" DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "Withdrawal" w WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: withdrawals.map(w => ({
        ...w,
        user: { id: w.userId, name: w.userName, email: w.userEmail }
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPendingWithdrawalsCount() {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "Withdrawal" WHERE status = 'PENDING'`
    );
    return parseInt(result?.count || '0', 10);
  }

  async approveWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    const withdrawal = await queryOne<WithdrawalRow>(
      `SELECT * FROM "Withdrawal" WHERE id = $1`,
      [withdrawalId]
    );

    if (!withdrawal) {
      throw new WithdrawalServiceError('Withdrawal not found', 404);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new WithdrawalServiceError('Withdrawal has already been processed', 400);
    }

    const now = new Date();

    // Balance was already deducted when withdrawal was created
    // Just update the withdrawal status to APPROVED
    const updatedWithdrawal = await queryOne<WithdrawalWithUser>(
      `WITH updated AS (
        UPDATE "Withdrawal" SET status = 'APPROVED', "adminNote" = $1, "processedBy" = $2, "processedAt" = $3, "updatedAt" = $3
        WHERE id = $4 RETURNING *
      )
      SELECT u.*, usr.name as "userName", usr.email as "userEmail"
      FROM updated u
      JOIN "User" usr ON usr.id = u."userId"`,
      [adminNote, adminId, now, withdrawalId]
    );

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
    if (updatedWithdrawal) {
      emailService.sendWithdrawalApproved(
        updatedWithdrawal.userEmail!,
        updatedWithdrawal.userName!,
        withdrawal.amount,
        withdrawal.method
      ).catch(err => logger.error('Failed to send withdrawal approved email', { error: err }));
    }

    return {
      ...updatedWithdrawal,
      user: updatedWithdrawal ? { id: withdrawal.userId, name: updatedWithdrawal.userName, email: updatedWithdrawal.userEmail } : null
    };
  }

  async rejectWithdrawal(withdrawalId: string, adminId: string, adminNote?: string) {
    const withdrawal = await queryOne<WithdrawalRow>(
      `SELECT * FROM "Withdrawal" WHERE id = $1`,
      [withdrawalId]
    );

    if (!withdrawal) {
      throw new WithdrawalServiceError('Withdrawal not found', 404);
    }

    if (withdrawal.status !== 'PENDING') {
      throw new WithdrawalServiceError('Withdrawal has already been processed', 400);
    }

    const now = new Date();

    // Reject withdrawal and refund balance to user (balance was held at creation)
    const updatedWithdrawal = await transaction(async (client) => {
      const withdrawalResult = await client.query<WithdrawalRow>(
        `UPDATE "Withdrawal" SET status = 'REJECTED', "adminNote" = $1, "processedBy" = $2, "processedAt" = $3, "updatedAt" = $3
         WHERE id = $4 RETURNING *`,
        [adminNote, adminId, now, withdrawalId]
      );

      // Refund the balance
      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" + $1, "updatedAt" = $2 WHERE id = $3`,
        [withdrawal.amount, now, withdrawal.userId]
      );

      const userResult = await client.query<{ name: string; email: string }>(
        `SELECT name, email FROM "User" WHERE id = $1`,
        [withdrawal.userId]
      );

      return { ...withdrawalResult.rows[0], user: userResult.rows[0] };
    });

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
    const result = await queryOne<{
      pending: string;
      approved: string;
      rejected: string;
      totalVolume: number;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) as "totalVolume"
       FROM "Withdrawal"`
    );

    return {
      pending: parseInt(result?.pending || '0', 10),
      approved: parseInt(result?.approved || '0', 10),
      rejected: parseInt(result?.rejected || '0', 10),
      totalVolume: Number(result?.totalVolume || 0),
    };
  }
}

export const withdrawalService = new WithdrawalService();
export { WithdrawalServiceError };
