import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';

export type PaymentMethodType = 'CRYPTO' | 'MOBILE_MONEY';

interface CreateCryptoPaymentMethod {
  name: string;
  code: string;
  cryptoCurrency: string;
  network?: string;
  walletAddress: string;
  iconUrl?: string;
  iconBg?: string;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
}

interface CreateMobileMoneyPaymentMethod {
  name: string;
  code: string;
  mobileProvider: string;
  phoneNumber: string;
  accountName?: string;
  iconUrl?: string;
  iconBg?: string;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
}

interface UpdatePaymentMethod {
  name?: string;
  walletAddress?: string;
  phoneNumber?: string;
  accountName?: string;
  iconUrl?: string;
  iconBg?: string;
  minAmount?: number;
  maxAmount?: number;
  processingTime?: string;
  isActive?: boolean;
  isPopular?: boolean;
  displayOrder?: number;
}

interface PaymentMethodFilters {
  type?: PaymentMethodType;
  isActive?: boolean;
  isPopular?: boolean;
  page?: number;
  limit?: number;
}

interface PaymentMethodRow {
  id: string;
  type: string;
  name: string;
  code: string;
  cryptoCurrency: string | null;
  network: string | null;
  walletAddress: string | null;
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
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

class PaymentMethodServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PaymentMethodServiceError';
  }
}

export class PaymentMethodService {
  async createCryptoPaymentMethod(data: CreateCryptoPaymentMethod) {
    const existing = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE code = $1`,
      [data.code]
    );

    if (existing) {
      throw new PaymentMethodServiceError('Payment method with this code already exists', 400);
    }

    const id = randomUUID();
    const now = new Date();

    const paymentMethod = await queryOne<PaymentMethodRow>(
      `INSERT INTO "PaymentMethod" (
        id, type, name, code, "cryptoCurrency", network, "walletAddress",
        "iconUrl", "iconBg", "minAmount", "maxAmount", "processingTime",
        "isActive", "isPopular", "displayOrder", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        id, 'CRYPTO', data.name, data.code, data.cryptoCurrency, data.network || null,
        data.walletAddress, data.iconUrl || null, data.iconBg || 'bg-gray-500/20',
        data.minAmount ?? 10, data.maxAmount ?? 100000, data.processingTime || '~5 min',
        data.isActive ?? true, data.isPopular ?? false, data.displayOrder ?? 0, now, now,
      ]
    );

    logger.info('Crypto payment method created', {
      id: paymentMethod!.id,
      code: paymentMethod!.code,
      currency: paymentMethod!.cryptoCurrency,
    });

    return paymentMethod;
  }

  async createMobileMoneyPaymentMethod(data: CreateMobileMoneyPaymentMethod) {
    const existing = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE code = $1`,
      [data.code]
    );

    if (existing) {
      throw new PaymentMethodServiceError('Payment method with this code already exists', 400);
    }

    const id = randomUUID();
    const now = new Date();

    const paymentMethod = await queryOne<PaymentMethodRow>(
      `INSERT INTO "PaymentMethod" (
        id, type, name, code, "mobileProvider", "phoneNumber", "accountName",
        "iconUrl", "iconBg", "minAmount", "maxAmount", "processingTime",
        "isActive", "isPopular", "displayOrder", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        id, 'MOBILE_MONEY', data.name, data.code, data.mobileProvider, data.phoneNumber,
        data.accountName || null, data.iconUrl || null, data.iconBg || 'bg-gray-500/20',
        data.minAmount ?? 10, data.maxAmount ?? 100000, data.processingTime || '~5 min',
        data.isActive ?? true, data.isPopular ?? false, data.displayOrder ?? 0, now, now,
      ]
    );

    logger.info('Mobile money payment method created', {
      id: paymentMethod!.id,
      code: paymentMethod!.code,
      provider: paymentMethod!.mobileProvider,
    });

    return paymentMethod;
  }

  async updatePaymentMethod(id: string, data: UpdatePaymentMethod) {
    const existing = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE id = $1`,
      [id]
    );

    if (!existing) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.walletAddress !== undefined) {
      updates.push(`"walletAddress" = $${paramIndex++}`);
      params.push(data.walletAddress);
    }
    if (data.phoneNumber !== undefined) {
      updates.push(`"phoneNumber" = $${paramIndex++}`);
      params.push(data.phoneNumber);
    }
    if (data.accountName !== undefined) {
      updates.push(`"accountName" = $${paramIndex++}`);
      params.push(data.accountName);
    }
    if (data.iconUrl !== undefined) {
      updates.push(`"iconUrl" = $${paramIndex++}`);
      params.push(data.iconUrl);
    }
    if (data.iconBg !== undefined) {
      updates.push(`"iconBg" = $${paramIndex++}`);
      params.push(data.iconBg);
    }
    if (data.minAmount !== undefined) {
      updates.push(`"minAmount" = $${paramIndex++}`);
      params.push(data.minAmount);
    }
    if (data.maxAmount !== undefined) {
      updates.push(`"maxAmount" = $${paramIndex++}`);
      params.push(data.maxAmount);
    }
    if (data.processingTime !== undefined) {
      updates.push(`"processingTime" = $${paramIndex++}`);
      params.push(data.processingTime);
    }
    if (data.isActive !== undefined) {
      updates.push(`"isActive" = $${paramIndex++}`);
      params.push(data.isActive);
    }
    if (data.isPopular !== undefined) {
      updates.push(`"isPopular" = $${paramIndex++}`);
      params.push(data.isPopular);
    }
    if (data.displayOrder !== undefined) {
      updates.push(`"displayOrder" = $${paramIndex++}`);
      params.push(data.displayOrder);
    }

    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const paymentMethod = await queryOne<PaymentMethodRow>(
      `UPDATE "PaymentMethod" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    logger.info('Payment method updated', {
      id: paymentMethod!.id,
      code: paymentMethod!.code,
    });

    return paymentMethod;
  }

  async deletePaymentMethod(id: string) {
    const existing = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE id = $1`,
      [id]
    );

    if (!existing) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    await query(
      `DELETE FROM "PaymentMethod" WHERE id = $1`,
      [id]
    );

    logger.info('Payment method deleted', {
      id,
      code: existing.code,
    });

    return { success: true };
  }

  async getPaymentMethodById(id: string) {
    const paymentMethod = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE id = $1`,
      [id]
    );

    if (!paymentMethod) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    return paymentMethod;
  }

  async getPaymentMethodByCode(code: string) {
    const paymentMethod = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE code = $1`,
      [code]
    );

    if (!paymentMethod) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    return paymentMethod;
  }

  async getAllPaymentMethods(filters: PaymentMethodFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters.isActive !== undefined) {
      whereClause += ` AND "isActive" = $${paramIndex++}`;
      params.push(filters.isActive);
    }
    if (filters.isPopular !== undefined) {
      whereClause += ` AND "isPopular" = $${paramIndex++}`;
      params.push(filters.isPopular);
    }

    const countParams = [...params];
    params.push(limit, offset);

    const [paymentMethods, countResult] = await Promise.all([
      queryMany<PaymentMethodRow>(
        `SELECT * FROM "PaymentMethod" WHERE ${whereClause}
         ORDER BY "displayOrder" ASC, "createdAt" ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "PaymentMethod" WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: paymentMethods,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActivePaymentMethods() {
    return queryMany<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE "isActive" = true ORDER BY "displayOrder" ASC, "createdAt" ASC`
    );
  }

  async getPaymentMethodStats() {
    // Single query with FILTER for all counts
    const result = await queryOne<{
      total_crypto: string;
      total_mobile: string;
      active: string;
      inactive: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE type = 'CRYPTO') as total_crypto,
        COUNT(*) FILTER (WHERE type = 'MOBILE_MONEY') as total_mobile,
        COUNT(*) FILTER (WHERE "isActive" = true) as active,
        COUNT(*) FILTER (WHERE "isActive" = false) as inactive
      FROM "PaymentMethod"
    `);

    const totalCrypto = parseInt(result?.total_crypto || '0', 10);
    const totalMobile = parseInt(result?.total_mobile || '0', 10);

    return {
      totalCrypto,
      totalMobile,
      active: parseInt(result?.active || '0', 10),
      inactive: parseInt(result?.inactive || '0', 10),
      total: totalCrypto + totalMobile,
    };
  }

  async togglePaymentMethodStatus(id: string) {
    const existing = await queryOne<PaymentMethodRow>(
      `SELECT * FROM "PaymentMethod" WHERE id = $1`,
      [id]
    );

    if (!existing) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    const paymentMethod = await queryOne<PaymentMethodRow>(
      `UPDATE "PaymentMethod" SET "isActive" = $1, "updatedAt" = $2 WHERE id = $3 RETURNING *`,
      [!existing.isActive, new Date(), id]
    );

    logger.info('Payment method status toggled', {
      id: paymentMethod!.id,
      code: paymentMethod!.code,
      isActive: paymentMethod!.isActive,
    });

    return paymentMethod;
  }

  async seedDefaultPaymentMethods() {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "PaymentMethod"`
    );

    if (parseInt(countResult?.count || '0', 10) > 0) {
      logger.info('Payment methods already exist, skipping seed');
      return;
    }

    const now = new Date();

    const defaultMethods = [
      // ===== POPULAR - CRYPTO =====
      { type: 'CRYPTO', name: 'Tether (USDT) TRC20', code: 'usdt-trc20', cryptoCurrency: 'USDT', network: 'TRC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: true, displayOrder: 1, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Bitcoin (BTC)', code: 'btc', cryptoCurrency: 'BTC', network: 'Bitcoin', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', iconBg: 'bg-orange-500/20', isPopular: true, displayOrder: 2, processingTime: '~30 min' },
      { type: 'CRYPTO', name: 'Binance Pay', code: 'binance-pay', cryptoCurrency: 'USDT', network: 'BEP20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', iconBg: 'bg-yellow-500/20', isPopular: true, displayOrder: 3, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Ethereum (ETH) ERC20', code: 'eth-erc20', cryptoCurrency: 'ETH', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', iconBg: 'bg-indigo-500/20', isPopular: true, displayOrder: 4, processingTime: '~5 min' },

      // ===== POPULAR - MOBILE MONEY =====
      { type: 'MOBILE_MONEY', name: 'MTN MoMo', code: 'mtn-momo', mobileProvider: 'MTN', phoneNumber: '', iconBg: 'bg-yellow-500', isPopular: true, displayOrder: 5, processingTime: '~5 min' },
      { type: 'MOBILE_MONEY', name: 'M-Pesa', code: 'mpesa', mobileProvider: 'MPESA', phoneNumber: '', iconBg: 'bg-green-500', isPopular: true, displayOrder: 6, processingTime: '~5 min' },

      // ===== MOBILE MONEY =====
      { type: 'MOBILE_MONEY', name: 'Airtel Money', code: 'airtel-money', mobileProvider: 'AIRTEL', phoneNumber: '', iconBg: 'bg-red-500', isPopular: false, displayOrder: 7, processingTime: '~5 min' },
      { type: 'MOBILE_MONEY', name: 'Vodafone Cash', code: 'vodafone-cash', mobileProvider: 'VODAFONE', phoneNumber: '', iconBg: 'bg-red-600', isPopular: false, displayOrder: 8, processingTime: '~5 min' },
      { type: 'MOBILE_MONEY', name: 'Orange Money', code: 'orange-money', mobileProvider: 'ORANGE', phoneNumber: '', iconBg: 'bg-orange-500', isPopular: false, displayOrder: 9, processingTime: '~5 min' },
      { type: 'MOBILE_MONEY', name: 'Tigo Pesa', code: 'tigo-pesa', mobileProvider: 'TIGO', phoneNumber: '', iconBg: 'bg-blue-500', isPopular: false, displayOrder: 10, processingTime: '~5 min' },
    ];

    for (const method of defaultMethods) {
      const id = randomUUID();
      await query(
        `INSERT INTO "PaymentMethod" (
          id, type, name, code, "cryptoCurrency", network, "walletAddress",
          "mobileProvider", "phoneNumber", "iconUrl", "iconBg", "minAmount", "maxAmount",
          "processingTime", "isActive", "isPopular", "displayOrder", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          id,
          method.type,
          method.name,
          method.code,
          method.type === 'CRYPTO' ? (method as any).cryptoCurrency : null,
          method.type === 'CRYPTO' ? (method as any).network : null,
          method.type === 'CRYPTO' ? (method as any).walletAddress : null,
          method.type === 'MOBILE_MONEY' ? (method as any).mobileProvider : null,
          method.type === 'MOBILE_MONEY' ? (method as any).phoneNumber : null,
          (method as any).iconUrl || null,
          method.iconBg,
          10, // minAmount
          100000, // maxAmount
          method.processingTime,
          true, // isActive
          method.isPopular,
          method.displayOrder,
          now,
          now,
        ]
      );
    }

    logger.info('Default payment methods seeded', { count: defaultMethods.length });
  }
}

export const paymentMethodService = new PaymentMethodService();
export { PaymentMethodServiceError };
