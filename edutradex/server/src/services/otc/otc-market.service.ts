/**
 * OTC Market Service
 *
 * Main orchestrator for the OTC market system. Integrates:
 * - Price generation (synthetic prices)
 * - Risk management (trade tracking & outcome influence)
 * - Market scheduling (24/7 operation, mode transitions)
 * - Database persistence
 *
 * Provides a unified interface for the trading system.
 */

import { queryMany, queryOne, query } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { marketService } from '../market/market.service.js';
import { OTCPriceGenerator, otcPriceGenerator } from './otc-price-generator.js';
import { RiskEngine, riskEngine } from './risk-engine.js';
import { OTCScheduler, otcScheduler } from './otc-scheduler.js';
import { manualControlService } from './manual-control.service.js';
import {
  OTCConfigRow,
  OTCPriceTick,
  PriceMode,
  OTCPriceConfig,
  RiskConfig,
  ExitPriceResult,
  SymbolExposure,
  OTCActivityEvent
} from './types.js';

// Price update interval (1000ms = 1 update per second for natural movement)
const PRICE_UPDATE_INTERVAL_MS = 1000;

// Price history save interval (every 5 seconds for more frequent data points)
const PRICE_HISTORY_SAVE_INTERVAL_MS = 5000;

// Cleanup interval for expired trades (every minute)
const CLEANUP_INTERVAL_MS = 60000;

// Diagnostic logging interval (every 30 seconds)
const DIAGNOSTIC_LOG_INTERVAL_MS = 30000;

export class OTCMarketService {
  private isInitialized = false;
  private isRunning = false;
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private historySaveInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private diagnosticInterval: NodeJS.Timeout | null = null;
  private configs: Map<string, OTCConfigRow> = new Map();
  private realPrices: Map<string, number> = new Map();
  private priceUpdateCount = 0;
  private lastDiagnosticTime = Date.now();

  // Services
  private priceGenerator: OTCPriceGenerator = otcPriceGenerator;
  private riskEngine: RiskEngine = riskEngine;
  private scheduler: OTCScheduler = otcScheduler;

  /**
   * Initialize the OTC market service
   * Loads configurations and starts price generation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[OTCMarket] Already initialized');
      return;
    }

    logger.info('[OTCMarket] Initializing OTC market service...');

    try {
      // Load configurations from database
      await this.loadConfigurations();

      // Load existing risk exposure state
      await this.riskEngine.loadFromDatabase();

      // Load manual control settings (bias, volatility, user targeting)
      await manualControlService.loadFromDatabase();

      // Initialize price generators for each enabled symbol
      await this.initializePriceGenerators();

      this.isInitialized = true;
      logger.info(`[OTCMarket] Initialized with ${this.configs.size} OTC symbols`);
    } catch (error) {
      logger.error('[OTCMarket] Initialization failed', { error });
      throw error;
    }
  }

  /**
   * Load OTC configurations from database
   */
  private async loadConfigurations(): Promise<void> {
    const configRows = await queryMany<OTCConfigRow>(
      `SELECT * FROM "OTCConfig" WHERE "isEnabled" = true`
    );

    this.configs.clear();

    for (const config of configRows) {
      this.configs.set(config.symbol, config);

      // Set scheduler anchoring duration
      this.scheduler.setAnchoringDuration(config.symbol, config.anchoringDurationMins);

      // Set risk engine configuration
      const riskConfig: RiskConfig = {
        symbol: config.symbol,
        riskEnabled: config.riskEnabled,
        exposureThreshold: config.exposureThreshold,
        minInterventionRate: config.minInterventionRate,
        maxInterventionRate: config.maxInterventionRate,
        spreadMultiplier: config.spreadMultiplier,
        pipSize: config.pipSize,
        payoutPercent: config.payoutPercent
      };
      this.riskEngine.setConfig(config.symbol, riskConfig);
    }

    logger.info(`[OTCMarket] Loaded ${configRows.length} OTC configurations`);
  }

  /**
   * Initialize price generators for all configured symbols
   */
  private async initializePriceGenerators(): Promise<void> {
    for (const [symbol, config] of this.configs) {
      // CRITICAL: Get last price from ANY source (OTC, SEEDED, etc.) for continuity
      // This prevents price jumps when server restarts or OTC mode changes
      let initialPrice = await this.getLastHistoryPrice(config.symbol);

      if (!initialPrice) {
        initialPrice = this.realPrices.get(config.baseSymbol) || this.getDefaultPrice(config.baseSymbol);
        logger.debug(`[OTCMarket] Using real/default price for ${config.symbol}: ${initialPrice}`);
      } else {
        logger.info(`[OTCMarket] Using last history price for ${config.symbol}: ${initialPrice}`);
      }

      const priceConfig: OTCPriceConfig = {
        symbol: config.symbol,
        baseSymbol: config.baseSymbol,
        marketType: config.marketType as 'FOREX' | 'CRYPTO',
        pipSize: config.pipSize,
        baseVolatility: config.baseVolatility,
        volatilityMultiplier: config.volatilityMultiplier,
        momentumFactor: config.momentumFactor,
        garchAlpha: config.garchAlpha,
        garchBeta: config.garchBeta,
        garchOmega: config.garchOmega,
        meanReversionStrength: config.meanReversionStrength,
        maxDeviationPercent: config.maxDeviationPercent,
        priceOffsetPips: config.priceOffsetPips
      };

      this.priceGenerator.initializeSymbol(priceConfig, initialPrice);

      // CRITICAL: Save initial candle immediately to prevent "long first candle" issue
      // Without this, the first candle accumulates all movement during the 5-second save interval
      await this.saveInitialCandle(config, initialPrice);

      // Register OTC symbol as an asset in market service for chart visibility
      marketService.registerOTCAsset({
        symbol: config.symbol,
        baseSymbol: config.baseSymbol,
        name: `${config.baseSymbol} OTC`,
        marketType: config.marketType as 'FOREX' | 'CRYPTO',
        pipSize: config.pipSize,
        basePrice: initialPrice
      });
    }

    logger.info(`[OTCMarket] Registered ${this.configs.size} OTC symbols as market assets`);
  }

  /**
   * Save an initial candle immediately after initialization
   * This prevents the "long first candle" issue where the first candle
   * accumulates all price movement during the 5-second save interval
   */
  private async saveInitialCandle(config: OTCConfigRow, price: number): Promise<void> {
    try {
      await query(`
        INSERT INTO "OTCPriceHistory" (
          id, "configId", symbol, price, bid, ask,
          open, high, low, close, volume, "priceMode", "volatilityState"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12
        )
      `, [
        config.id,
        config.symbol,
        price,
        price - config.pipSize,
        price + config.pipSize,
        price,  // open = price
        price,  // high = price
        price,  // low = price
        price,  // close = price
        0,      // volume
        'OTC',
        0
      ]);

      // Reset candle tracker so next save starts fresh
      this.priceGenerator.resetCandle(config.symbol);

      logger.debug(`[OTCMarket] Saved initial candle for ${config.symbol} at ${price}`);
    } catch (error) {
      // Non-critical - log and continue
      logger.warn(`[OTCMarket] Failed to save initial candle for ${config.symbol}:`, error);
    }
  }

  /**
   * Get the last price for an OTC symbol from history
   * CRITICAL: Uses ANY priceMode (OTC, SEEDED, REAL, ANCHORING) to ensure continuity
   * This prevents price jumps when switching from seeded to OTC mode
   */
  private async getLastHistoryPrice(symbol: string): Promise<number | null> {
    try {
      // First try to get the most recent price from ANY source
      const result = await queryOne<{ close: number }>(`
        SELECT close FROM "OTCPriceHistory"
        WHERE symbol = $1
        ORDER BY timestamp DESC
        LIMIT 1
      `, [symbol]);

      if (result?.close) {
        return result.close;
      }

      // Fallback: check seeded history specifically (in case table is different)
      const seededResult = await queryOne<{ close: number }>(`
        SELECT close FROM "OTCPriceHistory"
        WHERE symbol = $1 AND "priceMode" = 'SEEDED'
        ORDER BY timestamp DESC
        LIMIT 1
      `, [symbol]);

      return seededResult?.close || null;
    } catch (error) {
      logger.error(`[OTCMarket] Failed to get last history price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get default price for a symbol (fallback)
   */
  private getDefaultPrice(baseSymbol: string): number {
    const defaults: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 150.50,
      'BTC/USD': 95000,
      'ETH/USD': 3400,
      'SOL/USD': 180
    };
    return defaults[baseSymbol] || 1.0;
  }

  /**
   * Start the OTC market (price generation and broadcasting)
   */
  start(): void {
    if (!this.isInitialized) {
      logger.error('[OTCMarket] Cannot start: not initialized');
      return;
    }

    if (this.isRunning) {
      logger.warn('[OTCMarket] Already running');
      return;
    }

    // Log active configs
    const activeSymbols = Array.from(this.configs.keys());
    logger.info(`[OTCMarket] Starting with ${activeSymbols.length} active symbols: ${activeSymbols.join(', ')}`);

    // Start price update loop
    this.priceUpdateInterval = setInterval(() => {
      this.updatePrices();
    }, PRICE_UPDATE_INTERVAL_MS);

    // Start history save loop
    this.historySaveInterval = setInterval(() => {
      this.savePriceHistory();
    }, PRICE_HISTORY_SAVE_INTERVAL_MS);

    // Start cleanup loop
    this.cleanupInterval = setInterval(() => {
      this.riskEngine.cleanupExpiredTrades();
    }, CLEANUP_INTERVAL_MS);

    // Start diagnostic logging loop
    this.diagnosticInterval = setInterval(() => {
      this.logDiagnostics();
    }, DIAGNOSTIC_LOG_INTERVAL_MS);

    this.isRunning = true;
    this.priceUpdateCount = 0;
    this.lastDiagnosticTime = Date.now();
    logger.info('[OTCMarket] Started OTC price generation');
  }

  /**
   * Stop the OTC market
   */
  stop(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    if (this.historySaveInterval) {
      clearInterval(this.historySaveInterval);
      this.historySaveInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.diagnosticInterval) {
      clearInterval(this.diagnosticInterval);
      this.diagnosticInterval = null;
    }

    this.isRunning = false;
    logger.info('[OTCMarket] Stopped OTC price generation');
  }

  /**
   * Log diagnostic information about price generation
   */
  private logDiagnostics(): void {
    const elapsed = (Date.now() - this.lastDiagnosticTime) / 1000;
    const rate = this.priceUpdateCount / elapsed;

    const symbols = Array.from(this.configs.keys());
    const samplePrices: Record<string, { price: number; is24Hours: boolean }> = {};
    for (const symbol of symbols.slice(0, 3)) {
      const price = this.priceGenerator.getCurrentPrice(symbol);
      const config = this.configs.get(symbol);
      if (price) samplePrices[symbol] = { price, is24Hours: config?.is24Hours || false };
    }

    // Check if price generator has state for symbols
    const generatorSymbols = this.priceGenerator.getActiveSymbols();

    logger.info('[OTCMarket] Diagnostic', {
      symbolCount: this.configs.size,
      symbols: symbols.join(', '),
      generatorSymbols: generatorSymbols.join(', '),
      priceUpdates: this.priceUpdateCount,
      updateRate: `${rate.toFixed(1)}/sec`,
      samplePrices,
      isRunning: this.isRunning
    });

    this.priceUpdateCount = 0;
    this.lastDiagnosticTime = Date.now();
  }

  // Track last reference price update time per symbol
  private lastReferenceUpdate: Map<string, number> = new Map();

  // How often to update reference price (5 minutes) - prevents large gaps from real market
  private readonly REFERENCE_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

  /**
   * Update real price for a base symbol (called from market service)
   *
   * OTC prices are synthetic and move organically, but we periodically update
   * the reference price to prevent large gaps from real market (like Pocket Option).
   *
   * - Does NOT update on every tick (prevents tracking real movements)
   * - Updates every 5 minutes to stay within reasonable range of real market
   */
  updateRealPrice(baseSymbol: string, price: number): void {
    this.realPrices.set(baseSymbol, price);

    const now = Date.now();

    // Find OTC symbols that use this base symbol
    for (const [symbol, config] of this.configs) {
      if (config.baseSymbol === baseSymbol) {
        const lastUpdate = this.lastReferenceUpdate.get(symbol) || 0;

        // Only update reference price periodically (every 5 minutes)
        // This keeps OTC in range of real market without tracking every tick
        if (now - lastUpdate >= this.REFERENCE_UPDATE_INTERVAL_MS) {
          this.priceGenerator.updateRealPrice(symbol, price);
          this.lastReferenceUpdate.set(symbol, now);
        }
      }
    }
  }

  /**
   * Generate and broadcast price updates for all OTC symbols
   */
  private updatePrices(): void {
    const priceTicks: OTCPriceTick[] = [];

    for (const [symbol, config] of this.configs) {
      let priceTick: OTCPriceTick | null = null;
      let actualMode: PriceMode;

      // If is24Hours is enabled, always use OTC mode (synthetic prices)
      // This allows OTC trading during weekends and market closures
      if (config.is24Hours) {
        priceTick = this.priceGenerator.generateNextPrice(symbol);
        actualMode = 'OTC';
      } else {
        // Follow normal market hours logic
        const priceMode = this.scheduler.getPriceMode(symbol, config.marketType);
        actualMode = priceMode;

        switch (priceMode) {
          case 'REAL': {
            // Use real price with small offset
            const realPrice = this.realPrices.get(config.baseSymbol);
            if (realPrice) {
              priceTick = this.priceGenerator.getRealBasedPrice(symbol, realPrice);
            } else {
              // Fallback to OTC mode if real price not available
              priceTick = this.priceGenerator.generateNextPrice(symbol);
              actualMode = 'OTC';
            }
            break;
          }

          case 'OTC': {
            // Generate synthetic price
            priceTick = this.priceGenerator.generateNextPrice(symbol);
            break;
          }

          case 'ANCHORING': {
            // Blend OTC and real prices
            const realPrice = this.realPrices.get(config.baseSymbol);
            const otcPrice = this.priceGenerator.getCurrentPrice(symbol);

            if (realPrice && otcPrice) {
              const anchoredPrice = this.scheduler.getAnchoredPrice(symbol, otcPrice, realPrice);

              priceTick = {
                symbol,
                price: anchoredPrice,
                bid: anchoredPrice - config.pipSize,
                ask: anchoredPrice + config.pipSize,
                timestamp: new Date(),
                priceMode: 'ANCHORING',
                volatilityState: 0,
                change: 0,
                changePercent: 0
              };
            } else {
              // Fallback to OTC mode if anchoring data not available
              priceTick = this.priceGenerator.generateNextPrice(symbol);
              actualMode = 'OTC';
            }
            break;
          }
        }
      }

      if (priceTick) {
        priceTick.priceMode = actualMode;
        priceTicks.push(priceTick);
      }
    }

    // Broadcast to subscribers
    if (priceTicks.length > 0) {
      this.broadcastPrices(priceTicks);
    }
  }

  /**
   * Broadcast prices via WebSocket and update market service for chart data
   */
  private broadcastPrices(priceTicks: OTCPriceTick[]): void {
    this.priceUpdateCount += priceTicks.length;
    for (const tick of priceTicks) {
      // Broadcast via WebSocket
      wsManager.broadcastPriceUpdate({
        symbol: tick.symbol,
        price: tick.price,
        bid: tick.bid,
        ask: tick.ask,
        timestamp: tick.timestamp,
        change: tick.change,
        changePercent: tick.changePercent
      });

      // Update market service for chart historical data
      marketService.updateOTCPrice({
        symbol: tick.symbol,
        price: tick.price,
        bid: tick.bid,
        ask: tick.ask,
        timestamp: tick.timestamp,
        change: tick.change,
        changePercent: tick.changePercent
      });
    }
  }

  /**
   * Save price history to database (for charts)
   * Uses properly tracked candle OHLC values from price generator
   */
  private async savePriceHistory(): Promise<void> {
    for (const [symbol, config] of this.configs) {
      // Get properly tracked candle OHLC data
      const candleData = this.priceGenerator.getCandleOHLC(symbol);
      if (!candleData) continue;

      // Respect is24Hours setting - if enabled, always use OTC mode
      const priceMode = config.is24Hours
        ? 'OTC'
        : this.scheduler.getPriceMode(symbol, config.marketType);

      // Generate realistic volume based on price movement
      const volume = this.priceGenerator.generateVolume(symbol);

      try {
        await query(`
          INSERT INTO "OTCPriceHistory" (
            id, "configId", symbol, price, bid, ask,
            open, high, low, close, volume, "priceMode", "volatilityState"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11, $12
          )
        `, [
          config.id,
          symbol,
          candleData.close,                              // Current price
          candleData.close - config.pipSize,             // Bid
          candleData.close + config.pipSize,             // Ask
          candleData.open,                               // Properly tracked open
          candleData.high,                               // Properly tracked high
          candleData.low,                                // Properly tracked low
          candleData.close,                              // Close (current price)
          volume,                                        // Realistic volume
          priceMode,
          this.priceGenerator.getState(symbol)?.volatilityState || 0
        ]);

        // Reset candle for next period - start fresh OHLC tracking
        this.priceGenerator.resetCandle(symbol);

      } catch (error) {
        logger.error('[OTCMarket] Failed to save price history', { symbol, error });
      }
    }
  }

  /**
   * Track a new OTC trade in the risk engine
   */
  async trackTrade(trade: {
    id: string;
    symbol: string;
    direction: 'UP' | 'DOWN';
    amount: number;
    entryPrice: number;
    userId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.riskEngine.trackTrade({
      tradeId: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      entryPrice: trade.entryPrice,
      userId: trade.userId,
      expiresAt: trade.expiresAt
    });

    // Log activity
    await this.riskEngine.logActivity({
      symbol: trade.symbol,
      eventType: 'TRADE_TRACKED',
      tradeId: trade.id,
      userId: trade.userId,
      entryPrice: trade.entryPrice,
      exposureRatio: this.riskEngine.getExposure(trade.symbol)?.exposureRatio,
      success: true
    });
  }

  /**
   * Calculate exit price for a trade with risk adjustment
   */
  calculateExitPrice(trade: {
    id: string;
    userId: string;
    symbol: string;
    direction: 'UP' | 'DOWN';
    amount: number;
    entryPrice: number;
  }): ExitPriceResult {
    // Get current market price
    const currentPrice = this.priceGenerator.getCurrentPrice(trade.symbol);

    if (!currentPrice) {
      return {
        exitPrice: trade.entryPrice,
        influenced: false,
        interventionProbability: 0,
        reason: 'No current price available',
        originalPrice: trade.entryPrice
      };
    }

    // Apply risk engine
    return this.riskEngine.calculateExitPrice(trade, currentPrice);
  }

  /**
   * Remove a trade from risk tracking after settlement
   */
  async removeTrade(tradeId: string, symbol: string): Promise<void> {
    await this.riskEngine.removeTrade(tradeId, symbol);

    await this.riskEngine.logActivity({
      symbol,
      eventType: 'TRADE_REMOVED',
      tradeId,
      success: true
    });
  }

  /**
   * Get current price for an OTC symbol
   */
  getCurrentPrice(symbol: string): OTCPriceTick | null {
    const config = this.configs.get(symbol);
    if (!config) return null;

    const priceMode = this.scheduler.getPriceMode(symbol, config.marketType);
    const currentPrice = this.priceGenerator.getCurrentPrice(symbol);
    const state = this.priceGenerator.getState(symbol);

    if (!currentPrice || !state) return null;

    // Calculate change from price history
    const firstPrice = state.priceHistory[0] ?? currentPrice;
    const change = currentPrice - firstPrice;
    const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

    return {
      symbol,
      price: currentPrice,
      bid: currentPrice - config.pipSize,
      ask: currentPrice + config.pipSize,
      timestamp: new Date(),
      priceMode,
      volatilityState: state.volatilityState,
      change: Number(change.toFixed(config.pipSize < 0.01 ? 5 : 2)),
      changePercent: Number(changePercent.toFixed(2))
    };
  }

  /**
   * Get risk exposure for a symbol
   */
  getExposure(symbol: string): SymbolExposure | null {
    return this.riskEngine.getExposure(symbol);
  }

  /**
   * Get all risk exposures
   */
  getAllExposures(): SymbolExposure[] {
    return this.riskEngine.getAllExposures();
  }

  /**
   * Get OTC configuration for a symbol
   */
  getConfig(symbol: string): OTCConfigRow | null {
    return this.configs.get(symbol) || null;
  }

  /**
   * Get all OTC configurations
   */
  getAllConfigs(): OTCConfigRow[] {
    return Array.from(this.configs.values());
  }

  /**
   * Check if a symbol is an OTC symbol
   */
  isOTCSymbol(symbol: string): boolean {
    return this.configs.has(symbol);
  }

  /**
   * Update OTC configuration (admin)
   */
  async updateConfig(symbol: string, updates: Partial<OTCConfigRow>): Promise<void> {
    const config = this.configs.get(symbol);
    if (!config) {
      throw new Error(`OTC config not found for symbol: ${symbol}`);
    }

    // Build update query dynamically
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'symbol' && key !== 'createdAt') {
        fields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return;

    values.push(symbol);

    await query(
      `UPDATE "OTCConfig" SET ${fields.join(', ')}, "updatedAt" = NOW() WHERE symbol = $${paramIndex}`,
      values
    );

    // Reload configuration
    await this.loadConfigurations();
    await this.initializePriceGenerators();

    await this.riskEngine.logActivity({
      symbol,
      eventType: 'CONFIG_UPDATED',
      details: updates,
      success: true
    });

    logger.info(`[OTCMarket] Config updated for ${symbol}`, updates);
  }

  /**
   * Create a new OTC configuration
   */
  async createConfig(config: {
    symbol: string;
    baseSymbol: string;
    marketType: string;
    name: string;
  }): Promise<OTCConfigRow> {
    const result = await queryOne<OTCConfigRow>(`
      INSERT INTO "OTCConfig" (
        id, symbol, "baseSymbol", "marketType", name
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4
      ) RETURNING *
    `, [config.symbol, config.baseSymbol, config.marketType, config.name]);

    if (result) {
      this.configs.set(result.symbol, result);

      // Initialize price generator
      const priceConfig: OTCPriceConfig = {
        symbol: result.symbol,
        baseSymbol: result.baseSymbol,
        marketType: result.marketType as 'FOREX' | 'CRYPTO',
        pipSize: result.pipSize,
        baseVolatility: result.baseVolatility,
        volatilityMultiplier: result.volatilityMultiplier,
        momentumFactor: result.momentumFactor,
        garchAlpha: result.garchAlpha,
        garchBeta: result.garchBeta,
        garchOmega: result.garchOmega,
        meanReversionStrength: result.meanReversionStrength,
        maxDeviationPercent: result.maxDeviationPercent,
        priceOffsetPips: result.priceOffsetPips
      };

      const initialPrice = this.getDefaultPrice(result.baseSymbol);
      this.priceGenerator.initializeSymbol(priceConfig, initialPrice);

      logger.info(`[OTCMarket] Created new OTC config: ${result.symbol}`);
    }

    return result!;
  }

  /**
   * Get market status
   */
  getStatus(): {
    isInitialized: boolean;
    isRunning: boolean;
    symbolCount: number;
    symbols: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      symbolCount: this.configs.size,
      symbols: Array.from(this.configs.keys())
    };
  }

  /**
   * Reload a specific config from database and initialize its price generator
   * Called when a config is created or updated via admin panel
   */
  async reloadConfig(symbol: string): Promise<void> {
    const configRow = await queryOne<OTCConfigRow>(
      `SELECT * FROM "OTCConfig" WHERE symbol = $1`,
      [symbol]
    );

    if (!configRow) {
      // Config was deleted - remove from active configs
      this.configs.delete(symbol);
      logger.info(`[OTCMarket] Removed config for ${symbol}`);
      return;
    }

    if (!configRow.isEnabled) {
      // Config is disabled - remove from active configs
      this.configs.delete(symbol);
      logger.info(`[OTCMarket] Disabled config for ${symbol}`);
      return;
    }

    // Update or add config
    this.configs.set(symbol, configRow);

    // Set scheduler anchoring duration
    this.scheduler.setAnchoringDuration(symbol, configRow.anchoringDurationMins);

    // Set risk engine configuration
    const riskConfig: RiskConfig = {
      symbol: configRow.symbol,
      riskEnabled: configRow.riskEnabled,
      exposureThreshold: configRow.exposureThreshold,
      minInterventionRate: configRow.minInterventionRate,
      maxInterventionRate: configRow.maxInterventionRate,
      spreadMultiplier: configRow.spreadMultiplier,
      pipSize: configRow.pipSize,
      payoutPercent: configRow.payoutPercent
    };
    this.riskEngine.setConfig(symbol, riskConfig);

    // Initialize price generator
    const priceConfig: OTCPriceConfig = {
      symbol: configRow.symbol,
      baseSymbol: configRow.baseSymbol,
      marketType: configRow.marketType as 'FOREX' | 'CRYPTO',
      pipSize: configRow.pipSize,
      baseVolatility: configRow.baseVolatility,
      volatilityMultiplier: configRow.volatilityMultiplier,
      momentumFactor: configRow.momentumFactor,
      garchAlpha: configRow.garchAlpha,
      garchBeta: configRow.garchBeta,
      garchOmega: configRow.garchOmega,
      meanReversionStrength: configRow.meanReversionStrength,
      maxDeviationPercent: configRow.maxDeviationPercent,
      priceOffsetPips: configRow.priceOffsetPips
    };

    // CRITICAL: Use last history price (seeded or OTC) for continuity
    // This prevents price jumps when reloading after seeding
    let initialPrice = await this.getLastHistoryPrice(symbol);
    if (!initialPrice) {
      initialPrice = this.realPrices.get(configRow.baseSymbol) || this.getDefaultPrice(configRow.baseSymbol);
      logger.info(`[OTCMarket] Using real/default price for ${symbol}: ${initialPrice}`);
    } else {
      logger.info(`[OTCMarket] Using last history price for ${symbol}: ${initialPrice}`);
    }
    this.priceGenerator.initializeSymbol(priceConfig, initialPrice);

    // Save initial candle to prevent "long first candle" on reload
    await this.saveInitialCandle(configRow, initialPrice);

    logger.info(`[OTCMarket] Reloaded and initialized config for ${symbol}`);
  }

  /**
   * Get historical bars for charting with proper resolution aggregation
   * OTC data is saved every 5 seconds, so we aggregate for higher resolutions
   */
  async getHistoricalBars(
    symbol: string,
    resolution: number = 60,
    limit: number = 500
  ): Promise<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[]> {
    // Fetch more raw data to aggregate into requested limit
    // Each raw entry is ~5 seconds, so for 1 min resolution we need ~12 entries per bar
    const rawEntriesPerBar = Math.max(1, Math.ceil(resolution / 5));
    const fetchLimit = Math.min(limit * rawEntriesPerBar + 100, 10000);

    const rows = await queryMany<{
      timestamp: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>(`
      SELECT timestamp, open, high, low, close, volume
      FROM "OTCPriceHistory"
      WHERE symbol = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [symbol, fetchLimit]);

    if (rows.length === 0) {
      return [];
    }

    // Reverse to chronological order
    const chronological = rows.reverse();

    // Aggregate into resolution-based candles
    const aggregatedBars = new Map<number, {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      isFirst: boolean;
    }>();

    for (const row of chronological) {
      const timestampSec = Math.floor(row.timestamp.getTime() / 1000);
      const barTime = Math.floor(timestampSec / resolution) * resolution;

      const existing = aggregatedBars.get(barTime);
      const open = row.open || row.close;
      const high = row.high || row.close;
      const low = row.low || row.close;
      const close = row.close;
      const volume = row.volume || 0;

      if (!existing) {
        aggregatedBars.set(barTime, {
          time: barTime,
          open,
          high,
          low,
          close,
          volume,
          isFirst: true
        });
      } else {
        // Aggregate: update high/low/close, accumulate volume
        existing.high = Math.max(existing.high, high);
        existing.low = Math.min(existing.low, low);
        existing.close = close;
        existing.volume += volume;
      }
    }

    // Convert to array, sort by time, take last N bars
    const bars = Array.from(aggregatedBars.values())
      .sort((a, b) => a.time - b.time)
      .slice(-limit)
      .map(({ time, open, high, low, close, volume }) => ({
        time,
        open,
        high,
        low,
        close,
        volume
      }));

    return bars;
  }
}

// Singleton instance
export const otcMarketService = new OTCMarketService();
