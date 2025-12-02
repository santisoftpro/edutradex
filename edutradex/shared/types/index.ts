// ============================================================================
// User Types
// ============================================================================

export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  demoBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: Role;
  demoBalance: number;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// ============================================================================
// Trade Types
// ============================================================================

export type MarketType = 'FOREX' | 'OTC' | 'SYNTHETIC';
export type Direction = 'UP' | 'DOWN';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type TradeResult = 'WIN' | 'LOSS' | 'TIE';
export type Volatility = 'LOW' | 'MEDIUM' | 'HIGH' | 'SPIKE';

export interface Trade {
  id: string;
  userId: string;
  market: MarketType;
  symbol: string;
  direction: Direction;
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  duration: number;
  payoutPercent: number;
  status: TradeStatus;
  result?: TradeResult;
  profit?: number;
  openedAt: string;
  closedAt?: string;
  expiresAt: string;
}

export interface PlaceTradeRequest {
  symbol: string;
  market: MarketType;
  direction: Direction;
  amount: number;
  duration: number;
}

export interface TradeResponse extends Trade {
  potentialPayout: number;
}

// ============================================================================
// Market Types
// ============================================================================

export interface MarketConfig {
  id: string;
  symbol: string;
  marketType: MarketType;
  name: string;
  isActive: boolean;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  volatilityMode: Volatility;
}

export interface PriceTick {
  symbol: string;
  price: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export type WSMessageType =
  | 'connected'
  | 'subscribe'
  | 'unsubscribe'
  | 'price_update'
  | 'trade_update'
  | 'trade_result'
  | 'balance_update'
  | 'ping'
  | 'pong'
  | 'error';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
}

export interface WSSubscribePayload {
  symbols: string[];
}

export interface WSErrorPayload {
  message: string;
  code?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Stats Types
// ============================================================================

export interface UserStats {
  totalTrades: number;
  wins: number;
  losses: number;
  ties: number;
  totalProfit: number;
  winRate: number;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  openTrades: number;
  platformWinRate: number;
}
