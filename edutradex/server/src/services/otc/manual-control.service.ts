/**
 * OTC Manual Control Service
 *
 * Provides admin controls for:
 * - Price direction bias (push prices up/down)
 * - Volatility multiplier override
 * - Direct price override with expiry
 * - Force specific trade outcomes
 * - User-specific win rate targeting
 *
 * All actions are logged for audit trail.
 */

import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import {
  ManualControl,
  UserTargeting,
  ManualIntervention,
  ManualActionType,
  ManualTargetType,
  ActiveTradeInfo,
  UserTargetingInput,
  InterventionLogFilters,
  IManualControlService
} from './types.js';

export class ManualControlService implements IManualControlService {
  // In-memory caches for fast lookups
  private controls: Map<string, ManualControl> = new Map();
  private userTargets: Map<string, UserTargeting> = new Map(); // key: `${userId}:${symbol || 'ALL'}`
  private tradeForces: Map<string, 'WIN' | 'LOSE'> = new Map();

  // Expiry timers for auto-reset
  private priceOverrideTimers: Map<string, NodeJS.Timeout> = new Map();
  private directionBiasTimers: Map<string, NodeJS.Timeout> = new Map();
  private volatilityTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Load all manual controls from database on startup
   */
  async loadFromDatabase(): Promise<void> {
    try {
      // Load symbol controls
      const controlRows = await queryMany<{
        symbol: string;
        directionBias: number;
        directionStrength: number;
        directionBiasExpiry: Date | null;
        volatilityMultiplier: number;
        volatilityExpiry: Date | null;
        priceOverride: number | null;
        priceOverrideExpiry: Date | null;
        isActive: boolean;
        updatedAt: Date;
        updatedBy: string | null;
      }>(`SELECT * FROM "OTCManualControl" WHERE "isActive" = true`);

      for (const row of controlRows) {
        this.controls.set(row.symbol, {
          symbol: row.symbol,
          directionBias: row.directionBias,
          directionStrength: row.directionStrength,
          directionBiasExpiry: row.directionBiasExpiry,
          volatilityMultiplier: row.volatilityMultiplier,
          volatilityExpiry: row.volatilityExpiry,
          priceOverride: row.priceOverride,
          priceOverrideExpiry: row.priceOverrideExpiry,
          isActive: row.isActive,
          updatedAt: row.updatedAt,
          updatedBy: row.updatedBy
        });

        // Set up expiry timer for price overrides
        if (row.priceOverride !== null && row.priceOverrideExpiry) {
          const timeUntilExpiry = row.priceOverrideExpiry.getTime() - Date.now();
          if (timeUntilExpiry > 0) {
            this.schedulePriceOverrideExpiry(row.symbol, timeUntilExpiry);
          } else {
            await this.clearPriceOverrideInternal(row.symbol);
          }
        }

        // Set up expiry timer for direction bias
        if (row.directionBias !== 0 && row.directionBiasExpiry) {
          const timeUntilExpiry = row.directionBiasExpiry.getTime() - Date.now();
          if (timeUntilExpiry > 0) {
            this.scheduleDirectionBiasExpiry(row.symbol, timeUntilExpiry);
          } else {
            await this.clearDirectionBiasInternal(row.symbol);
          }
        }

        // Set up expiry timer for volatility
        if (row.volatilityMultiplier !== 1.0 && row.volatilityExpiry) {
          const timeUntilExpiry = row.volatilityExpiry.getTime() - Date.now();
          if (timeUntilExpiry > 0) {
            this.scheduleVolatilityExpiry(row.symbol, timeUntilExpiry);
          } else {
            await this.clearVolatilityInternal(row.symbol);
          }
        }
      }

      // Load user targeting
      const targetRows = await queryMany<{
        id: string;
        userId: string;
        symbol: string | null;
        targetWinRate: number | null;
        forceNextWin: number;
        forceNextLose: number;
        isActive: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
      }>(`SELECT * FROM "OTCUserTargeting" WHERE "isActive" = true`);

      for (const row of targetRows) {
        const key = this.getUserTargetKey(row.userId, row.symbol);
        this.userTargets.set(key, {
          id: row.id,
          userId: row.userId,
          symbol: row.symbol,
          targetWinRate: row.targetWinRate,
          forceNextWin: row.forceNextWin,
          forceNextLose: row.forceNextLose,
          isActive: row.isActive,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        });
      }

      logger.info(`[ManualControl] Loaded ${this.controls.size} symbol controls, ${this.userTargets.size} user targets`);
    } catch (error) {
      logger.error('[ManualControl] Failed to load from database', { error });
    }
  }

  private getUserTargetKey(userId: string, symbol: string | null): string {
    return `${userId}:${symbol || 'ALL'}`;
  }

  // ==========================================
  // PRICE DIRECTION BIAS
  // ==========================================

  async setDirectionBias(
    symbol: string,
    bias: number,
    strength: number,
    adminId: string,
    durationMinutes?: number,
    reason?: string
  ): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing
      ? { directionBias: existing.directionBias, directionStrength: existing.directionStrength }
      : null;

    const now = new Date();
    const expiryTime = durationMinutes ? new Date(now.getTime() + durationMinutes * 60 * 1000) : null;

    // Upsert to database
    await query(`
      INSERT INTO "OTCManualControl" (id, symbol, "directionBias", "directionStrength", "directionBiasExpiry", "updatedAt", "updatedBy")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      ON CONFLICT (symbol) DO UPDATE SET
        "directionBias" = $2,
        "directionStrength" = $3,
        "directionBiasExpiry" = $4,
        "updatedAt" = $5,
        "updatedBy" = $6
    `, [symbol, bias, strength, expiryTime, now, adminId]);

    // Update cache
    if (existing) {
      existing.directionBias = bias;
      existing.directionStrength = strength;
      existing.directionBiasExpiry = expiryTime;
      existing.updatedAt = now;
      existing.updatedBy = adminId;
    } else {
      this.controls.set(symbol, {
        symbol,
        directionBias: bias,
        directionStrength: strength,
        directionBiasExpiry: expiryTime,
        volatilityMultiplier: 1.0,
        volatilityExpiry: null,
        priceOverride: null,
        priceOverrideExpiry: null,
        isActive: true,
        updatedAt: now,
        updatedBy: adminId
      });
    }

    // Schedule expiry if duration is set
    if (durationMinutes) {
      this.scheduleDirectionBiasExpiry(symbol, durationMinutes * 60 * 1000);
    } else {
      // Clear any existing timer if setting to permanent
      this.clearDirectionBiasTimer(symbol);
    }

    // Log intervention
    await this.logIntervention({
      adminId,
      actionType: 'PRICE_BIAS',
      targetType: 'SYMBOL',
      targetId: symbol,
      previousValue,
      newValue: {
        directionBias: bias,
        directionStrength: strength,
        durationMinutes: durationMinutes || 'permanent',
        expiresAt: expiryTime
      },
      reason
    });

    logger.info(`[ManualControl] Direction bias set`, { symbol, bias, strength, durationMinutes, adminId });
  }

  getDirectionBias(symbol: string): { bias: number; strength: number } {
    const control = this.controls.get(symbol);
    if (!control || !control.isActive) {
      return { bias: 0, strength: 0 };
    }

    // Check if expired
    if (control.directionBiasExpiry && control.directionBiasExpiry.getTime() < Date.now()) {
      this.clearDirectionBiasInternal(symbol);
      return { bias: 0, strength: 0 };
    }

    return {
      bias: control.directionBias,
      strength: control.directionStrength
    };
  }

  async clearDirectionBias(symbol: string, adminId: string): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing
      ? { directionBias: existing.directionBias, directionStrength: existing.directionStrength }
      : null;

    await this.clearDirectionBiasInternal(symbol);

    if (previousValue && (previousValue.directionBias !== 0 || previousValue.directionStrength !== 0)) {
      await this.logIntervention({
        adminId,
        actionType: 'PRICE_BIAS',
        targetType: 'SYMBOL',
        targetId: symbol,
        previousValue,
        newValue: { directionBias: 0, directionStrength: 0, action: 'CLEARED' },
        reason: 'Manual clear'
      });
    }

    logger.info(`[ManualControl] Direction bias cleared`, { symbol, adminId });
  }

  private async clearDirectionBiasInternal(symbol: string): Promise<void> {
    this.clearDirectionBiasTimer(symbol);

    await query(`
      UPDATE "OTCManualControl"
      SET "directionBias" = 0, "directionStrength" = 0, "directionBiasExpiry" = NULL, "updatedAt" = NOW()
      WHERE symbol = $1
    `, [symbol]);

    const control = this.controls.get(symbol);
    if (control) {
      control.directionBias = 0;
      control.directionStrength = 0;
      control.directionBiasExpiry = null;
    }
  }

  private clearDirectionBiasTimer(symbol: string): void {
    const timer = this.directionBiasTimers.get(symbol);
    if (timer) {
      clearTimeout(timer);
      this.directionBiasTimers.delete(symbol);
    }
  }

  private scheduleDirectionBiasExpiry(symbol: string, delayMs: number): void {
    this.clearDirectionBiasTimer(symbol);

    const timer = setTimeout(async () => {
      await this.clearDirectionBiasInternal(symbol);
      logger.info(`[ManualControl] Direction bias expired`, { symbol });
    }, delayMs);

    this.directionBiasTimers.set(symbol, timer);
  }

  // ==========================================
  // VOLATILITY MULTIPLIER
  // ==========================================

  async setVolatilityMultiplier(
    symbol: string,
    multiplier: number,
    adminId: string,
    durationMinutes?: number,
    reason?: string
  ): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing ? { volatilityMultiplier: existing.volatilityMultiplier } : null;

    const now = new Date();
    const expiryTime = durationMinutes ? new Date(now.getTime() + durationMinutes * 60 * 1000) : null;

    await query(`
      INSERT INTO "OTCManualControl" (id, symbol, "volatilityMultiplier", "volatilityExpiry", "updatedAt", "updatedBy")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (symbol) DO UPDATE SET
        "volatilityMultiplier" = $2,
        "volatilityExpiry" = $3,
        "updatedAt" = $4,
        "updatedBy" = $5
    `, [symbol, multiplier, expiryTime, now, adminId]);

    if (existing) {
      existing.volatilityMultiplier = multiplier;
      existing.volatilityExpiry = expiryTime;
      existing.updatedAt = now;
      existing.updatedBy = adminId;
    } else {
      this.controls.set(symbol, {
        symbol,
        directionBias: 0,
        directionStrength: 0,
        directionBiasExpiry: null,
        volatilityMultiplier: multiplier,
        volatilityExpiry: expiryTime,
        priceOverride: null,
        priceOverrideExpiry: null,
        isActive: true,
        updatedAt: now,
        updatedBy: adminId
      });
    }

    // Schedule expiry if duration is set
    if (durationMinutes) {
      this.scheduleVolatilityExpiry(symbol, durationMinutes * 60 * 1000);
    } else {
      this.clearVolatilityTimer(symbol);
    }

    await this.logIntervention({
      adminId,
      actionType: 'VOLATILITY',
      targetType: 'SYMBOL',
      targetId: symbol,
      previousValue,
      newValue: {
        volatilityMultiplier: multiplier,
        durationMinutes: durationMinutes || 'permanent',
        expiresAt: expiryTime
      },
      reason
    });

    logger.info(`[ManualControl] Volatility multiplier set`, { symbol, multiplier, durationMinutes, adminId });
  }

  getVolatilityMultiplier(symbol: string): number {
    const control = this.controls.get(symbol);
    if (!control || !control.isActive) {
      return 1.0;
    }

    // Check if expired
    if (control.volatilityExpiry && control.volatilityExpiry.getTime() < Date.now()) {
      this.clearVolatilityInternal(symbol);
      return 1.0;
    }

    return control.volatilityMultiplier;
  }

  async clearVolatilityMultiplier(symbol: string, adminId: string): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing ? { volatilityMultiplier: existing.volatilityMultiplier } : null;

    await this.clearVolatilityInternal(symbol);

    if (previousValue && previousValue.volatilityMultiplier !== 1.0) {
      await this.logIntervention({
        adminId,
        actionType: 'VOLATILITY',
        targetType: 'SYMBOL',
        targetId: symbol,
        previousValue,
        newValue: { volatilityMultiplier: 1.0, action: 'CLEARED' },
        reason: 'Manual clear'
      });
    }

    logger.info(`[ManualControl] Volatility multiplier cleared`, { symbol, adminId });
  }

  private async clearVolatilityInternal(symbol: string): Promise<void> {
    this.clearVolatilityTimer(symbol);

    await query(`
      UPDATE "OTCManualControl"
      SET "volatilityMultiplier" = 1.0, "volatilityExpiry" = NULL, "updatedAt" = NOW()
      WHERE symbol = $1
    `, [symbol]);

    const control = this.controls.get(symbol);
    if (control) {
      control.volatilityMultiplier = 1.0;
      control.volatilityExpiry = null;
    }
  }

  private clearVolatilityTimer(symbol: string): void {
    const timer = this.volatilityTimers.get(symbol);
    if (timer) {
      clearTimeout(timer);
      this.volatilityTimers.delete(symbol);
    }
  }

  private scheduleVolatilityExpiry(symbol: string, delayMs: number): void {
    this.clearVolatilityTimer(symbol);

    const timer = setTimeout(async () => {
      await this.clearVolatilityInternal(symbol);
      logger.info(`[ManualControl] Volatility multiplier expired`, { symbol });
    }, delayMs);

    this.volatilityTimers.set(symbol, timer);
  }

  // ==========================================
  // PRICE OVERRIDE
  // ==========================================

  async setPriceOverride(
    symbol: string,
    price: number,
    expiryMinutes: number,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing?.priceOverride
      ? { priceOverride: existing.priceOverride, priceOverrideExpiry: existing.priceOverrideExpiry }
      : null;

    const now = new Date();
    const expiryTime = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    await query(`
      INSERT INTO "OTCManualControl" (id, symbol, "priceOverride", "priceOverrideExpiry", "updatedAt", "updatedBy")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (symbol) DO UPDATE SET
        "priceOverride" = $2,
        "priceOverrideExpiry" = $3,
        "updatedAt" = $4,
        "updatedBy" = $5
    `, [symbol, price, expiryTime, now, adminId]);

    if (existing) {
      existing.priceOverride = price;
      existing.priceOverrideExpiry = expiryTime;
      existing.updatedAt = now;
      existing.updatedBy = adminId;
    } else {
      this.controls.set(symbol, {
        symbol,
        directionBias: 0,
        directionStrength: 0,
        directionBiasExpiry: null,
        volatilityMultiplier: 1.0,
        volatilityExpiry: null,
        priceOverride: price,
        priceOverrideExpiry: expiryTime,
        isActive: true,
        updatedAt: now,
        updatedBy: adminId
      });
    }

    // Schedule expiry
    this.schedulePriceOverrideExpiry(symbol, expiryMinutes * 60 * 1000);

    await this.logIntervention({
      adminId,
      actionType: 'PRICE_OVERRIDE',
      targetType: 'SYMBOL',
      targetId: symbol,
      previousValue,
      newValue: { priceOverride: price, priceOverrideExpiry: expiryTime, expiryMinutes },
      reason
    });

    logger.info(`[ManualControl] Price override set`, { symbol, price, expiryMinutes, adminId });
  }

  getPriceOverride(symbol: string): number | null {
    const control = this.controls.get(symbol);
    if (!control || !control.isActive || control.priceOverride === null) {
      return null;
    }

    // Check if expired
    if (control.priceOverrideExpiry && control.priceOverrideExpiry.getTime() < Date.now()) {
      this.clearPriceOverrideInternal(symbol);
      return null;
    }

    return control.priceOverride;
  }

  async clearPriceOverride(symbol: string, adminId: string): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing?.priceOverride
      ? { priceOverride: existing.priceOverride, priceOverrideExpiry: existing.priceOverrideExpiry }
      : null;

    await this.clearPriceOverrideInternal(symbol);

    if (previousValue) {
      await this.logIntervention({
        adminId,
        actionType: 'PRICE_OVERRIDE',
        targetType: 'SYMBOL',
        targetId: symbol,
        previousValue,
        newValue: { priceOverride: null, priceOverrideExpiry: null, action: 'CLEARED' },
        reason: 'Manual clear'
      });
    }

    logger.info(`[ManualControl] Price override cleared`, { symbol, adminId });
  }

  private async clearPriceOverrideInternal(symbol: string): Promise<void> {
    const timer = this.priceOverrideTimers.get(symbol);
    if (timer) {
      clearTimeout(timer);
      this.priceOverrideTimers.delete(symbol);
    }

    await query(`
      UPDATE "OTCManualControl"
      SET "priceOverride" = NULL, "priceOverrideExpiry" = NULL, "updatedAt" = NOW()
      WHERE symbol = $1
    `, [symbol]);

    const control = this.controls.get(symbol);
    if (control) {
      control.priceOverride = null;
      control.priceOverrideExpiry = null;
    }
  }

  private schedulePriceOverrideExpiry(symbol: string, delayMs: number): void {
    // Clear existing timer
    const existing = this.priceOverrideTimers.get(symbol);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      await this.clearPriceOverrideInternal(symbol);
      logger.info(`[ManualControl] Price override expired`, { symbol });
    }, delayMs);

    this.priceOverrideTimers.set(symbol, timer);
  }

  // ==========================================
  // TRADE TARGETING
  // ==========================================

  async forceTradeOutcome(
    tradeId: string,
    outcome: 'WIN' | 'LOSE',
    adminId: string,
    reason?: string
  ): Promise<void> {
    this.tradeForces.set(tradeId, outcome);

    await this.logIntervention({
      adminId,
      actionType: 'TRADE_FORCE',
      targetType: 'TRADE',
      targetId: tradeId,
      previousValue: null,
      newValue: { outcome },
      reason
    });

    logger.info(`[ManualControl] Trade outcome forced`, { tradeId, outcome, adminId });
  }

  getForcedOutcome(tradeId: string): 'WIN' | 'LOSE' | null {
    return this.tradeForces.get(tradeId) || null;
  }

  clearForcedOutcome(tradeId: string): void {
    this.tradeForces.delete(tradeId);
  }

  async getActiveTrades(symbol?: string): Promise<ActiveTradeInfo[]> {
    const symbolFilter = symbol ? `AND t.symbol = $1` : '';
    const params = symbol ? [symbol] : [];

    const trades = await queryMany<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      symbol: string;
      direction: string;
      amount: number;
      entryPrice: number;
      expiresAt: Date;
      accountType: string;
    }>(`
      SELECT
        t.id,
        t."userId",
        u.name as "userName",
        u.email as "userEmail",
        t.symbol,
        t.direction,
        t.amount,
        t."entryPrice",
        t."expiresAt",
        t."accountType"
      FROM "Trade" t
      JOIN "User" u ON t."userId" = u.id
      WHERE t.status = 'OPEN'
        AND t.symbol LIKE '%-OTC'
        AND t."expiresAt" > NOW()
        ${symbolFilter}
      ORDER BY t."expiresAt" ASC
    `, params);

    return trades.map(t => ({
      id: t.id,
      userId: t.userId,
      userName: t.userName,
      userEmail: t.userEmail,
      symbol: t.symbol,
      direction: t.direction as 'UP' | 'DOWN',
      amount: t.amount,
      entryPrice: t.entryPrice,
      currentPrice: t.entryPrice, // Will be updated by caller with live price
      expiresAt: t.expiresAt,
      timeLeftMs: t.expiresAt.getTime() - Date.now(),
      accountType: t.accountType
    }));
  }

  // ==========================================
  // USER TARGETING
  // ==========================================

  async setUserTargeting(
    userId: string,
    config: UserTargetingInput,
    adminId: string
  ): Promise<void> {
    const key = this.getUserTargetKey(userId, config.symbol || null);
    const existing = this.userTargets.get(key);

    const previousValue = existing
      ? {
          targetWinRate: existing.targetWinRate,
          forceNextWin: existing.forceNextWin,
          forceNextLose: existing.forceNextLose
        }
      : null;

    const now = new Date();

    if (existing) {
      // Update existing
      await query(`
        UPDATE "OTCUserTargeting"
        SET
          "targetWinRate" = COALESCE($1, "targetWinRate"),
          "forceNextWin" = COALESCE($2, "forceNextWin"),
          "forceNextLose" = COALESCE($3, "forceNextLose"),
          "updatedAt" = $4
        WHERE id = $5
      `, [
        config.targetWinRate ?? null,
        config.forceNextWin ?? existing.forceNextWin,
        config.forceNextLose ?? existing.forceNextLose,
        now,
        existing.id
      ]);

      existing.targetWinRate = config.targetWinRate ?? existing.targetWinRate;
      existing.forceNextWin = config.forceNextWin ?? existing.forceNextWin;
      existing.forceNextLose = config.forceNextLose ?? existing.forceNextLose;
      existing.updatedAt = now;
    } else {
      // Insert new
      const result = await queryOne<{ id: string }>(`
        INSERT INTO "OTCUserTargeting" (
          id, "userId", symbol, "targetWinRate", "forceNextWin", "forceNextLose",
          "isActive", "createdAt", "updatedAt", "createdBy"
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, $6, $7)
        RETURNING id
      `, [
        userId,
        config.symbol || null,
        config.targetWinRate ?? null,
        config.forceNextWin ?? 0,
        config.forceNextLose ?? 0,
        now,
        adminId
      ]);

      if (result) {
        this.userTargets.set(key, {
          id: result.id,
          userId,
          symbol: config.symbol || null,
          targetWinRate: config.targetWinRate ?? null,
          forceNextWin: config.forceNextWin ?? 0,
          forceNextLose: config.forceNextLose ?? 0,
          isActive: true,
          createdBy: adminId,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await this.logIntervention({
      adminId,
      actionType: 'USER_TARGET',
      targetType: 'USER',
      targetId: userId,
      previousValue,
      newValue: {
        symbol: config.symbol || 'ALL',
        targetWinRate: config.targetWinRate,
        forceNextWin: config.forceNextWin,
        forceNextLose: config.forceNextLose
      },
      reason: config.reason
    });

    logger.info(`[ManualControl] User targeting set`, { userId, config, adminId });
  }

  getUserTargeting(userId: string, symbol?: string): UserTargeting | null {
    // First check for symbol-specific targeting
    if (symbol) {
      const symbolTarget = this.userTargets.get(this.getUserTargetKey(userId, symbol));
      if (symbolTarget && symbolTarget.isActive) {
        return symbolTarget;
      }
    }

    // Fall back to ALL symbols targeting
    const allTarget = this.userTargets.get(this.getUserTargetKey(userId, null));
    if (allTarget && allTarget.isActive) {
      return allTarget;
    }

    return null;
  }

  async getAllUserTargets(): Promise<UserTargeting[]> {
    const targets = await queryMany<{
      id: string;
      userId: string;
      symbol: string | null;
      targetWinRate: number | null;
      forceNextWin: number;
      forceNextLose: number;
      isActive: boolean;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
      userName: string;
      userEmail: string;
    }>(`
      SELECT ut.*, u.name as "userName", u.email as "userEmail"
      FROM "OTCUserTargeting" ut
      JOIN "User" u ON ut."userId" = u.id
      WHERE ut."isActive" = true
      ORDER BY ut."updatedAt" DESC
    `);

    return targets.map(t => ({
      id: t.id,
      userId: t.userId,
      symbol: t.symbol,
      targetWinRate: t.targetWinRate,
      forceNextWin: t.forceNextWin,
      forceNextLose: t.forceNextLose,
      isActive: t.isActive,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));
  }

  async removeUserTargeting(userId: string, symbol: string | null, adminId: string): Promise<void> {
    const key = this.getUserTargetKey(userId, symbol);
    const existing = this.userTargets.get(key);

    if (existing) {
      await query(`
        UPDATE "OTCUserTargeting"
        SET "isActive" = false, "updatedAt" = NOW()
        WHERE id = $1
      `, [existing.id]);

      this.userTargets.delete(key);

      await this.logIntervention({
        adminId,
        actionType: 'USER_TARGET',
        targetType: 'USER',
        targetId: userId,
        previousValue: {
          targetWinRate: existing.targetWinRate,
          forceNextWin: existing.forceNextWin,
          forceNextLose: existing.forceNextLose
        },
        newValue: { action: 'REMOVED', symbol: symbol || 'ALL' },
        reason: 'Targeting removed'
      });

      logger.info(`[ManualControl] User targeting removed`, { userId, symbol, adminId });
    }
  }

  async decrementForceNextWin(userId: string, symbol: string | null): Promise<void> {
    const key = this.getUserTargetKey(userId, symbol);
    const target = this.userTargets.get(key);

    if (target && target.forceNextWin > 0) {
      target.forceNextWin -= 1;
      await query(`
        UPDATE "OTCUserTargeting"
        SET "forceNextWin" = "forceNextWin" - 1, "updatedAt" = NOW()
        WHERE id = $1 AND "forceNextWin" > 0
      `, [target.id]);
    }
  }

  async decrementForceNextLose(userId: string, symbol: string | null): Promise<void> {
    const key = this.getUserTargetKey(userId, symbol);
    const target = this.userTargets.get(key);

    if (target && target.forceNextLose > 0) {
      target.forceNextLose -= 1;
      await query(`
        UPDATE "OTCUserTargeting"
        SET "forceNextLose" = "forceNextLose" - 1, "updatedAt" = NOW()
        WHERE id = $1 AND "forceNextLose" > 0
      `, [target.id]);
    }
  }

  // ==========================================
  // CONTROL STATE
  // ==========================================

  getManualControl(symbol: string): ManualControl | null {
    return this.controls.get(symbol) || null;
  }

  getAllManualControls(): ManualControl[] {
    return Array.from(this.controls.values()).filter(c => c.isActive);
  }

  /**
   * Reset all controls for a symbol to default values
   * This is a convenience method for admins to fully reset a symbol
   */
  async resetAllControls(symbol: string, adminId: string): Promise<void> {
    const existing = this.controls.get(symbol);
    const previousValue = existing
      ? {
          directionBias: existing.directionBias,
          directionStrength: existing.directionStrength,
          volatilityMultiplier: existing.volatilityMultiplier,
          priceOverride: existing.priceOverride
        }
      : null;

    // Clear all timers
    this.clearDirectionBiasTimer(symbol);
    this.clearVolatilityTimer(symbol);
    const priceTimer = this.priceOverrideTimers.get(symbol);
    if (priceTimer) {
      clearTimeout(priceTimer);
      this.priceOverrideTimers.delete(symbol);
    }

    // Reset in database
    await query(`
      UPDATE "OTCManualControl"
      SET
        "directionBias" = 0,
        "directionStrength" = 0,
        "directionBiasExpiry" = NULL,
        "volatilityMultiplier" = 1.0,
        "volatilityExpiry" = NULL,
        "priceOverride" = NULL,
        "priceOverrideExpiry" = NULL,
        "updatedAt" = NOW(),
        "updatedBy" = $2
      WHERE symbol = $1
    `, [symbol, adminId]);

    // Update cache
    if (existing) {
      existing.directionBias = 0;
      existing.directionStrength = 0;
      existing.directionBiasExpiry = null;
      existing.volatilityMultiplier = 1.0;
      existing.volatilityExpiry = null;
      existing.priceOverride = null;
      existing.priceOverrideExpiry = null;
      existing.updatedAt = new Date();
      existing.updatedBy = adminId;
    }

    // Log intervention
    if (previousValue) {
      await this.logIntervention({
        adminId,
        actionType: 'PRICE_BIAS', // Use existing type for audit
        targetType: 'SYMBOL',
        targetId: symbol,
        previousValue,
        newValue: {
          directionBias: 0,
          directionStrength: 0,
          volatilityMultiplier: 1.0,
          priceOverride: null,
          action: 'RESET_ALL'
        },
        reason: 'Reset all controls to default'
      });
    }

    logger.info(`[ManualControl] All controls reset for ${symbol}`, { adminId });
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================

  async getInterventionLog(filters: InterventionLogFilters): Promise<{
    logs: ManualIntervention[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: (string | Date | number)[] = [];
    let paramIndex = 1;

    if (filters.actionType) {
      conditions.push(`"actionType" = $${paramIndex++}`);
      params.push(filters.actionType);
    }

    if (filters.targetType) {
      conditions.push(`"targetType" = $${paramIndex++}`);
      params.push(filters.targetType);
    }

    if (filters.targetId) {
      conditions.push(`"targetId" = $${paramIndex++}`);
      params.push(filters.targetId);
    }

    if (filters.from) {
      conditions.push(`"createdAt" >= $${paramIndex++}`);
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push(`"createdAt" <= $${paramIndex++}`);
      params.push(filters.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "OTCManualIntervention" ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get logs
    const logs = await queryMany<{
      id: string;
      adminId: string;
      actionType: string;
      targetType: string;
      targetId: string;
      previousValue: Record<string, unknown> | null;
      newValue: Record<string, unknown>;
      reason: string | null;
      createdAt: Date;
      adminName: string;
      adminEmail: string;
    }>(`
      SELECT mi.*, u.name as "adminName", u.email as "adminEmail"
      FROM "OTCManualIntervention" mi
      JOIN "User" u ON mi."adminId" = u.id
      ${whereClause}
      ORDER BY mi."createdAt" DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);

    return {
      logs: logs.map(l => ({
        id: l.id,
        adminId: l.adminId,
        actionType: l.actionType as ManualActionType,
        targetType: l.targetType as ManualTargetType,
        targetId: l.targetId,
        previousValue: l.previousValue,
        newValue: l.newValue,
        reason: l.reason,
        createdAt: l.createdAt
      })),
      total
    };
  }

  private async logIntervention(intervention: {
    adminId: string;
    actionType: ManualActionType;
    targetType: ManualTargetType;
    targetId: string;
    previousValue: Record<string, unknown> | null;
    newValue: Record<string, unknown>;
    reason?: string;
  }): Promise<void> {
    try {
      await query(`
        INSERT INTO "OTCManualIntervention" (
          id, "adminId", "actionType", "targetType", "targetId",
          "previousValue", "newValue", reason, "createdAt"
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        intervention.adminId,
        intervention.actionType,
        intervention.targetType,
        intervention.targetId,
        intervention.previousValue ? JSON.stringify(intervention.previousValue) : null,
        JSON.stringify(intervention.newValue),
        intervention.reason || null
      ]);
    } catch (error) {
      logger.error('[ManualControl] Failed to log intervention', { intervention, error });
    }
  }
}

// Singleton instance
export const manualControlService = new ManualControlService();
