/**
 * OTC History Seeder Service
 *
 * Fetches real historical candles from Binance (crypto) or Deriv (forex)
 * and stores them as OTC historical data. This provides realistic chart
 * history that the OTC price generator can continue from.
 *
 * FALLBACK: When Deriv is unavailable (weekends), uses Binance stablecoin pairs
 * as fallback for Forex pairs (e.g., EUR/USD -> EURUSDT on Binance)
 */

import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { binanceService, BinanceService } from '../binance/binance.service.js';
import { derivService } from '../deriv/deriv.service.js';
import { randomUUID } from 'crypto';
import { otcMarketService } from './otc-market.service.js';

// Forex to Binance fallback mapping
// Maps Forex base symbols to Binance trading pairs for weekend fallback
const FOREX_TO_BINANCE_FALLBACK: Record<string, string> = {
  'EUR/USD': 'EURUSDT',
  'GBP/USD': 'GBPUSDT',
  'AUD/USD': 'AUDUSDT',
  // For pairs not directly available on Binance, use synthetic calculation or closest match
  'USD/JPY': 'USDCUSDT',  // Will need price inversion/adjustment
  'USD/CAD': 'USDCUSDT',
  'USD/CHF': 'USDCUSDT',
  'NZD/USD': 'NZDUSDT',   // If available, otherwise fallback
  // Cross pairs - use EUR as base reference
  'EUR/GBP': 'EURUSDT',
  'EUR/JPY': 'EURUSDT',
  'GBP/JPY': 'GBPUSDT',
};

interface OTCConfigRow {
  id: string;
  symbol: string;
  baseSymbol: string;
  marketType: string;
  isEnabled: boolean;
}

interface SeededCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SeedResult {
  symbol: string;
  baseSymbol: string;
  candlesSeeded: number;
  oldestCandle: Date | null;
  newestCandle: Date | null;
  source: 'BINANCE' | 'DERIV' | 'BINANCE_FALLBACK' | 'NONE';
}

interface SeedOptions {
  /** Number of candles to fetch (default: 500) */
  count?: number;
  /** Candle resolution in seconds (default: 60 for 1-minute candles) */
  resolution?: number;
  /** Clear existing history before seeding (default: true) */
  clearExisting?: boolean;
}

class OTCHistorySeeder {

  /**
   * Seed historical data for a single OTC symbol
   */
  async seedSymbol(otcSymbol: string, options: SeedOptions = {}): Promise<SeedResult> {
    const { count = 500, resolution = 60, clearExisting = true } = options;

    // Get the OTC config
    const config = await queryOne<OTCConfigRow>(
      `SELECT id, symbol, "baseSymbol", "marketType", "isEnabled"
       FROM "OTCConfig" WHERE symbol = $1`,
      [otcSymbol]
    );

    if (!config) {
      throw new Error(`OTC config not found for symbol: ${otcSymbol}`);
    }

    logger.info(`[OTCHistorySeeder] Seeding ${otcSymbol} from base symbol ${config.baseSymbol} (${config.marketType})`);

    // Fetch candles from appropriate source
    let candles: SeededCandle[] = [];
    let source: 'BINANCE' | 'DERIV' | 'BINANCE_FALLBACK' | 'NONE' = 'NONE';

    if (config.marketType === 'CRYPTO') {
      candles = await this.fetchFromBinance(config.baseSymbol, resolution, count);
      source = candles.length > 0 ? 'BINANCE' : 'NONE';
    } else if (config.marketType === 'FOREX') {
      // Try Deriv first
      candles = await this.fetchFromDeriv(config.baseSymbol, resolution, count);
      source = candles.length > 0 ? 'DERIV' : 'NONE';

      // FALLBACK: If Deriv fails (e.g., weekend), try Binance stablecoin pairs
      if (candles.length === 0) {
        logger.info(`[OTCHistorySeeder] Deriv returned no data for ${config.baseSymbol}, trying Binance fallback...`);
        candles = await this.fetchForexFromBinanceFallback(config.baseSymbol, resolution, count);
        source = candles.length > 0 ? 'BINANCE_FALLBACK' : 'NONE';
      }
    }

    if (candles.length === 0) {
      logger.warn(`[OTCHistorySeeder] No candles fetched for ${otcSymbol}`);
      return {
        symbol: otcSymbol,
        baseSymbol: config.baseSymbol,
        candlesSeeded: 0,
        oldestCandle: null,
        newestCandle: null,
        source: 'NONE',
      };
    }

    // Clear existing history if requested
    // CRITICAL: Clear ALL history (SEEDED + OTC) to prevent price discontinuity
    if (clearExisting) {
      await query(
        `DELETE FROM "OTCPriceHistory" WHERE symbol = $1`,
        [otcSymbol]
      );
      logger.info(`[OTCHistorySeeder] Cleared ALL history for ${otcSymbol} (seeded + OTC generated)`);
    }

    // Insert candles into OTCPriceHistory
    const insertedCount = await this.insertCandles(config.id, otcSymbol, candles, resolution);

    const oldestCandle = new Date(candles[0].time * 1000);
    const newestCandle = new Date(candles[candles.length - 1].time * 1000);
    const lastSeededPrice = candles[candles.length - 1].close;

    logger.info(`[OTCHistorySeeder] Seeded ${insertedCount} candles for ${otcSymbol} from ${source}`);
    logger.info(`[OTCHistorySeeder] Last seeded price for ${otcSymbol}: ${lastSeededPrice}`);

    // CRITICAL: Reinitialize the OTC price generator at the last seeded price
    // This ensures price continuity between seeded history and OTC generation
    try {
      await otcMarketService.reloadConfig(otcSymbol);
      logger.info(`[OTCHistorySeeder] Reinitialized OTC generator for ${otcSymbol} at price ${lastSeededPrice}`);
    } catch (error) {
      logger.warn(`[OTCHistorySeeder] Could not reinitialize OTC generator for ${otcSymbol}:`, error);
    }

    return {
      symbol: otcSymbol,
      baseSymbol: config.baseSymbol,
      candlesSeeded: insertedCount,
      oldestCandle,
      newestCandle,
      source,
    };
  }

  /**
   * Seed historical data for all enabled OTC symbols
   */
  async seedAllSymbols(options: SeedOptions = {}): Promise<SeedResult[]> {
    const configs = await queryMany<OTCConfigRow>(
      `SELECT id, symbol, "baseSymbol", "marketType", "isEnabled"
       FROM "OTCConfig" WHERE "isEnabled" = true`
    );

    logger.info(`[OTCHistorySeeder] Seeding ${configs.length} enabled OTC symbols`);

    const results: SeedResult[] = [];

    for (const config of configs) {
      try {
        const result = await this.seedSymbol(config.symbol, options);
        results.push(result);

        // Small delay between requests to avoid rate limiting
        await this.delay(500);
      } catch (error) {
        logger.error(`[OTCHistorySeeder] Failed to seed ${config.symbol}:`, error);
        results.push({
          symbol: config.symbol,
          baseSymbol: config.baseSymbol,
          candlesSeeded: 0,
          oldestCandle: null,
          newestCandle: null,
          source: 'NONE',
        });
      }
    }

    return results;
  }

  /**
   * Seed historical data for a specific market type
   */
  async seedByMarketType(
    marketType: 'FOREX' | 'CRYPTO',
    options: SeedOptions = {}
  ): Promise<SeedResult[]> {
    const configs = await queryMany<OTCConfigRow>(
      `SELECT id, symbol, "baseSymbol", "marketType", "isEnabled"
       FROM "OTCConfig" WHERE "marketType" = $1 AND "isEnabled" = true`,
      [marketType]
    );

    logger.info(`[OTCHistorySeeder] Seeding ${configs.length} ${marketType} OTC symbols`);

    const results: SeedResult[] = [];

    for (const config of configs) {
      try {
        const result = await this.seedSymbol(config.symbol, options);
        results.push(result);
        await this.delay(500);
      } catch (error) {
        logger.error(`[OTCHistorySeeder] Failed to seed ${config.symbol}:`, error);
        results.push({
          symbol: config.symbol,
          baseSymbol: config.baseSymbol,
          candlesSeeded: 0,
          oldestCandle: null,
          newestCandle: null,
          source: 'NONE',
        });
      }
    }

    return results;
  }

  /**
   * Check if a symbol has seeded historical data
   */
  async hasSeededHistory(otcSymbol: string): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "OTCPriceHistory"
       WHERE symbol = $1 AND "priceMode" = 'SEEDED'`,
      [otcSymbol]
    );
    return parseInt(result?.count || '0', 10) > 0;
  }

  /**
   * Get seeded history statistics for a symbol
   */
  async getSeededHistoryStats(otcSymbol: string): Promise<{
    count: number;
    oldest: Date | null;
    newest: Date | null;
  }> {
    const result = await queryOne<{ count: string; oldest: Date; newest: Date }>(
      `SELECT
         COUNT(*) as count,
         MIN(timestamp) as oldest,
         MAX(timestamp) as newest
       FROM "OTCPriceHistory"
       WHERE symbol = $1 AND "priceMode" = 'SEEDED'`,
      [otcSymbol]
    );

    return {
      count: parseInt(result?.count || '0', 10),
      oldest: result?.oldest || null,
      newest: result?.newest || null,
    };
  }

  /**
   * Fetch historical candles from Binance
   */
  private async fetchFromBinance(
    baseSymbol: string,
    resolution: number,
    count: number
  ): Promise<SeededCandle[]> {
    try {
      const interval = BinanceService.resolutionToInterval(resolution);

      const klines = await binanceService.getHistoricalKlines(baseSymbol, interval, count);

      logger.info(`[OTCHistorySeeder] Fetched ${klines.length} candles from Binance for ${baseSymbol}`);

      return klines.map(k => ({
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: Math.round(k.volume),
      }));
    } catch (error) {
      logger.error(`[OTCHistorySeeder] Binance fetch failed for ${baseSymbol}:`, error);
      return [];
    }
  }

  /**
   * Fetch historical candles from Deriv
   */
  private async fetchFromDeriv(
    baseSymbol: string,
    resolution: number,
    count: number
  ): Promise<SeededCandle[]> {
    try {
      const candles = await derivService.getHistoricalCandles(baseSymbol, resolution, count);

      logger.info(`[OTCHistorySeeder] Fetched ${candles.length} candles from Deriv for ${baseSymbol}`);

      return candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: 0,
      }));
    } catch (error) {
      logger.error(`[OTCHistorySeeder] Deriv fetch failed for ${baseSymbol}:`, error);
      return [];
    }
  }

  /**
   * Fetch Forex candles from Binance as fallback (for weekends when Deriv is unavailable)
   * Uses stablecoin pairs like EURUSDT as proxy for EUR/USD
   */
  private async fetchForexFromBinanceFallback(
    baseSymbol: string,
    resolution: number,
    count: number
  ): Promise<SeededCandle[]> {
    try {
      // Get Binance symbol for this Forex pair
      const binanceSymbol = FOREX_TO_BINANCE_FALLBACK[baseSymbol];

      if (!binanceSymbol) {
        logger.warn(`[OTCHistorySeeder] No Binance fallback mapping for ${baseSymbol}`);
        return [];
      }

      logger.info(`[OTCHistorySeeder] Using Binance fallback: ${baseSymbol} -> ${binanceSymbol}`);

      const interval = BinanceService.resolutionToInterval(resolution);
      const klines = await binanceService.getHistoricalKlines(binanceSymbol, interval, count);

      if (klines.length === 0) {
        logger.warn(`[OTCHistorySeeder] Binance fallback returned no data for ${binanceSymbol}`);
        return [];
      }

      logger.info(`[OTCHistorySeeder] Fetched ${klines.length} candles from Binance fallback for ${baseSymbol} (via ${binanceSymbol})`);

      // For stablecoin pairs like EURUSDT, the price IS the forex rate
      // No adjustment needed for EUR/USD, GBP/USD, AUD/USD etc.
      return klines.map(k => ({
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: Math.round(k.volume),
      }));
    } catch (error) {
      logger.error(`[OTCHistorySeeder] Binance fallback fetch failed for ${baseSymbol}:`, error);
      return [];
    }
  }

  /**
   * Insert candles into OTCPriceHistory table
   * Candles are TIME-SHIFTED so the last candle ends at current time
   * This ensures seamless continuation when OTC generator starts
   */
  private async insertCandles(
    configId: string,
    symbol: string,
    candles: SeededCandle[],
    resolution: number
  ): Promise<number> {
    if (candles.length === 0) return 0;

    // CRITICAL: Time-shift candles so the LAST candle ends at current time
    // This prevents gaps between seeded history and OTC-generated data
    const now = Math.floor(Date.now() / 1000);
    const lastCandleOriginalTime = candles[candles.length - 1].time;
    const timeOffset = now - lastCandleOriginalTime - resolution; // End one candle before now

    const oldestTime = new Date((candles[0].time + timeOffset) * 1000);
    const newestTime = new Date((candles[candles.length - 1].time + timeOffset) * 1000);
    logger.info(`[OTCHistorySeeder] Storing ${candles.length} candles for ${symbol}`);
    logger.info(`[OTCHistorySeeder] Time-shifted range: ${oldestTime.toISOString()} to ${newestTime.toISOString()}`);
    logger.info(`[OTCHistorySeeder] Time offset applied: ${Math.round(timeOffset / 60)} minutes`);

    // Insert in batches to avoid query length limits
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < candles.length; i += batchSize) {
      const batchCandles = candles.slice(i, i + batchSize);
      const batchValues: string[] = [];
      const batchParams: any[] = [];
      let batchParamIndex = 1;

      for (const candle of batchCandles) {
        // Apply time offset so candles end at current time
        const timestamp = new Date((candle.time + timeOffset) * 1000);
        const midPrice = (candle.open + candle.close) / 2;
        const spreadPercent = 0.0001;
        const spread = midPrice * spreadPercent;

        batchValues.push(`(
          $${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++},
          $${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++},
          $${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++}, $${batchParamIndex++},
          $${batchParamIndex++}
        )`);

        batchParams.push(
          randomUUID(),
          configId,
          symbol,
          midPrice,
          midPrice - spread / 2,
          midPrice + spread / 2,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume || 0,
          'SEEDED',
          timestamp
        );
      }

      await query(`
        INSERT INTO "OTCPriceHistory" (
          id, "configId", symbol, price, bid, ask,
          open, high, low, close, volume, "priceMode", timestamp
        ) VALUES ${batchValues.join(', ')}
        ON CONFLICT DO NOTHING
      `, batchParams);

      inserted += batchCandles.length;
    }

    return inserted;
  }

  /**
   * Convert resolution in seconds to Binance interval string
   */
  private resolutionToInterval(resolutionSeconds: number): string {
    if (resolutionSeconds < 60) return '1m';
    if (resolutionSeconds < 180) return '1m';
    if (resolutionSeconds < 300) return '3m';
    if (resolutionSeconds < 900) return '5m';
    if (resolutionSeconds < 1800) return '15m';
    if (resolutionSeconds < 3600) return '30m';
    if (resolutionSeconds < 7200) return '1h';
    if (resolutionSeconds < 14400) return '2h';
    if (resolutionSeconds < 28800) return '4h';
    if (resolutionSeconds < 43200) return '6h';
    if (resolutionSeconds < 86400) return '12h';
    return '1d';
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const otcHistorySeeder = new OTCHistorySeeder();
export { OTCHistorySeeder };
export type { SeedResult, SeedOptions };
