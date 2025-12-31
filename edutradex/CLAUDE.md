# EduTradeX - Claude Development Context

## Project Overview

EduTradeX is a binary options trading platform with the following core features:
- Real-time trading (Forex, Crypto, Stocks, Indices)
- Copy trading system (Leaders & Followers)
- Demo and Live accounts
- Deposit/Withdrawal management
- Referral system

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Backend**: Express.js 5.2.1, Node.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM 6.19.0
- **Real-time**: WebSockets (ws library)
- **Price Feeds**: Deriv API (Forex), Binance WebSocket (Crypto), Finnhub (Stocks)

## Project Structure

```
edutradex/
├── client/          # Next.js frontend
├── server/          # Express.js backend
└── shared/          # Shared types and configs
```

## Key Files

- `server/prisma/schema.prisma` - Database schema
- `server/src/services/trade/trade.service.ts` - Trading logic
- `server/src/services/market/market.service.ts` - Price feeds & market data
- `server/src/services/websocket/websocket.manager.ts` - Real-time communication
- `client/src/store/` - Zustand state management

---

## Active Feature Development

### OTC Market System (Backend Complete)

**Documentation**: See `OTC_MARKET_IMPLEMENTATION.md` for complete implementation guide.

**Summary**: OTC (Over-The-Counter) synthetic markets similar to Pocket Option / Expert Option.

**Key Components**:
1. OTC Price Generator - Brownian motion with GARCH volatility clustering
2. Risk Engine - Trade exposure tracking & outcome influence (25-40% moderate)
3. OTC Scheduler - Market hours detection & mode transitions
4. Price Anchoring - Smooth OTC-to-real transitions when markets reopen

**User Choices**:
- OTC Mode: Separate symbols (EUR/USD-OTC)
- Risk Level: Moderate (25-40%)
- Markets: Forex + Crypto only
- Admin Panel: Full control per symbol

**Implementation Status**:
- [x] Documentation created
- [x] Database schema (OTCConfig, OTCPriceHistory, OTCRiskExposure, OTCTradeExposure, OTCActivityLog)
- [x] OTC Price Generator service (`server/src/services/otc/otc-price-generator.ts`)
- [x] Risk Engine service (`server/src/services/otc/risk-engine.ts`)
- [x] OTC Scheduler service (`server/src/services/otc/otc-scheduler.ts`)
- [x] OTC Market Service (`server/src/services/otc/otc-market.service.ts`)
- [x] Trade service integration (tracking + risk-based settlement)
- [x] Admin API routes (`/api/admin/otc/*`)
- [x] OTC Admin Service (`server/src/services/otc/otc-admin.service.ts`)
- [x] Admin dashboard UI for OTC settings (full implementation)
- [x] OTC History Seeder (`server/src/services/otc/otc-history-seeder.ts`)

**OTC API Endpoints**:
- `GET /api/admin/otc/stats` - OTC system statistics
- `GET /api/admin/otc/configs` - List all OTC configs
- `POST /api/admin/otc/configs` - Create new OTC config
- `PATCH /api/admin/otc/configs/:id` - Update config
- `DELETE /api/admin/otc/configs/:id` - Delete config
- `GET /api/admin/otc/exposures` - Get all risk exposures
- `GET /api/admin/otc/activity` - Activity log
- `POST /api/admin/otc/configs/bulk/toggle-enabled` - Bulk enable/disable
- `POST /api/admin/otc/configs/bulk/toggle-risk` - Bulk risk toggle

**OTC History Seeding Endpoints**:
- `POST /api/admin/otc/history/seed/:symbol` - Seed history for single symbol
- `POST /api/admin/otc/history/seed-all` - Seed history for all enabled OTC pairs
- `POST /api/admin/otc/history/seed-type/:marketType` - Seed by market type (FOREX/CRYPTO)
- `GET /api/admin/otc/history/stats/:symbol` - Get seeded history stats for symbol
- `GET /api/admin/otc/history/has/:symbol` - Check if symbol has seeded history

**Seeding**: Run `npx tsx src/scripts/seed-otc-configs.ts` to create default OTC pairs.

**History Seeding**: Use the "Seed History" button in Admin > OTC Markets to fetch real historical candles from Binance/Deriv and store them as OTC chart history. This provides realistic charts that the OTC price generator continues from.

---

## Development Guidelines

1. **Production Quality**: Write clean, maintainable code without hacks
2. **No Over-engineering**: Only implement what's requested
3. **Database Changes**: Always use Prisma migrations
4. **Testing**: Test WebSocket connections and trade flows thoroughly
5. **Logging**: Use the existing logger utility for all services
