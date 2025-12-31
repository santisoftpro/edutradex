/**
 * OTC Scheduler Service
 *
 * Manages market hours detection and price mode transitions:
 * - Determines when real markets are open/closed
 * - Handles transitions between REAL, OTC, and ANCHORING modes
 * - Provides smooth price anchoring when markets reopen
 *
 * Supports forex and crypto markets with accurate timezone handling.
 */

import { logger } from '../../utils/logger.js';
import { PriceMode, MarketSession, AnchoringState, IOTCScheduler } from './types.js';

// Default anchoring duration (15 minutes)
const DEFAULT_ANCHORING_DURATION_MS = 15 * 60 * 1000;

/**
 * Market Schedule Definitions
 *
 * All times in UTC for consistency
 */
const MARKET_SCHEDULES = {
  /**
   * Forex Market Hours (24/5)
   * Opens: Sunday 22:00 UTC (Sydney open)
   * Closes: Friday 22:00 UTC (New York close)
   */
  forex: {
    sessions: [
      { name: 'Sydney', openHour: 22, closeHour: 7 },
      { name: 'Tokyo', openHour: 0, closeHour: 9 },
      { name: 'London', openHour: 8, closeHour: 17 },
      { name: 'New York', openHour: 13, closeHour: 22 }
    ],
    weekendClose: {
      closeDay: 5, // Friday
      closeHour: 22,
      openDay: 0, // Sunday
      openHour: 22
    }
  },

  /**
   * Crypto Market Hours (24/7)
   * Always open with no breaks
   */
  crypto: {
    alwaysOpen: true
  },

  /**
   * Stock Market Hours (US Markets)
   * Opens: 14:30 UTC (9:30 AM ET)
   * Closes: 21:00 UTC (4:00 PM ET)
   * Days: Monday - Friday only
   */
  stock: {
    openHourUTC: 14.5,
    closeHourUTC: 21,
    tradingDays: [1, 2, 3, 4, 5] // Monday = 1, Friday = 5
  }
} as const;

export class OTCScheduler implements IOTCScheduler {
  private anchoringStates: Map<string, AnchoringState> = new Map();
  private previousModes: Map<string, PriceMode> = new Map();
  private anchoringDurations: Map<string, number> = new Map();

  /**
   * Set anchoring duration for a symbol
   */
  setAnchoringDuration(symbol: string, durationMins: number): void {
    this.anchoringDurations.set(symbol, durationMins * 60 * 1000);
  }

  /**
   * Check if the real market is currently open for trading
   */
  isRealMarketOpen(symbol: string, marketType: string): boolean {
    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;

    const type = marketType.toLowerCase();

    switch (type) {
      case 'crypto':
        // Crypto markets are always open
        return true;

      case 'forex':
        return this.isForexOpen(utcDay, utcHour);

      case 'stock':
      case 'index':
        return this.isStockMarketOpen(utcDay, utcHour);

      default:
        return false;
    }
  }

  /**
   * Check if forex market is open
   */
  private isForexOpen(utcDay: number, utcHour: number): boolean {
    const { weekendClose } = MARKET_SCHEDULES.forex;

    // Saturday: Always closed
    if (utcDay === 6) {
      return false;
    }

    // Friday after close: Closed
    if (utcDay === weekendClose.closeDay && utcHour >= weekendClose.closeHour) {
      return false;
    }

    // Sunday before open: Closed
    if (utcDay === weekendClose.openDay && utcHour < weekendClose.openHour) {
      return false;
    }

    return true;
  }

  /**
   * Check if US stock market is open
   */
  private isStockMarketOpen(utcDay: number, utcHour: number): boolean {
    const { openHourUTC, closeHourUTC, tradingDays } = MARKET_SCHEDULES.stock;

    // Check if it's a trading day (Monday=1 through Friday=5)
    if (!(tradingDays as readonly number[]).includes(utcDay)) {
      return false;
    }

    // Check if within trading hours
    return utcHour >= openHourUTC && utcHour < closeHourUTC;
  }

  /**
   * Get current forex session name
   */
  private getCurrentForexSession(utcHour: number): string | undefined {
    const { sessions } = MARKET_SCHEDULES.forex;

    for (const session of sessions) {
      if (session.openHour < session.closeHour) {
        // Normal session (same day)
        if (utcHour >= session.openHour && utcHour < session.closeHour) {
          return session.name;
        }
      } else {
        // Overnight session (crosses midnight)
        if (utcHour >= session.openHour || utcHour < session.closeHour) {
          return session.name;
        }
      }
    }

    return undefined;
  }

  /**
   * Get detailed market session information
   */
  getMarketSession(symbol: string, marketType: string): MarketSession {
    const isOpen = this.isRealMarketOpen(symbol, marketType);
    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;

    const session: MarketSession = {
      isOpen,
      currentSession: undefined,
      nextOpen: undefined,
      nextClose: undefined
    };

    if (marketType.toLowerCase() === 'crypto') {
      session.currentSession = '24/7';
      return session;
    }

    if (marketType.toLowerCase() === 'forex') {
      if (isOpen) {
        session.currentSession = this.getCurrentForexSession(utcHour);
        session.nextClose = this.getNextForexClose(now);
      } else {
        session.nextOpen = this.getNextForexOpen(now);
      }
    }

    if (marketType.toLowerCase() === 'stock' || marketType.toLowerCase() === 'index') {
      if (isOpen) {
        session.currentSession = 'US Market';
        session.nextClose = this.getNextStockClose(now);
      } else {
        session.nextOpen = this.getNextStockOpen(now);
      }
    }

    return session;
  }

  /**
   * Calculate next forex market open time
   */
  private getNextForexOpen(now: Date): Date {
    const next = new Date(now);
    const { openDay, openHour } = MARKET_SCHEDULES.forex.weekendClose;

    // Find next Sunday 22:00 UTC
    while (next.getUTCDay() !== openDay || next.getUTCHours() < openHour) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    next.setUTCHours(openHour, 0, 0, 0);
    return next;
  }

  /**
   * Calculate next forex market close time
   */
  private getNextForexClose(now: Date): Date {
    const next = new Date(now);
    const { closeDay, closeHour } = MARKET_SCHEDULES.forex.weekendClose;

    // Find next Friday 22:00 UTC
    while (next.getUTCDay() !== closeDay) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    next.setUTCHours(closeHour, 0, 0, 0);

    // If we're past Friday close, get next week's close
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 7);
    }

    return next;
  }

  /**
   * Calculate next stock market open time
   */
  private getNextStockOpen(now: Date): Date {
    const next = new Date(now);
    const { openHourUTC, tradingDays } = MARKET_SCHEDULES.stock;
    const tradingDaysArr = tradingDays as readonly number[];

    // Move to next trading day
    do {
      if (next.getUTCHours() >= openHourUTC || !tradingDaysArr.includes(next.getUTCDay())) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
    } while (!tradingDaysArr.includes(next.getUTCDay()));

    next.setUTCHours(Math.floor(openHourUTC), (openHourUTC % 1) * 60, 0, 0);
    return next;
  }

  /**
   * Calculate next stock market close time
   */
  private getNextStockClose(now: Date): Date {
    const next = new Date(now);
    const { closeHourUTC } = MARKET_SCHEDULES.stock;

    next.setUTCHours(closeHourUTC, 0, 0, 0);

    if (next <= now) {
      // Already past today's close, won't happen if market is open
      next.setUTCDate(next.getUTCDate() + 1);
    }

    return next;
  }

  /**
   * Get the current price mode for a symbol
   * Handles transitions between REAL, OTC, and ANCHORING
   */
  getPriceMode(symbol: string, marketType: string): PriceMode {
    const isOpen = this.isRealMarketOpen(symbol, marketType);
    const previousMode = this.previousModes.get(symbol);

    if (isOpen) {
      // Market is open
      if (previousMode === 'OTC') {
        // Transition from OTC to REAL - start anchoring
        this.startAnchoring(symbol);
        this.previousModes.set(symbol, 'ANCHORING');

        logger.info(`[OTCScheduler] Mode switch: OTC -> ANCHORING for ${symbol}`);
        return 'ANCHORING';
      }

      // Check if still in anchoring period
      if (this.isAnchoring(symbol)) {
        return 'ANCHORING';
      }

      // Market open and anchoring complete (or never started)
      this.previousModes.set(symbol, 'REAL');
      return 'REAL';
    }

    // Market is closed - use OTC
    if (previousMode === 'REAL' || previousMode === 'ANCHORING') {
      logger.info(`[OTCScheduler] Mode switch: ${previousMode} -> OTC for ${symbol}`);
    }

    this.previousModes.set(symbol, 'OTC');
    return 'OTC';
  }

  /**
   * Start the anchoring period for a symbol
   */
  private startAnchoring(symbol: string): void {
    const duration = this.anchoringDurations.get(symbol) || DEFAULT_ANCHORING_DURATION_MS;

    this.anchoringStates.set(symbol, {
      symbol,
      startTime: Date.now(),
      startOtcPrice: 0, // Will be set by the caller
      targetRealPrice: 0, // Will be set by the caller
      durationMs: duration
    });

    logger.info(`[OTCScheduler] Started anchoring for ${symbol}, duration: ${duration / 1000}s`);
  }

  /**
   * Check if a symbol is currently in anchoring period
   */
  private isAnchoring(symbol: string): boolean {
    const state = this.anchoringStates.get(symbol);
    if (!state) return false;

    const elapsed = Date.now() - state.startTime;

    if (elapsed >= state.durationMs) {
      // Anchoring complete
      this.anchoringStates.delete(symbol);
      logger.info(`[OTCScheduler] Anchoring completed for ${symbol}`);
      return false;
    }

    return true;
  }

  /**
   * Get anchoring progress (0 to 1)
   */
  getAnchoringProgress(symbol: string): number {
    const state = this.anchoringStates.get(symbol);
    if (!state) return 1; // Fully anchored (or never anchoring)

    const elapsed = Date.now() - state.startTime;
    return Math.min(elapsed / state.durationMs, 1);
  }

  /**
   * Calculate anchored price during transition
   *
   * Uses quadratic easing for smooth transition:
   * - Starts heavily weighted toward OTC price
   * - Smoothly transitions to real price
   * - Avoids visible gaps in charts
   */
  getAnchoredPrice(symbol: string, otcPrice: number, realPrice: number): number {
    const progress = this.getAnchoringProgress(symbol);

    if (progress >= 1) {
      return realPrice; // Anchoring complete
    }

    // Quadratic easing out: progress^2 gives smooth deceleration
    // OTC weight starts at ~95% and decreases to 0%
    const otcWeight = 0.95 * Math.pow(1 - progress, 2);

    const anchoredPrice = otcPrice * otcWeight + realPrice * (1 - otcWeight);

    return anchoredPrice;
  }

  /**
   * Update anchoring state with current prices
   */
  updateAnchoringPrices(symbol: string, otcPrice: number, realPrice: number): void {
    const state = this.anchoringStates.get(symbol);
    if (state) {
      state.startOtcPrice = otcPrice;
      state.targetRealPrice = realPrice;
    }
  }

  /**
   * Force end anchoring for a symbol
   */
  endAnchoring(symbol: string): void {
    this.anchoringStates.delete(symbol);
    this.previousModes.set(symbol, 'REAL');
  }

  /**
   * Check if any symbol is currently anchoring
   */
  hasActiveAnchoring(): boolean {
    return this.anchoringStates.size > 0;
  }

  /**
   * Get all symbols currently in anchoring mode
   */
  getAnchoringSymbols(): string[] {
    return Array.from(this.anchoringStates.keys());
  }

  /**
   * Reset mode tracking for a symbol
   */
  resetSymbol(symbol: string): void {
    this.previousModes.delete(symbol);
    this.anchoringStates.delete(symbol);
    this.anchoringDurations.delete(symbol);
  }
}

// Singleton instance
export const otcScheduler = new OTCScheduler();
