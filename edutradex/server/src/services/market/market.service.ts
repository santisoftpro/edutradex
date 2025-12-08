import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { derivService, DerivService, DerivCandle } from '../deriv/deriv.service.js';
import { binanceService, BinanceService, BinanceKline } from '../binance/binance.service.js';
import { finnhubService, FinnhubService, FinnhubCandle } from '../finnhub/finnhub.service.js';
import { config } from '../../config/env.js';
import { queryMany } from '../../config/db.js';

interface PriceTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: Date;
  change: number;
  changePercent: number;
}

interface MarketAsset {
  symbol: string;
  name: string;
  marketType: 'forex' | 'crypto' | 'stock' | 'index';
  basePrice: number;
  pipSize: number;
  isActive: boolean;
  payoutPercent: number;
}

interface PriceHistory {
  symbol: string;
  prices: { price: number; timestamp: Date }[];
}

interface OHLCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Forex pairs - Real prices from Deriv API
const FOREX_ASSETS: MarketAsset[] = [
  // Major pairs
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', marketType: 'forex', basePrice: 1.1680, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', marketType: 'forex', basePrice: 1.2750, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', marketType: 'forex', basePrice: 150.50, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', marketType: 'forex', basePrice: 0.6542, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', marketType: 'forex', basePrice: 1.3625, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', marketType: 'forex', basePrice: 0.5932, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.8845, pipSize: 0.0001, isActive: true, payoutPercent: 85 },

  // EUR crosses
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', marketType: 'forex', basePrice: 0.8592, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', marketType: 'forex', basePrice: 162.45, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', marketType: 'forex', basePrice: 1.6590, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', marketType: 'forex', basePrice: 1.4785, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', marketType: 'forex', basePrice: 0.9595, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', marketType: 'forex', basePrice: 1.8295, pipSize: 0.0001, isActive: true, payoutPercent: 85 },

  // GBP crosses
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', marketType: 'forex', basePrice: 189.35, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', marketType: 'forex', basePrice: 1.9315, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', marketType: 'forex', basePrice: 1.7215, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', marketType: 'forex', basePrice: 1.1175, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/NZD', name: 'British Pound / New Zealand Dollar', marketType: 'forex', basePrice: 2.1305, pipSize: 0.0001, isActive: true, payoutPercent: 85 },

  // JPY crosses
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', marketType: 'forex', basePrice: 98.05, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', marketType: 'forex', basePrice: 109.95, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', marketType: 'forex', basePrice: 169.35, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', marketType: 'forex', basePrice: 88.85, pipSize: 0.01, isActive: true, payoutPercent: 85 },

  // Other crosses
  { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', marketType: 'forex', basePrice: 0.8915, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.5785, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar', marketType: 'forex', basePrice: 1.1025, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.6495, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/CAD', name: 'New Zealand Dollar / Canadian Dollar', marketType: 'forex', basePrice: 0.8085, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/CHF', name: 'New Zealand Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.5245, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
];

// Crypto pairs - Real prices from Binance WebSocket
const CRYPTO_ASSETS: MarketAsset[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', marketType: 'crypto', basePrice: 43500.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', marketType: 'crypto', basePrice: 2280.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'BNB/USD', name: 'Binance Coin / US Dollar', marketType: 'crypto', basePrice: 310.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar', marketType: 'crypto', basePrice: 105.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'XRP/USD', name: 'Ripple / US Dollar', marketType: 'crypto', basePrice: 0.6250, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ADA/USD', name: 'Cardano / US Dollar', marketType: 'crypto', basePrice: 0.5850, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'DOGE/USD', name: 'Dogecoin / US Dollar', marketType: 'crypto', basePrice: 0.0825, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'DOT/USD', name: 'Polkadot / US Dollar', marketType: 'crypto', basePrice: 7.25, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'LTC/USD', name: 'Litecoin / US Dollar', marketType: 'crypto', basePrice: 72.50, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'BCH/USD', name: 'Bitcoin Cash / US Dollar', marketType: 'crypto', basePrice: 245.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'AVAX/USD', name: 'Avalanche / US Dollar', marketType: 'crypto', basePrice: 38.50, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'MATIC/USD', name: 'Polygon / US Dollar', marketType: 'crypto', basePrice: 0.92, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ATOM/USD', name: 'Cosmos / US Dollar', marketType: 'crypto', basePrice: 9.85, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'NEAR/USD', name: 'NEAR Protocol / US Dollar', marketType: 'crypto', basePrice: 3.45, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'FTM/USD', name: 'Fantom / US Dollar', marketType: 'crypto', basePrice: 0.42, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ALGO/USD', name: 'Algorand / US Dollar', marketType: 'crypto', basePrice: 0.18, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ICP/USD', name: 'Internet Computer / US Dollar', marketType: 'crypto', basePrice: 12.50, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'APT/USD', name: 'Aptos / US Dollar', marketType: 'crypto', basePrice: 8.75, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'SUI/USD', name: 'Sui / US Dollar', marketType: 'crypto', basePrice: 1.25, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'LINK/USD', name: 'Chainlink / US Dollar', marketType: 'crypto', basePrice: 14.80, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'UNI/USD', name: 'Uniswap / US Dollar', marketType: 'crypto', basePrice: 6.25, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'AAVE/USD', name: 'Aave / US Dollar', marketType: 'crypto', basePrice: 92.50, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'MKR/USD', name: 'Maker / US Dollar', marketType: 'crypto', basePrice: 1450.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'CRV/USD', name: 'Curve DAO / US Dollar', marketType: 'crypto', basePrice: 0.58, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'SHIB/USD', name: 'Shiba Inu / US Dollar', marketType: 'crypto', basePrice: 0.0000095, pipSize: 0.00000001, isActive: true, payoutPercent: 80 },
  { symbol: 'PEPE/USD', name: 'Pepe / US Dollar', marketType: 'crypto', basePrice: 0.0000012, pipSize: 0.00000001, isActive: true, payoutPercent: 80 },
  { symbol: 'BONK/USD', name: 'Bonk / US Dollar', marketType: 'crypto', basePrice: 0.000012, pipSize: 0.00000001, isActive: true, payoutPercent: 80 },
  { symbol: 'XLM/USD', name: 'Stellar / US Dollar', marketType: 'crypto', basePrice: 0.125, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ETC/USD', name: 'Ethereum Classic / US Dollar', marketType: 'crypto', basePrice: 19.50, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'XMR/USD', name: 'Monero / US Dollar', marketType: 'crypto', basePrice: 165.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'TRX/USD', name: 'TRON / US Dollar', marketType: 'crypto', basePrice: 0.105, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'VET/USD', name: 'VeChain / US Dollar', marketType: 'crypto', basePrice: 0.028, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'FIL/USD', name: 'Filecoin / US Dollar', marketType: 'crypto', basePrice: 5.85, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'HBAR/USD', name: 'Hedera / US Dollar', marketType: 'crypto', basePrice: 0.075, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ARB/USD', name: 'Arbitrum / US Dollar', marketType: 'crypto', basePrice: 1.15, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'OP/USD', name: 'Optimism / US Dollar', marketType: 'crypto', basePrice: 2.35, pipSize: 0.01, isActive: true, payoutPercent: 80 },
];

// Stock Indices - Real prices from Finnhub (via ETFs: SPY, QQQ, DIA)
const INDEX_ASSETS: MarketAsset[] = [
  { symbol: 'US500', name: 'S&P 500 Index', marketType: 'index', basePrice: 4785.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'US100', name: 'NASDAQ 100 Index', marketType: 'index', basePrice: 16850.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'US30', name: 'Dow Jones 30 Index', marketType: 'index', basePrice: 37650.00, pipSize: 0.01, isActive: true, payoutPercent: 80 },
];

// Individual Stocks - Real prices from Finnhub
const STOCK_ASSETS: MarketAsset[] = [
  // US Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', marketType: 'stock', basePrice: 185.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', marketType: 'stock', basePrice: 375.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', marketType: 'stock', basePrice: 142.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', marketType: 'stock', basePrice: 155.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'META', name: 'Meta Platforms Inc.', marketType: 'stock', basePrice: 350.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', marketType: 'stock', basePrice: 485.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'TSLA', name: 'Tesla Inc.', marketType: 'stock', basePrice: 245.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', marketType: 'stock', basePrice: 135.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'INTC', name: 'Intel Corp.', marketType: 'stock', basePrice: 45.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'NFLX', name: 'Netflix Inc.', marketType: 'stock', basePrice: 485.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'CRM', name: 'Salesforce Inc.', marketType: 'stock', basePrice: 265.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'ORCL', name: 'Oracle Corp.', marketType: 'stock', basePrice: 115.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'ADBE', name: 'Adobe Inc.', marketType: 'stock', basePrice: 585.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'CSCO', name: 'Cisco Systems', marketType: 'stock', basePrice: 52.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', marketType: 'stock', basePrice: 145.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // US Finance
  { symbol: 'JPM', name: 'JPMorgan Chase', marketType: 'stock', basePrice: 165.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'BAC', name: 'Bank of America', marketType: 'stock', basePrice: 33.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'WFC', name: 'Wells Fargo', marketType: 'stock', basePrice: 48.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'GS', name: 'Goldman Sachs', marketType: 'stock', basePrice: 385.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'MS', name: 'Morgan Stanley', marketType: 'stock', basePrice: 92.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'V', name: 'Visa Inc.', marketType: 'stock', basePrice: 265.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'MA', name: 'Mastercard Inc.', marketType: 'stock', basePrice: 425.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'PYPL', name: 'PayPal Holdings', marketType: 'stock', basePrice: 62.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // US Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', marketType: 'stock', basePrice: 158.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'UNH', name: 'UnitedHealth Group', marketType: 'stock', basePrice: 525.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'PFE', name: 'Pfizer Inc.', marketType: 'stock', basePrice: 28.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', marketType: 'stock', basePrice: 165.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'MRK', name: 'Merck & Co.', marketType: 'stock', basePrice: 105.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'LLY', name: 'Eli Lilly', marketType: 'stock', basePrice: 585.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // US Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', marketType: 'stock', basePrice: 162.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'KO', name: 'Coca-Cola Co.', marketType: 'stock', basePrice: 59.50, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', marketType: 'stock', basePrice: 168.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'MCD', name: 'McDonald\'s Corp.', marketType: 'stock', basePrice: 295.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'NKE', name: 'Nike Inc.', marketType: 'stock', basePrice: 108.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'SBUX', name: 'Starbucks Corp.', marketType: 'stock', basePrice: 95.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'HD', name: 'Home Depot', marketType: 'stock', basePrice: 345.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'DIS', name: 'Walt Disney Co.', marketType: 'stock', basePrice: 92.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // US Energy & Industrial
  { symbol: 'XOM', name: 'Exxon Mobil', marketType: 'stock', basePrice: 105.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'CVX', name: 'Chevron Corp.', marketType: 'stock', basePrice: 152.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'BA', name: 'Boeing Co.', marketType: 'stock', basePrice: 215.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'CAT', name: 'Caterpillar Inc.', marketType: 'stock', basePrice: 285.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'GE', name: 'General Electric', marketType: 'stock', basePrice: 125.00, pipSize: 0.01, isActive: true, payoutPercent: 78 },
];

class MarketService {
  private currentPrices: Map<string, PriceTick> = new Map();
  private priceHistory: Map<string, PriceHistory> = new Map();
  private assets: Map<string, MarketAsset> = new Map();
  private spreadConfigs: Map<string, { markupPips: number; isActive: boolean }> = new Map();
  private readonly HISTORY_LENGTH = 100;
  private useDerivApi = false;
  private derivUnsubscribe: (() => void) | null = null;
  private derivInitialized: Set<string> = new Set();
  private binanceUnsubscribe: (() => void) | null = null;
  private binanceInitialized: Set<string> = new Set();
  private finnhubUnsubscribe: (() => void) | null = null;
  private finnhubInitialized: Set<string> = new Set();

  // Cache for historical bars to speed up chart loading
  private historicalBarsCache: Map<string, { bars: OHLCBar[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // Cache for 1 minute

  constructor() {
    this.initializeAssets();
    this.initializePrices();
    this.loadSpreadConfigs().catch(error => {
      logger.error('Failed to load spread configs during initialization:', error);
    });
    this.initializeDerivIntegration();
    this.initializeBinanceIntegration();
    this.initializeFinnhubIntegration();
  }

  private initializeAssets(): void {
    [
      ...FOREX_ASSETS,
      ...CRYPTO_ASSETS,
      ...INDEX_ASSETS,
      ...STOCK_ASSETS,
    ].forEach((asset) => {
      this.assets.set(asset.symbol, asset);
    });
  }

  private async loadSpreadConfigs(): Promise<void> {
    try {
      const configs = await queryMany<{ symbol: string; markupPips: number; isActive: boolean }>(
        `SELECT symbol, "markupPips", "isActive" FROM "SpreadConfig" WHERE "isActive" = true`
      );

      configs.forEach((configItem) => {
        this.spreadConfigs.set(configItem.symbol, {
          markupPips: configItem.markupPips,
          isActive: configItem.isActive,
        });
      });

      logger.info(`Loaded ${configs.length} spread configurations`);
    } catch (error) {
      logger.error('Failed to load spread configs:', error);
    }
  }

  private initializeDerivIntegration(): void {
    this.useDerivApi = config.deriv.useDerivApi;

    if (config.deriv.useDerivApi) {
      this.derivUnsubscribe = derivService.onPriceUpdate((tick) => {
        this.handleDerivPrice(tick);
      });

      let derivSubscriptionCount = 0;
      this.assets.forEach((asset, symbol) => {
        if (asset.marketType === 'forex') {
          derivService.subscribe(symbol);
          derivSubscriptionCount++;
        }
      });

      logger.info(`Deriv API integration initialized - subscribed to ${derivSubscriptionCount} forex pairs`);
    } else {
      logger.warn('Deriv API disabled or unavailable - forex prices will not update');
    }
  }

  private initializeBinanceIntegration(): void {
    this.binanceUnsubscribe = binanceService.onPriceUpdate((tick) => {
      this.handleBinancePrice(tick);
    });

    const status = binanceService.getStatus();
    logger.info(`Binance integration initialized - ${status.symbolCount} crypto pairs available`);
  }

  private handleBinancePrice(tick: { symbol: string; price: number; bid: number; ask: number; timestamp: number }): void {
    const asset = this.assets.get(tick.symbol);
    if (!asset) return;

    const spreadConfig = this.spreadConfigs.get(tick.symbol);
    const markupPips = spreadConfig?.markupPips ?? config.spread.defaultMarkup;
    const pipValue = asset.pipSize;
    const markupValue = markupPips * pipValue;

    const bid = tick.bid - markupValue / 2;
    const ask = tick.ask + markupValue / 2;
    const price = tick.price;

    if (!this.binanceInitialized.has(tick.symbol)) {
      this.binanceInitialized.add(tick.symbol);
      this.regenerateHistoryFromPrice(tick.symbol, price, asset);
      logger.info(`[Market] Initialized ${tick.symbol} with Binance price: ${price}`);
    }

    const history = this.priceHistory.get(tick.symbol);
    const openPrice = history && history.prices.length > 0
      ? history.prices[0].price
      : price;
    const change = price - openPrice;
    const changePercent = openPrice !== 0 ? (change / openPrice) * 100 : 0;

    const newTick: PriceTick = {
      symbol: tick.symbol,
      price: Number(price.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      bid: Number(bid.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      ask: Number(ask.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      timestamp: new Date(tick.timestamp),
      change: Number(change.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      changePercent: Number(changePercent.toFixed(2)),
    };

    this.currentPrices.set(tick.symbol, newTick);

    if (history) {
      history.prices.push({ price: newTick.price, timestamp: newTick.timestamp });
      if (history.prices.length > this.HISTORY_LENGTH) {
        history.prices.shift();
      }
    }

    wsManager.broadcastAllPrices([newTick]);
  }

  private initializeFinnhubIntegration(): void {
    const status = finnhubService.getStatus();

    if (!status.hasApiKey) {
      logger.warn('[Finnhub] No API key configured - stock/index prices will not update');
      return;
    }

    this.finnhubUnsubscribe = finnhubService.onPriceUpdate((tick) => {
      this.handleFinnhubPrice(tick);
    });

    logger.info(`Finnhub integration initialized - ${status.stockCount} stocks, ${status.indexCount} indices available`);
  }

  private handleFinnhubPrice(tick: { symbol: string; price: number; timestamp: number; volume: number }): void {
    const asset = this.assets.get(tick.symbol);
    if (!asset) return;

    const spreadConfig = this.spreadConfigs.get(tick.symbol);
    const markupPips = spreadConfig?.markupPips ?? config.spread.defaultMarkup;
    const pipValue = asset.pipSize;
    const markupValue = markupPips * pipValue;

    const bid = tick.price - markupValue / 2;
    const ask = tick.price + markupValue / 2;
    const price = tick.price;

    if (!this.finnhubInitialized.has(tick.symbol)) {
      this.finnhubInitialized.add(tick.symbol);
      this.regenerateHistoryFromPrice(tick.symbol, price, asset);
      logger.info(`[Market] Initialized ${tick.symbol} with Finnhub price: ${price}`);
    }

    const history = this.priceHistory.get(tick.symbol);
    const openPrice = history && history.prices.length > 0
      ? history.prices[0].price
      : price;
    const change = price - openPrice;
    const changePercent = openPrice !== 0 ? (change / openPrice) * 100 : 0;

    const newTick: PriceTick = {
      symbol: tick.symbol,
      price: Number(price.toFixed(2)),
      bid: Number(bid.toFixed(2)),
      ask: Number(ask.toFixed(2)),
      timestamp: new Date(tick.timestamp),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
    };

    this.currentPrices.set(tick.symbol, newTick);

    if (history) {
      history.prices.push({ price: newTick.price, timestamp: newTick.timestamp });
      if (history.prices.length > this.HISTORY_LENGTH) {
        history.prices.shift();
      }
    }

    wsManager.broadcastAllPrices([newTick]);
  }

  private handleDerivPrice(derivTick: any): void {
    const asset = this.assets.get(derivTick.symbol);
    if (!asset) return;

    if (asset.marketType !== 'forex') return;

    const basePrice = derivTick.quote || ((derivTick.bid + derivTick.ask) / 2);
    if (!basePrice || isNaN(basePrice)) {
      logger.warn(`Invalid Deriv tick for ${derivTick.symbol}:`, derivTick);
      return;
    }

    const spreadConfig = this.spreadConfigs.get(derivTick.symbol);
    const markupPips = spreadConfig?.markupPips ?? config.spread.defaultMarkup;
    const pipValue = asset.pipSize;
    const markupValue = markupPips * pipValue;

    const bid = basePrice - markupValue / 2;
    const ask = basePrice + markupValue / 2;
    const price = basePrice;

    if (!this.derivInitialized.has(derivTick.symbol)) {
      this.derivInitialized.add(derivTick.symbol);
      this.regenerateHistoryFromPrice(derivTick.symbol, price, asset);
      logger.info(`[Market] Initialized ${derivTick.symbol} with Deriv price: ${price}`);
    }

    const history = this.priceHistory.get(derivTick.symbol);
    const openPrice = history && history.prices.length > 0
      ? history.prices[0].price
      : price;
    const change = price - openPrice;
    const changePercent = openPrice !== 0 ? (change / openPrice) * 100 : 0;

    const newTick: PriceTick = {
      symbol: derivTick.symbol,
      price: Number(price.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      bid: Number(bid.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      ask: Number(ask.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      timestamp: new Date(derivTick.epoch * 1000),
      change: Number(change.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
      changePercent: Number(changePercent.toFixed(2)),
    };

    this.currentPrices.set(derivTick.symbol, newTick);

    if (history) {
      history.prices.push({ price: newTick.price, timestamp: newTick.timestamp });
      if (history.prices.length > this.HISTORY_LENGTH) {
        history.prices.shift();
      }
    }

    wsManager.broadcastAllPrices([newTick]);
  }

  private regenerateHistoryFromPrice(symbol: string, currentPrice: number, asset: MarketAsset): void {
    const history = this.priceHistory.get(symbol);
    if (!history) return;

    history.prices = [];

    const now = Date.now();
    const oneSecond = 1000;
    const volatility = currentPrice * 0.001; // 0.1% volatility for history generation

    for (let i = 300; i > 0; i--) {
      const timestamp = new Date(now - (i * oneSecond));
      const randomChange = (Math.random() - 0.5) * volatility;
      const historicalPrice = currentPrice + randomChange;

      history.prices.push({
        price: Number(historicalPrice.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
        timestamp
      });
    }

    const currentTick = this.currentPrices.get(symbol);
    if (currentTick) {
      currentTick.price = currentPrice;
      currentTick.bid = currentPrice - volatility * 0.05;
      currentTick.ask = currentPrice + volatility * 0.05;
    }
  }

  private initializePrices(): void {
    this.assets.forEach((asset, symbol) => {
      const spread = asset.basePrice * 0.001;
      const tick: PriceTick = {
        symbol,
        price: asset.basePrice,
        bid: asset.basePrice - spread / 2,
        ask: asset.basePrice + spread / 2,
        timestamp: new Date(),
        change: 0,
        changePercent: 0,
      };
      this.currentPrices.set(symbol, tick);
      this.priceHistory.set(symbol, { symbol, prices: [] });
      this.generateInitialHistory(symbol, 300);
    });
  }

  getCurrentPrice(symbol: string): PriceTick | null {
    return this.currentPrices.get(symbol) || null;
  }

  getAllPrices(): PriceTick[] {
    return Array.from(this.currentPrices.values());
  }

  getForexPrices(): PriceTick[] {
    return Array.from(this.currentPrices.values()).filter((tick) => {
      const asset = this.assets.get(tick.symbol);
      return asset?.marketType === 'forex';
    });
  }

  getCryptoPrices(): PriceTick[] {
    return Array.from(this.currentPrices.values()).filter((tick) => {
      const asset = this.assets.get(tick.symbol);
      return asset?.marketType === 'crypto';
    });
  }

  getStockPrices(): PriceTick[] {
    return Array.from(this.currentPrices.values()).filter((tick) => {
      const asset = this.assets.get(tick.symbol);
      return asset?.marketType === 'stock';
    });
  }

  getIndexPrices(): PriceTick[] {
    return Array.from(this.currentPrices.values()).filter((tick) => {
      const asset = this.assets.get(tick.symbol);
      return asset?.marketType === 'index';
    });
  }

  getPriceHistory(symbol: string): PriceHistory | null {
    return this.priceHistory.get(symbol) || null;
  }

  getAsset(symbol: string): MarketAsset | null {
    return this.assets.get(symbol) || null;
  }

  getAllAssets(): MarketAsset[] {
    return Array.from(this.assets.values());
  }

  getForexAssets(): MarketAsset[] {
    return FOREX_ASSETS.filter((asset) => asset.isActive);
  }

  getCryptoAssets(): MarketAsset[] {
    return CRYPTO_ASSETS.filter((asset) => asset.isActive);
  }

  getIndexAssets(): MarketAsset[] {
    return INDEX_ASSETS.filter((asset) => asset.isActive);
  }

  getStockAssets(): MarketAsset[] {
    return STOCK_ASSETS.filter((asset) => asset.isActive);
  }

  generateExitPrice(symbol: string, entryPrice: number, _durationSeconds: number): number {
    // Use current market price as exit price (real prices only)
    const currentTick = this.currentPrices.get(symbol);
    if (currentTick) {
      return currentTick.price;
    }
    return entryPrice;
  }

  stopPriceUpdates(): void {
    if (this.derivUnsubscribe) {
      this.derivUnsubscribe();
      this.derivUnsubscribe = null;
    }

    if (this.binanceUnsubscribe) {
      this.binanceUnsubscribe();
      this.binanceUnsubscribe = null;
    }

    if (this.finnhubUnsubscribe) {
      this.finnhubUnsubscribe();
      this.finnhubUnsubscribe = null;
    }

    logger.info('Market price updates stopped');
  }

  async reloadSpreadConfigs(): Promise<void> {
    await this.loadSpreadConfigs();
    logger.info('Spread configurations reloaded');
  }

  getMarketStatus(): {
    derivAvailable: boolean;
    derivConnected: boolean;
    binanceAvailable: boolean;
    binanceConnected: boolean;
    finnhubAvailable: boolean;
    finnhubConnected: boolean;
    forexPairsCount: number;
    cryptoPairsCount: number;
    stockPairsCount: number;
    indexPairsCount: number;
    spreadConfigsLoaded: number;
  } {
    const derivAvailable = derivService.isServiceAvailable();
    const derivStatus = derivService.getStatus();
    const binanceStatus = binanceService.getStatus();
    const finnhubStatus = finnhubService.getStatus();

    return {
      derivAvailable,
      derivConnected: derivStatus.connected,
      binanceAvailable: binanceStatus.available,
      binanceConnected: binanceStatus.connected,
      finnhubAvailable: finnhubStatus.available,
      finnhubConnected: finnhubStatus.connected,
      forexPairsCount: FOREX_ASSETS.length,
      cryptoPairsCount: CRYPTO_ASSETS.length,
      stockPairsCount: STOCK_ASSETS.length,
      indexPairsCount: INDEX_ASSETS.length,
      spreadConfigsLoaded: this.spreadConfigs.size,
    };
  }

  getHistoricalBars(symbol: string, resolution: number = 60, limit: number = 100): OHLCBar[] {
    const history = this.priceHistory.get(symbol);
    if (!history || history.prices.length === 0) {
      return [];
    }

    const resolutionMs = resolution * 1000;
    const bars: OHLCBar[] = [];

    const buckets = new Map<number, { open: number; high: number; low: number; close: number; prices: number[] }>();

    history.prices.forEach((tick) => {
      const time = Math.floor(tick.timestamp.getTime() / resolutionMs) * resolutionMs;

      if (!buckets.has(time)) {
        buckets.set(time, {
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          prices: [tick.price]
        });
      } else {
        const bucket = buckets.get(time)!;
        bucket.high = Math.max(bucket.high, tick.price);
        bucket.low = Math.min(bucket.low, tick.price);
        bucket.close = tick.price;
        bucket.prices.push(tick.price);
      }
    });

    buckets.forEach((bucket, time) => {
      bars.push({
        time: Math.floor(time / 1000),
        open: bucket.open,
        high: bucket.high,
        low: bucket.low,
        close: bucket.close,
        volume: bucket.prices.length
      });
    });

    bars.sort((a, b) => a.time - b.time);

    return bars.slice(-limit);
  }

  /**
   * Fetch real historical candles from external APIs
   * - Crypto: Binance API (free)
   * - Forex: Deriv API (free)
   * Returns OHLC bars with real market data
   * Includes caching to speed up chart loading
   */
  async getRealHistoricalBars(
    symbol: string,
    resolution: number = 60,
    limit: number = 500
  ): Promise<OHLCBar[]> {
    const effectiveResolution = Math.max(resolution, 60); // Deriv minimum is 60s
    const cacheKey = `${symbol}-${effectiveResolution}-${limit}`;
    const cached = this.historicalBarsCache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.bars;
    }

    const asset = this.assets.get(symbol);
    let bars: OHLCBar[] = [];

    // Fetch from Binance for crypto assets
    if (asset?.marketType === 'crypto') {
      const interval = BinanceService.resolutionToInterval(effectiveResolution);
      const klines = await binanceService.getHistoricalKlines(symbol, interval, limit);

      if (klines.length > 0) {
        bars = klines.map((kline) => ({
          time: kline.time,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close,
          volume: kline.volume,
        }));
      }
    }

    // Fetch from Finnhub first for forex assets (more reliable), then fall back to Deriv
    if (bars.length === 0 && asset?.marketType === 'forex') {
      // Try Finnhub first (REST API - more reliable for historical data)
      if (finnhubService.isForexSymbol(symbol)) {
        const finnhubResolution = FinnhubService.resolutionToInterval(effectiveResolution);
        logger.info(`[Market] Fetching forex candles from Finnhub for ${symbol}, resolution=${finnhubResolution}, requested=${limit}`);

        const finnhubCandles = await finnhubService.getForexCandles(symbol, finnhubResolution, limit);

        if (finnhubCandles.length > 0) {
          bars = finnhubCandles.map((candle) => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          }));
          logger.info(`[Market] Received ${bars.length} candles from Finnhub for ${symbol}`);
        } else {
          logger.warn(`[Market] No candles from Finnhub for ${symbol}, trying Deriv...`);
        }
      }

      // Fall back to Deriv if Finnhub didn't return data
      if (bars.length === 0) {
        const granularity = DerivService.resolutionToGranularity(effectiveResolution);
        logger.info(`[Market] Fetching forex candles from Deriv for ${symbol}, granularity=${granularity}s, requested=${limit}`);

        const derivCandles = await derivService.getHistoricalCandles(symbol, granularity, limit);

        if (derivCandles.length > 0) {
          bars = derivCandles.map((candle) => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));
          logger.info(`[Market] Received ${bars.length} candles from Deriv for ${symbol}`);
        } else {
          logger.warn(`[Market] No candles received from Deriv for ${symbol}`);
        }
      }
    }

    // Fallback to in-memory history for other assets or if API fails
    if (bars.length === 0) {
      bars = this.getHistoricalBars(symbol, effectiveResolution, limit);
    }

    // Cache the result - only cache if we got a reasonable amount of data
    // Don't cache small results as they might be incomplete due to API issues
    const minBarsForCache = Math.min(10, limit / 2);
    if (bars.length >= minBarsForCache) {
      this.historicalBarsCache.set(cacheKey, { bars, timestamp: Date.now() });
      logger.debug(`[Market] Cached ${bars.length} bars for ${symbol}_${resolution}`);
    } else if (bars.length > 0) {
      logger.warn(`[Market] Not caching ${bars.length} bars for ${symbol}_${resolution} (too few, min: ${minBarsForCache})`);
    }

    return bars;
  }

  generateInitialHistory(symbol: string, bars: number = 100): void {
    const asset = this.assets.get(symbol);
    if (!asset) return;

    const history = this.priceHistory.get(symbol);
    if (!history) return;

    const now = Date.now();
    const oneSecond = 1000;
    const volatility = asset.basePrice * 0.001;

    for (let i = bars; i > 0; i--) {
      const timestamp = new Date(now - (i * oneSecond));
      const randomChange = (Math.random() - 0.5) * volatility * 2;
      const price = asset.basePrice + randomChange;

      history.prices.push({
        price: Number(price.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
        timestamp
      });
    }
  }

  getAvailableSymbols(): any[] {
    if (this.useDerivApi && derivService.isSymbolsFetched()) {
      return derivService.getActiveSymbols().map(s => ({
        symbol: s.symbol,
        displayName: s.display_name,
        market: s.market,
        marketDisplayName: s.market_display_name,
        submarket: s.submarket,
        submarketDisplayName: s.submarket_display_name,
        pip: s.pip,
        isOpen: s.exchange_is_open === 1,
        isSuspended: s.is_trading_suspended === 1,
      }));
    }
    return [];
  }

  getAvailableForexSymbols(): any[] {
    if (this.useDerivApi && derivService.isSymbolsFetched()) {
      return derivService.getForexSymbols().map(s => ({
        symbol: s.symbol,
        displayName: s.display_name,
        market: s.market,
        submarket: s.submarket,
        pip: s.pip,
        isOpen: s.exchange_is_open === 1,
        isSuspended: s.is_trading_suspended === 1,
      }));
    }
    return [];
  }

  getAvailableSyntheticSymbols(): any[] {
    if (this.useDerivApi && derivService.isSymbolsFetched()) {
      return derivService.getSyntheticSymbols().map(s => ({
        symbol: s.symbol,
        displayName: s.display_name,
        market: s.market,
        submarket: s.submarket,
        pip: s.pip,
        isOpen: s.exchange_is_open === 1,
        isSuspended: s.is_trading_suspended === 1,
      }));
    }
    return [];
  }

  /**
   * Clear the historical bars cache for a specific symbol or all symbols
   */
  clearHistoricalCache(symbol?: string): void {
    if (symbol) {
      // Clear cache for specific symbol (all resolutions)
      for (const key of this.historicalBarsCache.keys()) {
        if (key.startsWith(`${symbol}_`)) {
          this.historicalBarsCache.delete(key);
        }
      }
      logger.info(`[Market] Cleared historical cache for ${symbol}`);
    } else {
      // Clear entire cache
      this.historicalBarsCache.clear();
      logger.info('[Market] Cleared all historical bars cache');
    }
  }
}

export const marketService = new MarketService();
export type { PriceTick, MarketAsset, PriceHistory, OHLCBar };
