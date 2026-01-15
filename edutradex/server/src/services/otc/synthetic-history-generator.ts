/**
 * Synthetic History Generator Service
 *
 * Generates synthetic historical candles using the same algorithm as the live
 * OTC price generator. This ensures consistent movement patterns between
 * historical and live data - no visible discontinuity.
 *
 * Key Features:
 * - Backwards generation from anchor price (current price)
 * - Same wave/pullback/noise patterns as live OTC
 * - Non-destructive (adds behind existing data)
 * - Production-ready with proper error handling
 *
 * @author Senior Developer
 * @version 1.0.0
 */

import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';
import {
  SyntheticGeneratorConfig,
  SyntheticWaveState,
  SyntheticCandle,
  SyntheticGenerationResult,
  SyntheticGenerationOptions,
  AnchorPoint,
  OTCConfigRow,
} from './types.js';

// ============================================================================
// CONFIGURATION CONSTANTS (Must match otc-price-generator.ts)
// ============================================================================

/**
 * Wave configuration - controls trend behavior
 * MUST match live OTC generator for consistency
 */
const WAVE_CONFIG = {
  LENGTH_MIN: 15,
  LENGTH_MAX: 100,
  PIPS_MIN: 8,
  PIPS_MAX: 45,
  CONTINUATION_PROB: 0.42,
} as const;

/**
 * Pullback configuration - natural counter-trend moves
 */
const PULLBACK_CONFIG = {
  PROBABILITY: 0.22,
  LENGTH_MIN: 2,
  LENGTH_MAX: 5,
  STRENGTH: 0.45,
} as const;

/**
 * Candle size distribution
 * Distribution: 40% small, 45% medium, 15% large
 */
const CANDLE_SIZE_CONFIG = {
  SMALL: { min: 0.25, max: 0.55, probability: 0.40 },
  MEDIUM: { min: 0.55, max: 1.15, probability: 0.45 },
  LARGE: { min: 1.15, max: 2.20, probability: 0.15 },
  NOISE_FACTOR: 0.25,
  NOISE_MIN: 0.4,
  NOISE_MAX: 1.6,
} as const;

/**
 * Market-specific parameters
 */
const MARKET_PARAMS: Record<string, { moveMultiplier: number; pullbackProb: number }> = {
  FOREX: { moveMultiplier: 0.85, pullbackProb: 0.24 },
  CRYPTO: { moveMultiplier: 15.0, pullbackProb: 0.26 },
};

/**
 * Default prices for symbols (fallback)
 */
const DEFAULT_PRICES: Record<string, number> = {
  'EUR/USD': 1.0850,
  'GBP/USD': 1.2650,
  'USD/JPY': 150.50,
  'AUD/USD': 0.6550,
  'USD/CAD': 1.3550,
  'BTC/USD': 95000,
  'ETH/USD': 3400,
  'SOL/USD': 180,
  'XRP/USD': 2.20,
  'BNB/USD': 680,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function gaussianRandom(): number {
  let u1: number;
  let u2: number;
  do {
    u1 = Math.random();
    u2 = Math.random();
  } while (u1 === 0);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTick(price: number, pipSize: number): number {
  return Math.round(price / pipSize) * pipSize;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

class SyntheticHistoryGenerator {
  /**
   * Generate synthetic history for a single OTC symbol
   * Adds candles BEHIND existing data (non-destructive)
   */
  async generateForSymbol(
    otcSymbol: string,
    options: SyntheticGenerationOptions = {}
  ): Promise<SyntheticGenerationResult> {
    const startTime = Date.now();
    const { candleCount = 500, resolutionSeconds = 60 } = options;

    // Step 1: Get OTC configuration
    const config = await this.getOTCConfig(otcSymbol);
    if (!config) {
      throw new Error(`OTC config not found for symbol: ${otcSymbol}`);
    }

    logger.info(`[SyntheticHistory] Generating ${candleCount} candles for ${otcSymbol}`);

    // Step 2: Find anchor point (where to generate backwards from)
    const anchor = await this.findAnchorPoint(otcSymbol, config);
    logger.info(`[SyntheticHistory] Anchor: ${anchor.price} at ${anchor.timestamp.toISOString()} (${anchor.source})`);

    // Step 3: Build generator config
    const generatorConfig: SyntheticGeneratorConfig = {
      symbol: otcSymbol,
      anchorPrice: anchor.price,
      anchorTimestamp: anchor.timestamp,
      candleCount,
      resolutionSeconds,
      marketType: config.marketType as 'FOREX' | 'CRYPTO',
      pipSize: config.pipSize,
      baseVolatility: config.baseVolatility,
    };

    // Step 4: Generate synthetic candles backwards
    const candles = this.generateCandlesBackwards(generatorConfig);

    // Step 5: Insert candles into database (non-destructive)
    const insertedCount = await this.insertCandles(config.id, otcSymbol, candles);

    // Step 6: Calculate statistics
    const prices = candles.map(c => c.close);
    const result: SyntheticGenerationResult = {
      symbol: otcSymbol,
      candlesGenerated: insertedCount,
      oldestTimestamp: candles[0].timestamp,
      newestTimestamp: candles[candles.length - 1].timestamp,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      anchorPrice: anchor.price,
      executionTimeMs: Date.now() - startTime,
    };

    logger.info(`[SyntheticHistory] Generated ${insertedCount} candles for ${otcSymbol} in ${result.executionTimeMs}ms`);
    logger.info(`[SyntheticHistory] Price range: ${result.priceRange.min.toFixed(5)} - ${result.priceRange.max.toFixed(5)}`);

    return result;
  }

  /**
   * Generate synthetic history for all enabled OTC symbols
   */
  async generateForAllSymbols(
    options: SyntheticGenerationOptions = {}
  ): Promise<{
    totalSymbols: number;
    successful: number;
    failed: number;
    results: SyntheticGenerationResult[];
    errors: Array<{ symbol: string; error: string }>;
  }> {
    const configs = await queryMany<OTCConfigRow>(
      `SELECT * FROM "OTCConfig" WHERE "isEnabled" = true`
    );

    logger.info(`[SyntheticHistory] Generating for ${configs.length} enabled OTC symbols`);

    const results: SyntheticGenerationResult[] = [];
    const errors: Array<{ symbol: string; error: string }> = [];

    for (const config of configs) {
      try {
        const result = await this.generateForSymbol(config.symbol, options);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[SyntheticHistory] Failed for ${config.symbol}: ${errorMessage}`);
        errors.push({ symbol: config.symbol, error: errorMessage });
      }
    }

    return {
      totalSymbols: configs.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Get OTC configuration from database
   */
  private async getOTCConfig(symbol: string): Promise<OTCConfigRow | null> {
    return queryOne<OTCConfigRow>(
      `SELECT * FROM "OTCConfig" WHERE symbol = $1`,
      [symbol]
    );
  }

  /**
   * Find the anchor point for backwards generation
   * Priority: Oldest existing candle > Current live price > Default price
   */
  private async findAnchorPoint(symbol: string, config: OTCConfigRow): Promise<AnchorPoint> {
    // First: Check for oldest existing history candle
    const oldestCandle = await queryOne<{ timestamp: Date; close: number }>(
      `SELECT timestamp, close FROM "OTCPriceHistory"
       WHERE symbol = $1
       ORDER BY timestamp ASC
       LIMIT 1`,
      [symbol]
    );

    if (oldestCandle) {
      return {
        price: oldestCandle.close,
        timestamp: new Date(oldestCandle.timestamp),
        source: 'EXISTING_HISTORY',
      };
    }

    // Second: Try to get current live price from OTC market service
    // We'll use the most recent price if available
    const latestPrice = await queryOne<{ close: number }>(
      `SELECT close FROM "OTCPriceHistory"
       WHERE symbol = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [symbol]
    );

    if (latestPrice) {
      return {
        price: latestPrice.close,
        timestamp: new Date(),
        source: 'LIVE_PRICE',
      };
    }

    // Third: Use default price based on base symbol
    const defaultPrice = DEFAULT_PRICES[config.baseSymbol] || 1.0;
    return {
      price: defaultPrice,
      timestamp: new Date(),
      source: 'DEFAULT',
    };
  }

  /**
   * Core algorithm: Generate candles backwards from anchor price
   * Uses same wave/pullback logic as live OTC for consistency
   */
  private generateCandlesBackwards(config: SyntheticGeneratorConfig): SyntheticCandle[] {
    const candles: SyntheticCandle[] = [];
    const marketParams = MARKET_PARAMS[config.marketType] || MARKET_PARAMS.FOREX;

    // Initialize wave state
    let waveState = this.createNewWave();
    let currentClose = config.anchorPrice;

    // Generate candles (will be in reverse order, newest first)
    for (let i = 0; i < config.candleCount; i++) {
      // Process wave state (pullbacks, wave completion)
      waveState = this.processWaveState(waveState, marketParams.pullbackProb);

      // Determine movement direction for this candle
      const direction = this.getEffectiveDirection(waveState);

      // Calculate movement size (in pips)
      const movePips = this.calculateMovementSize(marketParams.moveMultiplier);

      // Apply pullback reduction if active
      const adjustedMovePips = waveState.inPullback
        ? movePips * PULLBACK_CONFIG.STRENGTH
        : movePips;

      // Calculate price movement
      const priceMovement = adjustedMovePips * config.pipSize;

      // Generate OHLC working backwards
      // We know CLOSE, calculate OPEN based on direction
      const { open, high, low } = this.generateOHLCBackwards(
        currentClose,
        direction,
        priceMovement,
        config.pipSize
      );

      // Generate realistic volume
      const volume = this.generateVolume(high - low, config.pipSize);

      // Store candle (timestamp will be assigned later)
      candles.push({
        timestamp: new Date(), // Placeholder
        open: roundToTick(open, config.pipSize),
        high: roundToTick(high, config.pipSize),
        low: roundToTick(low, config.pipSize),
        close: roundToTick(currentClose, config.pipSize),
        volume,
      });

      // Move reference backwards: next candle's CLOSE is this candle's OPEN
      currentClose = open;

      // Update wave progress
      waveState.progressPips += adjustedMovePips * direction;
      waveState.remainingCandles--;
    }

    // Reverse array so oldest candle is first
    candles.reverse();

    // Assign timestamps (working backwards from anchor)
    this.assignTimestamps(candles, config.anchorTimestamp, config.resolutionSeconds);

    return candles;
  }

  /**
   * Create new wave with random parameters
   */
  private createNewWave(): SyntheticWaveState {
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    return {
      direction,
      remainingCandles: randomInt(WAVE_CONFIG.LENGTH_MIN, WAVE_CONFIG.LENGTH_MAX),
      targetPips: randomFloat(WAVE_CONFIG.PIPS_MIN, WAVE_CONFIG.PIPS_MAX),
      progressPips: 0,
      inPullback: false,
      pullbackRemaining: 0,
      pullbackDirection: direction,
    };
  }

  /**
   * Process wave state (check for completion, pullbacks)
   */
  private processWaveState(
    state: SyntheticWaveState,
    pullbackProb: number
  ): SyntheticWaveState {
    // Handle active pullback
    if (state.inPullback) {
      state.pullbackRemaining--;
      if (state.pullbackRemaining <= 0) {
        state.inPullback = false;
      }
      return state;
    }

    // Check for wave completion
    const waveComplete =
      state.remainingCandles <= 0 ||
      Math.abs(state.progressPips) >= state.targetPips;

    if (waveComplete) {
      // Start new wave
      const continueDirection = Math.random() < WAVE_CONFIG.CONTINUATION_PROB;
      const newDirection: 1 | -1 = continueDirection
        ? state.direction
        : ((state.direction * -1) as 1 | -1);

      return {
        direction: newDirection,
        remainingCandles: randomInt(WAVE_CONFIG.LENGTH_MIN, WAVE_CONFIG.LENGTH_MAX),
        targetPips: randomFloat(WAVE_CONFIG.PIPS_MIN, WAVE_CONFIG.PIPS_MAX),
        progressPips: 0,
        inPullback: false,
        pullbackRemaining: 0,
        pullbackDirection: newDirection,
      };
    }

    // Random chance to start pullback
    if (Math.random() < pullbackProb) {
      state.inPullback = true;
      state.pullbackRemaining = randomInt(PULLBACK_CONFIG.LENGTH_MIN, PULLBACK_CONFIG.LENGTH_MAX);
      state.pullbackDirection = (state.direction * -1) as 1 | -1;
    }

    return state;
  }

  /**
   * Get effective direction considering pullbacks
   */
  private getEffectiveDirection(state: SyntheticWaveState): 1 | -1 {
    if (state.inPullback) {
      return state.pullbackDirection;
    }
    return state.direction;
  }

  /**
   * Calculate movement size with proper distribution
   */
  private calculateMovementSize(moveMultiplier: number): number {
    const rand = Math.random();
    const cs = CANDLE_SIZE_CONFIG;

    let basePips: number;

    if (rand < cs.SMALL.probability) {
      basePips = randomFloat(cs.SMALL.min, cs.SMALL.max);
    } else if (rand < cs.SMALL.probability + cs.MEDIUM.probability) {
      basePips = randomFloat(cs.MEDIUM.min, cs.MEDIUM.max);
    } else {
      basePips = randomFloat(cs.LARGE.min, cs.LARGE.max);
    }

    // Apply Gaussian noise
    const noise = 1 + gaussianRandom() * cs.NOISE_FACTOR;
    const clampedNoise = clamp(noise, cs.NOISE_MIN, cs.NOISE_MAX);

    return basePips * moveMultiplier * clampedNoise;
  }

  /**
   * Generate OHLC working backwards from known CLOSE
   */
  private generateOHLCBackwards(
    close: number,
    direction: 1 | -1,
    priceMovement: number,
    pipSize: number
  ): { open: number; high: number; low: number } {
    let open: number;
    let high: number;
    let low: number;

    // Calculate wicks (random but proportional)
    const upperWickRatio = randomFloat(0.1, 0.4);
    const lowerWickRatio = randomFloat(0.1, 0.4);

    if (direction === 1) {
      // UP candle: price went up, so OPEN < CLOSE
      open = close - priceMovement;
      high = close + priceMovement * upperWickRatio;
      low = open - priceMovement * lowerWickRatio;
    } else {
      // DOWN candle: price went down, so OPEN > CLOSE
      open = close + priceMovement;
      high = open + priceMovement * upperWickRatio;
      low = close - priceMovement * lowerWickRatio;
    }

    // Ensure valid OHLC (high >= open/close, low <= open/close)
    high = Math.max(high, open, close);
    low = Math.min(low, open, close);

    // Ensure minimum candle body
    if (Math.abs(open - close) < pipSize) {
      if (direction === 1) {
        open = close - pipSize;
      } else {
        open = close + pipSize;
      }
    }

    return { open, high, low };
  }

  /**
   * Generate realistic volume based on candle range
   */
  private generateVolume(range: number, pipSize: number): number {
    const rangePips = range / pipSize;
    const baseVolume = 50 + rangePips * 10;
    return Math.round(baseVolume * randomFloat(0.7, 1.3));
  }

  /**
   * Assign timestamps to candles (backwards from anchor)
   */
  private assignTimestamps(
    candles: SyntheticCandle[],
    anchorTimestamp: Date,
    resolutionSeconds: number
  ): void {
    const anchorTime = anchorTimestamp.getTime();
    const resolutionMs = resolutionSeconds * 1000;

    // Candles are already in chronological order (oldest first)
    // Calculate start time so last candle ends just before anchor
    const totalDuration = candles.length * resolutionMs;
    const startTime = anchorTime - totalDuration;

    for (let i = 0; i < candles.length; i++) {
      candles[i].timestamp = new Date(startTime + i * resolutionMs);
    }
  }

  /**
   * Insert synthetic candles into database (non-destructive)
   * Uses ON CONFLICT DO NOTHING to prevent duplicates
   */
  private async insertCandles(
    configId: string,
    symbol: string,
    candles: SyntheticCandle[]
  ): Promise<number> {
    if (candles.length === 0) return 0;

    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < candles.length; i += batchSize) {
      const batch = candles.slice(i, i + batchSize);
      const values: string[] = [];
      const params: (string | number | Date)[] = [];
      let paramIndex = 1;

      for (const candle of batch) {
        const midPrice = (candle.open + candle.close) / 2;
        const spread = midPrice * 0.0001;

        values.push(`(
          $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
          $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
          $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
          $${paramIndex++}
        )`);

        params.push(
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
          candle.volume,
          'SYNTHETIC',
          candle.timestamp
        );
      }

      try {
        await query(`
          INSERT INTO "OTCPriceHistory" (
            id, "configId", symbol, price, bid, ask,
            open, high, low, close, volume, "priceMode", timestamp
          ) VALUES ${values.join(', ')}
          ON CONFLICT DO NOTHING
        `, params);

        totalInserted += batch.length;
      } catch (error) {
        logger.error(`[SyntheticHistory] Batch insert failed:`, error);
      }
    }

    return totalInserted;
  }

  /**
   * Check if symbol already has synthetic history
   */
  async hasSyntheticHistory(symbol: string): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "OTCPriceHistory"
       WHERE symbol = $1 AND "priceMode" = 'SYNTHETIC'`,
      [symbol]
    );
    return parseInt(result?.count || '0', 10) > 0;
  }

  /**
   * Get synthetic history statistics for a symbol
   */
  async getSyntheticHistoryStats(symbol: string): Promise<{
    count: number;
    oldest: Date | null;
    newest: Date | null;
    priceRange: { min: number; max: number } | null;
  }> {
    const result = await queryOne<{
      count: string;
      oldest: Date;
      newest: Date;
      min_price: number;
      max_price: number;
    }>(
      `SELECT
         COUNT(*) as count,
         MIN(timestamp) as oldest,
         MAX(timestamp) as newest,
         MIN(close) as min_price,
         MAX(close) as max_price
       FROM "OTCPriceHistory"
       WHERE symbol = $1 AND "priceMode" = 'SYNTHETIC'`,
      [symbol]
    );

    const count = parseInt(result?.count || '0', 10);

    return {
      count,
      oldest: result?.oldest || null,
      newest: result?.newest || null,
      priceRange: count > 0 && result
        ? { min: result.min_price, max: result.max_price }
        : null,
    };
  }

  /**
   * Clear synthetic history for a symbol (if needed to regenerate)
   */
  async clearSyntheticHistory(symbol: string): Promise<number> {
    const result = await query(
      `DELETE FROM "OTCPriceHistory"
       WHERE symbol = $1 AND "priceMode" = 'SYNTHETIC'`,
      [symbol]
    );
    return result?.rowCount || 0;
  }
}

// Export singleton instance
export const syntheticHistoryGenerator = new SyntheticHistoryGenerator();
export { SyntheticHistoryGenerator };
