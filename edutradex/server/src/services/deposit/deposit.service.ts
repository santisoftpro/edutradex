import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { emailService } from '../email/email.service.js';
import { randomUUID } from 'crypto';

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

interface DepositRow {
  id: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  phoneNumber: string | null;
  mobileProvider: string | null;
  cryptoCurrency: string | null;
  walletAddress: string | null;
  transactionHash: string | null;
  adminNote: string | null;
  processedBy: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DepositWithUser extends DepositRow {
  userName: string | null;
  userEmail: string | null;
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
    const id = randomUUID();
    const now = new Date();

    const result = await queryOne<DepositWithUser>(
      `WITH inserted AS (
        INSERT INTO "Deposit" (
          id, "userId", amount, method, status, "phoneNumber", "mobileProvider",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      )
      SELECT i.*, u.name as "userName", u.email as "userEmail"
      FROM inserted i
      JOIN "User" u ON u.id = i."userId"`,
      [id, data.userId, data.amount, 'MOBILE_MONEY', 'PENDING', data.phoneNumber, data.mobileProvider, now, now]
    );

    logger.info('Mobile money deposit request created', {
      depositId: id,
      userId: data.userId,
      amount: data.amount,
      provider: data.mobileProvider,
    });

    return {
      ...result,
      user: result ? { id: data.userId, name: result.userName, email: result.userEmail } : null
    };
  }

  async createCryptoDeposit(data: CreateCryptoDeposit) {
    const id = randomUUID();
    const now = new Date();

    const result = await queryOne<DepositWithUser>(
      `WITH inserted AS (
        INSERT INTO "Deposit" (
          id, "userId", amount, method, status, "cryptoCurrency",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      )
      SELECT i.*, u.name as "userName", u.email as "userEmail"
      FROM inserted i
      JOIN "User" u ON u.id = i."userId"`,
      [id, data.userId, data.amount, 'CRYPTO', 'PENDING', data.cryptoCurrency, now, now]
    );

    logger.info('Crypto deposit request created', {
      depositId: id,
      userId: data.userId,
      amount: data.amount,
      currency: data.cryptoCurrency,
    });

    return {
      ...result,
      user: result ? { id: data.userId, name: result.userName, email: result.userEmail } : null
    };
  }

  async getUserDeposits(userId: string, filters?: { status?: DepositStatus; limit?: number }) {
    let sql = `SELECT * FROM "Deposit" WHERE "userId" = $1`;
    const params: any[] = [userId];

    if (filters?.status) {
      sql += ` AND status = $2`;
      params.push(filters.status);
    }

    sql += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`;
    params.push(filters?.limit || 50);

    return queryMany<DepositRow>(sql, params);
  }

  async getDepositById(depositId: string, userId?: string) {
    const deposit = await queryOne<DepositWithUser>(
      `SELECT d.*, u.name as "userName", u.email as "userEmail"
       FROM "Deposit" d
       JOIN "User" u ON u.id = d."userId"
       WHERE d.id = $1`,
      [depositId]
    );

    if (!deposit) throw new DepositServiceError('Deposit not found', 404);
    if (userId && deposit.userId !== userId) throw new DepositServiceError('Unauthorized', 403);

    return {
      ...deposit,
      user: { id: deposit.userId, name: deposit.userName, email: deposit.userEmail }
    };
  }

  async getAllDeposits(filters: DepositFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClause += ` AND d.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.method) {
      whereClause += ` AND d.method = $${paramIndex++}`;
      params.push(filters.method);
    }
    if (filters.userId) {
      whereClause += ` AND d."userId" = $${paramIndex++}`;
      params.push(filters.userId);
    }

    const countParams = [...params];
    params.push(limit, offset);

    const [deposits, countResult] = await Promise.all([
      queryMany<DepositWithUser>(
        `SELECT d.*, u.name as "userName", u.email as "userEmail"
         FROM "Deposit" d
         JOIN "User" u ON u.id = d."userId"
         WHERE ${whereClause}
         ORDER BY d."createdAt" DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "Deposit" d WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: deposits.map(d => ({
        ...d,
        user: { id: d.userId, name: d.userName, email: d.userEmail }
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPendingDepositsCount() {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "Deposit" WHERE status = 'PENDING'`
    );
    return parseInt(result?.count || '0', 10);
  }

  async approveDeposit(depositId: string, adminId: string, adminNote?: string) {
    const deposit = await queryOne<DepositRow>(
      `SELECT * FROM "Deposit" WHERE id = $1`,
      [depositId]
    );

    if (!deposit) throw new DepositServiceError('Deposit not found', 404);
    if (deposit.status !== 'PENDING') throw new DepositServiceError('Deposit has already been processed', 400);

    const now = new Date();

    const updatedDeposit = await transaction(async (client) => {
      const depositResult = await client.query<DepositWithUser>(
        `UPDATE "Deposit" SET status = 'APPROVED', "adminNote" = $1, "processedBy" = $2, "processedAt" = $3, "updatedAt" = $3
         WHERE id = $4 RETURNING *`,
        [adminNote, adminId, now, depositId]
      );

      await client.query(
        `UPDATE "User" SET "demoBalance" = "demoBalance" + $1, "updatedAt" = $2 WHERE id = $3`,
        [deposit.amount, now, deposit.userId]
      );

      const userResult = await client.query<{ name: string; email: string }>(
        `SELECT name, email FROM "User" WHERE id = $1`,
        [deposit.userId]
      );

      return { ...depositResult.rows[0], user: userResult.rows[0] };
    });

    logger.info('Deposit approved', { depositId, userId: deposit.userId, amount: deposit.amount, approvedBy: adminId });

    wsManager.notifyDepositUpdate(deposit.userId, {
      id: depositId,
      amount: deposit.amount,
      status: 'APPROVED',
      method: deposit.method,
      adminNote,
    });

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
    const deposit = await queryOne<DepositRow>(
      `SELECT * FROM "Deposit" WHERE id = $1`,
      [depositId]
    );

    if (!deposit) throw new DepositServiceError('Deposit not found', 404);
    if (deposit.status !== 'PENDING') throw new DepositServiceError('Deposit has already been processed', 400);

    const now = new Date();

    const updatedDeposit = await queryOne<DepositWithUser>(
      `WITH updated AS (
        UPDATE "Deposit" SET status = 'REJECTED', "adminNote" = $1, "processedBy" = $2, "processedAt" = $3, "updatedAt" = $3
        WHERE id = $4 RETURNING *
      )
      SELECT u.*, usr.name as "userName", usr.email as "userEmail"
      FROM updated u
      JOIN "User" usr ON usr.id = u."userId"`,
      [adminNote, adminId, now, depositId]
    );

    logger.info('Deposit rejected', { depositId, userId: deposit.userId, amount: deposit.amount, rejectedBy: adminId, reason: adminNote });

    wsManager.notifyDepositUpdate(deposit.userId, {
      id: depositId,
      amount: deposit.amount,
      status: 'REJECTED',
      method: deposit.method,
      adminNote,
    });

    if (updatedDeposit) {
      emailService.sendDepositRejected(
        updatedDeposit.userEmail!,
        updatedDeposit.userName!,
        deposit.amount,
        adminNote
      ).catch(err => logger.error('Failed to send deposit rejected email', { error: err }));
    }

    return {
      ...updatedDeposit,
      user: updatedDeposit ? { id: deposit.userId, name: updatedDeposit.userName, email: updatedDeposit.userEmail } : null
    };
  }

  async getDepositStats() {
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
       FROM "Deposit"`
    );

    return {
      pending: parseInt(result?.pending || '0', 10),
      approved: parseInt(result?.approved || '0', 10),
      rejected: parseInt(result?.rejected || '0', 10),
      totalVolume: Number(result?.totalVolume || 0),
    };
  }

  // Get user's approved deposit method for withdrawal restriction
  async getUserDepositMethod(userId: string) {
    // Get the most recent approved deposit for this user
    const deposit = await queryOne<{
      method: string;
      mobileProvider: string | null;
      cryptoCurrency: string | null;
      phoneNumber: string | null;
    }>(
      `SELECT method, "mobileProvider", "cryptoCurrency", "phoneNumber"
       FROM "Deposit"
       WHERE "userId" = $1 AND status = 'APPROVED'
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [userId]
    );

    if (!deposit) {
      return null;
    }

    // Find the matching payment method
    if (deposit.method === 'MOBILE_MONEY' && deposit.mobileProvider) {
      const paymentMethod = await queryOne<{
        id: string;
        type: string;
        name: string;
        code: string;
        mobileProvider: string | null;
        phoneNumber: string | null;
        accountName: string | null;
        iconUrl: string | null;
        iconBg: string;
        minAmount: number;
        maxAmount: number;
        processingTime: string;
        isActive: boolean;
        isPopular: boolean;
      }>(
        `SELECT id, type, name, code, "mobileProvider", "phoneNumber", "accountName",
                "iconUrl", "iconBg", "minAmount", "maxAmount", "processingTime", "isActive", "isPopular"
         FROM "PaymentMethod"
         WHERE type = 'MOBILE_MONEY' AND "mobileProvider" = $1 AND "isActive" = true
         LIMIT 1`,
        [deposit.mobileProvider]
      );

      return paymentMethod ? {
        ...paymentMethod,
        userPhoneNumber: deposit.phoneNumber, // The phone number user used for deposit
      } : null;
    } else if (deposit.method === 'CRYPTO' && deposit.cryptoCurrency) {
      const paymentMethod = await queryOne<{
        id: string;
        type: string;
        name: string;
        code: string;
        cryptoCurrency: string | null;
        network: string | null;
        walletAddress: string | null;
        iconUrl: string | null;
        iconBg: string;
        minAmount: number;
        maxAmount: number;
        processingTime: string;
        isActive: boolean;
        isPopular: boolean;
      }>(
        `SELECT id, type, name, code, "cryptoCurrency", network, "walletAddress",
                "iconUrl", "iconBg", "minAmount", "maxAmount", "processingTime", "isActive", "isPopular"
         FROM "PaymentMethod"
         WHERE type = 'CRYPTO' AND "cryptoCurrency" = $1 AND "isActive" = true
         LIMIT 1`,
        [deposit.cryptoCurrency]
      );

      return paymentMethod;
    }

    return null;
  }
}

export const depositService = new DepositService();
export { DepositServiceError };
