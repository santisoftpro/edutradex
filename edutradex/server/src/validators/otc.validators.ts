import { z } from 'zod';

// Schema for listing OTC configs
export const getOTCConfigsQuerySchema = z.object({
  marketType: z.enum(['FOREX', 'CRYPTO']).optional(),
  isEnabled: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Schema for OTC config ID param
export const otcConfigIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Schema for OTC symbol param
export const otcSymbolSchema = z.object({
  params: z.object({
    symbol: z.string().min(1),
  }),
});

// Schema for creating a new OTC config
export const createOTCConfigSchema = z.object({
  symbol: z.string().min(1).max(50),
  baseSymbol: z.string().min(1).max(50),
  marketType: z.enum(['FOREX', 'CRYPTO']),
  name: z.string().min(1).max(100),
  pipSize: z.number().positive(),
  isEnabled: z.boolean().default(true),
  riskEnabled: z.boolean().default(true),
  is24Hours: z.boolean().default(true),

  // Price generation parameters
  baseVolatility: z.number().min(0.0001).max(0.1).default(0.0003),
  volatilityMultiplier: z.number().min(0.1).max(5).default(1.0),
  meanReversionStrength: z.number().min(0).max(0.1).default(0.0015),
  maxDeviationPercent: z.number().min(0.1).max(10).default(1.5),
  priceOffsetPips: z.number().min(0).max(100).default(2.0),
  momentumFactor: z.number().min(0).max(1).default(0.15),

  // GARCH parameters
  garchAlpha: z.number().min(0).max(1).default(0.08),
  garchBeta: z.number().min(0).max(1).default(0.88),
  garchOmega: z.number().min(0).max(1).default(0.04),

  // Risk engine parameters
  exposureThreshold: z.number().min(0.1).max(0.9).default(0.35),
  minInterventionRate: z.number().min(0).max(1).default(0.25),
  maxInterventionRate: z.number().min(0).max(1).default(0.40),
  spreadMultiplier: z.number().min(1).max(5).default(1.5),

  // Trade limits
  payoutPercent: z.number().min(50).max(100).default(85),
  minTradeAmount: z.number().min(0.01).default(1),
  maxTradeAmount: z.number().min(1).default(1000),

  // Anchoring
  anchoringDurationMins: z.number().min(1).max(60).default(15),
});

// Schema for updating an OTC config
export const updateOTCConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pipSize: z.number().positive().optional(),
  isEnabled: z.boolean().optional(),
  riskEnabled: z.boolean().optional(),
  is24Hours: z.boolean().optional(),

  // Price generation parameters
  baseVolatility: z.number().min(0.0001).max(0.1).optional(),
  volatilityMultiplier: z.number().min(0.1).max(5).optional(),
  meanReversionStrength: z.number().min(0).max(0.1).optional(),
  maxDeviationPercent: z.number().min(0.1).max(10).optional(),
  priceOffsetPips: z.number().min(0).max(100).optional(),
  momentumFactor: z.number().min(0).max(1).optional(),

  // GARCH parameters
  garchAlpha: z.number().min(0).max(1).optional(),
  garchBeta: z.number().min(0).max(1).optional(),
  garchOmega: z.number().min(0).max(1).optional(),

  // Risk engine parameters
  exposureThreshold: z.number().min(0.1).max(0.9).optional(),
  minInterventionRate: z.number().min(0).max(1).optional(),
  maxInterventionRate: z.number().min(0).max(1).optional(),
  spreadMultiplier: z.number().min(1).max(5).optional(),

  // Trade limits
  payoutPercent: z.number().min(50).max(100).optional(),
  minTradeAmount: z.number().min(0.01).optional(),
  maxTradeAmount: z.number().min(1).optional(),

  // Anchoring
  anchoringDurationMins: z.number().min(1).max(60).optional(),
});

// Schema for OTC price history query
export const getOTCPriceHistorySchema = z.object({
  params: z.object({
    symbol: z.string().min(1),
  }),
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
  }),
});

// Schema for OTC exposure query
export const getOTCExposureSchema = z.object({
  params: z.object({
    symbol: z.string().min(1),
  }),
});

// Schema for OTC activity log query
export const getOTCActivityLogSchema = z.object({
  query: z.object({
    symbol: z.string().optional(),
    actionType: z.enum(['CONFIG_CREATED', 'CONFIG_UPDATED', 'RISK_INTERVENTION', 'PRICE_ANCHORED']).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

// ==========================================
// MANUAL CONTROL SCHEMAS
// ==========================================

// Schema for setting direction bias
export const setDirectionBiasSchema = z.object({
  bias: z.number().min(-100).max(100),
  strength: z.number().min(0).max(1),
  durationMinutes: z.number().int().min(1).max(1440).optional(), // Max 24 hours, null = permanent
  reason: z.string().max(500).optional(),
});

// Schema for setting volatility multiplier
// Note: Price generator caps at 2x max for realistic movement
export const setVolatilitySchema = z.object({
  multiplier: z.number().min(0.1).max(2),
  durationMinutes: z.number().int().min(1).max(1440).optional(), // Max 24 hours, null = permanent
  reason: z.string().max(500).optional(),
});

// Schema for setting price override
export const setPriceOverrideSchema = z.object({
  price: z.number().positive(),
  expiryMinutes: z.number().int().min(1).max(1440), // Max 24 hours
  reason: z.string().max(500).optional(),
});

// Schema for forcing trade outcome
export const forceTradeOutcomeSchema = z.object({
  outcome: z.enum(['WIN', 'LOSE']),
  reason: z.string().max(500).optional(),
});

// Schema for setting user targeting
export const setUserTargetingSchema = z.object({
  symbol: z.string().optional(),
  targetWinRate: z.number().min(0).max(100).optional(),
  forceNextWin: z.number().int().min(0).max(100).optional(),
  forceNextLose: z.number().int().min(0).max(100).optional(),
  reason: z.string().max(500).optional(),
});

// Schema for user ID param
export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

// Schema for trade ID param
export const tradeIdParamSchema = z.object({
  params: z.object({
    tradeId: z.string().uuid(),
  }),
});

// Schema for intervention log query
export const getInterventionLogSchema = z.object({
  query: z.object({
    actionType: z.enum(['PRICE_BIAS', 'VOLATILITY', 'PRICE_OVERRIDE', 'TRADE_FORCE', 'USER_TARGET']).optional(),
    targetType: z.enum(['SYMBOL', 'TRADE', 'USER']).optional(),
    targetId: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

// Schema for active trades query
export const getActiveTradesSchema = z.object({
  query: z.object({
    symbol: z.string().optional(),
  }),
});

// Type exports
export type GetOTCConfigsQuery = z.infer<typeof getOTCConfigsQuerySchema>;
export type CreateOTCConfigInput = z.infer<typeof createOTCConfigSchema>;
export type UpdateOTCConfigInput = z.infer<typeof updateOTCConfigSchema>;
export type GetOTCPriceHistoryQuery = z.infer<typeof getOTCPriceHistorySchema>;
export type GetOTCExposureQuery = z.infer<typeof getOTCExposureSchema>;
export type GetOTCActivityLogQuery = z.infer<typeof getOTCActivityLogSchema>;

// Manual control type exports
export type SetDirectionBiasInput = z.infer<typeof setDirectionBiasSchema>;
export type SetVolatilityInput = z.infer<typeof setVolatilitySchema>;
export type SetPriceOverrideInput = z.infer<typeof setPriceOverrideSchema>;
export type ForceTradeOutcomeInput = z.infer<typeof forceTradeOutcomeSchema>;
export type SetUserTargetingInput = z.infer<typeof setUserTargetingSchema>;
export type GetInterventionLogQuery = z.infer<typeof getInterventionLogSchema>;
export type GetActiveTradesQuery = z.infer<typeof getActiveTradesSchema>;
