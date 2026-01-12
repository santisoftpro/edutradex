# OptigoBroker Partners - Affiliate System Project Plan

## Project Overview

Build a full-stack affiliate/partner program for OptigoBroker using Next.js (App Router). The system enables partners to refer traders, track performance, earn commissions based on revenue share, and withdraw earnings.

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | NextAuth.js v5 |
| Styling | Tailwind CSS |
| UI Components | Radix UI / shadcn/ui |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Email | Nodemailer / Resend |
| State | React Context + Server Actions |

---

## Architecture Overview

```
affiliate-portal/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public marketing pages
│   │   ├── page.tsx              # Home (/)
│   │   ├── how-it-works/
│   │   ├── levels/
│   │   ├── withdrawals/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected partner dashboard
│   │   ├── dashboard/
│   │   ├── statistics/
│   │   ├── links/
│   │   ├── top-10/
│   │   ├── affiliate-level/
│   │   ├── news/
│   │   ├── support/
│   │   └── payments/
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/
│   │   ├── partners/
│   │   ├── traders/
│   │   ├── links/
│   │   ├── withdrawals/
│   │   ├── settlements/
│   │   └── webhooks/
│   └── layout.tsx
├── components/
│   ├── ui/                       # Base UI components
│   ├── public/                   # Public page components
│   ├── dashboard/                # Dashboard components
│   └── shared/                   # Shared components
├── lib/
│   ├── db.ts                     # Prisma client
│   ├── auth.ts                   # Auth configuration
│   ├── utils.ts                  # Utility functions
│   └── constants.ts              # App constants
├── actions/                      # Server Actions
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript types
├── prisma/
│   └── schema.prisma             # Database schema
└── public/                       # Static assets
```

---

## Database Schema (Core Entities)

### Partner (Affiliate)
```prisma
model Partner {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String
  firstName         String
  lastName          String
  level             PartnerLevel @default(STARTER)
  status            PartnerStatus @default(ACTIVE)
  availableBalance  Decimal  @default(0)
  pendingBalance    Decimal  @default(0)
  totalEarned       Decimal  @default(0)
  totalFTD          Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  referredTraders   Trader[]
  trackingLinks     TrackingLink[]
  withdrawals       Withdrawal[]
  settlements       Settlement[]
  socialChannels    SocialChannel[]
  tickets           SupportTicket[]
  notifications     Notification[]
}

enum PartnerLevel {
  STARTER      // 60% - 20 FTD
  BUILDER      // 65% - 40 FTD
  GROWTH       // 70% - 100 FTD
  ADVANCED     // 75% - 150 FTD
  PRO          // 80% - 400+ FTD
  AMBASSADOR   // 85% - 400+ FTD + Verified
}

enum PartnerStatus {
  PENDING
  ACTIVE
  BLOCKED
  UNDER_REVIEW
  SUSPENDED
}
```

### Trader (Referred User)
```prisma
model Trader {
  id              String   @id @default(cuid())
  partnerId       String
  linkId          String?
  tradingUid      String   @unique
  country         String?
  balance         Decimal  @default(0)
  totalDeposits   Decimal  @default(0)
  depositCount    Int      @default(0)
  totalWithdrawals Decimal @default(0)
  profit          Decimal  @default(0)
  loss            Decimal  @default(0)
  hasFTD          Boolean  @default(false)
  ftdDate         DateTime?
  isSelfReferral  Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  partner         Partner  @relation(fields: [partnerId], references: [id])
  link            TrackingLink? @relation(fields: [linkId], references: [id])
  commissions     Commission[]
}
```

### Tracking Link
```prisma
model TrackingLink {
  id          String   @id @default(cuid())
  partnerId   String
  code        String   @unique
  comment     String?
  type        LinkType @default(REGISTER)
  isActive    Boolean  @default(true)
  clickCount  Int      @default(0)
  createdAt   DateTime @default(now())

  // Relations
  partner     Partner  @relation(fields: [partnerId], references: [id])
  traders     Trader[]
}

enum LinkType {
  REGISTER
  MAIN_PAGE
  ANDROID
  PLATFORM
}
```

### Commission & Settlement
```prisma
model Commission {
  id          String   @id @default(cuid())
  partnerId   String
  traderId    String
  amount      Decimal
  basis       Decimal  // The loss/revenue basis
  rate        Decimal  // Partner's rate at time of calculation
  periodStart DateTime
  periodEnd   DateTime
  status      CommissionStatus @default(PENDING)
  createdAt   DateTime @default(now())

  trader      Trader   @relation(fields: [traderId], references: [id])
}

model Settlement {
  id          String   @id @default(cuid())
  partnerId   String
  amount      Decimal
  level       PartnerLevel
  status      SettlementStatus @default(CREDITED)
  settledAt   DateTime @default(now())

  partner     Partner  @relation(fields: [partnerId], references: [id])
}

enum CommissionStatus {
  PENDING
  CREDITED
  ADJUSTED
  FROZEN
}
```

### Withdrawal
```prisma
model Withdrawal {
  id          String   @id @default(cuid())
  partnerId   String
  amount      Decimal
  fee         Decimal  @default(0)
  method      PayoutMethod
  coin        String?
  network     String?
  address     String?
  tradingUid  String?  // For internal transfer
  status      WithdrawalStatus @default(PENDING)
  txId        String?
  requestedAt DateTime @default(now())
  processedAt DateTime?

  partner     Partner  @relation(fields: [partnerId], references: [id])
}

enum PayoutMethod {
  CRYPTO
  INTERNAL_TRANSFER
}

enum WithdrawalStatus {
  PENDING
  PROCESSING
  COMPLETED
  REJECTED
}
```

---

## Partner Levels Configuration

| Level | Name | Revenue Share | FTD Required | Withdrawal Frequency | Withdrawal Days |
|-------|------|---------------|--------------|---------------------|-----------------|
| 1 | Starter | 60% | 20 | Weekly | Monday |
| 2 | Builder | 65% | 40 | Weekly | Monday |
| 3 | Growth | 70% | 100 | Twice/week | Mon & Thu |
| 4 | Advanced | 75% | 150 | Twice/week | Mon & Thu |
| 5 | Pro | 80% | 400+ | Twice/week | Mon & Thu |
| 6 | Ambassador | 85% | 400+ | Daily | Every day |

**Social Media Requirements:**
- Levels 1-2: None
- Level 3: At least 1 social channel
- Level 4: Active social media
- Level 5: Strong & consistent social
- Level 6: Verified social / influencer

---

## Pages & Routes

### Public Pages (Marketing)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Landing page with program overview, level preview, CTA |
| `/how-it-works` | How it Works | 5-step partner journey explanation |
| `/levels` | Levels | 6 level cards with rates & requirements |
| `/withdrawals` | Withdrawals | Withdrawal schedule by level |
| `/login` | Login | Partner authentication |
| `/register` | Register | New partner signup |

### Dashboard Pages (Protected)

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Dashboard | KPIs, performance chart, quick withdraw |
| `/statistics` | Statistics | Trader-by-trader stats table |
| `/links` | Links | Create/manage tracking links |
| `/top-10` | Top 10 | Partner leaderboard |
| `/affiliate-level` | Affiliate Level | Current level, progress, social profile |
| `/news` | News | Announcements & updates |
| `/support` | Support | Ticket system |
| `/payments` | Payments | Withdraw & history |

---

## Core Business Logic

### 1. Attribution System
- **First-click wins**: First affiliate link clicked gets attribution
- **Cookie-based**: Capture registration attribution within cookie window
- **Permanent**: Once attributed, trader permanently linked to partner
- Record both `partner_id` and `link_id` at attribution

### 2. Commission Calculation
```typescript
// Daily settlement at 00:00 system time
const calculateDailyCommission = (trader: Trader, partner: Partner) => {
  const dayLoss = Math.max(0, -trader.netPL);
  const levelRate = getLevelRate(partner.level); // 0.60 - 0.85
  const commission = dayLoss * levelRate;
  return commission;
};
```

### 3. Level Evaluation
```typescript
// Daily evaluation at 00:00
const evaluatePartnerLevel = (partner: Partner) => {
  const ftdCount = partner.totalFTD;
  const socialVerified = partner.socialChannels.some(c => c.status === 'VERIFIED');

  // Determine highest eligible level
  if (ftdCount >= 400 && socialVerified) return 'AMBASSADOR';
  if (ftdCount >= 400) return 'PRO';
  if (ftdCount >= 150) return 'ADVANCED';
  if (ftdCount >= 100 && partner.socialChannels.length > 0) return 'GROWTH';
  if (ftdCount >= 40) return 'BUILDER';
  if (ftdCount >= 20) return 'STARTER';
  return partner.level; // Keep current
};
```

### 4. Withdrawal Validation
```typescript
const canWithdraw = (partner: Partner): boolean => {
  const today = new Date().getDay(); // 0=Sun, 1=Mon, 4=Thu
  const level = partner.level;

  // Check minimum balance
  if (partner.availableBalance < 20) return false;

  // Check withdrawal day by level
  const allowedDays = {
    STARTER: [1],      // Monday only
    BUILDER: [1],      // Monday only
    GROWTH: [1, 4],    // Mon & Thu
    ADVANCED: [1, 4],  // Mon & Thu
    PRO: [1, 4],       // Mon & Thu
    AMBASSADOR: [0,1,2,3,4,5,6], // Every day
  };

  return allowedDays[level].includes(today);
};
```

### 5. Self-Referral Detection
- Same email/phone between partner and trader
- Device fingerprint match
- Wallet address reuse
- Admin manual marking

### 6. Fraud Detection Signals
- Duplicate IPs (partner ↔ trader overlap)
- Device fingerprint reuse across referred accounts
- Payment wallet reuse

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Partner registration
- `POST /api/auth/login` - Partner login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Partners
- `GET /api/partners/me` - Current partner profile
- `PATCH /api/partners/me` - Update profile
- `GET /api/partners/me/stats` - Dashboard KPIs
- `GET /api/partners/me/level` - Level progress

### Traders
- `GET /api/traders` - List referred traders (paginated)
- `GET /api/traders/stats` - Aggregated trader statistics

### Links
- `GET /api/links` - List partner's tracking links
- `POST /api/links` - Create new link
- `PATCH /api/links/:id` - Update link
- `DELETE /api/links/:id` - Deactivate link

### Payments
- `GET /api/withdrawals` - Withdrawal history
- `POST /api/withdrawals` - Request withdrawal
- `GET /api/settlements` - Commission settlement history

### Support
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Ticket detail
- `POST /api/tickets/:id/reply` - Reply to ticket

### News
- `GET /api/news` - List news articles

### Leaderboard
- `GET /api/leaderboard` - Top 10 partners

### Webhooks (from main broker)
- `POST /api/webhooks/trader-activity` - Trader registration/deposit/trade events
- `POST /api/webhooks/settlement` - Daily settlement trigger

---

## Implementation Phases

### Phase 1: Foundation
1. Project setup (Next.js, TypeScript, Tailwind)
2. Database schema (Prisma)
3. Authentication (NextAuth.js)
4. Base UI components
5. Public layout & navigation

### Phase 2: Public Pages
1. Home page
2. How it Works page
3. Levels page
4. Withdrawals page
5. Login page
6. Registration page

### Phase 3: Dashboard Core
1. Dashboard layout & sidebar
2. Dashboard page (KPIs, chart)
3. Statistics page
4. Links page
5. Top 10 page

### Phase 4: Advanced Dashboard
1. Affiliate Level page
2. News page
3. Support page
4. Payments page

### Phase 5: Business Logic
1. Commission calculation engine
2. Settlement cron job
3. Level evaluation system
4. Withdrawal processing
5. Attribution tracking

### Phase 6: Integration & Polish
1. Webhook endpoints for broker integration
2. Email notifications
3. Fraud detection
4. Testing & optimization
5. Responsive design polish

---

## Integration with Main Broker

The affiliate system needs to connect to the main OptigoBroker platform:

### Data Flow
```
[OptigoBroker Platform] --> Webhook --> [Affiliate System]
                                              |
                                              v
                                        [Update trader stats]
                                        [Calculate commissions]
                                        [Credit settlements]
```

### Webhook Events
1. **trader.registered** - New trader registered via affiliate link
2. **trader.deposit** - Trader made deposit
3. **trader.withdrawal** - Trader made withdrawal
4. **trader.trade.closed** - Trade closed (P/L update)
5. **settlement.trigger** - Daily settlement trigger

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Main Broker Integration
BROKER_API_URL="https://api.optigobroker.com"
BROKER_API_KEY="..."
BROKER_WEBHOOK_SECRET="..."

# Email
SMTP_HOST="..."
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
COOKIE_WINDOW_DAYS="30"
MIN_WITHDRAWAL_AMOUNT="20"
```

---

## Design Guidelines

### Theme
- Dark, space/tech visual style
- Primary: Blue neon accents (#3B82F6)
- Background: Dark (#0a0a0f, #111827)
- Cards: Slightly lighter dark (#1f2937)
- Text: White/gray shades

### Typography
- Clean, modern sans-serif
- Clear hierarchy
- Readable on dark backgrounds

### Components
- Glassmorphism effects
- Subtle gradients
- Neon glow effects on accents
- Smooth transitions

---

## File Naming Conventions

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE`
- API routes: `kebab-case`
- CSS classes: `kebab-case`

---

## Security Considerations

1. **Authentication**: JWT tokens with secure httpOnly cookies
2. **Authorization**: Role-based access control
3. **Input Validation**: Zod schemas for all inputs
4. **Rate Limiting**: Prevent brute force attacks
5. **CSRF Protection**: Built into NextAuth
6. **SQL Injection**: Prevented by Prisma ORM
7. **XSS**: React's built-in escaping + CSP headers
8. **Withdrawal Security**: Email OTP or 2FA confirmation

---

## Next Steps

1. Initialize the Next.js project
2. Install dependencies
3. Set up Prisma schema
4. Create base components
5. Implement authentication
6. Build public pages
7. Build dashboard pages
8. Implement business logic
9. Integration & testing
