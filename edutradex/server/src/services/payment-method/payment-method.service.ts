import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

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
    const existing = await prisma.paymentMethod.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new PaymentMethodServiceError('Payment method with this code already exists', 400);
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        type: 'CRYPTO',
        name: data.name,
        code: data.code,
        cryptoCurrency: data.cryptoCurrency,
        network: data.network,
        walletAddress: data.walletAddress,
        iconUrl: data.iconUrl,
        iconBg: data.iconBg || 'bg-gray-500/20',
        minAmount: data.minAmount ?? 10,
        maxAmount: data.maxAmount ?? 10000,
        processingTime: data.processingTime || '~5 min',
        isActive: data.isActive ?? true,
        isPopular: data.isPopular ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    logger.info('Crypto payment method created', {
      id: paymentMethod.id,
      code: paymentMethod.code,
      currency: paymentMethod.cryptoCurrency,
    });

    return paymentMethod;
  }

  async createMobileMoneyPaymentMethod(data: CreateMobileMoneyPaymentMethod) {
    const existing = await prisma.paymentMethod.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new PaymentMethodServiceError('Payment method with this code already exists', 400);
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        type: 'MOBILE_MONEY',
        name: data.name,
        code: data.code,
        mobileProvider: data.mobileProvider,
        phoneNumber: data.phoneNumber,
        accountName: data.accountName,
        iconUrl: data.iconUrl,
        iconBg: data.iconBg || 'bg-gray-500/20',
        minAmount: data.minAmount ?? 10,
        maxAmount: data.maxAmount ?? 10000,
        processingTime: data.processingTime || '~5 min',
        isActive: data.isActive ?? true,
        isPopular: data.isPopular ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    logger.info('Mobile money payment method created', {
      id: paymentMethod.id,
      code: paymentMethod.code,
      provider: paymentMethod.mobileProvider,
    });

    return paymentMethod;
  }

  async updatePaymentMethod(id: string, data: UpdatePaymentMethod) {
    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.accountName !== undefined && { accountName: data.accountName }),
        ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl }),
        ...(data.iconBg !== undefined && { iconBg: data.iconBg }),
        ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
        ...(data.maxAmount !== undefined && { maxAmount: data.maxAmount }),
        ...(data.processingTime !== undefined && { processingTime: data.processingTime }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
    });

    logger.info('Payment method updated', {
      id: paymentMethod.id,
      code: paymentMethod.code,
    });

    return paymentMethod;
  }

  async deletePaymentMethod(id: string) {
    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    await prisma.paymentMethod.delete({
      where: { id },
    });

    logger.info('Payment method deleted', {
      id,
      code: existing.code,
    });

    return { success: true };
  }

  async getPaymentMethodById(id: string) {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    return paymentMethod;
  }

  async getPaymentMethodByCode(code: string) {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { code },
    });

    if (!paymentMethod) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    return paymentMethod;
  }

  async getAllPaymentMethods(filters: PaymentMethodFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.type) where.type = filters.type;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.isPopular !== undefined) where.isPopular = filters.isPopular;

    const [paymentMethods, total] = await Promise.all([
      prisma.paymentMethod.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.paymentMethod.count({ where }),
    ]);

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
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return paymentMethods;
  }

  async getPaymentMethodStats() {
    const [totalCrypto, totalMobile, active, inactive] = await Promise.all([
      prisma.paymentMethod.count({ where: { type: 'CRYPTO' } }),
      prisma.paymentMethod.count({ where: { type: 'MOBILE_MONEY' } }),
      prisma.paymentMethod.count({ where: { isActive: true } }),
      prisma.paymentMethod.count({ where: { isActive: false } }),
    ]);

    return {
      totalCrypto,
      totalMobile,
      active,
      inactive,
      total: totalCrypto + totalMobile,
    };
  }

  async togglePaymentMethodStatus(id: string) {
    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PaymentMethodServiceError('Payment method not found', 404);
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    logger.info('Payment method status toggled', {
      id: paymentMethod.id,
      code: paymentMethod.code,
      isActive: paymentMethod.isActive,
    });

    return paymentMethod;
  }

  async seedDefaultPaymentMethods() {
    const count = await prisma.paymentMethod.count();
    if (count > 0) {
      logger.info('Payment methods already exist, skipping seed');
      return;
    }

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

      // ===== CRYPTO - USDT Networks =====
      { type: 'CRYPTO', name: 'Tether (USDT) BEP20', code: 'usdt-bep20', cryptoCurrency: 'USDT', network: 'BEP20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 11, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Tether (USDT) ERC20', code: 'usdt-erc20', cryptoCurrency: 'USDT', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 12, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Tether (USDT) Solana', code: 'usdt-sol', cryptoCurrency: 'USDT', network: 'Solana', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 13, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Tether (USDT) Polygon', code: 'usdt-polygon', cryptoCurrency: 'USDT', network: 'Polygon', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 14, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Tether (USDT) Avalanche', code: 'usdt-avax', cryptoCurrency: 'USDT', network: 'Avalanche', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 15, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Tether (USDT) Arbitrum', code: 'usdt-arb', cryptoCurrency: 'USDT', network: 'Arbitrum', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 16, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Tether (USDT) TON', code: 'usdt-ton', cryptoCurrency: 'USDT', network: 'TON', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png', iconBg: 'bg-emerald-500/20', isPopular: false, displayOrder: 17, processingTime: '~1 min' },

      // ===== CRYPTO - USDC Networks =====
      { type: 'CRYPTO', name: 'USD Coin (USDC) ERC20', code: 'usdc-erc20', cryptoCurrency: 'USDC', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 18, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'USD Coin (USDC) BEP20', code: 'usdc-bep20', cryptoCurrency: 'USDC', network: 'BEP20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 19, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'USD Coin (USDC) Solana', code: 'usdc-sol', cryptoCurrency: 'USDC', network: 'Solana', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 20, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'USD Coin (USDC) Polygon', code: 'usdc-polygon', cryptoCurrency: 'USDC', network: 'Polygon', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 21, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'USD Coin (USDC) Avalanche', code: 'usdc-avax', cryptoCurrency: 'USDC', network: 'Avalanche', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 22, processingTime: '~3 min' },

      // ===== CRYPTO - Major Coins =====
      { type: 'CRYPTO', name: 'BNB (BEP20)', code: 'bnb-bep20', cryptoCurrency: 'BNB', network: 'BEP20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', iconBg: 'bg-yellow-500/20', isPopular: false, displayOrder: 23, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Litecoin (LTC)', code: 'ltc', cryptoCurrency: 'LTC', network: 'Litecoin', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png', iconBg: 'bg-gray-400/20', isPopular: false, displayOrder: 24, processingTime: '~10 min' },
      { type: 'CRYPTO', name: 'Solana (SOL)', code: 'sol', cryptoCurrency: 'SOL', network: 'Solana', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png', iconBg: 'bg-purple-500/20', isPopular: false, displayOrder: 25, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Ripple (XRP)', code: 'xrp', cryptoCurrency: 'XRP', network: 'Ripple', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.png', iconBg: 'bg-gray-500/20', isPopular: false, displayOrder: 26, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Cardano (ADA)', code: 'ada', cryptoCurrency: 'ADA', network: 'Cardano', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/cardano-ada-logo.png', iconBg: 'bg-blue-600/20', isPopular: false, displayOrder: 27, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Avalanche (AVAX)', code: 'avax', cryptoCurrency: 'AVAX', network: 'Avalanche', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png', iconBg: 'bg-red-500/20', isPopular: false, displayOrder: 28, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Polygon (MATIC)', code: 'matic', cryptoCurrency: 'MATIC', network: 'Polygon', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png', iconBg: 'bg-purple-600/20', isPopular: false, displayOrder: 29, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Polkadot (DOT)', code: 'dot', cryptoCurrency: 'DOT', network: 'Polkadot', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png', iconBg: 'bg-pink-500/20', isPopular: false, displayOrder: 30, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Tron (TRX)', code: 'trx', cryptoCurrency: 'TRX', network: 'TRC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/tron-trx-logo.png', iconBg: 'bg-red-600/20', isPopular: false, displayOrder: 31, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Toncoin (TON)', code: 'ton', cryptoCurrency: 'TON', network: 'TON', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/toncoin-ton-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 32, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Dogecoin (DOGE)', code: 'doge', cryptoCurrency: 'DOGE', network: 'Dogecoin', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', iconBg: 'bg-yellow-400/20', isPopular: false, displayOrder: 33, processingTime: '~10 min' },
      { type: 'CRYPTO', name: 'Shiba Inu (SHIB)', code: 'shib', cryptoCurrency: 'SHIB', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png', iconBg: 'bg-orange-500/20', isPopular: false, displayOrder: 34, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Chainlink (LINK)', code: 'link', cryptoCurrency: 'LINK', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/chainlink-link-logo.png', iconBg: 'bg-blue-600/20', isPopular: false, displayOrder: 35, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Cosmos (ATOM)', code: 'atom', cryptoCurrency: 'ATOM', network: 'Cosmos', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/cosmos-atom-logo.png', iconBg: 'bg-indigo-500/20', isPopular: false, displayOrder: 36, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Algorand (ALGO)', code: 'algo', cryptoCurrency: 'ALGO', network: 'Algorand', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/algorand-algo-logo.png', iconBg: 'bg-gray-600/20', isPopular: false, displayOrder: 37, processingTime: '~3 min' },
      { type: 'CRYPTO', name: 'Stellar (XLM)', code: 'xlm', cryptoCurrency: 'XLM', network: 'Stellar', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/stellar-xlm-logo.png', iconBg: 'bg-gray-500/20', isPopular: false, displayOrder: 38, processingTime: '~1 min' },
      { type: 'CRYPTO', name: 'Dai (DAI)', code: 'dai', cryptoCurrency: 'DAI', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png', iconBg: 'bg-yellow-500/20', isPopular: false, displayOrder: 39, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Uniswap (UNI)', code: 'uni', cryptoCurrency: 'UNI', network: 'ERC20', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/uniswap-uni-logo.png', iconBg: 'bg-pink-500/20', isPopular: false, displayOrder: 40, processingTime: '~5 min' },
      { type: 'CRYPTO', name: 'Bitcoin Cash (BCH)', code: 'bch', cryptoCurrency: 'BCH', network: 'Bitcoin Cash', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png', iconBg: 'bg-green-500/20', isPopular: false, displayOrder: 41, processingTime: '~30 min' },
      { type: 'CRYPTO', name: 'Ethereum Classic (ETC)', code: 'etc', cryptoCurrency: 'ETC', network: 'Ethereum Classic', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/ethereum-classic-etc-logo.png', iconBg: 'bg-green-600/20', isPopular: false, displayOrder: 42, processingTime: '~10 min' },
      { type: 'CRYPTO', name: 'Dash (DASH)', code: 'dash', cryptoCurrency: 'DASH', network: 'Dash', walletAddress: '', iconUrl: 'https://cryptologos.cc/logos/dash-dash-logo.png', iconBg: 'bg-blue-500/20', isPopular: false, displayOrder: 43, processingTime: '~5 min' },
    ];

    await prisma.paymentMethod.createMany({
      data: defaultMethods.map((method) => ({
        ...method,
        minAmount: 10,
        maxAmount: 10000,
        isActive: true,
      })),
    });

    logger.info('Default payment methods seeded', { count: defaultMethods.length });
  }
}

export const paymentMethodService = new PaymentMethodService();
export { PaymentMethodServiceError };
