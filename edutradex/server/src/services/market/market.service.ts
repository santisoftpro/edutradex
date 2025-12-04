import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { derivService } from '../deriv/deriv.service.js';
import { config } from '../../config/env.js';
import { prisma } from '../../config/database.js';

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
  marketType: 'forex' | 'otc';
  basePrice: number;
  volatility: number;
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

const FOREX_ASSETS: MarketAsset[] = [
  // Major pairs - basePrice is used as fallback when Deriv API is unavailable
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', marketType: 'forex', basePrice: 1.1680, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', marketType: 'forex', basePrice: 1.2750, volatility: 0.0012, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', marketType: 'forex', basePrice: 150.50, volatility: 0.15, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', marketType: 'forex', basePrice: 0.6542, volatility: 0.0010, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', marketType: 'forex', basePrice: 1.3625, volatility: 0.0009, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', marketType: 'forex', basePrice: 0.5932, volatility: 0.0011, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.8845, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },

  // EUR crosses
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', marketType: 'forex', basePrice: 0.8592, volatility: 0.0007, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', marketType: 'forex', basePrice: 162.45, volatility: 0.18, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', marketType: 'forex', basePrice: 1.6590, volatility: 0.0015, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', marketType: 'forex', basePrice: 1.4785, volatility: 0.0012, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', marketType: 'forex', basePrice: 0.9595, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', marketType: 'forex', basePrice: 1.8295, volatility: 0.0018, pipSize: 0.0001, isActive: true, payoutPercent: 85 },

  // GBP crosses
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', marketType: 'forex', basePrice: 189.35, volatility: 0.25, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', marketType: 'forex', basePrice: 1.9315, volatility: 0.0018, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', marketType: 'forex', basePrice: 1.7215, volatility: 0.0015, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', marketType: 'forex', basePrice: 1.1175, volatility: 0.0012, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/NZD', name: 'British Pound / New Zealand Dollar', marketType: 'forex', basePrice: 2.1305, volatility: 0.0022, pipSize: 0.0001, isActive: true, payoutPercent: 85 },

  // JPY crosses
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', marketType: 'forex', basePrice: 98.05, volatility: 0.12, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', marketType: 'forex', basePrice: 109.95, volatility: 0.12, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', marketType: 'forex', basePrice: 169.35, volatility: 0.15, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', marketType: 'forex', basePrice: 88.85, volatility: 0.12, pipSize: 0.01, isActive: true, payoutPercent: 85 },

  // Other crosses
  { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', marketType: 'forex', basePrice: 0.8915, volatility: 0.0010, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.5785, volatility: 0.0009, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar', marketType: 'forex', basePrice: 1.1025, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.6495, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/CAD', name: 'New Zealand Dollar / Canadian Dollar', marketType: 'forex', basePrice: 0.8085, volatility: 0.0010, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/CHF', name: 'New Zealand Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.5245, volatility: 0.0009, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
];

// Crypto pairs (simulated - OTC)
const CRYPTO_ASSETS: MarketAsset[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', marketType: 'otc', basePrice: 43500.00, volatility: 150.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', marketType: 'otc', basePrice: 2280.00, volatility: 15.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'LTC/USD', name: 'Litecoin / US Dollar', marketType: 'otc', basePrice: 72.50, volatility: 1.5, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'XRP/USD', name: 'Ripple / US Dollar', marketType: 'otc', basePrice: 0.6250, volatility: 0.015, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'BCH/USD', name: 'Bitcoin Cash / US Dollar', marketType: 'otc', basePrice: 245.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'BNB/USD', name: 'Binance Coin / US Dollar', marketType: 'otc', basePrice: 310.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar', marketType: 'otc', basePrice: 105.00, volatility: 3.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'DOGE/USD', name: 'Dogecoin / US Dollar', marketType: 'otc', basePrice: 0.0825, volatility: 0.003, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'ADA/USD', name: 'Cardano / US Dollar', marketType: 'otc', basePrice: 0.5850, volatility: 0.02, pipSize: 0.0001, isActive: true, payoutPercent: 80 },
  { symbol: 'DOT/USD', name: 'Polkadot / US Dollar', marketType: 'otc', basePrice: 7.25, volatility: 0.2, pipSize: 0.01, isActive: true, payoutPercent: 80 },
];

// Commodities (simulated - OTC)
const COMMODITY_ASSETS: MarketAsset[] = [
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', marketType: 'otc', basePrice: 2035.50, volatility: 3.5, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'XAG/USD', name: 'Silver / US Dollar', marketType: 'otc', basePrice: 23.15, volatility: 0.15, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'XPT/USD', name: 'Platinum / US Dollar', marketType: 'otc', basePrice: 925.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'XPD/USD', name: 'Palladium / US Dollar', marketType: 'otc', basePrice: 1015.00, volatility: 8.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'WTI/USD', name: 'Crude Oil WTI', marketType: 'otc', basePrice: 72.50, volatility: 0.8, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'BRENT/USD', name: 'Brent Crude Oil', marketType: 'otc', basePrice: 77.25, volatility: 0.8, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'NGAS/USD', name: 'Natural Gas', marketType: 'otc', basePrice: 2.85, volatility: 0.08, pipSize: 0.001, isActive: true, payoutPercent: 82 },
];

// Stock Indices (simulated - OTC)
const INDEX_ASSETS: MarketAsset[] = [
  { symbol: 'US500', name: 'S&P 500 Index', marketType: 'otc', basePrice: 4785.00, volatility: 15.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'US100', name: 'NASDAQ 100 Index', marketType: 'otc', basePrice: 16850.00, volatility: 50.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'US30', name: 'Dow Jones 30 Index', marketType: 'otc', basePrice: 37650.00, volatility: 100.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'UK100', name: 'FTSE 100 Index', marketType: 'otc', basePrice: 7685.00, volatility: 20.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'DE40', name: 'DAX 40 Index', marketType: 'otc', basePrice: 16750.00, volatility: 50.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'JP225', name: 'Nikkei 225 Index', marketType: 'otc', basePrice: 33500.00, volatility: 150.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'HK50', name: 'Hang Seng 50 Index', marketType: 'otc', basePrice: 17250.00, volatility: 80.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'AU200', name: 'ASX 200 Index', marketType: 'otc', basePrice: 7580.00, volatility: 25.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
];

const OTC_ASSETS: MarketAsset[] = [
  // OTC Forex pairs
  { symbol: 'OTC_EUR/USD', name: 'OTC Euro / US Dollar', marketType: 'otc', basePrice: 1.0852, volatility: 0.0015, pipSize: 0.0001, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_GBP/USD', name: 'OTC British Pound / US Dollar', marketType: 'otc', basePrice: 1.2634, volatility: 0.0020, pipSize: 0.0001, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_USD/JPY', name: 'OTC US Dollar / Japanese Yen', marketType: 'otc', basePrice: 149.85, volatility: 0.20, pipSize: 0.01, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_AUD/USD', name: 'OTC Australian Dollar / US Dollar', marketType: 'otc', basePrice: 0.6542, volatility: 0.0015, pipSize: 0.0001, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_GBP/JPY', name: 'OTC British Pound / Japanese Yen', marketType: 'otc', basePrice: 189.35, volatility: 0.30, pipSize: 0.01, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_EUR/JPY', name: 'OTC Euro / Japanese Yen', marketType: 'otc', basePrice: 162.45, volatility: 0.22, pipSize: 0.01, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_USD/CHF', name: 'OTC US Dollar / Swiss Franc', marketType: 'otc', basePrice: 0.8845, volatility: 0.0012, pipSize: 0.0001, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_EUR/GBP', name: 'OTC Euro / British Pound', marketType: 'otc', basePrice: 0.8592, volatility: 0.0010, pipSize: 0.0001, isActive: true, payoutPercent: 92 },

  // Volatility indices
  { symbol: 'VOL_10', name: 'Volatility 10 Index', marketType: 'otc', basePrice: 1000.00, volatility: 1.0, pipSize: 0.01, isActive: true, payoutPercent: 90 },
  { symbol: 'VOL_25', name: 'Volatility 25 Index', marketType: 'otc', basePrice: 1000.00, volatility: 2.5, pipSize: 0.01, isActive: true, payoutPercent: 88 },
  { symbol: 'VOL_50', name: 'Volatility 50 Index', marketType: 'otc', basePrice: 1000.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'VOL_75', name: 'Volatility 75 Index', marketType: 'otc', basePrice: 1000.00, volatility: 7.5, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'VOL_100', name: 'Volatility 100 Index', marketType: 'otc', basePrice: 1000.00, volatility: 10.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'VOL_150', name: 'Volatility 150 Index', marketType: 'otc', basePrice: 1000.00, volatility: 15.0, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'VOL_200', name: 'Volatility 200 Index', marketType: 'otc', basePrice: 1000.00, volatility: 20.0, pipSize: 0.01, isActive: true, payoutPercent: 75 },
  { symbol: 'VOL_250', name: 'Volatility 250 Index', marketType: 'otc', basePrice: 1000.00, volatility: 25.0, pipSize: 0.01, isActive: true, payoutPercent: 72 },

  // 1-second Volatility indices
  { symbol: 'VOL_10_1S', name: 'Volatility 10 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 0.5, pipSize: 0.01, isActive: true, payoutPercent: 90 },
  { symbol: 'VOL_25_1S', name: 'Volatility 25 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 1.25, pipSize: 0.01, isActive: true, payoutPercent: 88 },
  { symbol: 'VOL_50_1S', name: 'Volatility 50 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 2.5, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'VOL_75_1S', name: 'Volatility 75 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 3.75, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'VOL_100_1S', name: 'Volatility 100 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'VOL_150_1S', name: 'Volatility 150 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 7.5, pipSize: 0.01, isActive: true, payoutPercent: 78 },
  { symbol: 'VOL_200_1S', name: 'Volatility 200 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 10.0, pipSize: 0.01, isActive: true, payoutPercent: 75 },
  { symbol: 'VOL_250_1S', name: 'Volatility 250 (1s) Index', marketType: 'otc', basePrice: 5000.00, volatility: 12.5, pipSize: 0.01, isActive: true, payoutPercent: 72 },

  // Crash indices
  { symbol: 'CRASH_300', name: 'Crash 300 Index', marketType: 'otc', basePrice: 8500.00, volatility: 25.0, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'CRASH_500', name: 'Crash 500 Index', marketType: 'otc', basePrice: 8500.00, volatility: 35.0, pipSize: 0.01, isActive: true, payoutPercent: 83 },
  { symbol: 'CRASH_600', name: 'Crash 600 Index', marketType: 'otc', basePrice: 8500.00, volatility: 40.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'CRASH_900', name: 'Crash 900 Index', marketType: 'otc', basePrice: 8500.00, volatility: 50.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'CRASH_1000', name: 'Crash 1000 Index', marketType: 'otc', basePrice: 8500.00, volatility: 55.0, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // Boom indices
  { symbol: 'BOOM_300', name: 'Boom 300 Index', marketType: 'otc', basePrice: 8500.00, volatility: 25.0, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'BOOM_500', name: 'Boom 500 Index', marketType: 'otc', basePrice: 8500.00, volatility: 35.0, pipSize: 0.01, isActive: true, payoutPercent: 83 },
  { symbol: 'BOOM_600', name: 'Boom 600 Index', marketType: 'otc', basePrice: 8500.00, volatility: 40.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'BOOM_900', name: 'Boom 900 Index', marketType: 'otc', basePrice: 8500.00, volatility: 50.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'BOOM_1000', name: 'Boom 1000 Index', marketType: 'otc', basePrice: 8500.00, volatility: 55.0, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // Step indices
  { symbol: 'STEP_INDEX', name: 'Step Index', marketType: 'otc', basePrice: 500.00, volatility: 0.25, pipSize: 0.01, isActive: true, payoutPercent: 88 },
  { symbol: 'STEP_100', name: 'Step Index 100', marketType: 'otc', basePrice: 500.00, volatility: 0.5, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'STEP_200', name: 'Step Index 200', marketType: 'otc', basePrice: 500.00, volatility: 1.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'STEP_500', name: 'Step Index 500', marketType: 'otc', basePrice: 500.00, volatility: 2.5, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // Jump indices
  { symbol: 'JUMP_10', name: 'Jump 10 Index', marketType: 'otc', basePrice: 1000.00, volatility: 3.0, pipSize: 0.01, isActive: true, payoutPercent: 88 },
  { symbol: 'JUMP_25', name: 'Jump 25 Index', marketType: 'otc', basePrice: 1000.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'JUMP_50', name: 'Jump 50 Index', marketType: 'otc', basePrice: 1000.00, volatility: 8.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
  { symbol: 'JUMP_75', name: 'Jump 75 Index', marketType: 'otc', basePrice: 1000.00, volatility: 12.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
  { symbol: 'JUMP_100', name: 'Jump 100 Index', marketType: 'otc', basePrice: 1000.00, volatility: 15.0, pipSize: 0.01, isActive: true, payoutPercent: 78 },

  // Range Break indices
  { symbol: 'RANGE_100', name: 'Range Break 100 Index', marketType: 'otc', basePrice: 500.00, volatility: 2.0, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'RANGE_200', name: 'Range Break 200 Index', marketType: 'otc', basePrice: 500.00, volatility: 4.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },

  // Drift Switch indices
  { symbol: 'DRIFT_SWITCH_10', name: 'Drift Switch 10 Index', marketType: 'otc', basePrice: 1000.00, volatility: 2.0, pipSize: 0.01, isActive: true, payoutPercent: 88 },
  { symbol: 'DRIFT_SWITCH_20', name: 'Drift Switch 20 Index', marketType: 'otc', basePrice: 1000.00, volatility: 3.5, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'DRIFT_SWITCH_30', name: 'Drift Switch 30 Index', marketType: 'otc', basePrice: 1000.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 82 },
];

// Market simulation state for realistic OTC price movements
interface MarketSimulationState {
  trend: number;           // Current trend direction (-1 to 1)
  trendStrength: number;   // How strong the trend is (0 to 1)
  trendDuration: number;   // How many ticks left in current trend
  momentum: number;        // Current momentum (smoothed direction)
  volatilityState: number; // Current volatility multiplier (0.5 to 2)
  lastChange: number;      // Last price change for momentum calculation
}

class MarketService {
  private currentPrices: Map<string, PriceTick> = new Map();
  private priceHistory: Map<string, PriceHistory> = new Map();
  private assets: Map<string, MarketAsset> = new Map();
  private spreadConfigs: Map<string, { markupPips: number; isActive: boolean }> = new Map();
  private volatilityConfigs: Map<string, { mode: 'LOW' | 'MEDIUM' | 'HIGH'; isActive: boolean }> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly HISTORY_LENGTH = 100;
  private useDerivApi = false;
  private derivUnsubscribe: (() => void) | null = null;
  private derivInitialized: Set<string> = new Set(); // Track which symbols have received first Deriv tick
  private simulationState: Map<string, MarketSimulationState> = new Map(); // Realistic market simulation state

  // Volatility multipliers for admin control
  private readonly VOLATILITY_MULTIPLIERS = {
    LOW: 0.4,
    MEDIUM: 1.0,
    HIGH: 2.5,
  };

  constructor() {
    this.initializeAssets();
    this.initializePrices();
    this.loadSpreadConfigs().catch(error => {
      logger.error('Failed to load spread configs during initialization:', error);
    });
    this.loadVolatilityConfigs().catch(error => {
      logger.error('Failed to load volatility configs during initialization:', error);
    });
    this.initializeDerivIntegration();
    this.startPriceUpdates();
  }

  private initializeAssets(): void {
    [
      ...FOREX_ASSETS,
      ...CRYPTO_ASSETS,
      ...COMMODITY_ASSETS,
      ...INDEX_ASSETS,
      ...OTC_ASSETS,
    ].forEach((asset) => {
      this.assets.set(asset.symbol, asset);
    });
  }

  private async loadSpreadConfigs(): Promise<void> {
    try {
      const configs = await prisma.spreadConfig.findMany({
        where: { isActive: true },
      });

      configs.forEach((config) => {
        this.spreadConfigs.set(config.symbol, {
          markupPips: config.markupPips,
          isActive: config.isActive,
        });
      });

      logger.info(`Loaded ${configs.length} spread configurations`);
    } catch (error) {
      logger.error('Failed to load spread configs:', error);
    }
  }

  private async loadVolatilityConfigs(): Promise<void> {
    try {
      const configs = await prisma.marketConfig.findMany();

      configs.forEach((config) => {
        this.volatilityConfigs.set(config.symbol, {
          mode: config.volatilityMode as 'LOW' | 'MEDIUM' | 'HIGH',
          isActive: config.isActive,
        });
      });

      logger.info(`Loaded ${configs.length} volatility configurations`);
    } catch (error) {
      logger.error('Failed to load volatility configs:', error);
    }
  }

  async reloadVolatilityConfigs(): Promise<void> {
    await this.loadVolatilityConfigs();
    logger.info('Volatility configurations reloaded');
  }

  getVolatilityMultiplier(symbol: string): number {
    const config = this.volatilityConfigs.get(symbol);
    if (!config) {
      return this.VOLATILITY_MULTIPLIERS.MEDIUM; // Default to medium
    }
    return this.VOLATILITY_MULTIPLIERS[config.mode] || this.VOLATILITY_MULTIPLIERS.MEDIUM;
  }

  private initializeDerivIntegration(): void {
    this.useDerivApi = config.deriv.useDerivApi && derivService.isServiceAvailable();

    if (config.deriv.useDerivApi) {
      // Subscribe to Deriv price updates
      this.derivUnsubscribe = derivService.onPriceUpdate((tick) => {
        this.handleDerivPrice(tick);
      });

      // Subscribe only to real market pairs (forex), NOT OTC pairs
      // OTC pairs use simulation exclusively
      let derivSubscriptionCount = 0;
      this.assets.forEach((asset, symbol) => {
        if (asset.marketType === 'forex') {
          derivService.subscribe(symbol);
          derivSubscriptionCount++;
        }
      });

      logger.info(`Deriv API integration initialized - subscribed to ${derivSubscriptionCount} forex pairs`);
    } else {
      logger.info('Using simulation mode (Deriv API disabled)');
    }
  }

  private handleDerivPrice(derivTick: any): void {
    const asset = this.assets.get(derivTick.symbol);
    if (!asset) return;

    // Only process forex pairs from Deriv (OTC pairs use simulation)
    if (asset.marketType !== 'forex') return;

    // Use quote as primary price (always available), fallback to bid/ask average
    const basePrice = derivTick.quote || ((derivTick.bid + derivTick.ask) / 2);
    if (!basePrice || isNaN(basePrice)) {
      logger.warn(`Invalid Deriv tick for ${derivTick.symbol}:`, derivTick);
      return;
    }

    // Apply spread markup if configured
    const spreadConfig = this.spreadConfigs.get(derivTick.symbol);
    const markupPips = spreadConfig?.markupPips ?? config.spread.defaultMarkup;
    const pipValue = asset.pipSize;
    const markupValue = markupPips * pipValue;

    // Calculate bid/ask with markup
    const bid = basePrice - markupValue / 2;
    const ask = basePrice + markupValue / 2;
    const price = basePrice;

    // On first Deriv tick for this symbol, regenerate history to avoid price jump
    if (!this.derivInitialized.has(derivTick.symbol)) {
      this.derivInitialized.add(derivTick.symbol);
      this.regenerateHistoryFromPrice(derivTick.symbol, price, asset);
      logger.info(`[Market] Initialized ${derivTick.symbol} with Deriv price: ${price}`);
    }

    // Calculate change from first price of the day (or use current history start)
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

    // Update current price
    this.currentPrices.set(derivTick.symbol, newTick);

    // Update history
    if (history) {
      history.prices.push({ price: newTick.price, timestamp: newTick.timestamp });
      if (history.prices.length > this.HISTORY_LENGTH) {
        history.prices.shift();
      }
    }

    // Broadcast to WebSocket clients
    wsManager.broadcastAllPrices([newTick]);
  }

  private regenerateHistoryFromPrice(symbol: string, currentPrice: number, asset: MarketAsset): void {
    const history = this.priceHistory.get(symbol);
    if (!history) return;

    // Clear existing history
    history.prices = [];

    // Generate new historical data centered around the current Deriv price
    const now = Date.now();
    const oneSecond = 1000;

    for (let i = 300; i > 0; i--) {
      const timestamp = new Date(now - (i * oneSecond));
      // Small random variation around current price (realistic movement)
      const randomChange = (Math.random() - 0.5) * asset.volatility * 0.5;
      const historicalPrice = currentPrice + randomChange;

      history.prices.push({
        price: Number(historicalPrice.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
        timestamp
      });
    }

    // Also update the current price in prices map
    const currentTick = this.currentPrices.get(symbol);
    if (currentTick) {
      currentTick.price = currentPrice;
      currentTick.bid = currentPrice - asset.volatility * 0.05;
      currentTick.ask = currentPrice + asset.volatility * 0.05;
    }
  }

  private initializePrices(): void {
    this.assets.forEach((asset, symbol) => {
      const spread = asset.volatility * 0.1;
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

      // Generate initial historical data (300 seconds = 5 minutes of history)
      this.generateInitialHistory(symbol, 300);
    });
  }

  private startPriceUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateAllPrices();
    }, 1000);

    logger.info('Market price updates started');
  }

  private updateAllPrices(): void {
    // Simulation runs ONLY for OTC pairs.
    // Real forex pairs get their prices exclusively from Deriv API.
    // This clean separation prevents price conflicts and makes management easier.
    const updatedTicks: PriceTick[] = [];

    this.assets.forEach((asset, symbol) => {
      if (!asset.isActive) return;

      // Only simulate OTC pairs - forex pairs use Deriv exclusively
      if (asset.marketType !== 'otc') return;

      const currentTick = this.currentPrices.get(symbol);
      if (!currentTick) return;

      // Get volatility multiplier from admin config
      const volatilityMultiplier = this.getVolatilityMultiplier(symbol);
      const newPrice = this.generateNewPrice(currentTick.price, asset, volatilityMultiplier);

      // Apply spread markup if configured
      const spreadConfig = this.spreadConfigs.get(symbol);
      const markupPips = spreadConfig?.markupPips ?? config.spread.defaultMarkup;
      const pipValue = asset.pipSize;
      const markupValue = markupPips * pipValue;

      const baseSpread = asset.volatility * 0.1;
      const totalSpread = baseSpread + markupValue;

      const openPrice = asset.basePrice;
      const change = newPrice - openPrice;
      const changePercent = (change / openPrice) * 100;

      const newTick: PriceTick = {
        symbol,
        price: newPrice,
        bid: newPrice - totalSpread / 2,
        ask: newPrice + totalSpread / 2,
        timestamp: new Date(),
        change: Number(change.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
        changePercent: Number(changePercent.toFixed(2)),
      };

      this.currentPrices.set(symbol, newTick);
      updatedTicks.push(newTick);

      const history = this.priceHistory.get(symbol);
      if (history) {
        history.prices.push({ price: newPrice, timestamp: new Date() });
        if (history.prices.length > this.HISTORY_LENGTH) {
          history.prices.shift();
        }
      }
    });

    // Broadcast price updates to WebSocket clients
    if (updatedTicks.length > 0) {
      wsManager.broadcastAllPrices(updatedTicks);
    }
  }

  private getOrCreateSimulationState(symbol: string): MarketSimulationState {
    let state = this.simulationState.get(symbol);
    if (!state) {
      state = {
        trend: (Math.random() - 0.5) * 2,      // Random initial trend
        trendStrength: Math.random() * 0.5,    // Initial trend strength
        trendDuration: Math.floor(Math.random() * 30) + 10, // 10-40 ticks
        momentum: 0,
        volatilityState: 1,
        lastChange: 0,
      };
      this.simulationState.set(symbol, state);
    }
    return state;
  }

  private generateNewPrice(currentPrice: number, asset: MarketAsset, volatilityMultiplier: number = 1.0): number {
    const state = this.getOrCreateSimulationState(asset.symbol);
    const effectiveVolatility = asset.volatility * volatilityMultiplier;

    // Update trend duration and potentially create new trend
    state.trendDuration--;
    if (state.trendDuration <= 0) {
      // Create new trend
      state.trend = (Math.random() - 0.5) * 2;
      state.trendStrength = Math.random() * 0.7 + 0.1; // 0.1 to 0.8
      state.trendDuration = Math.floor(Math.random() * 40) + 15; // 15-55 ticks

      // Occasionally create stronger trends (simulates news events)
      if (Math.random() < 0.1) {
        state.trendStrength = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
        state.trendDuration = Math.floor(Math.random() * 20) + 5; // Shorter duration
      }
    }

    // Gradually decay trend strength over time
    state.trendStrength *= 0.995;

    // Update volatility state (slowly varying)
    const volatilityChange = (Math.random() - 0.5) * 0.1;
    state.volatilityState = Math.max(0.5, Math.min(2.0, state.volatilityState + volatilityChange));
    // Occasionally spike volatility
    if (Math.random() < 0.02) {
      state.volatilityState = 1.5 + Math.random() * 0.5;
    }
    // Mean revert volatility
    state.volatilityState = state.volatilityState * 0.98 + 1.0 * 0.02;

    // Calculate price movement components:

    // 1. Trend component - follows the current trend direction
    const trendComponent = state.trend * state.trendStrength * effectiveVolatility * 0.3;

    // 2. Momentum component - smoothed continuation of previous movement
    const momentumDecay = 0.7;
    state.momentum = state.momentum * momentumDecay + state.lastChange * (1 - momentumDecay);
    const momentumComponent = state.momentum * 0.3;

    // 3. Random noise component - small random fluctuations
    const noiseComponent = (Math.random() - 0.5) * effectiveVolatility * state.volatilityState * 0.4;

    // 4. Mean reversion component - gentle pull back to base price
    const deviationFromBase = (currentPrice - asset.basePrice) / asset.basePrice;
    const meanReversionStrength = Math.min(Math.abs(deviationFromBase) * 2, 0.3);
    const meanReversionComponent = -Math.sign(deviationFromBase) * meanReversionStrength * effectiveVolatility * 0.2;

    // Combine all components
    let priceChange = trendComponent + momentumComponent + noiseComponent + meanReversionComponent;

    // Apply volatility state
    priceChange *= state.volatilityState;

    // Store for next iteration
    state.lastChange = priceChange;

    let newPrice = currentPrice + priceChange;

    // Soft bounds - stronger mean reversion near boundaries instead of hard stops
    const maxDeviation = asset.basePrice * 0.03 * Math.max(1, volatilityMultiplier * 0.5);
    const lowerBound = asset.basePrice - maxDeviation;
    const upperBound = asset.basePrice + maxDeviation;

    if (newPrice < lowerBound) {
      // Soft bounce from lower bound
      const overshoot = lowerBound - newPrice;
      newPrice = lowerBound + overshoot * 0.5 + Math.random() * effectiveVolatility * 0.2;
      state.trend = Math.abs(state.trend); // Force upward trend
      state.momentum = Math.abs(state.momentum) * 0.5;
    } else if (newPrice > upperBound) {
      // Soft bounce from upper bound
      const overshoot = newPrice - upperBound;
      newPrice = upperBound - overshoot * 0.5 - Math.random() * effectiveVolatility * 0.2;
      state.trend = -Math.abs(state.trend); // Force downward trend
      state.momentum = -Math.abs(state.momentum) * 0.5;
    }

    const precision = asset.pipSize < 0.01 ? 5 : 2;
    return Number(newPrice.toFixed(precision));
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

  getOtcPrices(): PriceTick[] {
    return Array.from(this.currentPrices.values()).filter((tick) => {
      const asset = this.assets.get(tick.symbol);
      return asset?.marketType === 'otc';
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

  getOtcAssets(): MarketAsset[] {
    return OTC_ASSETS.filter((asset) => asset.isActive);
  }

  getCryptoAssets(): MarketAsset[] {
    return CRYPTO_ASSETS.filter((asset) => asset.isActive);
  }

  getCommodityAssets(): MarketAsset[] {
    return COMMODITY_ASSETS.filter((asset) => asset.isActive);
  }

  getIndexAssets(): MarketAsset[] {
    return INDEX_ASSETS.filter((asset) => asset.isActive);
  }

  generateExitPrice(symbol: string, entryPrice: number, durationSeconds: number): number {
    const asset = this.assets.get(symbol);
    if (!asset) {
      return entryPrice + (Math.random() - 0.5) * 0.005;
    }

    const volatilityMultiplier = Math.sqrt(durationSeconds / 60);
    const priceChange = asset.volatility * volatilityMultiplier * (Math.random() - 0.5) * 2;
    const exitPrice = entryPrice + priceChange;

    const precision = asset.pipSize < 0.01 ? 5 : 2;
    return Number(exitPrice.toFixed(precision));
  }

  stopPriceUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Market price updates stopped');
    }

    // Cleanup Deriv subscription
    if (this.derivUnsubscribe) {
      this.derivUnsubscribe();
      this.derivUnsubscribe = null;
    }
  }

  async reloadSpreadConfigs(): Promise<void> {
    await this.loadSpreadConfigs();
    logger.info('Spread configurations reloaded');
  }

  getMarketStatus(): {
    derivAvailable: boolean;
    derivConnected: boolean;
    forexPairsCount: number;
    otcPairsCount: number;
    spreadConfigsLoaded: number;
  } {
    const derivAvailable = derivService.isServiceAvailable();
    const derivStatus = derivService.getStatus();

    // Count pairs by type
    let forexCount = 0;
    let otcCount = 0;
    this.assets.forEach((asset) => {
      if (asset.marketType === 'forex') forexCount++;
      else if (asset.marketType === 'otc') otcCount++;
    });

    return {
      derivAvailable,
      derivConnected: derivStatus.connected,
      forexPairsCount: forexCount, // Real pairs from Deriv
      otcPairsCount: otcCount, // Simulated OTC pairs
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

    // Group prices into time buckets based on resolution
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

    // Convert buckets to OHLC bars
    buckets.forEach((bucket, time) => {
      bars.push({
        time: Math.floor(time / 1000), // Convert to seconds for TradingView
        open: bucket.open,
        high: bucket.high,
        low: bucket.low,
        close: bucket.close,
        volume: bucket.prices.length
      });
    });

    // Sort by time ascending
    bars.sort((a, b) => a.time - b.time);

    // Return only the requested number of bars
    return bars.slice(-limit);
  }

  generateInitialHistory(symbol: string, bars: number = 100): void {
    const asset = this.assets.get(symbol);
    if (!asset) return;

    const history = this.priceHistory.get(symbol);
    if (!history) return;

    // Generate historical prices going back in time
    const now = Date.now();
    const oneSecond = 1000;

    for (let i = bars; i > 0; i--) {
      const timestamp = new Date(now - (i * oneSecond));
      const randomChange = (Math.random() - 0.5) * asset.volatility * 2;
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
}

export const marketService = new MarketService();
export type { PriceTick, MarketAsset, PriceHistory, OHLCBar };
