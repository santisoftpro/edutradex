/**
 * OTC Market System - Type Definitions
 * Professional-grade binary options OTC market implementation
 */

// ==========================================
// PRICE GENERATION TYPES
// ==========================================

export interface OTCPriceConfig {
  symbol: string;
  baseSymbol: string;
  marketType: 'FOREX' | 'CRYPTO';
  pipSize: number;

  // Volatility parameters
  baseVolatility: number;
  volatilityMultiplier: number;
  momentumFactor: number;

  // GARCH parameters for volatility clustering
  garchAlpha: number;
  garchBeta: number;
  garchOmega: number;

  // Mean reversion
  meanReversionStrength: number;
  maxDeviationPercent: number;
  priceOffsetPips: number;
}

export interface PriceState {
  symbol: string;
  currentPrice: number;
  lastRealPrice: number;
  volatilityState: number;
  momentum: number;
  lastReturn: number;
  lastUpdate: number;
  priceHistory: number[];
}

export interface OTCPriceTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: Date;
  priceMode: PriceMode;
  volatilityState: number;
  change: number;
  changePercent: number;
}

// ==========================================
// RISK ENGINE TYPES
// ==========================================

export interface RiskConfig {
  symbol: string;
  riskEnabled: boolean;
  exposureThreshold: number;
  minInterventionRate: number;
  maxInterventionRate: number;
  spreadMultiplier: number;
  pipSize: number;
  payoutPercent: number;
}

export interface TradeInfo {
  tradeId: string;
  userId: string;
  amount: number;
  entryPrice: number;
  direction: 'UP' | 'DOWN';
  expiresAt: Date;
}

export interface SymbolExposure {
  symbol: string;
  upTrades: TradeInfo[];
  downTrades: TradeInfo[];
  totalUpAmount: number;
  totalDownAmount: number;
  netExposure: number;
  exposureRatio: number;
  brokerRiskAmount: number;
}

export interface ExitPriceResult {
  exitPrice: number;
  influenced: boolean;
  interventionProbability: number;
  reason: string;
  originalPrice: number;
}

export interface InterventionDecision {
  shouldIntervene: boolean;
  probability: number;
  direction: 'FAVOR_BROKER' | 'NO_INTERVENTION';
  reason: string;
}

// ==========================================
// SCHEDULER TYPES
// ==========================================

export type PriceMode = 'REAL' | 'OTC' | 'ANCHORING' | 'SYNTHETIC' | 'SEEDED';

export interface MarketSession {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  currentSession?: string;
}

export interface AnchoringState {
  symbol: string;
  startTime: number;
  startOtcPrice: number;
  targetRealPrice: number;
  durationMs: number;
}

// ==========================================
// ACTIVITY LOG TYPES
// ==========================================

export type OTCEventType =
  | 'PRICE_GENERATED'
  | 'MODE_SWITCH'
  | 'TRADE_TRACKED'
  | 'TRADE_REMOVED'
  | 'INTERVENTION_APPLIED'
  | 'INTERVENTION_SKIPPED'
  | 'EXPOSURE_WARNING'
  | 'ANCHORING_STARTED'
  | 'ANCHORING_COMPLETED'
  | 'CONFIG_UPDATED'
  | 'SYSTEM_ERROR';

export interface OTCActivityEvent {
  symbol: string;
  eventType: OTCEventType;
  tradeId?: string;
  userId?: string;
  priceMode?: PriceMode;
  exposureRatio?: number;
  interventionProbability?: number;
  marketPrice?: number;
  adjustedPrice?: number;
  entryPrice?: number;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

// ==========================================
// SERVICE INTERFACES
// ==========================================

export interface IOTCPriceGenerator {
  initializeSymbol(config: OTCPriceConfig, initialPrice: number): void;
  updateRealPrice(symbol: string, realPrice: number): void;
  generateNextPrice(symbol: string): OTCPriceTick | null;
  getRealBasedPrice(symbol: string, realPrice: number): OTCPriceTick | null;
  getCurrentPrice(symbol: string): number | null;
  getState(symbol: string): PriceState | null;
}

export interface IRiskEngine {
  setConfig(symbol: string, config: RiskConfig): void;
  trackTrade(trade: TradeInfo & { symbol: string }): Promise<void>;
  removeTrade(tradeId: string, symbol: string): Promise<void>;
  calculateExitPrice(
    trade: { id: string; symbol: string; direction: 'UP' | 'DOWN'; amount: number; entryPrice: number },
    marketPrice: number
  ): ExitPriceResult;
  getExposure(symbol: string): SymbolExposure | null;
  getAllExposures(): SymbolExposure[];
}

export interface IOTCScheduler {
  isRealMarketOpen(symbol: string, marketType: string): boolean;
  getPriceMode(symbol: string, marketType: string): PriceMode;
  getMarketSession(symbol: string, marketType: string): MarketSession;
  getAnchoringProgress(symbol: string): number;
  getAnchoredPrice(symbol: string, otcPrice: number, realPrice: number): number;
}

// ==========================================
// DATABASE ROW TYPES
// ==========================================

export interface OTCConfigRow {
  id: string;
  symbol: string;
  baseSymbol: string;
  marketType: string;
  name: string;
  isEnabled: boolean;
  baseVolatility: number;
  volatilityMultiplier: number;
  meanReversionStrength: number;
  maxDeviationPercent: number;
  priceOffsetPips: number;
  momentumFactor: number;
  garchAlpha: number;
  garchBeta: number;
  garchOmega: number;
  riskEnabled: boolean;
  exposureThreshold: number;
  minInterventionRate: number;
  maxInterventionRate: number;
  spreadMultiplier: number;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  pipSize: number;
  is24Hours: boolean;
  anchoringDurationMins: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OTCRiskExposureRow {
  id: string;
  configId: string;
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
  totalInterventions: number;
  successfulInterventions: number;
  totalTradesProcessed: number;
  peakExposureRatio: number;
  peakExposureTime: Date | null;
  lastUpdated: Date;
  createdAt: Date;
}

// ==========================================
// MANUAL CONTROL TYPES
// ==========================================

export type ManualActionType =
  | 'PRICE_BIAS'
  | 'VOLATILITY'
  | 'PRICE_OVERRIDE'
  | 'TRADE_FORCE'
  | 'USER_TARGET';

export type ManualTargetType = 'SYMBOL' | 'TRADE' | 'USER';

export interface ManualControl {
  symbol: string;
  directionBias: number;      // -100 to +100
  directionStrength: number;  // 0 to 1
  directionBiasExpiry: Date | null;  // null = permanent
  volatilityMultiplier: number;
  volatilityExpiry: Date | null;  // null = permanent
  priceOverride: number | null;
  priceOverrideExpiry: Date | null;
  isActive: boolean;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface UserTargeting {
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
}

export interface ManualIntervention {
  id: string;
  adminId: string;
  actionType: ManualActionType;
  targetType: ManualTargetType;
  targetId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  reason: string | null;
  createdAt: Date;
}

export interface DirectionBiasInput {
  bias: number;
  strength: number;
  durationMinutes?: number;  // null/undefined = permanent, otherwise auto-resets
  reason?: string;
}

export interface VolatilityInput {
  multiplier: number;
  durationMinutes?: number;  // null/undefined = permanent, otherwise auto-resets
  reason?: string;
}

export interface PriceOverrideInput {
  price: number;
  expiryMinutes: number;
  reason?: string;
}

export interface ForceTradeOutcomeInput {
  outcome: 'WIN' | 'LOSE';
  reason?: string;
}

export interface UserTargetingInput {
  symbol?: string;
  targetWinRate?: number;
  forceNextWin?: number;
  forceNextLose?: number;
  reason?: string;
}

export interface ActiveTradeInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  expiresAt: Date;
  timeLeftMs: number;
  accountType: string;
}

export interface IManualControlService {
  // Initialization
  loadFromDatabase(): Promise<void>;

  // Price Direction
  setDirectionBias(symbol: string, bias: number, strength: number, adminId: string, durationMinutes?: number, reason?: string): Promise<void>;
  getDirectionBias(symbol: string): { bias: number; strength: number };
  clearDirectionBias(symbol: string, adminId: string): Promise<void>;

  // Volatility
  setVolatilityMultiplier(symbol: string, multiplier: number, adminId: string, durationMinutes?: number, reason?: string): Promise<void>;
  getVolatilityMultiplier(symbol: string): number;
  clearVolatilityMultiplier(symbol: string, adminId: string): Promise<void>;

  // Price Override
  setPriceOverride(symbol: string, price: number, expiryMinutes: number, adminId: string, reason?: string): Promise<void>;
  getPriceOverride(symbol: string): number | null;
  clearPriceOverride(symbol: string, adminId: string): Promise<void>;

  // Trade Targeting
  forceTradeOutcome(tradeId: string, outcome: 'WIN' | 'LOSE', adminId: string, reason?: string): Promise<void>;
  getForcedOutcome(tradeId: string): 'WIN' | 'LOSE' | null;
  clearForcedOutcome(tradeId: string): void;
  getActiveTrades(symbol?: string): Promise<ActiveTradeInfo[]>;

  // User Targeting
  setUserTargeting(userId: string, config: UserTargetingInput, adminId: string): Promise<void>;
  getUserTargeting(userId: string, symbol?: string): UserTargeting | null;
  getAllUserTargets(): Promise<UserTargeting[]>;
  removeUserTargeting(userId: string, symbol: string | null, adminId: string): Promise<void>;
  decrementForceNextWin(userId: string, symbol: string | null): Promise<void>;
  decrementForceNextLose(userId: string, symbol: string | null): Promise<void>;

  // Control state
  getManualControl(symbol: string): ManualControl | null;
  getAllManualControls(): ManualControl[];

  // Audit
  getInterventionLog(filters: InterventionLogFilters): Promise<{ logs: ManualIntervention[]; total: number }>;
}

export interface InterventionLogFilters {
  actionType?: ManualActionType;
  targetType?: ManualTargetType;
  targetId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

// ==========================================
// SYNTHETIC HISTORY GENERATOR TYPES
// ==========================================

/**
 * Configuration for synthetic history generation
 */
export interface SyntheticGeneratorConfig {
  symbol: string;
  anchorPrice: number;
  anchorTimestamp: Date;
  candleCount: number;
  resolutionSeconds: number;
  marketType: 'FOREX' | 'CRYPTO';
  pipSize: number;
  baseVolatility: number;
}

/**
 * Wave state for backwards generation
 */
export interface SyntheticWaveState {
  direction: 1 | -1;
  remainingCandles: number;
  targetPips: number;
  progressPips: number;
  inPullback: boolean;
  pullbackRemaining: number;
  pullbackDirection: 1 | -1;
}

/**
 * Generated synthetic candle
 */
export interface SyntheticCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Result of synthetic history generation
 */
export interface SyntheticGenerationResult {
  symbol: string;
  candlesGenerated: number;
  oldestTimestamp: Date;
  newestTimestamp: Date;
  priceRange: { min: number; max: number };
  anchorPrice: number;
  executionTimeMs: number;
}

/**
 * Options for synthetic history generation
 */
export interface SyntheticGenerationOptions {
  candleCount?: number;
  resolutionSeconds?: number;
}

/**
 * Anchor point for backwards generation
 */
export interface AnchorPoint {
  price: number;
  timestamp: Date;
  source: 'EXISTING_HISTORY' | 'LIVE_PRICE' | 'DEFAULT';
}
