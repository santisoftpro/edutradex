/**
 * OTC Risk Engine Service
 *
 * Implements sophisticated risk management for OTC trading:
 * - Real-time exposure tracking per symbol
 * - Trade clustering detection
 * - Dynamic intervention probability calculation
 * - Subtle outcome influence within natural price bounds
 * - Statistical tracking for optimization
 *
 * The engine ensures broker profitability while maintaining
 * natural-looking market behavior.
 */

import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import {
  RiskConfig,
  TradeInfo,
  SymbolExposure,
  ExitPriceResult,
  InterventionDecision,
  IRiskEngine,
  OTCActivityEvent
} from './types.js';
import { manualControlService } from './manual-control.service.js';

// Risk engine constants
const EXPOSURE_WARNING_THRESHOLD = 0.7; // 70% imbalance triggers warning
const MAX_ADJUSTMENT_SPREAD_MULTIPLIER = 2.0; // Max 2x normal spread for adjustments
const INTERVENTION_COOLDOWN_MS = 1000; // Min time between interventions per symbol

export class RiskEngine implements IRiskEngine {
  private exposures: Map<string, SymbolExposure> = new Map();
  private configs: Map<string, RiskConfig> = new Map();
  private lastInterventionTime: Map<string, number> = new Map();
  private interventionStats: Map<string, { total: number; applied: number }> = new Map();

  /**
   * Set risk configuration for a symbol
   */
  setConfig(symbol: string, config: RiskConfig): void {
    this.configs.set(symbol, config);

    if (!this.exposures.has(symbol)) {
      this.exposures.set(symbol, this.createEmptyExposure(symbol));
    }

    if (!this.interventionStats.has(symbol)) {
      this.interventionStats.set(symbol, { total: 0, applied: 0 });
    }

    logger.debug(`[RiskEngine] Config set for ${symbol}`, {
      exposureThreshold: config.exposureThreshold,
      interventionRange: `${config.minInterventionRate * 100}%-${config.maxInterventionRate * 100}%`
    });
  }

  /**
   * Create empty exposure object for a symbol
   */
  private createEmptyExposure(symbol: string): SymbolExposure {
    return {
      symbol,
      upTrades: [],
      downTrades: [],
      totalUpAmount: 0,
      totalDownAmount: 0,
      netExposure: 0,
      exposureRatio: 0,
      brokerRiskAmount: 0
    };
  }

  /**
   * Track a new trade in the exposure system
   */
  async trackTrade(trade: TradeInfo & { symbol: string }): Promise<void> {
    let exposure = this.exposures.get(trade.symbol);

    if (!exposure) {
      exposure = this.createEmptyExposure(trade.symbol);
      this.exposures.set(trade.symbol, exposure);
    }

    const tradeInfo: TradeInfo = {
      tradeId: trade.tradeId,
      userId: trade.userId,
      amount: trade.amount,
      entryPrice: trade.entryPrice,
      direction: trade.direction,
      expiresAt: trade.expiresAt
    };

    // Add to appropriate direction
    if (trade.direction === 'UP') {
      exposure.upTrades.push(tradeInfo);
      exposure.totalUpAmount += trade.amount;
    } else {
      exposure.downTrades.push(tradeInfo);
      exposure.totalDownAmount += trade.amount;
    }

    // Recalculate metrics
    this.recalculateExposure(trade.symbol);

    // Check for exposure warning
    if (exposure.exposureRatio > EXPOSURE_WARNING_THRESHOLD) {
      await this.logActivity({
        symbol: trade.symbol,
        eventType: 'EXPOSURE_WARNING',
        tradeId: trade.tradeId,
        userId: trade.userId,
        exposureRatio: exposure.exposureRatio,
        details: {
          totalUp: exposure.totalUpAmount,
          totalDown: exposure.totalDownAmount,
          netExposure: exposure.netExposure
        },
        success: true
      });
    }

    // Persist to database
    await this.persistExposure(trade.symbol);
    await this.persistTradeExposure(trade);

    logger.debug(`[RiskEngine] Trade tracked: ${trade.tradeId}`, {
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      exposureRatio: exposure.exposureRatio.toFixed(2)
    });
  }

  /**
   * Remove a trade after settlement
   */
  async removeTrade(tradeId: string, symbol: string): Promise<void> {
    const exposure = this.exposures.get(symbol);
    if (!exposure) return;

    // Find and remove from UP trades
    const upIndex = exposure.upTrades.findIndex(t => t.tradeId === tradeId);
    if (upIndex !== -1) {
      const trade = exposure.upTrades[upIndex];
      exposure.totalUpAmount -= trade.amount;
      exposure.upTrades.splice(upIndex, 1);
    }

    // Find and remove from DOWN trades
    const downIndex = exposure.downTrades.findIndex(t => t.tradeId === tradeId);
    if (downIndex !== -1) {
      const trade = exposure.downTrades[downIndex];
      exposure.totalDownAmount -= trade.amount;
      exposure.downTrades.splice(downIndex, 1);
    }

    // Recalculate
    this.recalculateExposure(symbol);

    // Persist changes
    await this.persistExposure(symbol);
    await query(`DELETE FROM "OTCTradeExposure" WHERE "tradeId" = $1`, [tradeId]);

    logger.debug(`[RiskEngine] Trade removed: ${tradeId}`, {
      symbol,
      newExposureRatio: exposure.exposureRatio.toFixed(2)
    });
  }

  /**
   * Recalculate exposure metrics for a symbol
   */
  private recalculateExposure(symbol: string): void {
    const exposure = this.exposures.get(symbol);
    if (!exposure) return;

    const total = exposure.totalUpAmount + exposure.totalDownAmount;

    exposure.netExposure = exposure.totalUpAmount - exposure.totalDownAmount;

    // Calculate exposure ratio (0-1 scale)
    exposure.exposureRatio = total > 0
      ? Math.abs(exposure.netExposure) / total
      : 0;

    // Calculate broker risk (potential loss if all trades go against broker)
    const config = this.configs.get(symbol);
    if (config) {
      // If netExposure > 0, broker loses if price goes UP
      // If netExposure < 0, broker loses if price goes DOWN
      const atRiskAmount = Math.abs(exposure.netExposure);
      exposure.brokerRiskAmount = atRiskAmount * (config.payoutPercent / 100);
    }
  }

  /**
   * Calculate intervention decision based on current exposure
   */
  private calculateInterventionDecision(
    trade: { direction: 'UP' | 'DOWN'; amount: number },
    exposure: SymbolExposure,
    config: RiskConfig
  ): InterventionDecision {
    // Check if risk management is enabled
    if (!config.riskEnabled) {
      return {
        shouldIntervene: false,
        probability: 0,
        direction: 'NO_INTERVENTION',
        reason: 'Risk management disabled'
      };
    }

    // Check exposure threshold
    if (exposure.exposureRatio < config.exposureThreshold) {
      return {
        shouldIntervene: false,
        probability: 0,
        direction: 'NO_INTERVENTION',
        reason: `Exposure ratio (${(exposure.exposureRatio * 100).toFixed(1)}%) below threshold (${config.exposureThreshold * 100}%)`
      };
    }

    // Determine broker's preferred outcome
    // netExposure > 0 means more UP trades, broker prefers DOWN outcome
    // netExposure < 0 means more DOWN trades, broker prefers UP outcome
    const brokerPrefersDown = exposure.netExposure > 0;
    const tradeWantsUp = trade.direction === 'UP';

    // Check if trade opposes broker's interest
    const tradeOpposedToBroker = brokerPrefersDown === tradeWantsUp;

    if (!tradeOpposedToBroker) {
      return {
        shouldIntervene: false,
        probability: 0,
        direction: 'NO_INTERVENTION',
        reason: 'Trade aligns with broker interest'
      };
    }

    // Calculate intervention probability
    // Scales from minRate at threshold to maxRate at 100% exposure
    const excessRatio = exposure.exposureRatio - config.exposureThreshold;
    const scaleFactor = excessRatio / (1 - config.exposureThreshold);

    let probability = config.minInterventionRate +
      scaleFactor * (config.maxInterventionRate - config.minInterventionRate);

    // Apply trade size weighting (larger trades slightly higher probability)
    const averageTradeSize = (exposure.totalUpAmount + exposure.totalDownAmount) /
      (exposure.upTrades.length + exposure.downTrades.length || 1);

    if (trade.amount > averageTradeSize * 1.5) {
      probability *= 1.1; // 10% increase for large trades
    }

    // Cap at max rate
    probability = Math.min(probability, config.maxInterventionRate);

    return {
      shouldIntervene: true,
      probability,
      direction: 'FAVOR_BROKER',
      reason: `Exposure ${(exposure.exposureRatio * 100).toFixed(1)}%, probability ${(probability * 100).toFixed(1)}%`
    };
  }

  /**
   * Calculate risk-adjusted exit price for a trade
   *
   * This is the core function that determines if and how to influence
   * the trade outcome while maintaining natural market appearance.
   *
   * Priority order:
   * 1. Manual trade force (admin forced this specific trade)
   * 2. User targeting (force next win/lose or win rate)
   * 3. Automatic risk engine intervention
   */
  calculateExitPrice(
    trade: {
      id: string;
      userId: string;
      symbol: string;
      direction: 'UP' | 'DOWN';
      amount: number;
      entryPrice: number
    },
    marketPrice: number
  ): ExitPriceResult {
    const exposure = this.exposures.get(trade.symbol);
    const config = this.configs.get(trade.symbol);
    const stats = this.interventionStats.get(trade.symbol) || { total: 0, applied: 0 };

    stats.total++;

    // Default result (no intervention)
    const defaultResult: ExitPriceResult = {
      exitPrice: marketPrice,
      influenced: false,
      interventionProbability: 0,
      reason: 'No intervention',
      originalPrice: marketPrice
    };

    // MANUAL CONTROL 1: Check for forced trade outcome (highest priority)
    const forcedOutcome = manualControlService.getForcedOutcome(trade.id);
    if (forcedOutcome) {
      manualControlService.clearForcedOutcome(trade.id);
      const result = this.calculateForcedExitPrice(trade, marketPrice, forcedOutcome, config);
      logger.info(`[RiskEngine] Manual trade force applied`, {
        tradeId: trade.id,
        outcome: forcedOutcome,
        exitPrice: result.exitPrice.toFixed(5)
      });
      return result;
    }

    // MANUAL CONTROL 2: Check for user targeting
    const userTarget = manualControlService.getUserTargeting(trade.userId, trade.symbol);
    if (userTarget) {
      // Check force next win
      if (userTarget.forceNextWin > 0) {
        manualControlService.decrementForceNextWin(trade.userId, userTarget.symbol);
        const result = this.calculateForcedExitPrice(trade, marketPrice, 'WIN', config);
        logger.info(`[RiskEngine] User force-next-win applied`, {
          tradeId: trade.id,
          userId: trade.userId,
          remaining: userTarget.forceNextWin - 1
        });
        return result;
      }

      // Check force next lose
      if (userTarget.forceNextLose > 0) {
        manualControlService.decrementForceNextLose(trade.userId, userTarget.symbol);
        const result = this.calculateForcedExitPrice(trade, marketPrice, 'LOSE', config);
        logger.info(`[RiskEngine] User force-next-lose applied`, {
          tradeId: trade.id,
          userId: trade.userId,
          remaining: userTarget.forceNextLose - 1
        });
        return result;
      }

      // Apply custom win rate
      if (userTarget.targetWinRate !== null) {
        const shouldWin = Math.random() * 100 < userTarget.targetWinRate;
        const result = this.calculateForcedExitPrice(trade, marketPrice, shouldWin ? 'WIN' : 'LOSE', config);
        logger.info(`[RiskEngine] User target win rate applied`, {
          tradeId: trade.id,
          userId: trade.userId,
          targetWinRate: userTarget.targetWinRate,
          outcome: shouldWin ? 'WIN' : 'LOSE'
        });
        return result;
      }
    }

    // AUTOMATIC RISK ENGINE: Standard intervention logic
    if (!exposure || !config) {
      return defaultResult;
    }

    // Check intervention cooldown
    const lastIntervention = this.lastInterventionTime.get(trade.symbol) || 0;
    if (Date.now() - lastIntervention < INTERVENTION_COOLDOWN_MS) {
      return {
        ...defaultResult,
        reason: 'Intervention cooldown active'
      };
    }

    // Get intervention decision
    const decision = this.calculateInterventionDecision(trade, exposure, config);

    if (!decision.shouldIntervene) {
      return {
        ...defaultResult,
        reason: decision.reason
      };
    }

    // Random decision to actually intervene
    const random = Math.random();
    if (random > decision.probability) {
      return {
        ...defaultResult,
        interventionProbability: decision.probability,
        reason: `Random skip (${(random * 100).toFixed(1)}% > ${(decision.probability * 100).toFixed(1)}%)`
      };
    }

    // Calculate adjustment
    const adjustedPrice = this.calculateAdjustedPrice(
      trade,
      marketPrice,
      config
    );

    // Update intervention tracking
    this.lastInterventionTime.set(trade.symbol, Date.now());
    stats.applied++;
    this.interventionStats.set(trade.symbol, stats);

    logger.info(`[RiskEngine] Intervention applied`, {
      tradeId: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      originalPrice: marketPrice.toFixed(5),
      adjustedPrice: adjustedPrice.toFixed(5),
      probability: (decision.probability * 100).toFixed(1) + '%'
    });

    return {
      exitPrice: adjustedPrice,
      influenced: true,
      interventionProbability: decision.probability,
      reason: decision.reason,
      originalPrice: marketPrice
    };
  }

  /**
   * Calculate exit price that forces a specific outcome (WIN or LOSE)
   */
  private calculateForcedExitPrice(
    trade: { direction: 'UP' | 'DOWN'; entryPrice: number },
    marketPrice: number,
    outcome: 'WIN' | 'LOSE',
    config: RiskConfig | undefined
  ): ExitPriceResult {
    const pipSize = config?.pipSize || 0.0001;
    const adjustment = pipSize * 3; // 3 pips margin to ensure clear win/lose

    let exitPrice: number;
    if (outcome === 'WIN') {
      // For WIN: price must move in trade direction
      exitPrice = trade.direction === 'UP'
        ? trade.entryPrice + adjustment
        : trade.entryPrice - adjustment;
    } else {
      // For LOSE: price must move against trade direction
      exitPrice = trade.direction === 'UP'
        ? trade.entryPrice - adjustment
        : trade.entryPrice + adjustment;
    }

    return {
      exitPrice,
      influenced: true,
      interventionProbability: 1,
      reason: `MANUAL_FORCE_${outcome}`,
      originalPrice: marketPrice
    };
  }

  /**
   * Calculate the adjusted exit price that GUARANTEES broker-favorable outcome
   *
   * CRITICAL: This method MUST ensure the trade results in a loss for the trader
   * when intervention is triggered. The previous blending approach could fail
   * if market price was far from entry.
   *
   * Algorithm:
   * 1. Determine the losing price threshold for the trade direction
   * 2. Calculate exit price that is ALWAYS on the losing side
   * 3. Add small randomization to look natural (but never cross to winning side)
   * 4. Bound within reasonable market range
   */
  private calculateAdjustedPrice(
    trade: { direction: 'UP' | 'DOWN'; entryPrice: number },
    marketPrice: number,
    config: RiskConfig
  ): number {
    const pipSize = config.pipSize;

    // Minimum margin to ensure clear loss (not a tie)
    const minLossMargin = pipSize * 2;

    // Maximum adjustment from entry (to look natural)
    const maxAdjustment = pipSize * 5;

    // Random offset within bounds (but always ensuring loss)
    const randomOffset = minLossMargin + Math.random() * (maxAdjustment - minLossMargin);

    let exitPrice: number;

    if (trade.direction === 'UP') {
      // For UP trade to LOSE: exit price MUST be < entry price
      exitPrice = trade.entryPrice - randomOffset;
    } else {
      // For DOWN trade to LOSE: exit price MUST be > entry price
      exitPrice = trade.entryPrice + randomOffset;
    }

    // Validate: ensure we're on the losing side (defensive check)
    const isLosingPrice = trade.direction === 'UP'
      ? exitPrice < trade.entryPrice
      : exitPrice > trade.entryPrice;

    if (!isLosingPrice) {
      // Fallback: force to losing side with minimum margin
      exitPrice = trade.direction === 'UP'
        ? trade.entryPrice - minLossMargin
        : trade.entryPrice + minLossMargin;

      logger.warn('[RiskEngine] Price correction applied to ensure loss', {
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        correctedExitPrice: exitPrice
      });
    }

    // Bound within reasonable market range (max 15 pips from market)
    // But NEVER allow it to cross to the winning side
    const maxDeviation = pipSize * 15;
    const boundedPrice = Math.max(
      marketPrice - maxDeviation,
      Math.min(marketPrice + maxDeviation, exitPrice)
    );

    // Final safety check: if bounding pushed us to winning side, override
    const boundedIsLosing = trade.direction === 'UP'
      ? boundedPrice < trade.entryPrice
      : boundedPrice > trade.entryPrice;

    if (!boundedIsLosing) {
      // Market price is too favorable - use minimum loss price
      return trade.direction === 'UP'
        ? trade.entryPrice - minLossMargin
        : trade.entryPrice + minLossMargin;
    }

    return boundedPrice;
  }

  /**
   * Get current exposure for a symbol
   */
  getExposure(symbol: string): SymbolExposure | null {
    return this.exposures.get(symbol) || null;
  }

  /**
   * Get all exposures
   */
  getAllExposures(): SymbolExposure[] {
    return Array.from(this.exposures.values());
  }

  /**
   * Get intervention statistics for a symbol
   */
  getStats(symbol: string): { total: number; applied: number; rate: number } | null {
    const stats = this.interventionStats.get(symbol);
    if (!stats) return null;

    return {
      ...stats,
      rate: stats.total > 0 ? stats.applied / stats.total : 0
    };
  }

  /**
   * Persist exposure state to database
   */
  private async persistExposure(symbol: string): Promise<void> {
    const exposure = this.exposures.get(symbol);
    const config = this.configs.get(symbol);
    if (!exposure) return;

    try {
      // Get config ID
      const configRow = await queryOne<{ id: string }>(
        `SELECT id FROM "OTCConfig" WHERE symbol = $1`,
        [symbol]
      );

      if (!configRow) return;

      await query(`
        INSERT INTO "OTCRiskExposure" (
          id, "configId", symbol,
          "totalUpAmount", "activeUpTrades", "upTradeIds",
          "totalDownAmount", "activeDownTrades", "downTradeIds",
          "netExposure", "exposureRatio", "brokerRiskAmount",
          "lastUpdated"
        ) VALUES (
          gen_random_uuid(), $1, $2,
          $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          NOW()
        )
        ON CONFLICT (symbol) DO UPDATE SET
          "totalUpAmount" = $3,
          "activeUpTrades" = $4,
          "upTradeIds" = $5,
          "totalDownAmount" = $6,
          "activeDownTrades" = $7,
          "downTradeIds" = $8,
          "netExposure" = $9,
          "exposureRatio" = $10,
          "brokerRiskAmount" = $11,
          "peakExposureRatio" = GREATEST("OTCRiskExposure"."peakExposureRatio", $10),
          "peakExposureTime" = CASE
            WHEN $10 > "OTCRiskExposure"."peakExposureRatio" THEN NOW()
            ELSE "OTCRiskExposure"."peakExposureTime"
          END,
          "totalTradesProcessed" = "OTCRiskExposure"."totalTradesProcessed" + 1,
          "lastUpdated" = NOW()
      `, [
        configRow.id,
        symbol,
        exposure.totalUpAmount,
        exposure.upTrades.length,
        exposure.upTrades.map(t => t.tradeId),
        exposure.totalDownAmount,
        exposure.downTrades.length,
        exposure.downTrades.map(t => t.tradeId),
        exposure.netExposure,
        exposure.exposureRatio,
        exposure.brokerRiskAmount
      ]);
    } catch (error) {
      logger.error('[RiskEngine] Failed to persist exposure', { symbol, error });
    }
  }

  /**
   * Persist individual trade exposure
   */
  private async persistTradeExposure(trade: TradeInfo & { symbol: string }): Promise<void> {
    try {
      const exposureRow = await queryOne<{ id: string }>(
        `SELECT id FROM "OTCRiskExposure" WHERE symbol = $1`,
        [trade.symbol]
      );

      if (!exposureRow) return;

      await query(`
        INSERT INTO "OTCTradeExposure" (
          id, "exposureId", "tradeId", symbol, direction, amount, "entryPrice", "userId", "expiresAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT ("tradeId") DO NOTHING
      `, [
        exposureRow.id,
        trade.tradeId,
        trade.symbol,
        trade.direction,
        trade.amount,
        trade.entryPrice,
        trade.userId,
        trade.expiresAt
      ]);
    } catch (error) {
      logger.error('[RiskEngine] Failed to persist trade exposure', { tradeId: trade.tradeId, error });
    }
  }

  /**
   * Log activity event
   */
  async logActivity(event: OTCActivityEvent): Promise<void> {
    try {
      const configRow = await queryOne<{ id: string }>(
        `SELECT id FROM "OTCConfig" WHERE symbol = $1`,
        [event.symbol]
      );

      await query(`
        INSERT INTO "OTCActivityLog" (
          id, "configId", symbol, "eventType",
          "tradeId", "userId", "priceMode", "exposureRatio",
          "interventionProbability", "marketPrice", "adjustedPrice", "entryPrice",
          details, success, "errorMessage"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3,
          $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14
        )
      `, [
        configRow?.id || null,
        event.symbol,
        event.eventType,
        event.tradeId,
        event.userId,
        event.priceMode,
        event.exposureRatio,
        event.interventionProbability,
        event.marketPrice,
        event.adjustedPrice,
        event.entryPrice,
        event.details ? JSON.stringify(event.details) : null,
        event.success,
        event.errorMessage
      ]);
    } catch (error) {
      logger.error('[RiskEngine] Failed to log activity', { event, error });
    }
  }

  /**
   * Load exposure state from database on startup
   */
  async loadFromDatabase(): Promise<void> {
    try {
      const exposureRows = await queryMany<{
        symbol: string;
        totalUpAmount: number;
        activeUpTrades: number;
        upTradeIds: string[];
        totalDownAmount: number;
        activeDownTrades: number;
        downTradeIds: string[];
        netExposure: number;
        exposureRatio: number;
        brokerRiskAmount: number;
      }>(`SELECT * FROM "OTCRiskExposure"`);

      const tradeRows = await queryMany<{
        tradeId: string;
        symbol: string;
        direction: string;
        amount: number;
        entryPrice: number;
        userId: string;
        expiresAt: Date;
      }>(`SELECT * FROM "OTCTradeExposure" WHERE "expiresAt" > NOW()`);

      // Rebuild in-memory state
      for (const exp of exposureRows) {
        const symbolTrades = tradeRows.filter(t => t.symbol === exp.symbol);

        this.exposures.set(exp.symbol, {
          symbol: exp.symbol,
          upTrades: symbolTrades
            .filter(t => t.direction === 'UP')
            .map(t => ({
              tradeId: t.tradeId,
              amount: t.amount,
              userId: t.userId,
              entryPrice: t.entryPrice,
              direction: 'UP' as const,
              expiresAt: t.expiresAt
            })),
          downTrades: symbolTrades
            .filter(t => t.direction === 'DOWN')
            .map(t => ({
              tradeId: t.tradeId,
              amount: t.amount,
              userId: t.userId,
              entryPrice: t.entryPrice,
              direction: 'DOWN' as const,
              expiresAt: t.expiresAt
            })),
          totalUpAmount: exp.totalUpAmount,
          totalDownAmount: exp.totalDownAmount,
          netExposure: exp.netExposure,
          exposureRatio: exp.exposureRatio,
          brokerRiskAmount: exp.brokerRiskAmount
        });
      }

      logger.info(`[RiskEngine] Loaded ${this.exposures.size} exposures from database`);
    } catch (error) {
      logger.error('[RiskEngine] Failed to load from database', { error });
    }
  }

  /**
   * Clean up expired trades from tracking
   */
  async cleanupExpiredTrades(): Promise<number> {
    let cleaned = 0;

    for (const [symbol, exposure] of this.exposures) {
      const now = Date.now();

      // Clean UP trades
      const validUpTrades = exposure.upTrades.filter(t => t.expiresAt.getTime() > now);
      const removedUp = exposure.upTrades.length - validUpTrades.length;
      exposure.upTrades = validUpTrades;

      // Clean DOWN trades
      const validDownTrades = exposure.downTrades.filter(t => t.expiresAt.getTime() > now);
      const removedDown = exposure.downTrades.length - validDownTrades.length;
      exposure.downTrades = validDownTrades;

      if (removedUp > 0 || removedDown > 0) {
        // Recalculate totals
        exposure.totalUpAmount = exposure.upTrades.reduce((sum, t) => sum + t.amount, 0);
        exposure.totalDownAmount = exposure.downTrades.reduce((sum, t) => sum + t.amount, 0);
        this.recalculateExposure(symbol);
        cleaned += removedUp + removedDown;
      }
    }

    // Clean database
    await query(`DELETE FROM "OTCTradeExposure" WHERE "expiresAt" <= NOW()`);

    if (cleaned > 0) {
      logger.info(`[RiskEngine] Cleaned up ${cleaned} expired trades`);
    }

    return cleaned;
  }
}

// Singleton instance
export const riskEngine = new RiskEngine();
