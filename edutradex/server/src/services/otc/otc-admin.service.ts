/**
 * OTC Admin Service
 *
 * Provides administrative functions for managing OTC market configurations:
 * - CRUD operations for OTC configs
 * - Real-time exposure monitoring
 * - Activity logging
 * - System statistics
 */

import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';
import type { OTCPriceConfig, RiskConfig } from './types.js';
import { otcMarketService } from './otc-market.service.js';

interface OTCConfigRow {
  id: string;
  symbol: string;
  baseSymbol: string;
  marketType: string;
  name: string;
  pipSize: number;
  isEnabled: boolean;
  riskEnabled: boolean;
  is24Hours: boolean;
  baseVolatility: number;
  volatilityMultiplier: number;
  meanReversionStrength: number;
  maxDeviationPercent: number;
  priceOffsetPips: number;
  momentumFactor: number;
  garchAlpha: number;
  garchBeta: number;
  garchOmega: number;
  exposureThreshold: number;
  minInterventionRate: number;
  maxInterventionRate: number;
  spreadMultiplier: number;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  anchoringDurationMins: number;
  createdAt: Date;
  updatedAt: Date;
}

interface OTCExposureRow {
  id: string;
  symbol: string;
  totalUpAmount: number;
  totalDownAmount: number;
  activeUpTrades: number;
  activeDownTrades: number;
  netExposure: number;
  exposureRatio: number;
  brokerRiskAmount: number;
  totalInterventions: number;
  successfulInterventions: number;
  totalTradesProcessed: number;
  lastUpdated: Date;
}

interface OTCActivityRow {
  id: string;
  symbol: string;
  eventType: string;
  details: any;
  userId: string | null;
  timestamp: Date;
}

interface GetConfigsOptions {
  marketType?: string;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
}

interface CreateConfigInput {
  symbol: string;
  baseSymbol: string;
  marketType: string;
  name: string;
  pipSize: number;
  isEnabled?: boolean;
  riskEnabled?: boolean;
  is24Hours?: boolean;
  baseVolatility?: number;
  volatilityMultiplier?: number;
  meanReversionStrength?: number;
  maxDeviationPercent?: number;
  priceOffsetPips?: number;
  momentumFactor?: number;
  garchAlpha?: number;
  garchBeta?: number;
  garchOmega?: number;
  exposureThreshold?: number;
  minInterventionRate?: number;
  maxInterventionRate?: number;
  spreadMultiplier?: number;
  payoutPercent?: number;
  minTradeAmount?: number;
  maxTradeAmount?: number;
  anchoringDurationMins?: number;
}

interface UpdateConfigInput {
  name?: string;
  pipSize?: number;
  isEnabled?: boolean;
  riskEnabled?: boolean;
  is24Hours?: boolean;
  baseVolatility?: number;
  volatilityMultiplier?: number;
  meanReversionStrength?: number;
  maxDeviationPercent?: number;
  priceOffsetPips?: number;
  momentumFactor?: number;
  garchAlpha?: number;
  garchBeta?: number;
  garchOmega?: number;
  exposureThreshold?: number;
  minInterventionRate?: number;
  maxInterventionRate?: number;
  spreadMultiplier?: number;
  payoutPercent?: number;
  minTradeAmount?: number;
  maxTradeAmount?: number;
  anchoringDurationMins?: number;
}

interface GetActivityLogOptions {
  symbol?: string;
  actionType?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

class OTCAdminServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'OTCAdminServiceError';
  }
}

export class OTCAdminService {
  /**
   * Get all OTC configurations with optional filters
   */
  async getAllConfigs(
    options: GetConfigsOptions = {}
  ): Promise<{ configs: OTCConfigRow[]; total: number; page: number; limit: number }> {
    const { marketType, isEnabled, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (marketType) {
      whereClause += ` AND "marketType" = $${paramIndex++}`;
      params.push(marketType);
    }

    if (isEnabled !== undefined) {
      whereClause += ` AND "isEnabled" = $${paramIndex++}`;
      params.push(isEnabled);
    }

    const [configs, countResult] = await Promise.all([
      queryMany<OTCConfigRow>(
        `SELECT * FROM "OTCConfig" WHERE ${whereClause}
         ORDER BY "marketType", symbol
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "OTCConfig" WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      configs,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  /**
   * Get a single OTC config by ID
   */
  async getConfigById(id: string): Promise<OTCConfigRow | null> {
    return queryOne<OTCConfigRow>(
      `SELECT * FROM "OTCConfig" WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get a single OTC config by symbol
   */
  async getConfigBySymbol(symbol: string): Promise<OTCConfigRow | null> {
    return queryOne<OTCConfigRow>(
      `SELECT * FROM "OTCConfig" WHERE symbol = $1`,
      [symbol]
    );
  }

  /**
   * Create a new OTC configuration
   */
  async createConfig(input: CreateConfigInput, adminId?: string): Promise<OTCConfigRow> {
    // Check if symbol already exists
    const existing = await this.getConfigBySymbol(input.symbol);
    if (existing) {
      throw new OTCAdminServiceError(`OTC config for symbol ${input.symbol} already exists`, 409);
    }

    const id = randomUUID();
    const now = new Date();

    const config = await queryOne<OTCConfigRow>(`
      INSERT INTO "OTCConfig" (
        id, symbol, "baseSymbol", "marketType", name, "pipSize",
        "isEnabled", "riskEnabled", "is24Hours",
        "baseVolatility", "volatilityMultiplier", "meanReversionStrength",
        "maxDeviationPercent", "priceOffsetPips", "momentumFactor",
        "garchAlpha", "garchBeta", "garchOmega",
        "exposureThreshold", "minInterventionRate", "maxInterventionRate", "spreadMultiplier",
        "payoutPercent", "minTradeAmount", "maxTradeAmount",
        "anchoringDurationMins", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25,
        $26, $27, $28
      ) RETURNING *
    `, [
      id,
      input.symbol,
      input.baseSymbol,
      input.marketType,
      input.name,
      input.pipSize,
      input.isEnabled ?? true,
      input.riskEnabled ?? true,
      input.is24Hours ?? true,
      input.baseVolatility ?? 0.0003,
      input.volatilityMultiplier ?? 1.0,
      input.meanReversionStrength ?? 0.0015,
      input.maxDeviationPercent ?? 1.5,
      input.priceOffsetPips ?? 2.0,
      input.momentumFactor ?? 0.15,
      input.garchAlpha ?? 0.08,
      input.garchBeta ?? 0.88,
      input.garchOmega ?? 0.04,
      input.exposureThreshold ?? 0.35,
      input.minInterventionRate ?? 0.25,
      input.maxInterventionRate ?? 0.40,
      input.spreadMultiplier ?? 1.5,
      input.payoutPercent ?? 85,
      input.minTradeAmount ?? 1,
      input.maxTradeAmount ?? 1000,
      input.anchoringDurationMins ?? 15,
      now,
      now,
    ]);

    if (!config) {
      throw new OTCAdminServiceError('Failed to create OTC config', 500);
    }

    // Initialize the price generator for the new symbol
    await otcMarketService.reloadConfig(config.symbol);

    // Log activity
    await this.logActivity(input.symbol, 'CONFIG_CREATED', { config }, adminId);

    logger.info('OTC config created', { symbol: input.symbol, id });

    return config;
  }

  /**
   * Update an existing OTC configuration
   */
  async updateConfig(id: string, input: UpdateConfigInput, adminId?: string): Promise<OTCConfigRow> {
    const existing = await this.getConfigById(id);
    if (!existing) {
      throw new OTCAdminServiceError('OTC config not found', 404);
    }

    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateConfigInput)[] = [
      'name', 'pipSize', 'isEnabled', 'riskEnabled', 'is24Hours',
      'baseVolatility', 'volatilityMultiplier', 'meanReversionStrength',
      'maxDeviationPercent', 'priceOffsetPips', 'momentumFactor',
      'garchAlpha', 'garchBeta', 'garchOmega',
      'exposureThreshold', 'minInterventionRate', 'maxInterventionRate', 'spreadMultiplier',
      'payoutPercent', 'minTradeAmount', 'maxTradeAmount',
      'anchoringDurationMins',
    ];

    for (const field of fields) {
      if (input[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, (match) => `${match}`);
        updates.push(`"${dbField}" = $${paramIndex++}`);
        params.push(input[field]);
      }
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const config = await queryOne<OTCConfigRow>(
      `UPDATE "OTCConfig" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (!config) {
      throw new OTCAdminServiceError('Failed to update OTC config', 500);
    }

    // Reload the config in the market service (handles enable/disable and settings changes)
    await otcMarketService.reloadConfig(config.symbol);

    // Log activity
    await this.logActivity(existing.symbol, 'CONFIG_UPDATED', {
      previous: existing,
      updated: input,
    }, adminId);

    logger.info('OTC config updated', { symbol: existing.symbol, id, updates: input });

    return config;
  }

  /**
   * Delete an OTC configuration
   */
  async deleteConfig(id: string, adminId?: string): Promise<void> {
    const existing = await this.getConfigById(id);
    if (!existing) {
      throw new OTCAdminServiceError('OTC config not found', 404);
    }

    await query(`DELETE FROM "OTCConfig" WHERE id = $1`, [id]);

    // Remove from the market service
    await otcMarketService.reloadConfig(existing.symbol);

    // Log activity
    await this.logActivity(existing.symbol, 'CONFIG_DELETED', { config: existing }, adminId);

    logger.info('OTC config deleted', { symbol: existing.symbol, id });
  }

  /**
   * Get current exposure for a symbol
   */
  async getSymbolExposure(symbol: string): Promise<OTCExposureRow | null> {
    return queryOne<OTCExposureRow>(
      `SELECT * FROM "OTCRiskExposure" WHERE symbol = $1`,
      [symbol]
    );
  }

  /**
   * Get exposure for all active symbols
   */
  async getAllExposures(): Promise<OTCExposureRow[]> {
    return queryMany<OTCExposureRow>(
      `SELECT e.* FROM "OTCRiskExposure" e
       INNER JOIN "OTCConfig" c ON e.symbol = c.symbol
       WHERE c."isEnabled" = true
       ORDER BY e."netExposure" DESC`
    );
  }

  /**
   * Get OTC system statistics
   */
  async getOTCStats(): Promise<{
    totalConfigs: number;
    enabledConfigs: number;
    forexConfigs: number;
    cryptoConfigs: number;
    totalExposure: number;
    interventionsToday: number;
  }> {
    const [configStats, exposureSum, interventionCount] = await Promise.all([
      queryOne<{
        total: string;
        enabled: string;
        forex: string;
        crypto: string;
      }>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE "isEnabled" = true) as enabled,
          COUNT(*) FILTER (WHERE "marketType" = 'FOREX') as forex,
          COUNT(*) FILTER (WHERE "marketType" = 'CRYPTO') as crypto
        FROM "OTCConfig"
      `),
      queryOne<{ sum: number }>(`
        SELECT COALESCE(SUM(ABS("netExposure")), 0) as sum
        FROM "OTCRiskExposure"
      `),
      queryOne<{ count: string }>(`
        SELECT COUNT(*) as count
        FROM "OTCActivityLog"
        WHERE "eventType" = 'RISK_INTERVENTION'
        AND timestamp >= CURRENT_DATE
      `),
    ]);

    return {
      totalConfigs: parseInt(configStats?.total || '0', 10),
      enabledConfigs: parseInt(configStats?.enabled || '0', 10),
      forexConfigs: parseInt(configStats?.forex || '0', 10),
      cryptoConfigs: parseInt(configStats?.crypto || '0', 10),
      totalExposure: exposureSum?.sum || 0,
      interventionsToday: parseInt(interventionCount?.count || '0', 10),
    };
  }

  /**
   * Get activity log with filters
   */
  async getActivityLog(
    options: GetActivityLogOptions = {}
  ): Promise<{ logs: OTCActivityRow[]; total: number; page: number; limit: number }> {
    const { symbol, actionType, from, to, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (symbol) {
      whereClause += ` AND symbol = $${paramIndex++}`;
      params.push(symbol);
    }

    if (actionType) {
      whereClause += ` AND "eventType" = $${paramIndex++}`;
      params.push(actionType);
    }

    if (from) {
      whereClause += ` AND timestamp >= $${paramIndex++}`;
      params.push(from);
    }

    if (to) {
      whereClause += ` AND timestamp <= $${paramIndex++}`;
      params.push(to);
    }

    const [logs, countResult] = await Promise.all([
      queryMany<OTCActivityRow>(
        `SELECT * FROM "OTCActivityLog" WHERE ${whereClause}
         ORDER BY timestamp DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "OTCActivityLog" WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      logs,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  /**
   * Get price history for a symbol
   */
  async getPriceHistory(
    symbol: string,
    options: { from?: Date; to?: Date; limit?: number } = {}
  ): Promise<any[]> {
    const { from, to, limit = 100 } = options;

    let whereClause = 'symbol = $1';
    const params: any[] = [symbol];
    let paramIndex = 2;

    if (from) {
      whereClause += ` AND timestamp >= $${paramIndex++}`;
      params.push(from);
    }

    if (to) {
      whereClause += ` AND timestamp <= $${paramIndex++}`;
      params.push(to);
    }

    params.push(limit);

    return queryMany(
      `SELECT * FROM "OTCPriceHistory" WHERE ${whereClause}
       ORDER BY timestamp DESC LIMIT $${paramIndex}`,
      params
    );
  }

  /**
   * Log OTC activity
   */
  private async logActivity(
    symbol: string,
    eventType: string,
    details: any,
    userId?: string
  ): Promise<void> {
    await query(`
      INSERT INTO "OTCActivityLog" (id, symbol, "eventType", details, "userId", timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [randomUUID(), symbol, eventType, JSON.stringify(details), userId || null, new Date()]);
  }

  /**
   * Bulk toggle enabled status for multiple configs
   */
  async bulkToggleEnabled(ids: string[], enabled: boolean, adminId?: string): Promise<number> {
    const result = await query(
      `UPDATE "OTCConfig" SET "isEnabled" = $1, "updatedAt" = $2 WHERE id = ANY($3)`,
      [enabled, new Date(), ids]
    );

    const affected = result.rowCount || 0;

    if (affected > 0) {
      await this.logActivity('BULK', 'BULK_TOGGLE', { ids, enabled, count: affected }, adminId);
      logger.info('Bulk toggle OTC configs', { count: affected, enabled });
    }

    return affected;
  }

  /**
   * Bulk toggle risk engine for multiple configs
   */
  async bulkToggleRisk(ids: string[], riskEnabled: boolean, adminId?: string): Promise<number> {
    const result = await query(
      `UPDATE "OTCConfig" SET "riskEnabled" = $1, "updatedAt" = $2 WHERE id = ANY($3)`,
      [riskEnabled, new Date(), ids]
    );

    const affected = result.rowCount || 0;

    if (affected > 0) {
      await this.logActivity('BULK', 'BULK_RISK_TOGGLE', { ids, riskEnabled, count: affected }, adminId);
      logger.info('Bulk toggle OTC risk engine', { count: affected, riskEnabled });
    }

    return affected;
  }

  /**
   * Reset exposure data for a symbol
   */
  async resetExposure(symbol: string, adminId?: string): Promise<void> {
    await query(`DELETE FROM "OTCRiskExposure" WHERE symbol = $1`, [symbol]);
    await query(`DELETE FROM "OTCTradeExposure" WHERE symbol = $1`, [symbol]);

    await this.logActivity(symbol, 'EXPOSURE_RESET', {}, adminId);
    logger.info('OTC exposure reset', { symbol });
  }
}

export const otcAdminService = new OTCAdminService();
export { OTCAdminServiceError };
