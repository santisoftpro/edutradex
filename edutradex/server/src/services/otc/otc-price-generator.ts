/**
 * OTC Price Generator V6 - Production Grade
 *
 * A robust, unpredictable price generation system for OTC markets.
 * Designed with senior-level architecture patterns:
 *
 * - Clean separation of concerns
 * - Type-safe implementation
 * - Defensive programming
 * - Configurable parameters
 * - No magic numbers
 * - Proper error handling
 * - Mathematically sound algorithms
 *
 * @author Senior Developer
 * @version 6.0.0
 */

import { logger } from '../../utils/logger.js';
import {
  OTCPriceConfig,
  PriceState,
  OTCPriceTick,
  PriceMode,
  IOTCPriceGenerator
} from './types.js';
import { manualControlService } from './manual-control.service.js';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Wave configuration - controls trend behavior
 * Wider ranges = more unpredictability
 */
const WAVE_CONFIG = {
  LENGTH_MIN: 15,           // Minimum ticks per wave
  LENGTH_MAX: 100,          // Maximum ticks per wave
  PIPS_MIN: 8,              // Minimum pips target per wave
  PIPS_MAX: 45,             // Maximum pips target per wave
  CONTINUATION_PROB: 0.42,  // Probability wave continues same direction (< 0.5 for unpredictability)
} as const;

/**
 * Unpredictability mechanisms - key to preventing pattern exploitation
 */
const UNPREDICTABILITY_CONFIG = {
  MICRO_REVERSAL_PROB: 0.12,    // Chance of sudden direction change per tick
  FAKE_OUT_PROB: 0.06,          // Chance of trap move (multi-tick reversal)
  FAKE_OUT_LENGTH_MIN: 3,       // Minimum fake-out duration
  FAKE_OUT_LENGTH_MAX: 7,       // Maximum fake-out duration
  ANTI_PATTERN_THRESHOLD: 4,    // Max same-direction moves before forced reversal
  ANTI_PATTERN_BASE_PROB: 0.08, // Base probability increase per same-direction move
} as const;

/**
 * Pullback configuration - natural counter-trend moves
 */
const PULLBACK_CONFIG = {
  PROBABILITY: 0.22,      // Chance of pullback occurring
  LENGTH_MIN: 2,          // Minimum pullback duration
  LENGTH_MAX: 5,          // Maximum pullback duration
  STRENGTH: 0.45,         // Pullback move size multiplier
} as const;

/**
 * Candle size distribution - controls price movement magnitude
 * Distribution: 40% small, 45% medium, 15% large
 */
const CANDLE_SIZE_CONFIG = {
  SMALL: { min: 0.25, max: 0.55, probability: 0.40 },
  MEDIUM: { min: 0.55, max: 1.15, probability: 0.45 },
  LARGE: { min: 1.15, max: 2.20, probability: 0.15 },
  NOISE_FACTOR: 0.25,     // Gaussian noise multiplier
  NOISE_MIN: 0.4,         // Minimum noise clamp
  NOISE_MAX: 1.6,         // Maximum noise clamp
} as const;

/**
 * Market parameters interface
 */
interface MarketParams {
  moveMultiplier: number;
  waveBias: number;
  pullbackProb: number;
}

/**
 * Market type specific parameters
 * Lower wave bias = more unpredictable direction
 *
 * Note: Crypto moveMultiplier is higher because crypto assets have high prices
 * (BTC ~$95000) but small pipSize ($0.01), so we need larger multiplier
 * to get visible percentage changes.
 */
const MARKET_PARAMS: Record<string, MarketParams> = {
  FOREX: {
    moveMultiplier: 0.85,     // Base pip multiplier for forex
    waveBias: 0.54,           // Probability of following wave direction
    pullbackProb: 0.24,       // Market-specific pullback probability
  },
  CRYPTO: {
    moveMultiplier: 15.0,     // Higher multiplier for visible % change on high-priced assets
    waveBias: 0.51,           // Even more unpredictable for crypto
    pullbackProb: 0.26,
  },
};

/**
 * Timing configuration
 */
const TIMING_CONFIG = {
  BASE_TICK_INTERVAL: 500,    // Base milliseconds between ticks
  TICK_VARIANCE: 120,         // Random variance in tick timing
  PRICE_HISTORY_SIZE: 300,    // Number of prices to keep in history
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Wave state tracking - manages trend behavior
 */
interface WaveState {
  direction: 1 | -1;
  targetPips: number;
  progressPips: number;
  remainingTicks: number;
  startPrice: number;
  inPullback: boolean;
  pullbackRemaining: number;
  pullbackDirection: 1 | -1;
  inFakeOut: boolean;
  fakeOutRemaining: number;
  fakeOutOriginalDir: 1 | -1;
}

/**
 * Extended price state with all tracking data
 */
interface ExtendedPriceState extends PriceState {
  wave: WaveState;
  candle: {
    open: number;
    high: number;
    low: number;
    tickCount: number;
  };
  timing: {
    nextTickDelay: number;
    lastTickTime: number;
  };
  antiPattern: {
    lastDirection: 1 | -1;
    sameDirectionCount: number;
  };
}

// MarketType is handled via MarketParams interface

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a random integer between min and max (inclusive)
 * Uses Math.random() which is sufficient for price generation
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min and max
 */
function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generates a Gaussian (normal) distributed random number
 * Uses Box-Muller transform for natural-looking variations
 */
function gaussianRandom(): number {
  let u1: number;
  let u2: number;

  // Avoid log(0)
  do {
    u1 = Math.random();
    u2 = Math.random();
  } while (u1 === 0);

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rounds price to pip precision
 */
function roundToTick(price: number, pipSize: number): number {
  return Math.round(price / pipSize) * pipSize;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class OTCPriceGenerator implements IOTCPriceGenerator {
  private priceStates: Map<string, ExtendedPriceState> = new Map();
  private configs: Map<string, OTCPriceConfig> = new Map();

  // ==========================================================================
  // PUBLIC INTERFACE
  // ==========================================================================

  /**
   * Initialize a new symbol for price generation
   */
  initializeSymbol(config: OTCPriceConfig, initialPrice: number): void {
    if (!config || !config.symbol) {
      logger.error('[OTC] Cannot initialize symbol: invalid config');
      return;
    }

    if (initialPrice <= 0 || !Number.isFinite(initialPrice)) {
      logger.error(`[OTC] Cannot initialize ${config.symbol}: invalid initial price ${initialPrice}`);
      return;
    }

    const state = this.createInitialState(config.symbol, initialPrice, config.baseVolatility);

    this.priceStates.set(config.symbol, state);
    this.configs.set(config.symbol, config);

    logger.info(`[OTC] Price generator initialized for ${config.symbol} at ${initialPrice}`);
  }

  /**
   * Generate the next price tick for a symbol
   * Returns null if not ready for next tick or symbol not found
   */
  generateNextPrice(symbol: string): OTCPriceTick | null {
    const state = this.priceStates.get(symbol);
    const config = this.configs.get(symbol);

    if (!state || !config) {
      return null;
    }

    const now = Date.now();

    // Rate limiting - don't generate too fast
    if (now - state.lastUpdate < state.timing.nextTickDelay) {
      return null;
    }

    // Check for manual price override from admin
    const manualOverride = manualControlService.getPriceOverride(symbol);
    if (manualOverride !== null) {
      return this.applyManualOverride(symbol, manualOverride, state, config, now);
    }

    // Generate organic price movement
    return this.generateOrganicPrice(symbol, state, config, now);
  }

  /**
   * Get current OHLC data for candle formation
   */
  getCandleOHLC(symbol: string): { open: number; high: number; low: number; close: number; tickCount: number } | null {
    const state = this.priceStates.get(symbol);
    if (!state) return null;

    return {
      open: state.candle.open,
      high: state.candle.high,
      low: state.candle.low,
      close: state.currentPrice,
      tickCount: state.candle.tickCount,
    };
  }

  /**
   * Reset candle tracking for new period
   */
  resetCandle(symbol: string): void {
    const state = this.priceStates.get(symbol);
    if (!state) return;

    state.candle.open = state.currentPrice;
    state.candle.high = state.currentPrice;
    state.candle.low = state.currentPrice;
    state.candle.tickCount = 0;
  }

  /**
   * Update reference price for bounds calculation
   * Called periodically to keep OTC within range of real market
   */
  updateRealPrice(symbol: string, realPrice: number): void {
    const state = this.priceStates.get(symbol);
    if (state && Number.isFinite(realPrice) && realPrice > 0) {
      state.lastRealPrice = realPrice;
    }
  }

  /**
   * Get price based directly on real market (for REAL mode)
   */
  getRealBasedPrice(symbol: string, realPrice: number): OTCPriceTick | null {
    const config = this.configs.get(symbol);
    const state = this.priceStates.get(symbol);

    if (!config || !state) return null;

    // Add small random noise to real price
    const noise = (Math.random() - 0.5) * 2 * config.pipSize;
    const price = realPrice + noise;

    state.lastRealPrice = realPrice;
    state.currentPrice = price;
    state.lastUpdate = Date.now();

    this.updateCandleTracking(state, price);

    return this.createPriceTick(symbol, price, config, state, 'REAL');
  }

  getCurrentPrice(symbol: string): number | null {
    return this.priceStates.get(symbol)?.currentPrice ?? null;
  }

  getState(symbol: string): PriceState | null {
    return this.priceStates.get(symbol) ?? null;
  }

  getExtendedState(symbol: string): ExtendedPriceState | null {
    return this.priceStates.get(symbol) ?? null;
  }

  generateVolume(symbol: string): number {
    const state = this.priceStates.get(symbol);
    const config = this.configs.get(symbol);

    if (!state || !config) return 10;

    const priceRange = state.candle.high - state.candle.low;
    const rangePips = priceRange / config.pipSize;
    const baseVolume = 50 + rangePips * 10;

    return Math.round(baseVolume * randomFloat(0.7, 1.3));
  }

  getActiveSymbols(): string[] {
    return Array.from(this.priceStates.keys());
  }

  hasSymbol(symbol: string): boolean {
    return this.priceStates.has(symbol);
  }

  removeSymbol(symbol: string): void {
    this.priceStates.delete(symbol);
    this.configs.delete(symbol);
  }

  updateConfig(symbol: string, updates: Partial<OTCPriceConfig>): void {
    const existing = this.configs.get(symbol);
    if (existing) {
      this.configs.set(symbol, { ...existing, ...updates });
    }
  }

  /**
   * Admin control: Force price impulse in a direction
   */
  forceImpulse(symbol: string, direction: 'up' | 'down', duration = 20): void {
    const state = this.priceStates.get(symbol);
    const config = this.configs.get(symbol);

    if (state && config) {
      state.wave = this.createNewWave(state, config, direction === 'up' ? 1 : -1);
      state.wave.remainingTicks = duration;
    }
  }

  /**
   * Admin control: Force consolidation (low movement)
   */
  forceConsolidation(symbol: string, duration = 15): void {
    const state = this.priceStates.get(symbol);
    if (state) {
      state.wave.targetPips = 3;
      state.wave.remainingTicks = duration;
    }
  }

  // Stub methods for interface compatibility
  forceVolatilityEvent(): void {}
  setPriceMagnet(): void {}
  setTraderSentiment(): void {}
  getTraderSentiment() {
    return { upPercent: 50, downPercent: 50, lastUpdate: Date.now() };
  }

  // ==========================================================================
  // PRIVATE METHODS - Core Algorithm
  // ==========================================================================

  /**
   * Create initial state for a new symbol
   */
  private createInitialState(symbol: string, initialPrice: number, baseVolatility: number): ExtendedPriceState {
    const initialDirection: 1 | -1 = Math.random() > 0.5 ? 1 : -1;

    return {
      symbol,
      currentPrice: initialPrice,
      lastRealPrice: initialPrice,
      volatilityState: baseVolatility,
      momentum: 0,
      lastReturn: 0,
      lastUpdate: Date.now(),
      priceHistory: [initialPrice],
      wave: {
        direction: initialDirection,
        targetPips: randomFloat(WAVE_CONFIG.PIPS_MIN, WAVE_CONFIG.PIPS_MAX),
        progressPips: 0,
        remainingTicks: randomInt(WAVE_CONFIG.LENGTH_MIN, WAVE_CONFIG.LENGTH_MAX),
        startPrice: initialPrice,
        inPullback: false,
        pullbackRemaining: 0,
        pullbackDirection: initialDirection,
        inFakeOut: false,
        fakeOutRemaining: 0,
        fakeOutOriginalDir: initialDirection,
      },
      candle: {
        open: initialPrice,
        high: initialPrice,
        low: initialPrice,
        tickCount: 0,
      },
      timing: {
        nextTickDelay: TIMING_CONFIG.BASE_TICK_INTERVAL,
        lastTickTime: Date.now(),
      },
      antiPattern: {
        lastDirection: initialDirection,
        sameDirectionCount: 0,
      },
    };
  }

  /**
   * Main price generation algorithm
   */
  private generateOrganicPrice(
    symbol: string,
    state: ExtendedPriceState,
    config: OTCPriceConfig,
    now: number
  ): OTCPriceTick {
    const marketParams = this.getMarketParams(config.marketType);

    // Step 1: Process state machines (fake-out, pullback)
    this.processFakeOut(state);
    this.processPullback(state, marketParams);

    // Step 2: Determine movement direction
    let direction = this.determineDirection(state, marketParams);

    // Step 3: Apply unpredictability mechanisms
    direction = this.applyMicroReversal(direction);
    direction = this.applyAntiPattern(state, direction);

    // Step 4: Calculate movement size
    let movePips = this.calculateMoveSize(config, marketParams);

    // Step 5: Apply pullback reduction if active
    if (state.wave.inPullback) {
      movePips *= PULLBACK_CONFIG.STRENGTH;
    }

    // Step 6: Apply admin controls
    direction = this.applyAdminBias(symbol, direction);
    movePips *= manualControlService.getVolatilityMultiplier(symbol);

    // Step 7: Calculate new price with bounds
    const newPrice = this.calculateBoundedPrice(state, config, movePips, direction);

    // Step 8: Update all state
    this.updateState(state, config, newPrice, direction, movePips, now);

    return this.createPriceTick(symbol, newPrice, config, state, 'OTC');
  }

  /**
   * Get market-specific parameters
   * Handles case-insensitive lookup (database might store 'crypto' or 'CRYPTO')
   */
  private getMarketParams(marketType: string): MarketParams {
    const normalized = marketType?.toUpperCase() || 'FOREX';
    return MARKET_PARAMS[normalized] ?? MARKET_PARAMS.FOREX;
  }

  /**
   * Process fake-out state machine
   * Fake-outs create trap moves that reverse after a few ticks
   */
  private processFakeOut(state: ExtendedPriceState): void {
    const wave = state.wave;

    if (wave.inFakeOut) {
      wave.fakeOutRemaining--;

      if (wave.fakeOutRemaining <= 0) {
        // Fake-out complete - reverse to trap direction
        wave.inFakeOut = false;
        wave.direction = (wave.fakeOutOriginalDir * -1) as 1 | -1;
      }
      return;
    }

    // Random chance to start fake-out
    if (Math.random() < UNPREDICTABILITY_CONFIG.FAKE_OUT_PROB) {
      wave.inFakeOut = true;
      wave.fakeOutRemaining = randomInt(
        UNPREDICTABILITY_CONFIG.FAKE_OUT_LENGTH_MIN,
        UNPREDICTABILITY_CONFIG.FAKE_OUT_LENGTH_MAX
      );
      wave.fakeOutOriginalDir = wave.direction;
      wave.direction = (wave.direction * -1) as 1 | -1;
    }
  }

  /**
   * Process pullback state machine
   * Pullbacks create natural counter-trend movements
   */
  private processPullback(state: ExtendedPriceState, marketParams: MarketParams): void {
    const wave = state.wave;

    if (wave.inPullback) {
      wave.pullbackRemaining--;

      if (wave.pullbackRemaining <= 0) {
        wave.inPullback = false;
      }
      return;
    }

    // Random chance to start pullback
    const pullbackProb = marketParams.pullbackProb ?? PULLBACK_CONFIG.PROBABILITY;

    if (Math.random() < pullbackProb) {
      wave.inPullback = true;
      wave.pullbackRemaining = randomInt(PULLBACK_CONFIG.LENGTH_MIN, PULLBACK_CONFIG.LENGTH_MAX);
      wave.pullbackDirection = (wave.direction * -1) as 1 | -1;
    }
  }

  /**
   * Determine base movement direction
   */
  private determineDirection(state: ExtendedPriceState, marketParams: MarketParams): 1 | -1 {
    const wave = state.wave;

    // In fake-out - use current (reversed) wave direction
    if (wave.inFakeOut) {
      return wave.direction;
    }

    // In pullback - use pullback direction
    if (wave.inPullback) {
      return wave.pullbackDirection;
    }

    // Normal: wave bias determines if we follow trend or counter
    // Lower waveBias = more unpredictable
    if (Math.random() < marketParams.waveBias) {
      return wave.direction;
    }

    return (wave.direction * -1) as 1 | -1;
  }

  /**
   * Apply micro-reversal for sudden unpredictable changes
   */
  private applyMicroReversal(direction: 1 | -1): 1 | -1 {
    if (Math.random() < UNPREDICTABILITY_CONFIG.MICRO_REVERSAL_PROB) {
      return (direction * -1) as 1 | -1;
    }
    return direction;
  }

  /**
   * Apply anti-pattern logic to break predictable sequences
   * If price moves same direction too many times, force a reversal
   */
  private applyAntiPattern(state: ExtendedPriceState, direction: 1 | -1): 1 | -1 {
    const ap = state.antiPattern;

    if (ap.lastDirection === direction) {
      ap.sameDirectionCount++;

      // Increasing probability of reversal based on streak length
      const streakFactor = Math.max(0, ap.sameDirectionCount - UNPREDICTABILITY_CONFIG.ANTI_PATTERN_THRESHOLD);
      const reversalProb = streakFactor * UNPREDICTABILITY_CONFIG.ANTI_PATTERN_BASE_PROB;

      if (Math.random() < Math.min(0.7, reversalProb)) {
        ap.sameDirectionCount = 0;
        return (direction * -1) as 1 | -1;
      }
    } else {
      ap.sameDirectionCount = 1;
    }

    return direction;
  }

  /**
   * Calculate movement size with proper distribution
   */
  private calculateMoveSize(config: OTCPriceConfig, marketParams: MarketParams): number {
    const rand = Math.random();
    const cs = CANDLE_SIZE_CONFIG;

    let basePips: number;

    // Determine candle size category
    if (rand < cs.SMALL.probability) {
      basePips = randomFloat(cs.SMALL.min, cs.SMALL.max);
    } else if (rand < cs.SMALL.probability + cs.MEDIUM.probability) {
      basePips = randomFloat(cs.MEDIUM.min, cs.MEDIUM.max);
    } else {
      basePips = randomFloat(cs.LARGE.min, cs.LARGE.max);
    }

    // Apply Gaussian noise for natural variation
    const noise = 1 + gaussianRandom() * cs.NOISE_FACTOR;
    const clampedNoise = clamp(noise, cs.NOISE_MIN, cs.NOISE_MAX);

    return basePips * marketParams.moveMultiplier * clampedNoise;
  }

  /**
   * Apply admin direction bias
   */
  private applyAdminBias(symbol: string, direction: 1 | -1): 1 | -1 {
    const { bias, strength } = manualControlService.getDirectionBias(symbol);

    if (bias !== 0 && strength > 0) {
      // Bias influence scales with strength
      const biasInfluence = 0.5 + (Math.abs(bias) / 100) * strength * 0.35;

      if (Math.random() < biasInfluence) {
        return bias > 0 ? 1 : -1;
      }
    }

    return direction;
  }

  /**
   * Calculate new price with bounds enforcement
   */
  private calculateBoundedPrice(
    state: ExtendedPriceState,
    config: OTCPriceConfig,
    movePips: number,
    direction: 1 | -1
  ): number {
    // Calculate raw new price
    let newPrice = state.currentPrice + movePips * config.pipSize * direction;

    // Apply mean reversion if deviating too far from reference
    const deviation = state.lastRealPrice - state.currentPrice;
    const maxDeviation = state.lastRealPrice * (config.maxDeviationPercent / 100);

    if (Math.abs(deviation) > maxDeviation * 0.5) {
      // Gentle pull back toward reference (2% of deviation)
      newPrice += deviation * 0.02;
    }

    // Hard bounds - never exceed max deviation
    const upperBound = state.lastRealPrice * (1 + config.maxDeviationPercent / 100);
    const lowerBound = state.lastRealPrice * (1 - config.maxDeviationPercent / 100);

    if (newPrice > upperBound) {
      newPrice = upperBound - randomFloat(0, 5) * config.pipSize;
    } else if (newPrice < lowerBound) {
      newPrice = lowerBound + randomFloat(0, 5) * config.pipSize;
    }

    return roundToTick(newPrice, config.pipSize);
  }

  /**
   * Update all state after price generation
   */
  private updateState(
    state: ExtendedPriceState,
    config: OTCPriceConfig,
    newPrice: number,
    direction: 1 | -1,
    movePips: number,
    now: number
  ): void {
    const prevPrice = state.currentPrice;

    // Update price state
    state.currentPrice = newPrice;
    state.lastReturn = prevPrice > 0 ? (newPrice - prevPrice) / prevPrice : 0;
    state.lastUpdate = now;

    // Update anti-pattern tracking
    state.antiPattern.lastDirection = direction;

    // Update wave progress
    this.updateWave(state, config, movePips * direction);

    // Update candle tracking
    this.updateCandleTracking(state, newPrice);

    // Update timing
    state.timing.nextTickDelay = TIMING_CONFIG.BASE_TICK_INTERVAL +
      randomInt(-TIMING_CONFIG.TICK_VARIANCE, TIMING_CONFIG.TICK_VARIANCE);
    state.timing.lastTickTime = now;

    // Update price history
    state.priceHistory.push(newPrice);
    if (state.priceHistory.length > TIMING_CONFIG.PRICE_HISTORY_SIZE) {
      state.priceHistory.shift();
    }
  }

  /**
   * Update wave state and create new wave if needed
   */
  private updateWave(state: ExtendedPriceState, config: OTCPriceConfig, movePips: number): void {
    const wave = state.wave;

    wave.progressPips += movePips * wave.direction;
    wave.remainingTicks--;

    // Check if wave is complete
    const waveComplete = wave.remainingTicks <= 0 || Math.abs(wave.progressPips) >= wave.targetPips;

    if (waveComplete) {
      state.wave = this.createNewWave(state, config);
    }
  }

  /**
   * Create a new wave with random parameters
   */
  private createNewWave(state: ExtendedPriceState, config: OTCPriceConfig, forceDirection?: 1 | -1): WaveState {
    let direction: 1 | -1;

    if (forceDirection !== undefined) {
      direction = forceDirection;
    } else if (Math.random() < WAVE_CONFIG.CONTINUATION_PROB) {
      direction = state.wave.direction;
    } else {
      direction = Math.random() > 0.5 ? 1 : -1;
    }

    return {
      direction,
      targetPips: randomFloat(WAVE_CONFIG.PIPS_MIN, WAVE_CONFIG.PIPS_MAX),
      progressPips: 0,
      remainingTicks: randomInt(WAVE_CONFIG.LENGTH_MIN, WAVE_CONFIG.LENGTH_MAX),
      startPrice: state.currentPrice,
      inPullback: false,
      pullbackRemaining: 0,
      pullbackDirection: direction,
      inFakeOut: false,
      fakeOutRemaining: 0,
      fakeOutOriginalDir: direction,
    };
  }

  /**
   * Update candle OHLC tracking
   */
  private updateCandleTracking(state: ExtendedPriceState, price: number): void {
    if (price > state.candle.high) state.candle.high = price;
    if (price < state.candle.low) state.candle.low = price;
    state.candle.tickCount++;
  }

  /**
   * Apply manual price override from admin
   */
  private applyManualOverride(
    symbol: string,
    price: number,
    state: ExtendedPriceState,
    config: OTCPriceConfig,
    now: number
  ): OTCPriceTick {
    const roundedPrice = roundToTick(price, config.pipSize);

    state.currentPrice = roundedPrice;
    state.lastUpdate = now;

    this.updateCandleTracking(state, roundedPrice);

    state.priceHistory.push(roundedPrice);
    if (state.priceHistory.length > TIMING_CONFIG.PRICE_HISTORY_SIZE) {
      state.priceHistory.shift();
    }

    return this.createPriceTick(symbol, roundedPrice, config, state, 'OTC');
  }

  /**
   * Create a price tick response object
   */
  private createPriceTick(
    symbol: string,
    price: number,
    config: OTCPriceConfig,
    state: ExtendedPriceState,
    mode: PriceMode
  ): OTCPriceTick {
    const spread = 2 * config.pipSize;
    const firstPrice = state.priceHistory[0] ?? price;
    const change = price - firstPrice;
    const decimals = config.pipSize < 0.01 ? 5 : 2;

    return {
      symbol,
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      timestamp: new Date(),
      priceMode: mode,
      volatilityState: state.volatilityState,
      change: Number(change.toFixed(decimals)),
      changePercent: Number(((change / firstPrice) * 100).toFixed(2)),
    };
  }
}

// Export singleton instance
export const otcPriceGenerator = new OTCPriceGenerator();
