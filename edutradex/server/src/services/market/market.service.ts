import { logger } from '../../utils/logger.js';

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

const FOREX_ASSETS: MarketAsset[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', marketType: 'forex', basePrice: 1.0852, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', marketType: 'forex', basePrice: 1.2634, volatility: 0.0012, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', marketType: 'forex', basePrice: 149.85, volatility: 0.15, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', marketType: 'forex', basePrice: 0.6542, volatility: 0.0010, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', marketType: 'forex', basePrice: 1.3625, volatility: 0.0009, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', marketType: 'forex', basePrice: 0.8592, volatility: 0.0007, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', marketType: 'forex', basePrice: 0.5932, volatility: 0.0011, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', marketType: 'forex', basePrice: 0.8845, volatility: 0.0008, pipSize: 0.0001, isActive: true, payoutPercent: 85 },
];

const OTC_ASSETS: MarketAsset[] = [
  { symbol: 'OTC_EUR/USD', name: 'OTC Euro / US Dollar', marketType: 'otc', basePrice: 1.0852, volatility: 0.0015, pipSize: 0.0001, isActive: true, payoutPercent: 92 },
  { symbol: 'OTC_GBP/USD', name: 'OTC British Pound / US Dollar', marketType: 'otc', basePrice: 1.2634, volatility: 0.0020, pipSize: 0.0001, isActive: true, payoutPercent: 92 },
  { symbol: 'VOL_10', name: 'Volatility 10 Index', marketType: 'otc', basePrice: 1000.00, volatility: 1.0, pipSize: 0.01, isActive: true, payoutPercent: 90 },
  { symbol: 'VOL_25', name: 'Volatility 25 Index', marketType: 'otc', basePrice: 1000.00, volatility: 2.5, pipSize: 0.01, isActive: true, payoutPercent: 88 },
  { symbol: 'VOL_50', name: 'Volatility 50 Index', marketType: 'otc', basePrice: 1000.00, volatility: 5.0, pipSize: 0.01, isActive: true, payoutPercent: 85 },
  { symbol: 'VOL_100', name: 'Volatility 100 Index', marketType: 'otc', basePrice: 1000.00, volatility: 10.0, pipSize: 0.01, isActive: true, payoutPercent: 80 },
];

class MarketService {
  private currentPrices: Map<string, PriceTick> = new Map();
  private priceHistory: Map<string, PriceHistory> = new Map();
  private assets: Map<string, MarketAsset> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly HISTORY_LENGTH = 100;

  constructor() {
    this.initializeAssets();
    this.initializePrices();
    this.startPriceUpdates();
  }

  private initializeAssets(): void {
    [...FOREX_ASSETS, ...OTC_ASSETS].forEach((asset) => {
      this.assets.set(asset.symbol, asset);
    });
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
      this.priceHistory.set(symbol, { symbol, prices: [{ price: asset.basePrice, timestamp: new Date() }] });
    });
  }

  private startPriceUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateAllPrices();
    }, 1000);

    logger.info('Market price updates started');
  }

  private updateAllPrices(): void {
    this.assets.forEach((asset, symbol) => {
      if (!asset.isActive) return;

      const currentTick = this.currentPrices.get(symbol);
      if (!currentTick) return;

      const newPrice = this.generateNewPrice(currentTick.price, asset);
      const spread = asset.volatility * 0.1;
      const openPrice = asset.basePrice;
      const change = newPrice - openPrice;
      const changePercent = (change / openPrice) * 100;

      const newTick: PriceTick = {
        symbol,
        price: newPrice,
        bid: newPrice - spread / 2,
        ask: newPrice + spread / 2,
        timestamp: new Date(),
        change: Number(change.toFixed(asset.pipSize < 0.01 ? 5 : 2)),
        changePercent: Number(changePercent.toFixed(2)),
      };

      this.currentPrices.set(symbol, newTick);

      const history = this.priceHistory.get(symbol);
      if (history) {
        history.prices.push({ price: newPrice, timestamp: new Date() });
        if (history.prices.length > this.HISTORY_LENGTH) {
          history.prices.shift();
        }
      }
    });
  }

  private generateNewPrice(currentPrice: number, asset: MarketAsset): number {
    const randomFactor = (Math.random() - 0.5) * 2;
    const trendBias = (Math.random() - 0.5) * 0.3;
    const priceChange = asset.volatility * (randomFactor + trendBias);

    let newPrice = currentPrice + priceChange;

    const maxDeviation = asset.basePrice * 0.02;
    const lowerBound = asset.basePrice - maxDeviation;
    const upperBound = asset.basePrice + maxDeviation;

    if (newPrice < lowerBound) {
      newPrice = lowerBound + Math.random() * asset.volatility;
    } else if (newPrice > upperBound) {
      newPrice = upperBound - Math.random() * asset.volatility;
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
  }
}

export const marketService = new MarketService();
export type { PriceTick, MarketAsset, PriceHistory };
