# OTC Market System Implementation Guide

> **Purpose**: This document provides complete context for implementing an OTC (Over-The-Counter) market system similar to binary options brokers like Pocket Option and Expert Option.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [User Requirements](#2-user-requirements)
3. [Algorithm Deep Dive](#3-algorithm-deep-dive)
4. [Architecture Design](#4-architecture-design)
5. [Database Schema](#5-database-schema)
6. [Implementation Files](#6-implementation-files)
7. [Code Examples](#7-code-examples)
8. [Integration Points](#8-integration-points)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Feature Overview

### What is an OTC Market?

OTC (Over-The-Counter) markets in binary options are **synthetic/manipulated markets** that:

- **Mirror real market movements** with slight variations (1-5 pips offset)
- **Continue operating 24/7** even when real markets are closed
- **Are fully controlled** by the broker's algorithm
- **Look natural** but allow risk management (outcome influence)
- **Resynchronize** with real prices when markets reopen

### Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    OTC MARKET SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. OTC PRICE GENERATOR                                         │
│     - Geometric Brownian Motion for price simulation            │
│     - Volatility clustering (GARCH-like behavior)               │
│     - Mean reversion toward real prices                         │
│     - Support/resistance level respect                          │
│                                                                 │
│  2. RISK ENGINE                                                 │
│     - Track all active trades by symbol and direction           │
│     - Calculate net exposure (UP vs DOWN amounts)               │
│     - Detect trade clustering (many trades same direction)      │
│     - Apply subtle outcome influence when needed                │
│                                                                 │
│  3. OTC SCHEDULER                                               │
│     - Detect real market hours for each asset type              │
│     - Switch between REAL, OTC, and ANCHORING modes             │
│     - Manage 24/7 operation for OTC pairs                       │
│                                                                 │
│  4. PRICE ANCHORING                                             │
│     - Smooth transition when real market reopens                │
│     - Gradually blend OTC price → Real price over 15 minutes    │
│     - Prevent visible gaps in price charts                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. User Requirements

### Confirmed Choices (from user input)

| Setting | Choice | Description |
|---------|--------|-------------|
| **OTC Mode** | Separate OTC symbols | Users see both `EUR/USD` and `EUR/USD-OTC` as different options |
| **Risk Level** | Moderate (25-40%) | Balanced broker edge, similar to most binary brokers |
| **Markets** | Forex + Crypto | Only forex and crypto pairs get OTC functionality |
| **Admin Panel** | Full control | Admin can adjust volatility, intervention rates per symbol |

### OTC Symbol Naming Convention

```
Real Symbol    →    OTC Symbol
EUR/USD        →    EUR/USD-OTC
GBP/USD        →    GBP/USD-OTC
BTC/USD        →    BTC/USD-OTC
ETH/USD        →    ETH/USD-OTC
```

---

## 3. Algorithm Deep Dive

### 3.1 OTC Price Generation Algorithm

The synthetic price follows **Geometric Brownian Motion with Mean Reversion**:

```
Price(t+1) = Price(t) × (1 + RandomShock + MeanReversion + Momentum)

Where:
- RandomShock = GaussianRandom() × Volatility × √(dt)
- MeanReversion = (RealPrice - OTCPrice) / OTCPrice × ReversionStrength
- Momentum = Short-term trend continuation factor
```

#### Volatility Clustering (GARCH-like)

High volatility tends to follow high volatility:

```typescript
updateVolatilityState(symbol: string, baseVol: number): number {
  const currentState = this.volatilityState.get(symbol) || baseVol;
  const shock = Math.abs(this.lastPriceChange.get(symbol) || 0);

  // GARCH(1,1) style update
  const alpha = 0.1;  // Weight of recent shock
  const beta = 0.85;  // Persistence of volatility
  const omega = baseVol * 0.05; // Long-term variance

  const newState = omega + alpha * shock * shock + beta * currentState;
  this.volatilityState.set(symbol, newState);

  return Math.sqrt(newState);
}
```

#### Mean Reversion

Prevents OTC price from drifting too far from real price:

```typescript
calculateMeanReversion(symbol: string): number {
  const realPrice = this.lastRealPrice.get(symbol);
  const otcPrice = this.currentOtcPrice.get(symbol);

  if (!realPrice) return 0;

  const deviation = (realPrice - otcPrice) / otcPrice;
  const maxDeviation = 0.02; // 2% max

  // Stronger reversion as deviation increases
  const reversionStrength = Math.min(Math.abs(deviation) / maxDeviation, 1) * 0.002;

  return deviation * reversionStrength;
}
```

### 3.2 Risk Engine Algorithm

#### Exposure Tracking

```typescript
interface SymbolExposure {
  symbol: string;
  upTrades: TradeInfo[];      // All active UP trades
  downTrades: TradeInfo[];    // All active DOWN trades
  totalUpAmount: number;      // Sum of UP trade amounts
  totalDownAmount: number;    // Sum of DOWN trade amounts
  netExposure: number;        // UP - DOWN (positive = broker loses if UP)
  exposureRatio: number;      // Imbalance ratio (0-1)
}

// Calculate exposure ratio
exposureRatio = Math.abs(totalUpAmount - totalDownAmount) / (totalUpAmount + totalDownAmount);

// Example:
// UP trades: $5000 total
// DOWN trades: $2000 total
// netExposure = 5000 - 2000 = 3000 (broker at risk if price goes UP)
// exposureRatio = |3000| / 7000 = 0.43 (43% imbalanced)
```

#### Outcome Influence Logic

```typescript
calculateRiskAdjustedExitPrice(trade: Trade, marketPrice: number): ExitPriceResult {
  const exposure = this.getExposure(trade.symbol);

  // STEP 1: Check if intervention threshold reached
  const INTERVENTION_THRESHOLD = 0.35; // 35% imbalance (moderate setting)
  if (exposure.exposureRatio < INTERVENTION_THRESHOLD) {
    return { exitPrice: marketPrice, influenced: false };
  }

  // STEP 2: Determine if this trade opposes broker's interest
  const brokerPrefersDown = exposure.netExposure > 0;
  const tradeWantsUp = trade.direction === 'UP';
  const tradeOpposedToBroker = brokerPrefersDown === tradeWantsUp;

  if (!tradeOpposedToBroker) {
    return { exitPrice: marketPrice, influenced: false };
  }

  // STEP 3: Calculate intervention probability (25-40% range for moderate)
  const baseProb = 0.25;
  const maxProb = 0.40;
  const excessRatio = exposure.exposureRatio - INTERVENTION_THRESHOLD;
  const probability = Math.min(baseProb + excessRatio * 0.5, maxProb);

  // STEP 4: Random decision to intervene
  if (Math.random() > probability) {
    return { exitPrice: marketPrice, influenced: false };
  }

  // STEP 5: Apply subtle adjustment within spread
  const asset = getAsset(trade.symbol);
  const spreadPips = 2;
  const adjustmentPips = Math.random() * spreadPips * 1.5;

  // Push price against trade direction
  const adjustment = adjustmentPips * asset.pipSize;
  const targetLoss = trade.direction === 'UP';

  let adjustedPrice: number;
  if (targetLoss) {
    // For UP trade to lose, exit price must be <= entry price
    adjustedPrice = trade.entryPrice - adjustment;
  } else {
    // For DOWN trade to lose, exit price must be >= entry price
    adjustedPrice = trade.entryPrice + adjustment;
  }

  // STEP 6: Blend with market price to maintain chart coherence
  const blendFactor = 0.35;
  const finalPrice = marketPrice * (1 - blendFactor) + adjustedPrice * blendFactor;

  return { exitPrice: finalPrice, influenced: true };
}
```

### 3.3 Market Hours Detection

```typescript
interface MarketHours {
  forex: {
    // Forex: Sunday 5pm EST to Friday 5pm EST (24/5)
    // In UTC: Sunday 22:00 to Friday 22:00
    closedPeriods: [
      { day: 6, startHour: 0, endHour: 24 },  // All Saturday
      { day: 0, startHour: 0, endHour: 22 },  // Sunday until 10pm UTC
    ]
  },
  crypto: {
    // Crypto: 24/7, always open
    alwaysOpen: true
  },
  stock: {
    // US Stocks: Mon-Fri 9:30am-4pm EST
    // In UTC: Mon-Fri 14:30-21:00
    openDays: [1, 2, 3, 4, 5],
    openHourUTC: 14.5,
    closeHourUTC: 21
  }
}

isRealMarketOpen(symbol: string): boolean {
  const asset = getAsset(symbol);
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;

  switch (asset.marketType) {
    case 'crypto':
      return true; // Always open

    case 'forex':
      // Closed Saturday and Sunday until 22:00 UTC
      if (day === 6) return false;
      if (day === 0 && hour < 22) return false;
      if (day === 5 && hour >= 22) return false;
      return true;

    case 'stock':
    case 'index':
      if (day < 1 || day > 5) return false;
      return hour >= 14.5 && hour < 21;

    default:
      return false;
  }
}
```

### 3.4 Price Anchoring Algorithm

When real market reopens, smoothly transition from OTC to real prices:

```typescript
class PriceAnchoring {
  private anchoringStart: Map<string, number> = new Map();
  private readonly DURATION_MS = 15 * 60 * 1000; // 15 minutes

  startAnchoring(symbol: string): void {
    this.anchoringStart.set(symbol, Date.now());
  }

  getBlendedPrice(symbol: string, otcPrice: number, realPrice: number): number {
    const startTime = this.anchoringStart.get(symbol);

    if (!startTime) {
      return realPrice; // No anchoring, use real
    }

    const elapsed = Date.now() - startTime;

    if (elapsed >= this.DURATION_MS) {
      this.anchoringStart.delete(symbol);
      return realPrice; // Anchoring complete
    }

    // Progressive blend: 95% OTC → 0% OTC over 15 minutes
    const progress = elapsed / this.DURATION_MS;
    const otcWeight = 0.95 * Math.pow(1 - progress, 2); // Quadratic easing

    return otcPrice * otcWeight + realPrice * (1 - otcWeight);
  }
}
```

---

## 4. Architecture Design

### System Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE OTC SYSTEM FLOW                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │ REAL MARKET     │                                                     │
│  │ (Deriv/Binance) │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    OTC SCHEDULER                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ REAL MODE    │  │ OTC MODE     │  │ ANCHORING    │           │    │
│  │  │ Market Open  │  │ Market Closed│  │ Just Opened  │           │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │    │
│  └─────────┼─────────────────┼─────────────────┼───────────────────┘    │
│            │                 │                 │                         │
│            ▼                 ▼                 ▼                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    OTC PRICE GENERATOR                           │    │
│  │                                                                  │    │
│  │  REAL MODE:     realPrice + offset(1-3 pips)                    │    │
│  │  OTC MODE:      Brownian Motion + Volatility Clustering         │    │
│  │  ANCHORING:     lerp(otcPrice, realPrice, progress)             │    │
│  │                                                                  │    │
│  └─────────────────────────────┬───────────────────────────────────┘    │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PRICE BROADCAST                               │    │
│  │                                                                  │    │
│  │  1. Store to OTCPriceHistory (for charts)                       │    │
│  │  2. Broadcast via WebSocket to all subscribers                  │    │
│  │  3. Update currentPrices Map                                    │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                        TRADE FLOW                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │ USER PLACES     │                                                     │
│  │ TRADE           │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    RISK ENGINE                                   │    │
│  │                                                                  │    │
│  │  1. Track trade in symbol exposure                              │    │
│  │  2. Recalculate netExposure and exposureRatio                   │    │
│  │                                                                  │    │
│  └─────────────────────────────┬───────────────────────────────────┘    │
│                                │                                         │
│                    [Trade Duration Passes]                               │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    TRADE SETTLEMENT                              │    │
│  │                                                                  │    │
│  │  1. Get current OTC price                                       │    │
│  │  2. Check symbol exposure ratio                                 │    │
│  │  3. If ratio > 35% AND trade opposes broker:                    │    │
│  │     - Calculate intervention probability (25-40%)               │    │
│  │     - Maybe apply subtle price adjustment                       │    │
│  │  4. Determine WIN/LOSS with final exit price                    │    │
│  │  5. Update user balance                                         │    │
│  │  6. Remove trade from exposure tracking                         │    │
│  │  7. Send WebSocket notification                                 │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### Add to `server/prisma/schema.prisma`:

```prisma
// ==========================================
// OTC MARKET SYSTEM TABLES
// ==========================================

// OTC Configuration per symbol
model OTCConfig {
  id                      String   @id @default(uuid())
  symbol                  String   @unique  // e.g., "EUR/USD-OTC"
  baseSymbol              String   // e.g., "EUR/USD" (real symbol to track)
  marketType              String   // "FOREX" or "CRYPTO"
  isEnabled               Boolean  @default(true)

  // Price Generation Settings
  baseVolatility          Float    @default(0.0005)  // 0.05% per tick
  volatilityMultiplier    Float    @default(1.0)     // Scale volatility
  meanReversionStrength   Float    @default(0.001)   // How fast to revert
  maxDeviationPercent     Float    @default(2.0)     // Max 2% from real
  priceOffsetPips         Float    @default(2.0)     // Offset from real price

  // Risk Management Settings
  riskEnabled             Boolean  @default(true)
  exposureThreshold       Float    @default(0.35)    // 35% triggers intervention
  minInterventionRate     Float    @default(0.25)    // 25% min
  maxInterventionRate     Float    @default(0.40)    // 40% max (moderate)

  // Payout Settings
  payoutPercent           Float    @default(85)
  minTradeAmount          Float    @default(1)
  maxTradeAmount          Float    @default(1000)

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@index([baseSymbol])
  @@index([marketType])
}

// OTC Price History (for charts)
model OTCPriceHistory {
  id          String   @id @default(uuid())
  symbol      String   // OTC symbol (e.g., "EUR/USD-OTC")
  price       Float
  bid         Float
  ask         Float
  open        Float?   // For OHLC
  high        Float?
  low         Float?
  close       Float?
  volume      Int?
  priceMode   String   @default("OTC")  // "REAL", "OTC", or "ANCHORING"
  timestamp   DateTime @default(now())

  @@index([symbol, timestamp])
  @@index([symbol, timestamp(sort: Desc)])
}

// Real-time Risk Exposure Tracking
model RiskExposure {
  id                String   @id @default(uuid())
  symbol            String   @unique  // OTC symbol

  // UP trades
  totalUpAmount     Float    @default(0)
  activeUpTrades    Int      @default(0)

  // DOWN trades
  totalDownAmount   Float    @default(0)
  activeDownTrades  Int      @default(0)

  // Calculated fields
  netExposure       Float    @default(0)   // UP - DOWN
  exposureRatio     Float    @default(0)   // Imbalance ratio 0-1

  // Statistics
  totalInterventions Int     @default(0)
  totalTradesTracked Int     @default(0)

  lastUpdated       DateTime @updatedAt

  @@index([symbol])
  @@index([exposureRatio])
}

// Track individual trade exposure (for cleanup on settlement)
model TradeExposure {
  id          String   @id @default(uuid())
  tradeId     String   @unique
  symbol      String
  direction   String   // "UP" or "DOWN"
  amount      Float
  userId      String
  createdAt   DateTime @default(now())

  @@index([symbol])
  @@index([tradeId])
}

// OTC System Activity Log (for debugging/analysis)
model OTCActivityLog {
  id            String   @id @default(uuid())
  symbol        String
  eventType     String   // "PRICE_GENERATED", "INTERVENTION_APPLIED", "MODE_SWITCH", etc.
  details       Json?    // Additional context
  priceMode     String?  // Current price mode
  exposureRatio Float?   // Current exposure at time of event
  timestamp     DateTime @default(now())

  @@index([symbol, timestamp])
  @@index([eventType])
}
```

### Migration Command

```bash
cd edutradex/server
npx prisma migrate dev --name add_otc_market_system
```

---

## 6. Implementation Files

### Directory Structure

```
server/src/services/
├── otc/
│   ├── index.ts                      # Export all OTC services
│   ├── otc-price-generator.ts        # Synthetic price generation
│   ├── otc-scheduler.ts              # Market hours & mode management
│   ├── price-anchoring.ts            # Real-to-OTC transitions
│   ├── risk-engine.ts                # Trade tracking & outcome influence
│   ├── otc-market.service.ts         # Main OTC market service (integrates all)
│   └── types.ts                      # OTC-specific TypeScript interfaces
│
├── market/
│   └── market.service.ts             # MODIFY: Add OTC price handling
│
└── trade/
    └── trade.service.ts              # MODIFY: Use risk engine for OTC settlements

server/src/routes/
├── admin/
│   └── otc.routes.ts                 # NEW: Admin OTC configuration endpoints

client/src/
├── app/admin/otc/
│   └── page.tsx                      # NEW: Admin OTC dashboard
```

---

## 7. Code Examples

### 7.1 OTC Price Generator (`otc-price-generator.ts`)

```typescript
import { logger } from '../../utils/logger.js';

interface PriceState {
  currentPrice: number;
  lastRealPrice: number;
  volatilityState: number;
  momentum: number;
  lastUpdate: number;
}

interface OTCConfig {
  baseVolatility: number;
  volatilityMultiplier: number;
  meanReversionStrength: number;
  maxDeviationPercent: number;
  priceOffsetPips: number;
  pipSize: number;
}

export class OTCPriceGenerator {
  private priceStates: Map<string, PriceState> = new Map();
  private configs: Map<string, OTCConfig> = new Map();

  // Gaussian random number (Box-Muller transform)
  private gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Initialize price state for a symbol
  initializeSymbol(symbol: string, initialPrice: number, config: OTCConfig): void {
    this.priceStates.set(symbol, {
      currentPrice: initialPrice,
      lastRealPrice: initialPrice,
      volatilityState: config.baseVolatility,
      momentum: 0,
      lastUpdate: Date.now()
    });
    this.configs.set(symbol, config);
  }

  // Update with new real price (when real market is open)
  updateRealPrice(symbol: string, realPrice: number): void {
    const state = this.priceStates.get(symbol);
    if (state) {
      state.lastRealPrice = realPrice;
    }
  }

  // Generate next OTC price
  generateNextPrice(symbol: string): number | null {
    const state = this.priceStates.get(symbol);
    const config = this.configs.get(symbol);

    if (!state || !config) {
      return null;
    }

    const now = Date.now();
    const deltaTimeMs = now - state.lastUpdate;
    const dt = deltaTimeMs / 1000 / 60; // Minutes

    // 1. Update volatility state (GARCH-like clustering)
    const lastReturn = Math.abs(state.momentum);
    const alpha = 0.1;
    const beta = 0.85;
    const omega = config.baseVolatility * 0.05;
    state.volatilityState = omega + alpha * lastReturn * lastReturn + beta * state.volatilityState;

    const volatility = Math.sqrt(state.volatilityState) * config.volatilityMultiplier;

    // 2. Random shock (Brownian motion)
    const randomShock = this.gaussianRandom() * volatility * Math.sqrt(dt);

    // 3. Mean reversion toward real price
    const deviation = (state.lastRealPrice - state.currentPrice) / state.currentPrice;
    const maxDev = config.maxDeviationPercent / 100;
    const reversionForce = Math.sign(deviation) * Math.min(Math.abs(deviation), maxDev) * config.meanReversionStrength;

    // 4. Momentum (trend continuation)
    const momentumDecay = 0.95;
    state.momentum = state.momentum * momentumDecay + randomShock * 0.3;

    // 5. Calculate new price
    const priceChange = randomShock + reversionForce + state.momentum * 0.1;
    let newPrice = state.currentPrice * (1 + priceChange);

    // 6. Apply max deviation constraint
    const maxPrice = state.lastRealPrice * (1 + maxDev);
    const minPrice = state.lastRealPrice * (1 - maxDev);
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

    // 7. Update state
    state.currentPrice = newPrice;
    state.lastUpdate = now;

    return newPrice;
  }

  // Get price with offset from real price (when real market is open)
  getRealBasedPrice(symbol: string, realPrice: number): number | null {
    const config = this.configs.get(symbol);
    if (!config) return null;

    // Add small random offset within configured range
    const offsetPips = (Math.random() - 0.5) * 2 * config.priceOffsetPips;
    const offset = offsetPips * config.pipSize;

    return realPrice + offset;
  }

  getCurrentPrice(symbol: string): number | null {
    return this.priceStates.get(symbol)?.currentPrice || null;
  }
}

export const otcPriceGenerator = new OTCPriceGenerator();
```

### 7.2 Risk Engine (`risk-engine.ts`)

```typescript
import { queryOne, query } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

interface TradeInfo {
  tradeId: string;
  amount: number;
  userId: string;
  direction: 'UP' | 'DOWN';
}

interface SymbolExposure {
  symbol: string;
  upTrades: TradeInfo[];
  downTrades: TradeInfo[];
  totalUpAmount: number;
  totalDownAmount: number;
  netExposure: number;
  exposureRatio: number;
}

interface RiskConfig {
  exposureThreshold: number;
  minInterventionRate: number;
  maxInterventionRate: number;
  pipSize: number;
}

interface ExitPriceResult {
  exitPrice: number;
  influenced: boolean;
  reason?: string;
}

export class RiskEngine {
  private exposures: Map<string, SymbolExposure> = new Map();
  private configs: Map<string, RiskConfig> = new Map();

  // Set config for a symbol
  setConfig(symbol: string, config: RiskConfig): void {
    this.configs.set(symbol, config);
  }

  // Track a new trade
  async trackTrade(trade: {
    id: string;
    symbol: string;
    direction: 'UP' | 'DOWN';
    amount: number;
    userId: string;
  }): Promise<void> {
    let exposure = this.exposures.get(trade.symbol);

    if (!exposure) {
      exposure = {
        symbol: trade.symbol,
        upTrades: [],
        downTrades: [],
        totalUpAmount: 0,
        totalDownAmount: 0,
        netExposure: 0,
        exposureRatio: 0
      };
      this.exposures.set(trade.symbol, exposure);
    }

    const tradeInfo: TradeInfo = {
      tradeId: trade.id,
      amount: trade.amount,
      userId: trade.userId,
      direction: trade.direction
    };

    if (trade.direction === 'UP') {
      exposure.upTrades.push(tradeInfo);
      exposure.totalUpAmount += trade.amount;
    } else {
      exposure.downTrades.push(tradeInfo);
      exposure.totalDownAmount += trade.amount;
    }

    this.recalculateExposure(trade.symbol);

    // Persist to database
    await this.persistExposure(trade.symbol);
    await this.persistTradeExposure(trade);

    logger.debug('Trade tracked in risk engine', {
      symbol: trade.symbol,
      direction: trade.direction,
      amount: trade.amount,
      newExposureRatio: exposure.exposureRatio
    });
  }

  // Remove trade after settlement
  async removeTrade(tradeId: string, symbol: string): Promise<void> {
    const exposure = this.exposures.get(symbol);
    if (!exposure) return;

    // Remove from UP trades
    const upIndex = exposure.upTrades.findIndex(t => t.tradeId === tradeId);
    if (upIndex !== -1) {
      const trade = exposure.upTrades[upIndex];
      exposure.totalUpAmount -= trade.amount;
      exposure.upTrades.splice(upIndex, 1);
    }

    // Remove from DOWN trades
    const downIndex = exposure.downTrades.findIndex(t => t.tradeId === tradeId);
    if (downIndex !== -1) {
      const trade = exposure.downTrades[downIndex];
      exposure.totalDownAmount -= trade.amount;
      exposure.downTrades.splice(downIndex, 1);
    }

    this.recalculateExposure(symbol);

    // Update database
    await this.persistExposure(symbol);
    await query(`DELETE FROM "TradeExposure" WHERE "tradeId" = $1`, [tradeId]);
  }

  // Calculate risk-adjusted exit price
  calculateExitPrice(
    trade: { id: string; symbol: string; direction: 'UP' | 'DOWN'; amount: number; entryPrice: number },
    marketPrice: number
  ): ExitPriceResult {
    const exposure = this.exposures.get(trade.symbol);
    const config = this.configs.get(trade.symbol);

    if (!exposure || !config) {
      return { exitPrice: marketPrice, influenced: false };
    }

    // Check if intervention threshold reached
    if (exposure.exposureRatio < config.exposureThreshold) {
      return { exitPrice: marketPrice, influenced: false, reason: 'Below threshold' };
    }

    // Determine if this trade opposes broker's interest
    const brokerPrefersDown = exposure.netExposure > 0;
    const tradeWantsUp = trade.direction === 'UP';
    const tradeOpposedToBroker = brokerPrefersDown === tradeWantsUp;

    if (!tradeOpposedToBroker) {
      return { exitPrice: marketPrice, influenced: false, reason: 'Trade aligns with broker' };
    }

    // Calculate intervention probability
    const excessRatio = exposure.exposureRatio - config.exposureThreshold;
    const probability = Math.min(
      config.minInterventionRate + excessRatio * 0.5,
      config.maxInterventionRate
    );

    // Random decision to intervene
    if (Math.random() > probability) {
      return { exitPrice: marketPrice, influenced: false, reason: 'Random skip' };
    }

    // Apply subtle adjustment within spread
    const spreadPips = 2;
    const adjustmentPips = Math.random() * spreadPips * 1.5;
    const adjustment = adjustmentPips * config.pipSize;

    // Push price against trade direction
    let adjustedPrice: number;
    if (trade.direction === 'UP') {
      // For UP trade to lose, exit must be <= entry
      adjustedPrice = trade.entryPrice - adjustment;
    } else {
      // For DOWN trade to lose, exit must be >= entry
      adjustedPrice = trade.entryPrice + adjustment;
    }

    // Blend with market price for chart coherence
    const blendFactor = 0.35;
    const finalPrice = marketPrice * (1 - blendFactor) + adjustedPrice * blendFactor;

    // Log intervention
    this.logIntervention(trade.symbol, trade.id, probability);

    return {
      exitPrice: finalPrice,
      influenced: true,
      reason: `Intervention at ${(probability * 100).toFixed(1)}% probability`
    };
  }

  // Get current exposure for a symbol
  getExposure(symbol: string): SymbolExposure | null {
    return this.exposures.get(symbol) || null;
  }

  // Get all exposures
  getAllExposures(): SymbolExposure[] {
    return Array.from(this.exposures.values());
  }

  private recalculateExposure(symbol: string): void {
    const exposure = this.exposures.get(symbol);
    if (!exposure) return;

    const total = exposure.totalUpAmount + exposure.totalDownAmount;
    exposure.netExposure = exposure.totalUpAmount - exposure.totalDownAmount;
    exposure.exposureRatio = total > 0 ? Math.abs(exposure.netExposure) / total : 0;
  }

  private async persistExposure(symbol: string): Promise<void> {
    const exposure = this.exposures.get(symbol);
    if (!exposure) return;

    await query(`
      INSERT INTO "RiskExposure" (id, symbol, "totalUpAmount", "activeUpTrades",
        "totalDownAmount", "activeDownTrades", "netExposure", "exposureRatio")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (symbol) DO UPDATE SET
        "totalUpAmount" = $2,
        "activeUpTrades" = $3,
        "totalDownAmount" = $4,
        "activeDownTrades" = $5,
        "netExposure" = $6,
        "exposureRatio" = $7,
        "lastUpdated" = NOW()
    `, [
      symbol,
      exposure.totalUpAmount,
      exposure.upTrades.length,
      exposure.totalDownAmount,
      exposure.downTrades.length,
      exposure.netExposure,
      exposure.exposureRatio
    ]);
  }

  private async persistTradeExposure(trade: {
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    userId: string;
  }): Promise<void> {
    await query(`
      INSERT INTO "TradeExposure" (id, "tradeId", symbol, direction, amount, "userId")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
    `, [trade.id, trade.symbol, trade.direction, trade.amount, trade.userId]);
  }

  private async logIntervention(symbol: string, tradeId: string, probability: number): Promise<void> {
    await query(`
      INSERT INTO "OTCActivityLog" (id, symbol, "eventType", details, timestamp)
      VALUES (gen_random_uuid(), $1, 'INTERVENTION_APPLIED', $2, NOW())
    `, [symbol, JSON.stringify({ tradeId, probability })]);

    await query(`
      UPDATE "RiskExposure" SET "totalInterventions" = "totalInterventions" + 1
      WHERE symbol = $1
    `, [symbol]);
  }

  // Load exposure state from database on startup
  async loadFromDatabase(): Promise<void> {
    const exposures = await query<any>(`SELECT * FROM "RiskExposure"`);
    const trades = await query<any>(`SELECT * FROM "TradeExposure"`);

    // Rebuild in-memory state
    for (const exp of exposures.rows) {
      const symbolTrades = trades.rows.filter((t: any) => t.symbol === exp.symbol);

      this.exposures.set(exp.symbol, {
        symbol: exp.symbol,
        upTrades: symbolTrades.filter((t: any) => t.direction === 'UP').map((t: any) => ({
          tradeId: t.tradeId,
          amount: t.amount,
          userId: t.userId,
          direction: 'UP' as const
        })),
        downTrades: symbolTrades.filter((t: any) => t.direction === 'DOWN').map((t: any) => ({
          tradeId: t.tradeId,
          amount: t.amount,
          userId: t.userId,
          direction: 'DOWN' as const
        })),
        totalUpAmount: exp.totalUpAmount,
        totalDownAmount: exp.totalDownAmount,
        netExposure: exp.netExposure,
        exposureRatio: exp.exposureRatio
      });
    }

    logger.info(`Risk engine loaded ${this.exposures.size} symbol exposures from database`);
  }
}

export const riskEngine = new RiskEngine();
```

### 7.3 OTC Scheduler (`otc-scheduler.ts`)

```typescript
import { logger } from '../../utils/logger.js';

export type PriceMode = 'REAL' | 'OTC' | 'ANCHORING';

interface MarketSchedule {
  isOpen: (now: Date) => boolean;
}

const FOREX_SCHEDULE: MarketSchedule = {
  isOpen: (now: Date) => {
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    // Closed: Saturday all day, Sunday until 22:00 UTC, Friday after 22:00 UTC
    if (day === 6) return false;
    if (day === 0 && hour < 22) return false;
    if (day === 5 && hour >= 22) return false;
    return true;
  }
};

const CRYPTO_SCHEDULE: MarketSchedule = {
  isOpen: () => true // 24/7
};

const STOCK_SCHEDULE: MarketSchedule = {
  isOpen: (now: Date) => {
    const day = now.getUTCDay();
    const hour = now.getUTCHours() + now.getUTCMinutes() / 60;

    // Mon-Fri only
    if (day < 1 || day > 5) return false;
    // 14:30-21:00 UTC (9:30am-4pm EST)
    return hour >= 14.5 && hour < 21;
  }
};

export class OTCScheduler {
  private anchoringStartTimes: Map<string, number> = new Map();
  private previousModes: Map<string, PriceMode> = new Map();
  private readonly ANCHORING_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  isRealMarketOpen(symbol: string, marketType: string): boolean {
    const now = new Date();

    switch (marketType.toLowerCase()) {
      case 'forex':
        return FOREX_SCHEDULE.isOpen(now);
      case 'crypto':
        return CRYPTO_SCHEDULE.isOpen(now);
      case 'stock':
      case 'index':
        return STOCK_SCHEDULE.isOpen(now);
      default:
        return false;
    }
  }

  getPriceMode(symbol: string, marketType: string): PriceMode {
    const isOpen = this.isRealMarketOpen(symbol, marketType);
    const previousMode = this.previousModes.get(symbol);

    // Check for mode transition
    if (isOpen) {
      if (previousMode === 'OTC') {
        // Market just opened - start anchoring
        this.startAnchoring(symbol);
        this.previousModes.set(symbol, 'ANCHORING');
        return 'ANCHORING';
      }

      // Check if still in anchoring period
      if (this.isAnchoring(symbol)) {
        return 'ANCHORING';
      }

      this.previousModes.set(symbol, 'REAL');
      return 'REAL';
    }

    // Market is closed
    this.previousModes.set(symbol, 'OTC');
    return 'OTC';
  }

  private startAnchoring(symbol: string): void {
    this.anchoringStartTimes.set(symbol, Date.now());
    logger.info(`[OTC] Started anchoring for ${symbol}`);
  }

  private isAnchoring(symbol: string): boolean {
    const startTime = this.anchoringStartTimes.get(symbol);
    if (!startTime) return false;

    const elapsed = Date.now() - startTime;
    if (elapsed >= this.ANCHORING_DURATION_MS) {
      this.anchoringStartTimes.delete(symbol);
      return false;
    }

    return true;
  }

  getAnchoringProgress(symbol: string): number {
    const startTime = this.anchoringStartTimes.get(symbol);
    if (!startTime) return 1; // Fully anchored

    const elapsed = Date.now() - startTime;
    return Math.min(elapsed / this.ANCHORING_DURATION_MS, 1);
  }

  // Blend OTC and real prices during anchoring
  getAnchoredPrice(symbol: string, otcPrice: number, realPrice: number): number {
    const progress = this.getAnchoringProgress(symbol);

    if (progress >= 1) {
      return realPrice;
    }

    // Quadratic easing for smoother transition
    const otcWeight = 0.95 * Math.pow(1 - progress, 2);
    return otcPrice * otcWeight + realPrice * (1 - otcWeight);
  }
}

export const otcScheduler = new OTCScheduler();
```

---

## 8. Integration Points

### 8.1 Modify `market.service.ts`

Add OTC price handling:

```typescript
// In marketService class, add:

import { otcPriceGenerator } from '../otc/otc-price-generator.js';
import { otcScheduler, PriceMode } from '../otc/otc-scheduler.js';

// Add OTC assets to FOREX_ASSETS and CRYPTO_ASSETS
const FOREX_OTC_ASSETS: MarketAsset[] = FOREX_ASSETS.map(asset => ({
  ...asset,
  symbol: `${asset.symbol}-OTC`,
  name: `${asset.name} (OTC)`,
  isOTC: true
}));

const CRYPTO_OTC_ASSETS: MarketAsset[] = CRYPTO_ASSETS.map(asset => ({
  ...asset,
  symbol: `${asset.symbol}-OTC`,
  name: `${asset.name} (OTC)`,
  isOTC: true
}));

// Add to initializeAssets():
[...FOREX_OTC_ASSETS, ...CRYPTO_OTC_ASSETS].forEach(asset => {
  this.assets.set(asset.symbol, asset);
});

// New method to get OTC price
getOTCPrice(symbol: string): PriceTick | null {
  const asset = this.assets.get(symbol);
  if (!asset || !symbol.endsWith('-OTC')) return null;

  const baseSymbol = symbol.replace('-OTC', '');
  const realPrice = this.currentPrices.get(baseSymbol)?.price;
  const marketType = asset.marketType;

  const mode = otcScheduler.getPriceMode(symbol, marketType);
  let price: number;

  switch (mode) {
    case 'REAL':
      price = otcPriceGenerator.getRealBasedPrice(symbol, realPrice!) || realPrice!;
      break;
    case 'OTC':
      price = otcPriceGenerator.generateNextPrice(symbol) || realPrice!;
      break;
    case 'ANCHORING':
      const otcPrice = otcPriceGenerator.getCurrentPrice(symbol) || realPrice!;
      price = otcScheduler.getAnchoredPrice(symbol, otcPrice, realPrice!);
      break;
  }

  // Create price tick
  const spread = price * 0.0002;
  return {
    symbol,
    price,
    bid: price - spread / 2,
    ask: price + spread / 2,
    timestamp: new Date(),
    change: 0,
    changePercent: 0
  };
}

// Modify generateExitPrice to check for OTC:
generateExitPrice(symbol: string, entryPrice: number, duration: number): number {
  if (symbol.endsWith('-OTC')) {
    // For OTC, use current OTC price (risk engine will adjust if needed)
    const otcTick = this.getOTCPrice(symbol);
    return otcTick?.price || entryPrice;
  }

  // Original logic for real markets
  const currentTick = this.currentPrices.get(symbol);
  return currentTick?.price || entryPrice;
}
```

### 8.2 Modify `trade.service.ts`

Add risk engine integration for OTC trades:

```typescript
import { riskEngine } from '../otc/risk-engine.js';

// In placeTrade method, after creating trade:
if (data.symbol.endsWith('-OTC')) {
  await riskEngine.trackTrade({
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction as 'UP' | 'DOWN',
    amount: trade.amount,
    userId
  });
}

// In settleTrade method, modify exit price calculation:
async settleTrade(tradeId: string): Promise<TradeResult | null> {
  // ... existing code to fetch trade ...

  let exitPrice = marketService.generateExitPrice(trade.symbol, trade.entryPrice, trade.duration);

  // Apply risk engine for OTC trades
  if (trade.symbol.endsWith('-OTC')) {
    const riskResult = riskEngine.calculateExitPrice(
      {
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction as 'UP' | 'DOWN',
        amount: trade.amount,
        entryPrice: trade.entryPrice
      },
      exitPrice
    );

    exitPrice = riskResult.exitPrice;

    if (riskResult.influenced) {
      logger.info('OTC trade settlement influenced', {
        tradeId,
        symbol: trade.symbol,
        originalPrice: exitPrice,
        adjustedPrice: riskResult.exitPrice,
        reason: riskResult.reason
      });
    }

    // Remove from tracking after settlement
    await riskEngine.removeTrade(tradeId, trade.symbol);
  }

  // ... rest of existing settlement logic ...
}
```

---

## 9. Implementation Checklist

### Phase 1: Database & Core Services

- [ ] Add OTC tables to Prisma schema
- [ ] Run database migration
- [ ] Create `otc-price-generator.ts`
- [ ] Create `risk-engine.ts`
- [ ] Create `otc-scheduler.ts`
- [ ] Create `price-anchoring.ts`
- [ ] Create `otc-market.service.ts` (main service)
- [ ] Create `types.ts` for OTC interfaces

### Phase 2: Market Service Integration

- [ ] Add OTC assets to market service
- [ ] Initialize OTC price generator on startup
- [ ] Add OTC price broadcast loop
- [ ] Modify `generateExitPrice` for OTC
- [ ] Store OTC price history

### Phase 3: Trade Service Integration

- [ ] Track OTC trades in risk engine
- [ ] Apply risk-adjusted exit prices
- [ ] Remove trades from tracking on settlement
- [ ] Add OTC-specific logging

### Phase 4: Admin API & Dashboard

- [ ] Create OTC admin routes
- [ ] CRUD for OTCConfig
- [ ] View risk exposures
- [ ] View activity logs
- [ ] Build admin UI components

### Phase 5: Testing & Refinement

- [ ] Test price generation quality
- [ ] Test risk engine accuracy
- [ ] Test mode transitions (REAL → OTC → ANCHORING)
- [ ] Verify chart appearance
- [ ] Load testing

---

## 10. Testing Strategy

### Unit Tests

```typescript
// Test price generation
describe('OTCPriceGenerator', () => {
  it('should generate prices within max deviation', () => {
    const generator = new OTCPriceGenerator();
    generator.initializeSymbol('EUR/USD-OTC', 1.1000, {
      baseVolatility: 0.0005,
      maxDeviationPercent: 2.0,
      // ...
    });

    for (let i = 0; i < 1000; i++) {
      const price = generator.generateNextPrice('EUR/USD-OTC');
      expect(price).toBeGreaterThan(1.1000 * 0.98);
      expect(price).toBeLessThan(1.1000 * 1.02);
    }
  });
});

// Test risk engine
describe('RiskEngine', () => {
  it('should apply intervention above threshold', () => {
    const engine = new RiskEngine();
    engine.setConfig('EUR/USD-OTC', {
      exposureThreshold: 0.35,
      minInterventionRate: 0.25,
      maxInterventionRate: 0.40,
      pipSize: 0.0001
    });

    // Add imbalanced trades
    for (let i = 0; i < 10; i++) {
      engine.trackTrade({
        id: `up-${i}`,
        symbol: 'EUR/USD-OTC',
        direction: 'UP',
        amount: 100,
        userId: 'user1'
      });
    }

    const exposure = engine.getExposure('EUR/USD-OTC');
    expect(exposure?.exposureRatio).toBe(1); // 100% UP

    // Test intervention
    const result = engine.calculateExitPrice(
      { id: 'test', symbol: 'EUR/USD-OTC', direction: 'UP', amount: 100, entryPrice: 1.1000 },
      1.1005
    );

    // Should have some interventions over many runs
  });
});
```

### Integration Tests

- Place trades on OTC pairs
- Verify price generation continues when market closed
- Test anchoring transition
- Verify chart data looks natural

---

## Quick Start Commands

```bash
# 1. Update database schema
cd edutradex/server
npx prisma migrate dev --name add_otc_market_system

# 2. Create OTC service files
mkdir -p src/services/otc

# 3. After implementing, test OTC prices
curl http://localhost:5000/api/market/prices/EUR/USD-OTC

# 4. Test risk exposure
curl http://localhost:5000/api/admin/otc/exposures
```

---

## Notes for Future Development

1. **Chart Quality**: Monitor user feedback on chart appearance. Adjust volatility parameters if charts look too noisy or too flat.

2. **Risk Balance**: The 25-40% intervention rate is moderate. Can be adjusted per symbol in admin panel.

3. **Performance**: OTC price generation runs every 100ms per symbol. Monitor CPU usage with many OTC pairs.

4. **Audit Trail**: All interventions are logged in `OTCActivityLog`. Review periodically.

5. **Legal Considerations**: OTC markets with outcome influence have regulatory implications. Consult legal counsel before production use.

---

*Last Updated: December 2024*
*Created for: EduTradeX Platform*
