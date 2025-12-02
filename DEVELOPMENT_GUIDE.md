# EduTradeX Development Guide
## Demo Forex & OTC Trading Platform - Step-by-Step Development to Deployment

---

## Table of Contents
1. [Phase 1: Project Setup & Foundation](#phase-1-project-setup--foundation)
2. [Phase 2: Backend Core Development](#phase-2-backend-core-development)
3. [Phase 3: Frontend Core Development](#phase-3-frontend-core-development)
4. [Phase 4: Real-Time Market Data Integration](#phase-4-real-time-market-data-integration)
5. [Phase 5: Trading Engine Implementation](#phase-5-trading-engine-implementation)
6. [Phase 6: TradingView Chart Integration](#phase-6-tradingview-chart-integration)
7. [Phase 7: Admin Panel Development](#phase-7-admin-panel-development)
8. [Phase 8: Testing & Quality Assurance](#phase-8-testing--quality-assurance)
9. [Phase 9: Deployment](#phase-9-deployment)
10. [Phase 10: Post-Deployment](#phase-10-post-deployment)

---

## Phase 1: Project Setup & Foundation

### Step 1.1: Development Environment Setup

**Prerequisites to Install:**
- Node.js (v18 LTS or higher)
- npm or yarn package manager
- Git for version control
- PostgreSQL (or MongoDB) database
- Redis (for caching and session management)
- VS Code or preferred IDE

**Verify Installation:**
```bash
node --version
npm --version
git --version
psql --version
```

### Step 1.2: Project Structure Creation

```
edutradex/
├── client/                    # Frontend (Next.js)
│   ├── public/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # Reusable UI components
│   │   │   ├── charts/       # TradingView integration
│   │   │   ├── trading/      # Trade execution UI
│   │   │   ├── dashboard/    # User dashboard components
│   │   │   ├── auth/         # Authentication forms
│   │   │   └── common/       # Shared components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── services/         # API service layer
│   │   ├── store/            # State management (Zustand/Redux)
│   │   ├── types/            # TypeScript interfaces
│   │   └── styles/           # Global styles
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                    # Backend (Node.js/Express)
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Express middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── auth/         # Authentication service
│   │   │   ├── market/       # Market data service
│   │   │   ├── trading/      # Trading engine service
│   │   │   ├── otc/          # OTC price generator
│   │   │   └── websocket/    # WebSocket handlers
│   │   ├── utils/            # Helper functions
│   │   ├── validators/       # Input validation
│   │   └── app.ts            # Express app setup
│   ├── prisma/               # Database schema (if using Prisma)
│   └── package.json
│
├── shared/                    # Shared types/constants
│   └── types/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

### Step 1.3: Initialize Projects

**Backend Setup:**
```bash
mkdir optigobroker && cd optigobroker
mkdir server && cd server
npm init -y
npm install express cors helmet dotenv jsonwebtoken bcryptjs
npm install ws socket.io prisma @prisma/client
npm install axios node-cron
npm install -D typescript @types/node @types/express ts-node nodemon
npx tsc --init
npx prisma init
```

**Frontend Setup:**
```bash
cd .. && npx create-next-app@latest client --typescript --tailwind --app
cd client
npm install zustand axios socket.io-client
npm install @tanstack/react-query react-hot-toast
npm install recharts date-fns
```

### Step 1.4: Environment Configuration

**Create `.env` files:**

`server/.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/edutradex"

# JWT
JWT_SECRET=your-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Market Data APIs
ALPHA_VANTAGE_API_KEY=your-api-key
TWELVE_DATA_API_KEY=your-api-key
FINNHUB_API_KEY=your-api-key

# Deriv API (Optional)
DERIV_APP_ID=your-deriv-app-id

# Demo Settings
DEFAULT_DEMO_BALANCE=10000
DEFAULT_PAYOUT_PERCENTAGE=80
```

`client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

---

## Phase 2: Backend Core Development

### Step 2.1: Database Schema Design

**Create `server/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(USER)
  demoBalance   Decimal   @default(10000) @db.Decimal(15, 2)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  trades        Trade[]
  sessions      Session[]
}

model Trade {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  market        MarketType
  symbol        String
  direction     Direction
  amount        Decimal     @db.Decimal(15, 2)
  entryPrice    Decimal     @db.Decimal(20, 8)
  exitPrice     Decimal?    @db.Decimal(20, 8)
  duration      Int         // in seconds
  payoutPercent Decimal     @db.Decimal(5, 2)
  status        TradeStatus @default(OPEN)
  result        TradeResult?
  profit        Decimal?    @db.Decimal(15, 2)
  openedAt      DateTime    @default(now())
  closedAt      DateTime?
  expiresAt     DateTime
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model MarketConfig {
  id              String     @id @default(uuid())
  symbol          String     @unique
  marketType      MarketType
  name            String
  isActive        Boolean    @default(true)
  payoutPercent   Decimal    @db.Decimal(5, 2) @default(80)
  minTradeAmount  Decimal    @db.Decimal(15, 2) @default(1)
  maxTradeAmount  Decimal    @db.Decimal(15, 2) @default(1000)
  volatilityMode  Volatility @default(MEDIUM)
}

model SystemConfig {
  id    String @id @default(uuid())
  key   String @unique
  value String
}

enum Role {
  USER
  ADMIN
}

enum MarketType {
  FOREX
  OTC
  SYNTHETIC
}

enum Direction {
  UP
  DOWN
}

enum TradeStatus {
  OPEN
  CLOSED
  CANCELLED
}

enum TradeResult {
  WIN
  LOSS
  TIE
}

enum Volatility {
  LOW
  MEDIUM
  HIGH
  SPIKE
}
```

**Run migrations:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 2.2: Authentication System

**Create `server/src/services/auth/authService.ts`:**

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        demoBalance: parseFloat(process.env.DEFAULT_DEMO_BALANCE || '10000')
      },
      select: {
        id: true,
        email: true,
        name: true,
        demoBalance: true,
        createdAt: true
      }
    });

    const token = this.generateToken(user.id);

    return { user, token };
  }

  async login(data: LoginData) {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        demoBalance: user.demoBalance
      },
      token
    };
  }

  async resetDemoBalance(userId: string) {
    const defaultBalance = parseFloat(process.env.DEFAULT_DEMO_BALANCE || '10000');

    return prisma.user.update({
      where: { id: userId },
      data: { demoBalance: defaultBalance },
      select: {
        id: true,
        demoBalance: true
      }
    });
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}
```

**Create `server/src/middleware/authMiddleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        demoBalance: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

### Step 2.3: API Routes Setup

**Create `server/src/routes/authRoutes.ts`:**

```typescript
import { Router } from 'express';
import { AuthService } from '../services/auth/authService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const authService = new AuthService();

router.post('/register', async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post('/reset-balance', authMiddleware, async (req, res) => {
  try {
    const result = await authService.resetDemoBalance(req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### Step 2.4: Main Application Setup

**Create `server/src/app.ts`:**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/authRoutes';
import tradeRoutes from './routes/tradeRoutes';
import marketRoutes from './routes/marketRoutes';
import adminRoutes from './routes/adminRoutes';
import { setupWebSocket } from './services/websocket/wsServer';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server, wss };
```

---

## Phase 3: Frontend Core Development

### Step 3.1: Authentication UI Components

**Create `client/src/components/auth/LoginForm.tsx`:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(formData.email, formData.password);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 py-2 text-white font-medium
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Step 3.2: State Management Setup

**Create `client/src/store/authStore.ts`:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/services/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  demoBalance: number;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
  resetBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/login', { email, password });
          const { user, token } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/register', {
            email,
            password,
            name
          });
          const { user, token } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },

      updateBalance: (newBalance: number) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, demoBalance: newBalance } });
        }
      },

      resetBalance: async () => {
        const response = await apiClient.post('/auth/reset-balance');
        const { demoBalance } = response.data;
        const user = get().user;
        if (user) {
          set({ user: { ...user, demoBalance } });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token })
    }
  )
);
```

### Step 3.3: Dashboard Layout

**Create `client/src/app/dashboard/layout.tsx`:**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Phase 4: Real-Time Market Data Integration

### Step 4.1: Forex Data Service

**Create `server/src/services/market/forexService.ts`:**

```typescript
import axios from 'axios';

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export class ForexService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TWELVE_DATA_API_KEY || '';
    this.baseUrl = 'https://api.twelvedata.com';
  }

  async getRealtimePrice(symbol: string): Promise<PriceData> {
    try {
      const response = await axios.get(`${this.baseUrl}/price`, {
        params: {
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      return {
        symbol,
        price: parseFloat(response.data.price),
        timestamp: Date.now(),
        open: parseFloat(response.data.price),
        high: parseFloat(response.data.price),
        low: parseFloat(response.data.price),
        close: parseFloat(response.data.price)
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalData(
    symbol: string,
    interval: string = '1min',
    outputsize: number = 100
  ) {
    try {
      const response = await axios.get(`${this.baseUrl}/time_series`, {
        params: {
          symbol,
          interval,
          outputsize,
          apikey: this.apiKey
        }
      });

      return response.data.values.map((candle: any) => ({
        time: new Date(candle.datetime).getTime() / 1000,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume || 0)
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }
}
```

### Step 4.2: OTC Price Generator

**Create `server/src/services/otc/otcPriceGenerator.ts`:**

```typescript
type Volatility = 'LOW' | 'MEDIUM' | 'HIGH' | 'SPIKE';

interface OTCConfig {
  basePrice: number;
  volatility: Volatility;
  trendBias: number; // -1 to 1 (bearish to bullish)
}

interface PriceTick {
  symbol: string;
  price: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export class OTCPriceGenerator {
  private prices: Map<string, number> = new Map();
  private configs: Map<string, OTCConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private subscribers: Map<string, Set<(tick: PriceTick) => void>> = new Map();

  private volatilityMultipliers = {
    LOW: 0.0001,
    MEDIUM: 0.0005,
    HIGH: 0.001,
    SPIKE: 0.003
  };

  constructor() {
    this.initializeDefaultMarkets();
  }

  private initializeDefaultMarkets() {
    const defaultMarkets = [
      { symbol: 'OTC_EUR_USD', basePrice: 1.0850, volatility: 'MEDIUM' as Volatility },
      { symbol: 'OTC_GBP_USD', basePrice: 1.2650, volatility: 'MEDIUM' as Volatility },
      { symbol: 'OTC_USD_JPY', basePrice: 149.50, volatility: 'MEDIUM' as Volatility },
      { symbol: 'OTC_GOLD', basePrice: 2050.00, volatility: 'HIGH' as Volatility },
      { symbol: 'OTC_VOLATILITY_10', basePrice: 100.00, volatility: 'LOW' as Volatility },
      { symbol: 'OTC_VOLATILITY_25', basePrice: 100.00, volatility: 'MEDIUM' as Volatility },
      { symbol: 'OTC_VOLATILITY_50', basePrice: 100.00, volatility: 'HIGH' as Volatility },
      { symbol: 'OTC_VOLATILITY_100', basePrice: 100.00, volatility: 'SPIKE' as Volatility }
    ];

    defaultMarkets.forEach(market => {
      this.configs.set(market.symbol, {
        basePrice: market.basePrice,
        volatility: market.volatility,
        trendBias: 0
      });
      this.prices.set(market.symbol, market.basePrice);
    });
  }

  startPriceGeneration(symbol: string, intervalMs: number = 1000) {
    if (this.intervals.has(symbol)) {
      return;
    }

    const interval = setInterval(() => {
      const tick = this.generateTick(symbol);
      this.notifySubscribers(symbol, tick);
    }, intervalMs);

    this.intervals.set(symbol, interval);
  }

  stopPriceGeneration(symbol: string) {
    const interval = this.intervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(symbol);
    }
  }

  private generateTick(symbol: string): PriceTick {
    const config = this.configs.get(symbol);
    const currentPrice = this.prices.get(symbol);

    if (!config || currentPrice === undefined) {
      throw new Error(`Unknown symbol: ${symbol}`);
    }

    const volatility = this.volatilityMultipliers[config.volatility];

    // Generate random price movement with trend bias
    const random = Math.random() - 0.5 + (config.trendBias * 0.1);
    const change = currentPrice * volatility * random;

    // Occasionally add spikes for SPIKE volatility
    let spikeMultiplier = 1;
    if (config.volatility === 'SPIKE' && Math.random() < 0.05) {
      spikeMultiplier = Math.random() > 0.5 ? 3 : -3;
    }

    const newPrice = currentPrice + (change * spikeMultiplier);
    this.prices.set(symbol, newPrice);

    const timestamp = Date.now();

    return {
      symbol,
      price: newPrice,
      timestamp,
      open: currentPrice,
      high: Math.max(currentPrice, newPrice),
      low: Math.min(currentPrice, newPrice),
      close: newPrice
    };
  }

  subscribe(symbol: string, callback: (tick: PriceTick) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    // Start generation if not already running
    this.startPriceGeneration(symbol);
  }

  unsubscribe(symbol: string, callback: (tick: PriceTick) => void) {
    this.subscribers.get(symbol)?.delete(callback);

    // Stop generation if no subscribers
    if (this.subscribers.get(symbol)?.size === 0) {
      this.stopPriceGeneration(symbol);
    }
  }

  private notifySubscribers(symbol: string, tick: PriceTick) {
    this.subscribers.get(symbol)?.forEach(callback => callback(tick));
  }

  getCurrentPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  updateConfig(symbol: string, config: Partial<OTCConfig>) {
    const existing = this.configs.get(symbol);
    if (existing) {
      this.configs.set(symbol, { ...existing, ...config });
    }
  }

  getAvailableSymbols(): string[] {
    return Array.from(this.configs.keys());
  }
}

export const otcGenerator = new OTCPriceGenerator();
```

### Step 4.3: WebSocket Server for Real-Time Data

**Create `server/src/services/websocket/wsServer.ts`:**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { otcGenerator } from '../otc/otcPriceGenerator';
import { ForexService } from '../market/forexService';

interface WSMessage {
  type: string;
  payload: any;
}

interface ClientSubscription {
  ws: WebSocket;
  symbols: Set<string>;
  userId?: string;
}

export function setupWebSocket(wss: WebSocketServer) {
  const clients: Map<WebSocket, ClientSubscription> = new Map();
  const forexService = new ForexService();

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    clients.set(ws, {
      ws,
      symbols: new Set()
    });

    ws.on('message', async (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data);
        await handleMessage(ws, message);
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({ type: 'error', payload: 'Invalid message' }));
      }
    });

    ws.on('close', () => {
      const client = clients.get(ws);
      if (client) {
        // Unsubscribe from all symbols
        client.symbols.forEach(symbol => {
          if (symbol.startsWith('OTC_')) {
            otcGenerator.unsubscribe(symbol, () => {});
          }
        });
        clients.delete(ws);
      }
      console.log('Client disconnected');
    });

    // Send initial connection success
    ws.send(JSON.stringify({ type: 'connected', payload: { timestamp: Date.now() } }));
  });

  async function handleMessage(ws: WebSocket, message: WSMessage) {
    const client = clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        handleSubscribe(client, message.payload.symbols);
        break;

      case 'unsubscribe':
        handleUnsubscribe(client, message.payload.symbols);
        break;

      case 'authenticate':
        client.userId = message.payload.userId;
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
        break;
    }
  }

  function handleSubscribe(client: ClientSubscription, symbols: string[]) {
    symbols.forEach(symbol => {
      client.symbols.add(symbol);

      if (symbol.startsWith('OTC_')) {
        // Subscribe to OTC market
        otcGenerator.subscribe(symbol, (tick) => {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: 'price_update',
              payload: tick
            }));
          }
        });
      }
    });
  }

  function handleUnsubscribe(client: ClientSubscription, symbols: string[]) {
    symbols.forEach(symbol => {
      client.symbols.delete(symbol);
    });
  }

  // Broadcast to all clients subscribed to a symbol
  function broadcast(symbol: string, message: any) {
    clients.forEach(client => {
      if (client.symbols.has(symbol) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  return { broadcast };
}
```

---

## Phase 5: Trading Engine Implementation

### Step 5.1: Trade Service

**Create `server/src/services/trading/tradeService.ts`:**

```typescript
import { PrismaClient, Trade, TradeStatus, TradeResult, Direction } from '@prisma/client';
import { otcGenerator } from '../otc/otcPriceGenerator';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface PlaceTradeData {
  userId: string;
  symbol: string;
  market: 'FOREX' | 'OTC' | 'SYNTHETIC';
  direction: 'UP' | 'DOWN';
  amount: number;
  duration: number; // in seconds
}

interface TradeWithResult extends Trade {
  potentialPayout: number;
}

export class TradeService {
  private activeTradeTimers: Map<string, NodeJS.Timeout> = new Map();

  async placeTrade(data: PlaceTradeData): Promise<TradeWithResult> {
    // Get user and verify balance
    const user = await prisma.user.findUnique({
      where: { id: data.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (Number(user.demoBalance) < data.amount) {
      throw new Error('Insufficient balance');
    }

    // Get current price
    const currentPrice = this.getCurrentPrice(data.symbol, data.market);
    if (!currentPrice) {
      throw new Error('Unable to get current price');
    }

    // Get market config for payout percentage
    const marketConfig = await prisma.marketConfig.findUnique({
      where: { symbol: data.symbol }
    });

    const payoutPercent = marketConfig?.payoutPercent || 80;

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + data.duration * 1000);

    // Create trade and deduct balance in transaction
    const [trade] = await prisma.$transaction([
      prisma.trade.create({
        data: {
          userId: data.userId,
          symbol: data.symbol,
          market: data.market,
          direction: data.direction,
          amount: data.amount,
          entryPrice: currentPrice,
          duration: data.duration,
          payoutPercent: payoutPercent,
          expiresAt: expiresAt
        }
      }),
      prisma.user.update({
        where: { id: data.userId },
        data: {
          demoBalance: {
            decrement: data.amount
          }
        }
      })
    ]);

    // Schedule trade settlement
    this.scheduleTradeSettlement(trade.id, data.duration * 1000);

    const potentialPayout = data.amount * (1 + Number(payoutPercent) / 100);

    return {
      ...trade,
      potentialPayout
    };
  }

  private getCurrentPrice(symbol: string, market: string): number | null {
    if (market === 'OTC' || market === 'SYNTHETIC') {
      return otcGenerator.getCurrentPrice(symbol) || null;
    }
    // For FOREX, would fetch from forex service
    return null;
  }

  private scheduleTradeSettlement(tradeId: string, delayMs: number) {
    const timer = setTimeout(async () => {
      await this.settleTrade(tradeId);
      this.activeTradeTimers.delete(tradeId);
    }, delayMs);

    this.activeTradeTimers.set(tradeId, timer);
  }

  async settleTrade(tradeId: string) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId }
    });

    if (!trade || trade.status !== 'OPEN') {
      return;
    }

    // Get exit price
    const exitPrice = this.getCurrentPrice(trade.symbol, trade.market);
    if (!exitPrice) {
      throw new Error('Unable to get exit price');
    }

    // Determine result
    const priceWentUp = exitPrice > Number(trade.entryPrice);
    const priceWentDown = exitPrice < Number(trade.entryPrice);

    let result: TradeResult;
    let profit: number;

    if (exitPrice === Number(trade.entryPrice)) {
      // Tie - return stake
      result = 'TIE';
      profit = 0;
    } else if (
      (trade.direction === 'UP' && priceWentUp) ||
      (trade.direction === 'DOWN' && priceWentDown)
    ) {
      // Win
      result = 'WIN';
      profit = Number(trade.amount) * (Number(trade.payoutPercent) / 100);
    } else {
      // Loss
      result = 'LOSS';
      profit = -Number(trade.amount);
    }

    // Update trade and user balance in transaction
    const returnAmount = result === 'WIN'
      ? Number(trade.amount) + profit
      : result === 'TIE'
        ? Number(trade.amount)
        : 0;

    await prisma.$transaction([
      prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: 'CLOSED',
          result: result,
          exitPrice: exitPrice,
          profit: profit,
          closedAt: new Date()
        }
      }),
      ...(returnAmount > 0 ? [
        prisma.user.update({
          where: { id: trade.userId },
          data: {
            demoBalance: {
              increment: returnAmount
            }
          }
        })
      ] : [])
    ]);

    return {
      tradeId,
      result,
      profit,
      exitPrice
    };
  }

  async getTradeHistory(userId: string, limit: number = 50, offset: number = 0) {
    return prisma.trade.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async getActiveTradesCount(userId: string): Promise<number> {
    return prisma.trade.count({
      where: {
        userId,
        status: 'OPEN'
      }
    });
  }

  async getUserStats(userId: string) {
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'CLOSED'
      }
    });

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'WIN').length;
    const losses = trades.filter(t => t.result === 'LOSS').length;
    const totalProfit = trades.reduce((sum, t) => sum + Number(t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      totalTrades,
      wins,
      losses,
      ties: totalTrades - wins - losses,
      totalProfit,
      winRate: winRate.toFixed(2)
    };
  }
}

export const tradeService = new TradeService();
```

### Step 5.2: Trade Routes

**Create `server/src/routes/tradeRoutes.ts`:**

```typescript
import { Router } from 'express';
import { tradeService } from '../services/trading/tradeService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/place', async (req, res) => {
  try {
    const trade = await tradeService.placeTrade({
      userId: req.userId!,
      ...req.body
    });
    res.status(201).json(trade);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const trades = await tradeService.getTradeHistory(req.userId!, limit, offset);
    res.json(trades);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await tradeService.getUserStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const count = await tradeService.getActiveTradesCount(req.userId!);
    res.json({ activeTradesCount: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Phase 6: TradingView Chart Integration

### Step 6.1: TradingView Data Feed

**Create `client/src/lib/tradingview/datafeed.ts`:**

```typescript
import { apiClient } from '@/services/apiClient';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SubscriptionInfo {
  subscriberUID: string;
  resolution: string;
  lastBar: Bar | null;
  handler: (bar: Bar) => void;
}

class Datafeed {
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private ws: WebSocket | null = null;

  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    this.ws = new WebSocket(`${wsUrl}/ws`);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'price_update') {
        this.handlePriceUpdate(message.payload);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  private handlePriceUpdate(tick: any) {
    const subscription = this.subscriptions.get(tick.symbol);
    if (!subscription) return;

    const bar: Bar = {
      time: tick.timestamp,
      open: tick.open,
      high: tick.high,
      low: tick.low,
      close: tick.close
    };

    subscription.handler(bar);
    subscription.lastBar = bar;
  }

  onReady(callback: (config: any) => void) {
    setTimeout(() => {
      callback({
        supported_resolutions: ['1S', '5S', '1', '5', '15', '30', '60', '240', 'D'],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true
      });
    }, 0);
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (symbols: any[]) => void
  ) {
    // Return available symbols
    const symbols = [
      { symbol: 'OTC_EUR_USD', full_name: 'OTC EUR/USD', description: 'Euro/US Dollar OTC', type: 'forex' },
      { symbol: 'OTC_GBP_USD', full_name: 'OTC GBP/USD', description: 'British Pound/US Dollar OTC', type: 'forex' },
      { symbol: 'OTC_USD_JPY', full_name: 'OTC USD/JPY', description: 'US Dollar/Japanese Yen OTC', type: 'forex' },
      { symbol: 'OTC_VOLATILITY_10', full_name: 'Volatility 10 Index', description: 'Low Volatility Index', type: 'index' },
      { symbol: 'OTC_VOLATILITY_25', full_name: 'Volatility 25 Index', description: 'Medium Volatility Index', type: 'index' },
      { symbol: 'OTC_VOLATILITY_50', full_name: 'Volatility 50 Index', description: 'High Volatility Index', type: 'index' },
      { symbol: 'OTC_VOLATILITY_100', full_name: 'Volatility 100 Index', description: 'Extreme Volatility Index', type: 'index' }
    ];

    const filtered = symbols.filter(s =>
      s.symbol.toLowerCase().includes(userInput.toLowerCase()) ||
      s.description.toLowerCase().includes(userInput.toLowerCase())
    );

    onResult(filtered);
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: any) => void,
    onError: (error: string) => void
  ) {
    setTimeout(() => {
      const symbolInfo = {
        name: symbolName,
        description: symbolName.replace(/_/g, '/'),
        type: 'forex',
        session: '24x7',
        timezone: 'Etc/UTC',
        ticker: symbolName,
        minmov: 1,
        pricescale: symbolName.includes('JPY') ? 1000 : 100000,
        has_intraday: true,
        has_seconds: true,
        seconds_multipliers: [1, 5],
        intraday_multipliers: ['1', '5', '15', '30', '60'],
        supported_resolutions: ['1S', '5S', '1', '5', '15', '30', '60', '240', 'D'],
        volume_precision: 0,
        data_status: 'streaming'
      };

      onResolve(symbolInfo);
    }, 0);
  }

  async getBars(
    symbolInfo: any,
    resolution: string,
    periodParams: { from: number; to: number; firstDataRequest: boolean },
    onResult: (bars: Bar[], meta: { noData: boolean }) => void,
    onError: (error: string) => void
  ) {
    try {
      const response = await apiClient.get('/market/history', {
        params: {
          symbol: symbolInfo.name,
          resolution,
          from: periodParams.from,
          to: periodParams.to
        }
      });

      const bars = response.data.bars || [];
      onResult(bars, { noData: bars.length === 0 });
    } catch (error) {
      onError('Failed to load historical data');
    }
  }

  subscribeBars(
    symbolInfo: any,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string
  ) {
    this.subscriptions.set(symbolInfo.name, {
      subscriberUID,
      resolution,
      lastBar: null,
      handler: onTick
    });

    // Subscribe via WebSocket
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { symbols: [symbolInfo.name] }
      }));
    }
  }

  unsubscribeBars(subscriberUID: string) {
    this.subscriptions.forEach((subscription, symbol) => {
      if (subscription.subscriberUID === subscriberUID) {
        this.subscriptions.delete(symbol);

        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'unsubscribe',
            payload: { symbols: [symbol] }
          }));
        }
      }
    });
  }
}

export const datafeed = new Datafeed();
```

### Step 6.2: TradingView Chart Component

**Create `client/src/components/charts/TradingViewChart.tsx`:**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { datafeed } from '@/lib/tradingview/datafeed';

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  onSymbolChange?: (symbol: string) => void;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export function TradingViewChart({
  symbol,
  interval = '1',
  onSymbolChange
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = '/charting_library/charting_library.js';
    script.async = true;
    script.onload = initChart;
    document.body.appendChild(script);

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.setSymbol(symbol, interval);
    }
  }, [symbol, interval]);

  function initChart() {
    if (!window.TradingView || !containerRef.current) return;

    widgetRef.current = new window.TradingView.widget({
      container: containerRef.current,
      locale: 'en',
      library_path: '/charting_library/',
      datafeed: datafeed,
      symbol: symbol,
      interval: interval,
      fullscreen: false,
      autosize: true,
      theme: 'dark',
      timezone: 'Etc/UTC',
      toolbar_bg: '#1a1a2e',
      loading_screen: { backgroundColor: '#1a1a2e', foregroundColor: '#5a5a7a' },
      overrides: {
        'paneProperties.background': '#1a1a2e',
        'paneProperties.vertGridProperties.color': '#2a2a4e',
        'paneProperties.horzGridProperties.color': '#2a2a4e',
        'scalesProperties.textColor': '#AAA',
        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
        'mainSeriesProperties.candleStyle.downColor': '#ef5350',
        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350'
      },
      disabled_features: [
        'use_localstorage_for_settings',
        'header_symbol_search',
        'header_compare'
      ],
      enabled_features: [
        'study_templates',
        'side_toolbar_in_fullscreen_mode'
      ],
      studies_overrides: {},
      custom_css_url: '/tradingview-custom.css'
    });

    widgetRef.current.onChartReady(() => {
      console.log('Chart ready');
    });
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
    />
  );
}
```

---

## Phase 7: Admin Panel Development

### Step 7.1: Admin Service

**Create `server/src/services/admin/adminService.ts`:**

```typescript
import { PrismaClient } from '@prisma/client';
import { otcGenerator } from '../otc/otcPriceGenerator';

const prisma = new PrismaClient();

export class AdminService {
  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          demoBalance: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { trades: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });
  }

  async resetUserBalance(userId: string, balance?: number) {
    const newBalance = balance ?? parseFloat(process.env.DEFAULT_DEMO_BALANCE || '10000');

    return prisma.user.update({
      where: { id: userId },
      data: { demoBalance: newBalance }
    });
  }

  async getMarketConfigs() {
    return prisma.marketConfig.findMany();
  }

  async updateMarketConfig(symbol: string, data: {
    payoutPercent?: number;
    volatilityMode?: 'LOW' | 'MEDIUM' | 'HIGH' | 'SPIKE';
    isActive?: boolean;
  }) {
    const config = await prisma.marketConfig.update({
      where: { symbol },
      data
    });

    // Update OTC generator if applicable
    if (symbol.startsWith('OTC_') && data.volatilityMode) {
      otcGenerator.updateConfig(symbol, { volatility: data.volatilityMode });
    }

    return config;
  }

  async getPlatformStats() {
    const [
      totalUsers,
      activeUsers,
      totalTrades,
      openTrades
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.trade.count(),
      prisma.trade.count({ where: { status: 'OPEN' } })
    ]);

    const recentTrades = await prisma.trade.findMany({
      take: 100,
      where: { status: 'CLOSED' },
      orderBy: { closedAt: 'desc' }
    });

    const wins = recentTrades.filter(t => t.result === 'WIN').length;
    const platformWinRate = recentTrades.length > 0
      ? ((wins / recentTrades.length) * 100).toFixed(2)
      : 0;

    return {
      totalUsers,
      activeUsers,
      totalTrades,
      openTrades,
      platformWinRate
    };
  }

  async getSystemConfig() {
    return prisma.systemConfig.findMany();
  }

  async updateSystemConfig(key: string, value: string) {
    return prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }
}

export const adminService = new AdminService();
```

### Step 7.2: Admin Routes

**Create `server/src/routes/adminRoutes.ts`:**

```typescript
import { Router } from 'express';
import { adminService } from '../services/admin/adminService';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await adminService.getAllUsers(page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const result = await adminService.updateUserStatus(req.params.userId, isActive);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/users/:userId/reset-balance', async (req, res) => {
  try {
    const { balance } = req.body;
    const result = await adminService.resetUserBalance(req.params.userId, balance);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/markets', async (req, res) => {
  try {
    const configs = await adminService.getMarketConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/markets/:symbol', async (req, res) => {
  try {
    const result = await adminService.updateMarketConfig(req.params.symbol, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await adminService.getPlatformStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = await adminService.getSystemConfig();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/config/:key', async (req, res) => {
  try {
    const { value } = req.body;
    const result = await adminService.updateSystemConfig(req.params.key, value);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

---

## Phase 8: Testing & Quality Assurance

### Step 8.1: Backend Testing Setup

**Install testing dependencies:**
```bash
cd server
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

**Create `server/jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
```

**Create `server/src/test/setup.ts`:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Clean up test data
});
```

### Step 8.2: Frontend Testing Setup

**Install testing dependencies:**
```bash
cd client
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

### Step 8.3: Testing Checklist

**Backend Tests:**
- [ ] Authentication service unit tests
- [ ] Trade service unit tests
- [ ] OTC price generator tests
- [ ] API integration tests
- [ ] WebSocket connection tests

**Frontend Tests:**
- [ ] Component rendering tests
- [ ] User authentication flow tests
- [ ] Trade placement flow tests
- [ ] WebSocket connection tests

**Manual Testing:**
- [ ] User registration and login
- [ ] Demo balance management
- [ ] Trade placement (UP/DOWN)
- [ ] Trade settlement accuracy
- [ ] Real-time price updates
- [ ] Chart functionality
- [ ] Admin panel operations
- [ ] Mobile responsiveness

---

## Phase 9: Deployment

### Step 9.1: Docker Configuration

**Create `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: edutradex
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: edutradex
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://edutradex:${DB_PASSWORD}@postgres:5432/edutradex
      - REDIS_URL=redis://redis:6379
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - server

volumes:
  postgres_data:
  redis_data:
```

**Create `server/Dockerfile`:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 5000
CMD ["npm", "start"]
```

**Create `client/Dockerfile`:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Step 9.2: Cloud Deployment Options

**Option A: Railway/Render (Recommended for simplicity)**
1. Connect GitHub repository
2. Configure environment variables
3. Deploy backend and frontend as separate services
4. Set up PostgreSQL add-on

**Option B: AWS/GCP/Azure**
1. Set up VPC and networking
2. Deploy PostgreSQL (RDS/Cloud SQL)
3. Deploy Redis (ElastiCache/Memorystore)
4. Deploy backend on EC2/Compute Engine or ECS/Cloud Run
5. Deploy frontend on S3+CloudFront or Cloud Storage+CDN
6. Configure load balancer and SSL

**Option C: DigitalOcean**
1. Create Droplet or App Platform
2. Set up Managed PostgreSQL
3. Configure environment variables
4. Deploy using Docker or direct code deployment

### Step 9.3: SSL/Domain Configuration

1. Purchase domain from registrar
2. Configure DNS records:
   - A record for API subdomain (api.yourdomain.com)
   - A record for main domain
3. Set up SSL certificates (Let's Encrypt or cloud provider)
4. Configure CORS for production domain

### Step 9.4: Environment Variables for Production

```env
# Production .env
NODE_ENV=production
PORT=5000

# Database (use managed database URL)
DATABASE_URL=postgresql://user:password@host:5432/edutradex?sslmode=require

# Security
JWT_SECRET=generate-strong-256-bit-secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://host:6379

# API Keys
ALPHA_VANTAGE_API_KEY=your-key
TWELVE_DATA_API_KEY=your-key

# URLs
CLIENT_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Demo Settings
DEFAULT_DEMO_BALANCE=10000
DEFAULT_PAYOUT_PERCENTAGE=80
```

---

## Phase 10: Post-Deployment

### Step 10.1: Monitoring Setup

**Application Monitoring:**
- Set up error tracking (Sentry)
- Configure application performance monitoring (APM)
- Set up log aggregation (CloudWatch/Datadog)

**Infrastructure Monitoring:**
- Database performance metrics
- Server resource utilization
- WebSocket connection monitoring

### Step 10.2: Backup Strategy

1. **Database Backups:**
   - Automated daily backups
   - Point-in-time recovery enabled
   - Cross-region backup replication

2. **Code Backups:**
   - Git repository on multiple remotes
   - Tagged releases

### Step 10.3: Security Checklist

- [ ] HTTPS enforced everywhere
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention (React handles this)
- [ ] CORS properly configured
- [ ] Secrets stored securely (environment variables)
- [ ] Regular dependency updates
- [ ] Security headers configured (Helmet.js)

### Step 10.4: Maintenance Tasks

**Regular Tasks:**
- Monitor error logs daily
- Review performance metrics weekly
- Update dependencies monthly
- Security audit quarterly

**Scaling Considerations:**
- Horizontal scaling for WebSocket servers
- Database read replicas if needed
- CDN for static assets
- Redis cluster for session management

---

## Quick Start Commands

```bash
# Clone and setup
git clone <repository>
cd edutradex

# Backend setup
cd server
npm install
cp .env.example .env
# Edit .env with your values
npx prisma migrate dev
npm run dev

# Frontend setup (new terminal)
cd client
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
# WebSocket: ws://localhost:5000/ws
```

---

## Support Resources

- **TradingView Library Docs:** https://www.tradingview.com/charting-library-docs/
- **Deriv API Docs:** https://api.deriv.com/
- **Alpha Vantage Docs:** https://www.alphavantage.co/documentation/
- **Twelve Data Docs:** https://twelvedata.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## Disclaimer

This platform is for **educational purposes only**. It does not involve real money and should not be used as actual financial advice or as a real trading platform. All market data in OTC mode is simulated.
