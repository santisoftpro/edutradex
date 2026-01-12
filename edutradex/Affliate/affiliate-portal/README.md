# OptigoBroker Partners - Affiliate Portal

A full-stack affiliate/partner program for OptigoBroker built with Next.js 14+ (App Router). Partners can refer traders, track performance, earn revenue-share commissions, and withdraw earnings.

## Features

### Public Pages
- **Home** - Landing page with program overview and level preview
- **How it Works** - Step-by-step partner journey explanation
- **Levels** - All 6 partner levels with rates and requirements
- **Withdrawals** - Withdrawal schedule by partner level
- **Login/Register** - Partner authentication

### Partner Dashboard
- **Dashboard** - KPIs, performance charts, quick withdraw
- **Statistics** - Trader-by-trader statistics table
- **Links** - Create and manage tracking links
- **Top 10** - Partner leaderboard
- **Affiliate Level** - Current level, progress, social profile
- **News** - Announcements and updates
- **Support** - Ticket system
- **Payments** - Withdrawals and commission history

### Business Logic
- 6 Partner Levels (60% - 85% revenue share)
- Daily settlement at 00:00 UTC
- Level-based withdrawal schedules
- First-click attribution model
- Fraud detection and self-referral prevention

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd affiliate-portal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/affiliate_portal"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Partner Levels

| Level | Name | Revenue Share | FTD Required | Withdrawal |
|-------|------|---------------|--------------|------------|
| 1 | Starter | 60% | 20 | Weekly (Mon) |
| 2 | Builder | 65% | 40 | Weekly (Mon) |
| 3 | Growth | 70% | 100 | 2x/week (Mon, Thu) |
| 4 | Advanced | 75% | 150 | 2x/week (Mon, Thu) |
| 5 | Pro | 80% | 400+ | 2x/week (Mon, Thu) |
| 6 | Ambassador | 85% | 400+ | Daily |

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public marketing pages
│   │   ├── page.tsx       # Home
│   │   ├── how-it-works/
│   │   ├── levels/
│   │   ├── withdrawals/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Protected partner dashboard
│   │   ├── dashboard/
│   │   ├── statistics/
│   │   ├── links/
│   │   ├── top-10/
│   │   ├── affiliate-level/
│   │   ├── news/
│   │   ├── support/
│   │   └── payments/
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── public/            # Public page components
│   ├── dashboard/         # Dashboard components
│   └── shared/            # Shared components
├── lib/
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # NextAuth configuration
│   ├── constants.ts       # App constants (levels, etc.)
│   └── utils.ts           # Utility functions
├── types/                 # TypeScript types
└── prisma/
    └── schema.prisma      # Database schema
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Partner registration
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Partners
- `GET /api/partners/me` - Current partner profile
- `GET /api/partners/me/stats` - Dashboard KPIs

### Traders
- `GET /api/traders` - List referred traders
- `GET /api/traders/stats` - Aggregated statistics

### Links
- `GET /api/links` - List tracking links
- `POST /api/links` - Create new link

### Payments
- `GET /api/withdrawals` - Withdrawal history
- `POST /api/withdrawals` - Request withdrawal
- `GET /api/settlements` - Settlement history

### Support
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket

## Integration with Main Broker

The affiliate system receives data from the main OptigoBroker platform via webhooks:

```
POST /api/webhooks/trader-activity
- trader.registered
- trader.deposit
- trader.withdrawal
- trader.trade.closed

POST /api/webhooks/settlement
- Daily settlement trigger
```

## Commission Calculation

```typescript
// Daily settlement at 00:00 UTC
const commission = traderDayLoss * partnerLevelRate;
// If loss = 0, commission = 0
```

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Database
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to database
npx prisma studio      # Open Prisma Studio

# Linting
npm run lint
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Application URL |
| `NEXTAUTH_SECRET` | NextAuth secret key |
| `BROKER_API_URL` | Main broker API URL |
| `BROKER_WEBHOOK_SECRET` | Webhook verification secret |

## Design

- Dark theme with blue neon accents
- Space/tech visual style
- Glassmorphism effects
- Responsive design (mobile-first)

## License

Proprietary - OptigoBroker

---

For detailed specifications, see `PROJECT_PLAN.md`.
