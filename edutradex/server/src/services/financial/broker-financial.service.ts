import { query, queryOne, queryMany, transaction } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';
import { wsManager } from '../websocket/websocket.manager.js';

// ==========================================
// TYPES & INTERFACES
// ==========================================

type UserType = 'REAL' | 'TEST' | 'DEMO_ONLY' | 'AFFILIATE_TEST';

interface DailySnapshot {
  id: string;
  date: Date;
  grossTradingRevenue: number;
  totalTradeVolume: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  brokerWinRate: number;
  avgPayoutPercent: number;
  totalWonAmount: number;
  totalLostAmount: number;
  totalPayoutsPaid: number;
  totalAffiliateCommissions: number;
  signupBonusCosts: number;
  depositCommissionCosts: number;
  tradeCommissionCosts: number;
  affiliateCount: number;
  netRevenue: number;
  operatingCosts: number;
  netProfit: number;
  totalDeposits: number;
  depositCount: number;
  totalWithdrawals: number;
  withdrawalCount: number;
  netDeposits: number;
  activeTraders: number;
  newRegistrations: number;
  newDepositors: number;
  totalActiveUsers: number;
  realUserTradeCount: number;
  realUserVolume: number;
  testUserTradeCount: number;
  testUserVolume: number;
  copyTradingVolume: number;
  copyTradingTrades: number;
  activeLeaders: number;
  activeFollowers: number;
  otcTradingVolume: number;
  otcTradingTrades: number;
  otcBrokerRevenue: number;
  otcInterventions: number;
  profitFactor: number;
  revenuePerUser: number;
  revenuePerTrade: number;
  userWinRate: number;
  isFinalized: boolean;
  notes: string | null;
}

interface MonthlyReport {
  id: string;
  month: number;
  year: number;
  totalRevenue: number;
  totalVolume: number;
  totalTrades: number;
  netProfit: number;
  profitMargin: number;
  totalDeposits: number;
  totalWithdrawals: number;
  uniqueActiveTraders: number;
  newRegistrations: number;
  avgBrokerWinRate: number;
  avgProfitFactor: number;
  arpu: number;
  profitableDays: number;
  lossDays: number;
}

interface RealTimeMetrics {
  totalOpenTrades: number;
  totalOpenVolume: number;
  maxPotentialPayout: number;
  netExposure: number;
  todayRevenue: number;
  todayVolume: number;
  todayTrades: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayAffiliateCommissions: number;
  currentDailyPL: number;
  isAlertActive: boolean;
  alertMessage: string | null;
}

interface TradePLResult {
  tradeId: string;
  brokerPL: number;
  userResult: 'WON' | 'LOST';
  amount: number;
  payoutPercent: number;
  isRealUser: boolean;
}

interface DateRange {
  start: Date;
  end: Date;
}

class BrokerFinancialServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'BrokerFinancialServiceError';
  }
}

// ==========================================
// BROKER FINANCIAL SERVICE
// ==========================================

class BrokerFinancialService {
  // ==========================================
  // CORE P&L CALCULATIONS
  // ==========================================

  /**
   * Calculate broker P&L for a single trade
   * Binary options P&L:
   * - User LOSES: Broker keeps the stake amount (+amount)
   * - User WINS: Broker pays the profit (-amount * payoutPercent/100)
   */
  calculateTradePL(trade: {
    result: 'WON' | 'LOST' | null;
    amount: number;
    payoutPercent: number;
  }): number {
    if (!trade.result) return 0;

    if (trade.result === 'LOST') {
      // User lost - broker keeps the stake
      return trade.amount;
    } else {
      // User won - broker pays the profit (stake is returned to user, not broker profit)
      return -(trade.amount * (trade.payoutPercent / 100));
    }
  }

  /**
   * Calculate broker P&L for a date range (REAL users only)
   */
  async calculatePeriodPL(dateRange: DateRange): Promise<{
    grossRevenue: number;
    totalVolume: number;
    totalTrades: number;
    wonTrades: number;
    lostTrades: number;
    brokerWinRate: number;
    avgPayoutPercent: number;
    totalWonAmount: number;
    totalLostAmount: number;
    totalPayoutsPaid: number;
  }> {
    const result = await queryOne<{
      totalTrades: string;
      wonTrades: string;
      lostTrades: string;
      totalVolume: number;
      totalWonAmount: number;
      totalLostAmount: number;
      totalPayoutsPaid: number;
      avgPayoutPercent: number;
    }>(
      `SELECT
        COUNT(*) as "totalTrades",
        COUNT(*) FILTER (WHERE t.result = 'WON') as "wonTrades",
        COUNT(*) FILTER (WHERE t.result = 'LOST') as "lostTrades",
        COALESCE(SUM(t.amount), 0) as "totalVolume",
        COALESCE(SUM(t.amount) FILTER (WHERE t.result = 'WON'), 0) as "totalWonAmount",
        COALESCE(SUM(t.amount) FILTER (WHERE t.result = 'LOST'), 0) as "totalLostAmount",
        COALESCE(SUM(t.amount * t."payoutPercent" / 100) FILTER (WHERE t.result = 'WON'), 0) as "totalPayoutsPaid",
        COALESCE(AVG(t."payoutPercent"), 0) as "avgPayoutPercent"
       FROM "Trade" t
       JOIN "User" u ON u.id = t."userId"
       WHERE t.status = 'CLOSED'
         AND t."closedAt" >= $1 AND t."closedAt" < $2
         AND t."accountType" = 'LIVE'
         AND u."userType" = 'REAL'
         AND u."isTestAccount" = false`,
      [dateRange.start, dateRange.end]
    );

    const totalTrades = parseInt(result?.totalTrades || '0', 10);
    const wonTrades = parseInt(result?.wonTrades || '0', 10);
    const lostTrades = parseInt(result?.lostTrades || '0', 10);
    const totalVolume = Number(result?.totalVolume || 0);
    const totalWonAmount = Number(result?.totalWonAmount || 0);
    const totalLostAmount = Number(result?.totalLostAmount || 0);
    const totalPayoutsPaid = Number(result?.totalPayoutsPaid || 0);
    const avgPayoutPercent = Number(result?.avgPayoutPercent || 0);

    // Gross revenue = amount from lost trades - payouts for won trades
    const grossRevenue = totalLostAmount - totalPayoutsPaid;

    // Broker win rate = % of trades where broker profited (user lost)
    const brokerWinRate = totalTrades > 0 ? (lostTrades / totalTrades) * 100 : 0;

    return {
      grossRevenue,
      totalVolume,
      totalTrades,
      wonTrades,
      lostTrades,
      brokerWinRate,
      avgPayoutPercent,
      totalWonAmount,
      totalLostAmount,
      totalPayoutsPaid,
    };
  }

  // ==========================================
  // DAILY SNAPSHOT GENERATION
  // ==========================================

  /**
   * Generate or update daily financial snapshot
   */
  async generateDailySnapshot(date: Date = new Date()): Promise<DailySnapshot> {
    // Normalize to start of day
    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(snapshotDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const dateRange: DateRange = { start: snapshotDate, end: nextDay };

    logger.info('Generating daily financial snapshot', { date: snapshotDate.toISOString() });

    // Calculate all metrics in parallel
    const [
      tradingMetrics,
      affiliateMetrics,
      depositMetrics,
      withdrawalMetrics,
      userMetrics,
      segregatedMetrics,
      copyTradingMetrics,
      otcMetrics,
    ] = await Promise.all([
      this.calculatePeriodPL(dateRange),
      this.calculateAffiliateMetrics(dateRange),
      this.calculateDepositMetrics(dateRange),
      this.calculateWithdrawalMetrics(dateRange),
      this.calculateUserMetrics(dateRange),
      this.calculateSegregatedMetrics(dateRange),
      this.calculateCopyTradingMetrics(dateRange),
      this.calculateOTCMetrics(dateRange),
    ]);

    // Calculate net values
    const netRevenue = tradingMetrics.grossRevenue - affiliateMetrics.totalCommissions;
    const netDeposits = depositMetrics.totalDeposits - withdrawalMetrics.totalWithdrawals;

    // Calculate business health indicators
    const profitFactor = tradingMetrics.totalPayoutsPaid > 0
      ? tradingMetrics.totalLostAmount / tradingMetrics.totalPayoutsPaid
      : 0;

    const revenuePerUser = userMetrics.activeTraders > 0
      ? tradingMetrics.grossRevenue / userMetrics.activeTraders
      : 0;

    const revenuePerTrade = tradingMetrics.totalTrades > 0
      ? tradingMetrics.grossRevenue / tradingMetrics.totalTrades
      : 0;

    // User win rate (% of users who made profit)
    const userWinRate = tradingMetrics.totalTrades > 0
      ? (tradingMetrics.wonTrades / tradingMetrics.totalTrades) * 100
      : 0;

    // Check if today is complete
    const now = new Date();
    const isFinalized = now >= nextDay;

    // Upsert snapshot
    const snapshotId = randomUUID();
    const snapshot = await queryOne<DailySnapshot>(
      `INSERT INTO "BrokerFinancialSnapshot" (
        id, date,
        "grossTradingRevenue", "totalTradeVolume", "totalTrades", "wonTrades", "lostTrades",
        "brokerWinRate", "avgPayoutPercent", "totalWonAmount", "totalLostAmount", "totalPayoutsPaid",
        "totalAffiliateCommissions", "signupBonusCosts", "depositCommissionCosts", "tradeCommissionCosts", "affiliateCount",
        "netRevenue", "operatingCosts", "netProfit",
        "totalDeposits", "depositCount", "totalWithdrawals", "withdrawalCount", "netDeposits",
        "activeTraders", "newRegistrations", "newDepositors", "totalActiveUsers",
        "realUserTradeCount", "realUserVolume", "testUserTradeCount", "testUserVolume",
        "copyTradingVolume", "copyTradingTrades", "activeLeaders", "activeFollowers",
        "otcTradingVolume", "otcTradingTrades", "otcBrokerRevenue", "otcInterventions",
        "profitFactor", "revenuePerUser", "revenuePerTrade", "userWinRate",
        "isFinalized", "generatedAt", "lastUpdatedAt"
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28, $29,
        $30, $31, $32, $33,
        $34, $35, $36, $37,
        $38, $39, $40, $41,
        $42, $43, $44, $45,
        $46, $47, $48
      )
      ON CONFLICT (date) DO UPDATE SET
        "grossTradingRevenue" = $3, "totalTradeVolume" = $4, "totalTrades" = $5, "wonTrades" = $6, "lostTrades" = $7,
        "brokerWinRate" = $8, "avgPayoutPercent" = $9, "totalWonAmount" = $10, "totalLostAmount" = $11, "totalPayoutsPaid" = $12,
        "totalAffiliateCommissions" = $13, "signupBonusCosts" = $14, "depositCommissionCosts" = $15, "tradeCommissionCosts" = $16, "affiliateCount" = $17,
        "netRevenue" = $18, "netProfit" = $20,
        "totalDeposits" = $21, "depositCount" = $22, "totalWithdrawals" = $23, "withdrawalCount" = $24, "netDeposits" = $25,
        "activeTraders" = $26, "newRegistrations" = $27, "newDepositors" = $28, "totalActiveUsers" = $29,
        "realUserTradeCount" = $30, "realUserVolume" = $31, "testUserTradeCount" = $32, "testUserVolume" = $33,
        "copyTradingVolume" = $34, "copyTradingTrades" = $35, "activeLeaders" = $36, "activeFollowers" = $37,
        "otcTradingVolume" = $38, "otcTradingTrades" = $39, "otcBrokerRevenue" = $40, "otcInterventions" = $41,
        "profitFactor" = $42, "revenuePerUser" = $43, "revenuePerTrade" = $44, "userWinRate" = $45,
        "isFinalized" = $46, "lastUpdatedAt" = $48
      RETURNING *`,
      [
        snapshotId, snapshotDate,
        tradingMetrics.grossRevenue, tradingMetrics.totalVolume, tradingMetrics.totalTrades, tradingMetrics.wonTrades, tradingMetrics.lostTrades,
        tradingMetrics.brokerWinRate, tradingMetrics.avgPayoutPercent, tradingMetrics.totalWonAmount, tradingMetrics.totalLostAmount, tradingMetrics.totalPayoutsPaid,
        affiliateMetrics.totalCommissions, affiliateMetrics.signupBonusCosts, affiliateMetrics.depositCommissionCosts, affiliateMetrics.tradeCommissionCosts, affiliateMetrics.affiliateCount,
        netRevenue, 0, netRevenue, // operatingCosts is manual, so netProfit = netRevenue for now
        depositMetrics.totalDeposits, depositMetrics.depositCount, withdrawalMetrics.totalWithdrawals, withdrawalMetrics.withdrawalCount, netDeposits,
        userMetrics.activeTraders, userMetrics.newRegistrations, userMetrics.newDepositors, userMetrics.totalActiveUsers,
        segregatedMetrics.realUserTradeCount, segregatedMetrics.realUserVolume, segregatedMetrics.testUserTradeCount, segregatedMetrics.testUserVolume,
        copyTradingMetrics.volume, copyTradingMetrics.trades, copyTradingMetrics.activeLeaders, copyTradingMetrics.activeFollowers,
        otcMetrics.volume, otcMetrics.trades, otcMetrics.brokerRevenue, otcMetrics.interventions,
        profitFactor, revenuePerUser, revenuePerTrade, userWinRate,
        isFinalized, new Date(), new Date(),
      ]
    );

    // Log audit
    await this.logFinancialAction('SNAPSHOT_GENERATED', 'DAILY_SNAPSHOT', snapshot!.id, {
      date: snapshotDate.toISOString(),
      grossRevenue: tradingMetrics.grossRevenue,
      netRevenue,
    });

    logger.info('Daily snapshot generated', {
      date: snapshotDate.toISOString(),
      grossRevenue: tradingMetrics.grossRevenue,
      netRevenue,
      totalTrades: tradingMetrics.totalTrades,
    });

    // Broadcast daily snapshot update via WebSocket
    wsManager.broadcastFinancialUpdate({
      type: 'daily_snapshot',
      payload: {
        id: snapshot!.id,
        date: snapshotDate.toISOString(),
        grossTradingRevenue: tradingMetrics.grossRevenue,
        netRevenue,
        totalTrades: tradingMetrics.totalTrades,
        brokerWinRate: tradingMetrics.brokerWinRate,
        isFinalized,
      },
    });

    return snapshot!;
  }

  /**
   * Calculate affiliate commission metrics for a period
   */
  private async calculateAffiliateMetrics(dateRange: DateRange): Promise<{
    totalCommissions: number;
    signupBonusCosts: number;
    depositCommissionCosts: number;
    tradeCommissionCosts: number;
    affiliateCount: number;
  }> {
    const result = await queryOne<{
      totalCommissions: number;
      signupBonusCosts: number;
      depositCommissionCosts: number;
      tradeCommissionCosts: number;
      affiliateCount: string;
    }>(
      `SELECT
        COALESCE(SUM(amount), 0) as "totalCommissions",
        COALESCE(SUM(amount) FILTER (WHERE type = 'SIGNUP_BONUS'), 0) as "signupBonusCosts",
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT_COMMISSION'), 0) as "depositCommissionCosts",
        COALESCE(SUM(amount) FILTER (WHERE type = 'TRADE_COMMISSION'), 0) as "tradeCommissionCosts",
        COUNT(DISTINCT "earnerId") as "affiliateCount"
       FROM "ReferralCommission"
       WHERE status = 'CREDITED'
         AND "creditedAt" >= $1 AND "creditedAt" < $2`,
      [dateRange.start, dateRange.end]
    );

    return {
      totalCommissions: Number(result?.totalCommissions || 0),
      signupBonusCosts: Number(result?.signupBonusCosts || 0),
      depositCommissionCosts: Number(result?.depositCommissionCosts || 0),
      tradeCommissionCosts: Number(result?.tradeCommissionCosts || 0),
      affiliateCount: parseInt(result?.affiliateCount || '0', 10),
    };
  }

  /**
   * Calculate deposit metrics for a period
   */
  private async calculateDepositMetrics(dateRange: DateRange): Promise<{
    totalDeposits: number;
    depositCount: number;
  }> {
    const result = await queryOne<{
      totalDeposits: number;
      depositCount: string;
    }>(
      `SELECT
        COALESCE(SUM(d.amount), 0) as "totalDeposits",
        COUNT(*) as "depositCount"
       FROM "Deposit" d
       JOIN "User" u ON u.id = d."userId"
       WHERE d.status = 'APPROVED'
         AND d."processedAt" >= $1 AND d."processedAt" < $2
         AND u."userType" = 'REAL'
         AND u."isTestAccount" = false`,
      [dateRange.start, dateRange.end]
    );

    return {
      totalDeposits: Number(result?.totalDeposits || 0),
      depositCount: parseInt(result?.depositCount || '0', 10),
    };
  }

  /**
   * Calculate withdrawal metrics for a period
   */
  private async calculateWithdrawalMetrics(dateRange: DateRange): Promise<{
    totalWithdrawals: number;
    withdrawalCount: number;
  }> {
    const result = await queryOne<{
      totalWithdrawals: number;
      withdrawalCount: string;
    }>(
      `SELECT
        COALESCE(SUM(w.amount), 0) as "totalWithdrawals",
        COUNT(*) as "withdrawalCount"
       FROM "Withdrawal" w
       JOIN "User" u ON u.id = w."userId"
       WHERE w.status = 'APPROVED'
         AND w."processedAt" >= $1 AND w."processedAt" < $2
         AND u."userType" = 'REAL'
         AND u."isTestAccount" = false`,
      [dateRange.start, dateRange.end]
    );

    return {
      totalWithdrawals: Number(result?.totalWithdrawals || 0),
      withdrawalCount: parseInt(result?.withdrawalCount || '0', 10),
    };
  }

  /**
   * Calculate user metrics for a period
   */
  private async calculateUserMetrics(dateRange: DateRange): Promise<{
    activeTraders: number;
    newRegistrations: number;
    newDepositors: number;
    totalActiveUsers: number;
  }> {
    const [activeTradersResult, newRegsResult, newDepositorsResult, totalActiveResult] = await Promise.all([
      // Active traders (placed at least one LIVE trade)
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT t."userId") as count
         FROM "Trade" t
         JOIN "User" u ON u.id = t."userId"
         WHERE t."openedAt" >= $1 AND t."openedAt" < $2
           AND t."accountType" = 'LIVE'
           AND u."userType" = 'REAL'
           AND u."isTestAccount" = false`,
        [dateRange.start, dateRange.end]
      ),
      // New registrations
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM "User"
         WHERE "createdAt" >= $1 AND "createdAt" < $2
           AND "userType" = 'REAL'
           AND "isTestAccount" = false`,
        [dateRange.start, dateRange.end]
      ),
      // New depositors (first deposit in this period)
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT d."userId") as count
         FROM "Deposit" d
         JOIN "User" u ON u.id = d."userId"
         WHERE d.status = 'APPROVED'
           AND d."processedAt" >= $1 AND d."processedAt" < $2
           AND u."userType" = 'REAL'
           AND u."isTestAccount" = false
           AND NOT EXISTS (
             SELECT 1 FROM "Deposit" d2
             WHERE d2."userId" = d."userId"
               AND d2.status = 'APPROVED'
               AND d2."processedAt" < $1
           )`,
        [dateRange.start, dateRange.end]
      ),
      // Total active users
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM "User"
         WHERE "isActive" = true
           AND "userType" = 'REAL'
           AND "isTestAccount" = false`,
        []
      ),
    ]);

    return {
      activeTraders: parseInt(activeTradersResult?.count || '0', 10),
      newRegistrations: parseInt(newRegsResult?.count || '0', 10),
      newDepositors: parseInt(newDepositorsResult?.count || '0', 10),
      totalActiveUsers: parseInt(totalActiveResult?.count || '0', 10),
    };
  }

  /**
   * Calculate segregated metrics (real vs test users)
   */
  private async calculateSegregatedMetrics(dateRange: DateRange): Promise<{
    realUserTradeCount: number;
    realUserVolume: number;
    testUserTradeCount: number;
    testUserVolume: number;
  }> {
    const result = await queryOne<{
      realUserTradeCount: string;
      realUserVolume: number;
      testUserTradeCount: string;
      testUserVolume: number;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE u."userType" = 'REAL' AND u."isTestAccount" = false) as "realUserTradeCount",
        COALESCE(SUM(t.amount) FILTER (WHERE u."userType" = 'REAL' AND u."isTestAccount" = false), 0) as "realUserVolume",
        COUNT(*) FILTER (WHERE u."userType" != 'REAL' OR u."isTestAccount" = true) as "testUserTradeCount",
        COALESCE(SUM(t.amount) FILTER (WHERE u."userType" != 'REAL' OR u."isTestAccount" = true), 0) as "testUserVolume"
       FROM "Trade" t
       JOIN "User" u ON u.id = t."userId"
       WHERE t.status = 'CLOSED'
         AND t."closedAt" >= $1 AND t."closedAt" < $2
         AND t."accountType" = 'LIVE'`,
      [dateRange.start, dateRange.end]
    );

    return {
      realUserTradeCount: parseInt(result?.realUserTradeCount || '0', 10),
      realUserVolume: Number(result?.realUserVolume || 0),
      testUserTradeCount: parseInt(result?.testUserTradeCount || '0', 10),
      testUserVolume: Number(result?.testUserVolume || 0),
    };
  }

  /**
   * Calculate copy trading metrics for a period
   */
  private async calculateCopyTradingMetrics(dateRange: DateRange): Promise<{
    volume: number;
    trades: number;
    activeLeaders: number;
    activeFollowers: number;
  }> {
    const [copyTradesResult, leadersResult, followersResult] = await Promise.all([
      queryOne<{ volume: number; trades: string }>(
        `SELECT
          COALESCE(SUM(t.amount), 0) as volume,
          COUNT(*) as trades
         FROM "Trade" t
         WHERE t."isCopyTrade" = true
           AND t."openedAt" >= $1 AND t."openedAt" < $2`,
        [dateRange.start, dateRange.end]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM "CopyTradingLeader"
         WHERE status = 'APPROVED'`,
        []
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM "CopyTradingFollower"
         WHERE "isActive" = true`,
        []
      ),
    ]);

    return {
      volume: Number(copyTradesResult?.volume || 0),
      trades: parseInt(copyTradesResult?.trades || '0', 10),
      activeLeaders: parseInt(leadersResult?.count || '0', 10),
      activeFollowers: parseInt(followersResult?.count || '0', 10),
    };
  }

  /**
   * Calculate OTC market metrics for a period
   */
  private async calculateOTCMetrics(dateRange: DateRange): Promise<{
    volume: number;
    trades: number;
    brokerRevenue: number;
    interventions: number;
  }> {
    const [tradesResult, interventionsResult] = await Promise.all([
      queryOne<{
        volume: number;
        trades: string;
        lostAmount: number;
        payoutsPaid: number;
      }>(
        `SELECT
          COALESCE(SUM(t.amount), 0) as volume,
          COUNT(*) as trades,
          COALESCE(SUM(t.amount) FILTER (WHERE t.result = 'LOST'), 0) as "lostAmount",
          COALESCE(SUM(t.amount * t."payoutPercent" / 100) FILTER (WHERE t.result = 'WON'), 0) as "payoutsPaid"
         FROM "Trade" t
         JOIN "User" u ON u.id = t."userId"
         WHERE t.symbol LIKE '%-OTC'
           AND t.status = 'CLOSED'
           AND t."closedAt" >= $1 AND t."closedAt" < $2
           AND u."userType" = 'REAL'
           AND u."isTestAccount" = false`,
        [dateRange.start, dateRange.end]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM "OTCActivityLog"
         WHERE "eventType" = 'RISK_INTERVENTION'
           AND timestamp >= $1 AND timestamp < $2`,
        [dateRange.start, dateRange.end]
      ),
    ]);

    const brokerRevenue = Number(tradesResult?.lostAmount || 0) - Number(tradesResult?.payoutsPaid || 0);

    return {
      volume: Number(tradesResult?.volume || 0),
      trades: parseInt(tradesResult?.trades || '0', 10),
      brokerRevenue,
      interventions: parseInt(interventionsResult?.count || '0', 10),
    };
  }

  // ==========================================
  // MONTHLY REPORT GENERATION
  // ==========================================

  /**
   * Generate monthly report from daily snapshots
   */
  async generateMonthlyReport(month: number, year: number): Promise<MonthlyReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    logger.info('Generating monthly financial report', { month, year });

    // Get all daily snapshots for the month
    const snapshots = await queryMany<DailySnapshot>(
      `SELECT * FROM "BrokerFinancialSnapshot"
       WHERE date >= $1 AND date < $2
       ORDER BY date ASC`,
      [startDate, endDate]
    );

    if (snapshots.length === 0) {
      throw new BrokerFinancialServiceError('No daily snapshots found for this month', 404);
    }

    // Aggregate metrics
    const totalRevenue = snapshots.reduce((sum, s) => sum + Number(s.grossTradingRevenue), 0);
    const totalVolume = snapshots.reduce((sum, s) => sum + Number(s.totalTradeVolume), 0);
    const totalTrades = snapshots.reduce((sum, s) => sum + s.totalTrades, 0);
    const totalWonTrades = snapshots.reduce((sum, s) => sum + s.wonTrades, 0);
    const totalLostTrades = snapshots.reduce((sum, s) => sum + s.lostTrades, 0);
    const totalAffiliateCommissions = snapshots.reduce((sum, s) => sum + Number(s.totalAffiliateCommissions), 0);
    const totalOperatingCosts = snapshots.reduce((sum, s) => sum + Number(s.operatingCosts), 0);
    const totalDeposits = snapshots.reduce((sum, s) => sum + Number(s.totalDeposits), 0);
    const totalWithdrawals = snapshots.reduce((sum, s) => sum + Number(s.totalWithdrawals), 0);

    const netProfit = totalRevenue - totalAffiliateCommissions - totalOperatingCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const netDeposits = totalDeposits - totalWithdrawals;

    // Get unique active traders for the month
    const uniqueTradersResult = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT t."userId") as count
       FROM "Trade" t
       JOIN "User" u ON u.id = t."userId"
       WHERE t."openedAt" >= $1 AND t."openedAt" < $2
         AND t."accountType" = 'LIVE'
         AND u."userType" = 'REAL'
         AND u."isTestAccount" = false`,
      [startDate, endDate]
    );

    const uniqueActiveTraders = parseInt(uniqueTradersResult?.count || '0', 10);
    const newRegistrations = snapshots.reduce((sum, s) => sum + s.newRegistrations, 0);
    const newDepositors = snapshots.reduce((sum, s) => sum + s.newDepositors, 0);

    // Calculate averages
    const avgBrokerWinRate = snapshots.reduce((sum, s) => sum + Number(s.brokerWinRate), 0) / snapshots.length;
    const avgProfitFactor = snapshots.reduce((sum, s) => sum + Number(s.profitFactor), 0) / snapshots.length;
    const arpu = uniqueActiveTraders > 0 ? totalRevenue / uniqueActiveTraders : 0;

    // Daily breakdowns
    const avgDailyRevenue = totalRevenue / snapshots.length;
    const avgDailyVolume = totalVolume / snapshots.length;
    const avgDailyTrades = totalTrades / snapshots.length;

    const revenues = snapshots.map(s => Number(s.grossTradingRevenue));
    const peakDayRevenue = Math.max(...revenues);
    const lowestDayRevenue = Math.min(...revenues);
    const peakDayIndex = revenues.indexOf(peakDayRevenue);
    const lowestDayIndex = revenues.indexOf(lowestDayRevenue);

    const profitableDays = snapshots.filter(s => Number(s.grossTradingRevenue) > 0).length;
    const lossDays = snapshots.filter(s => Number(s.grossTradingRevenue) < 0).length;

    // Get previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previousReport = await queryOne<{ totalRevenue: number; netProfit: number }>(
      `SELECT "totalRevenue", "netProfit" FROM "BrokerMonthlyReport"
       WHERE month = $1 AND year = $2`,
      [prevMonth, prevYear]
    );

    const previousMonthRevenue = previousReport?.totalRevenue || null;
    const previousMonthProfit = previousReport?.netProfit || null;
    const revenueGrowthPercent = previousMonthRevenue
      ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : null;
    const profitGrowthPercent = previousMonthProfit
      ? ((netProfit - previousMonthProfit) / previousMonthProfit) * 100
      : null;

    // Upsert monthly report
    const reportId = randomUUID();
    const report = await queryOne<MonthlyReport>(
      `INSERT INTO "BrokerMonthlyReport" (
        id, month, year,
        "totalRevenue", "totalVolume", "totalTrades", "totalWonTrades", "totalLostTrades",
        "totalAffiliateCommissions", "totalOperatingCosts",
        "netProfit", "profitMargin",
        "totalDeposits", "totalWithdrawals", "netDeposits",
        "uniqueActiveTraders", "newRegistrations", "newDepositors",
        "previousMonthRevenue", "revenueGrowthPercent", "previousMonthProfit", "profitGrowthPercent",
        "avgDailyRevenue", "avgDailyVolume", "avgDailyTrades",
        "peakDayRevenue", "peakDayDate", "lowestDayRevenue", "lowestDayDate",
        "profitableDays", "lossDays",
        "avgBrokerWinRate", "avgProfitFactor", "arpu",
        "isFinalized", "generatedAt", "lastUpdatedAt"
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10,
        $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25,
        $26, $27, $28, $29,
        $30, $31,
        $32, $33, $34,
        $35, $36, $37
      )
      ON CONFLICT (month, year) DO UPDATE SET
        "totalRevenue" = $4, "totalVolume" = $5, "totalTrades" = $6, "totalWonTrades" = $7, "totalLostTrades" = $8,
        "totalAffiliateCommissions" = $9, "totalOperatingCosts" = $10,
        "netProfit" = $11, "profitMargin" = $12,
        "totalDeposits" = $13, "totalWithdrawals" = $14, "netDeposits" = $15,
        "uniqueActiveTraders" = $16, "newRegistrations" = $17, "newDepositors" = $18,
        "previousMonthRevenue" = $19, "revenueGrowthPercent" = $20, "previousMonthProfit" = $21, "profitGrowthPercent" = $22,
        "avgDailyRevenue" = $23, "avgDailyVolume" = $24, "avgDailyTrades" = $25,
        "peakDayRevenue" = $26, "peakDayDate" = $27, "lowestDayRevenue" = $28, "lowestDayDate" = $29,
        "profitableDays" = $30, "lossDays" = $31,
        "avgBrokerWinRate" = $32, "avgProfitFactor" = $33, "arpu" = $34,
        "lastUpdatedAt" = $37
      RETURNING *`,
      [
        reportId, month, year,
        totalRevenue, totalVolume, totalTrades, totalWonTrades, totalLostTrades,
        totalAffiliateCommissions, totalOperatingCosts,
        netProfit, profitMargin,
        totalDeposits, totalWithdrawals, netDeposits,
        uniqueActiveTraders, newRegistrations, newDepositors,
        previousMonthRevenue, revenueGrowthPercent, previousMonthProfit, profitGrowthPercent,
        avgDailyRevenue, avgDailyVolume, avgDailyTrades,
        peakDayRevenue, snapshots[peakDayIndex]?.date || null, lowestDayRevenue, snapshots[lowestDayIndex]?.date || null,
        profitableDays, lossDays,
        avgBrokerWinRate, avgProfitFactor, arpu,
        false, new Date(), new Date(),
      ]
    );

    // Log audit
    await this.logFinancialAction('REPORT_GENERATED', 'MONTHLY_REPORT', report!.id, {
      month,
      year,
      totalRevenue,
      netProfit,
    });

    logger.info('Monthly report generated', {
      month,
      year,
      totalRevenue,
      netProfit,
      profitMargin,
    });

    return report!;
  }

  // ==========================================
  // REAL-TIME METRICS
  // ==========================================

  /**
   * Get or create real-time metrics singleton
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    let metrics = await queryOne<RealTimeMetrics & { id: string }>(
      `SELECT * FROM "BrokerRealTimeMetrics" WHERE "isActive" = true LIMIT 1`
    );

    if (!metrics) {
      // Initialize singleton
      const id = randomUUID();
      await query(
        `INSERT INTO "BrokerRealTimeMetrics" (id, "isActive", "lastDailyReset", "updatedAt")
         VALUES ($1, true, $2, $3)`,
        [id, new Date(), new Date()]
      );
      metrics = await queryOne<RealTimeMetrics & { id: string }>(
        `SELECT * FROM "BrokerRealTimeMetrics" WHERE id = $1`,
        [id]
      );
    }

    return metrics!;
  }

  /**
   * Update real-time metrics with current data
   */
  async updateRealTimeMetrics(): Promise<RealTimeMetrics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Calculate current exposure from open trades
    const exposureResult = await queryOne<{
      totalOpenTrades: string;
      totalOpenVolume: number;
      maxPotentialPayout: number;
      upExposure: number;
      downExposure: number;
    }>(
      `SELECT
        COUNT(*) as "totalOpenTrades",
        COALESCE(SUM(amount), 0) as "totalOpenVolume",
        COALESCE(SUM(amount * "payoutPercent" / 100), 0) as "maxPotentialPayout",
        COALESCE(SUM(amount) FILTER (WHERE direction = 'UP'), 0) as "upExposure",
        COALESCE(SUM(amount) FILTER (WHERE direction = 'DOWN'), 0) as "downExposure"
       FROM "Trade"
       WHERE status = 'OPEN' AND "accountType" = 'LIVE'`
    );

    // Calculate today's P&L
    const todayPL = await this.calculatePeriodPL({ start: todayStart, end: now });

    // Calculate today's deposits/withdrawals
    const [depositsResult, withdrawalsResult, commissionsResult] = await Promise.all([
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM "Deposit"
         WHERE status = 'APPROVED' AND "processedAt" >= $1`,
        [todayStart]
      ),
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM "Withdrawal"
         WHERE status = 'APPROVED' AND "processedAt" >= $1`,
        [todayStart]
      ),
      queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM "ReferralCommission"
         WHERE status = 'CREDITED' AND "creditedAt" >= $1`,
        [todayStart]
      ),
    ]);

    const netExposure = Number(exposureResult?.upExposure || 0) - Number(exposureResult?.downExposure || 0);

    // Check alert conditions
    const currentMetrics = await this.getRealTimeMetrics();
    const isAlertActive = Math.abs(netExposure) > (currentMetrics as any).exposureAlertThreshold ||
      todayPL.grossRevenue < -(currentMetrics as any).dailyLossLimit;
    const alertMessage = isAlertActive
      ? Math.abs(netExposure) > (currentMetrics as any).exposureAlertThreshold
        ? `High exposure alert: $${Math.abs(netExposure).toFixed(2)}`
        : `Daily loss limit warning: $${Math.abs(todayPL.grossRevenue).toFixed(2)}`
      : null;

    // Update metrics
    await query(
      `UPDATE "BrokerRealTimeMetrics" SET
        "totalOpenTrades" = $1,
        "totalOpenVolume" = $2,
        "maxPotentialPayout" = $3,
        "netExposure" = $4,
        "todayRevenue" = $5,
        "todayVolume" = $6,
        "todayTrades" = $7,
        "todayDeposits" = $8,
        "todayWithdrawals" = $9,
        "todayAffiliateCommissions" = $10,
        "currentDailyPL" = $11,
        "isAlertActive" = $12,
        "alertMessage" = $13,
        "updatedAt" = $14
       WHERE "isActive" = true`,
      [
        parseInt(exposureResult?.totalOpenTrades || '0', 10),
        Number(exposureResult?.totalOpenVolume || 0),
        Number(exposureResult?.maxPotentialPayout || 0),
        netExposure,
        todayPL.grossRevenue,
        todayPL.totalVolume,
        todayPL.totalTrades,
        Number(depositsResult?.total || 0),
        Number(withdrawalsResult?.total || 0),
        Number(commissionsResult?.total || 0),
        todayPL.grossRevenue,
        isAlertActive,
        alertMessage,
        now,
      ]
    );

    const metrics = await this.getRealTimeMetrics();

    // Broadcast real-time metrics update via WebSocket
    wsManager.broadcastFinancialUpdate({
      type: 'realtime_metrics',
      payload: metrics as unknown as Record<string, unknown>,
    });

    return metrics;
  }

  /**
   * Reset daily counters (call at midnight)
   */
  async resetDailyCounters(): Promise<void> {
    await query(
      `UPDATE "BrokerRealTimeMetrics" SET
        "todayRevenue" = 0,
        "todayVolume" = 0,
        "todayTrades" = 0,
        "todayDeposits" = 0,
        "todayWithdrawals" = 0,
        "todayAffiliateCommissions" = 0,
        "currentDailyPL" = 0,
        "isAlertActive" = false,
        "alertMessage" = NULL,
        "lastDailyReset" = $1,
        "updatedAt" = $1
       WHERE "isActive" = true`,
      [new Date()]
    );

    logger.info('Daily financial counters reset');
  }

  // ==========================================
  // USER TYPE MANAGEMENT
  // ==========================================

  /**
   * Update user type (for segregating real vs test accounts)
   */
  async updateUserType(
    userId: string,
    userType: UserType,
    adminId?: string
  ): Promise<{ success: boolean; previousType: UserType }> {
    const user = await queryOne<{ userType: string; isTestAccount: boolean }>(
      `SELECT "userType", "isTestAccount" FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new BrokerFinancialServiceError('User not found', 404);
    }

    const previousType = user.userType as UserType;
    const isTestAccount = userType !== 'REAL';

    await query(
      `UPDATE "User" SET
        "userType" = $1,
        "isTestAccount" = $2,
        "updatedAt" = $3
       WHERE id = $4`,
      [userType, isTestAccount, new Date(), userId]
    );

    // Log the change
    await this.logFinancialAction('USER_TYPE_CHANGED', 'USER', userId, {
      previousType,
      newType: userType,
      adminId,
    }, adminId);

    logger.info('User type updated', { userId, previousType, newType: userType });

    return { success: true, previousType };
  }

  /**
   * Bulk update user types
   */
  async bulkUpdateUserTypes(
    userIds: string[],
    userType: UserType,
    adminId?: string
  ): Promise<{ updated: number }> {
    const isTestAccount = userType !== 'REAL';
    const placeholders = userIds.map((_, i) => `$${i + 4}`).join(', ');

    const result = await query(
      `UPDATE "User" SET
        "userType" = $1,
        "isTestAccount" = $2,
        "updatedAt" = $3
       WHERE id IN (${placeholders})`,
      [userType, isTestAccount, new Date(), ...userIds]
    );

    // Log bulk action
    await this.logFinancialAction('USER_TYPE_CHANGED', 'USER', 'BULK', {
      userIds,
      newType: userType,
      count: result.rowCount,
      adminId,
    }, adminId);

    logger.info('Bulk user type update', { count: result.rowCount, userType });

    return { updated: result.rowCount || 0 };
  }

  /**
   * Automatically detect and mark DEMO_ONLY users
   * Users are classified as DEMO_ONLY if they:
   * 1. Have never made an approved deposit, AND
   * 2. Have only traded on demo/practice accounts (no LIVE trades)
   */
  async autoClassifyDemoOnlyUsers(adminId?: string): Promise<{ classified: number; userIds: string[] }> {
    // Find users who:
    // - Are currently marked as REAL
    // - Have ZERO approved deposits
    // - Have ZERO LIVE account trades
    const demoOnlyUsers = await queryMany<{ id: string; email: string }>(
      `SELECT u.id, u.email
       FROM "User" u
       WHERE u."userType" = 'REAL'
         AND u.role = 'USER'
         AND NOT EXISTS (
           SELECT 1 FROM "Deposit" d
           WHERE d."userId" = u.id AND d.status = 'APPROVED'
         )
         AND NOT EXISTS (
           SELECT 1 FROM "Trade" t
           WHERE t."userId" = u.id AND t."accountType" = 'LIVE'
         )`
    );

    if (demoOnlyUsers.length === 0) {
      logger.info('No demo-only users found to classify');
      return { classified: 0, userIds: [] };
    }

    const userIds = demoOnlyUsers.map((u: { id: string; email: string }) => u.id);

    // Update these users to DEMO_ONLY
    const placeholders = userIds.map((_: string, i: number) => `$${i + 3}`).join(', ');
    await query(
      `UPDATE "User" SET
        "userType" = 'DEMO_ONLY',
        "isTestAccount" = true,
        "updatedAt" = $1
       WHERE id IN (${placeholders})`,
      [new Date(), ...userIds]
    );

    // Log the action
    await this.logFinancialAction('AUTO_CLASSIFY_DEMO_ONLY', 'USER', 'SYSTEM', {
      classifiedCount: userIds.length,
      userIds,
      adminId,
    }, adminId);

    logger.info('Auto-classified demo-only users', {
      count: userIds.length,
      emails: demoOnlyUsers.map((u: { id: string; email: string }) => u.email)
    });

    return { classified: userIds.length, userIds };
  }

  /**
   * Get count of users who would be classified as DEMO_ONLY
   * (Preview without making changes)
   */
  async previewDemoOnlyClassification(): Promise<{ count: number; users: { id: string; email: string; name: string }[] }> {
    const users = await queryMany<{ id: string; email: string; name: string }>(
      `SELECT u.id, u.email, u.name
       FROM "User" u
       WHERE u."userType" = 'REAL'
         AND u.role = 'USER'
         AND NOT EXISTS (
           SELECT 1 FROM "Deposit" d
           WHERE d."userId" = u.id AND d.status = 'APPROVED'
         )
         AND NOT EXISTS (
           SELECT 1 FROM "Trade" t
           WHERE t."userId" = u.id AND t."accountType" = 'LIVE'
         )
       ORDER BY u."createdAt" DESC
       LIMIT 100`
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM "User" u
       WHERE u."userType" = 'REAL'
         AND u.role = 'USER'
         AND NOT EXISTS (
           SELECT 1 FROM "Deposit" d
           WHERE d."userId" = u.id AND d.status = 'APPROVED'
         )
         AND NOT EXISTS (
           SELECT 1 FROM "Trade" t
           WHERE t."userId" = u.id AND t."accountType" = 'LIVE'
         )`
    );

    return {
      count: parseInt(countResult?.count || '0', 10),
      users,
    };
  }

  /**
   * Get users by type with pagination
   */
  async getUsersByType(
    userType: UserType,
    options: { page?: number; limit?: number; search?: string } = {}
  ): Promise<{
    users: { id: string; email: string; name: string; userType: string; createdAt: Date }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let whereClause = `"userType" = $1`;
    const params: any[] = [userType];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const [users, countResult] = await Promise.all([
      queryMany<{ id: string; email: string; name: string; userType: string; createdAt: Date }>(
        `SELECT id, email, name, "userType", "createdAt"
         FROM "User"
         WHERE ${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "User" WHERE ${whereClause}`,
        params
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // OPERATING COSTS MANAGEMENT
  // ==========================================

  /**
   * Set operating costs for a daily snapshot
   */
  async setOperatingCosts(
    date: Date,
    operatingCosts: number,
    adminId?: string
  ): Promise<DailySnapshot> {
    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    const snapshot = await queryOne<DailySnapshot>(
      `SELECT * FROM "BrokerFinancialSnapshot" WHERE date = $1`,
      [snapshotDate]
    );

    if (!snapshot) {
      throw new BrokerFinancialServiceError('Snapshot not found for this date', 404);
    }

    const previousCosts = Number(snapshot.operatingCosts);
    const netRevenue = Number(snapshot.netRevenue);
    const newNetProfit = netRevenue - operatingCosts;

    await query(
      `UPDATE "BrokerFinancialSnapshot" SET
        "operatingCosts" = $1,
        "netProfit" = $2,
        "lastUpdatedAt" = $3
       WHERE date = $4`,
      [operatingCosts, newNetProfit, new Date(), snapshotDate]
    );

    // Log the change
    await this.logFinancialAction('OPERATING_COST_SET', 'DAILY_SNAPSHOT', snapshot.id, {
      date: snapshotDate.toISOString(),
      previousCosts,
      newCosts: operatingCosts,
      adminId,
    }, adminId);

    return queryOne<DailySnapshot>(
      `SELECT * FROM "BrokerFinancialSnapshot" WHERE date = $1`,
      [snapshotDate]
    ) as Promise<DailySnapshot>;
  }

  // ==========================================
  // REPORTING & ANALYTICS
  // ==========================================

  /**
   * Get daily snapshots for a date range
   */
  async getDailySnapshots(dateRange: DateRange): Promise<DailySnapshot[]> {
    return queryMany<DailySnapshot>(
      `SELECT * FROM "BrokerFinancialSnapshot"
       WHERE date >= $1 AND date < $2
       ORDER BY date ASC`,
      [dateRange.start, dateRange.end]
    );
  }

  /**
   * Get monthly reports for a year
   */
  async getMonthlyReports(year: number): Promise<MonthlyReport[]> {
    return queryMany<MonthlyReport>(
      `SELECT * FROM "BrokerMonthlyReport"
       WHERE year = $1
       ORDER BY month ASC`,
      [year]
    );
  }

  /**
   * Get financial summary (dashboard overview)
   */
  async getFinancialSummary(): Promise<{
    today: RealTimeMetrics;
    yesterday: DailySnapshot | null;
    thisMonth: {
      totalRevenue: number;
      totalVolume: number;
      totalTrades: number;
      netProfit: number;
      daysReported: number;
    };
    lastMonth: MonthlyReport | null;
    yearToDate: {
      totalRevenue: number;
      totalVolume: number;
      netProfit: number;
    };
  }> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [today, yesterday, thisMonthSnapshots, lastMonthReport, ytdResult] = await Promise.all([
      this.updateRealTimeMetrics(),
      queryOne<DailySnapshot>(
        `SELECT * FROM "BrokerFinancialSnapshot" WHERE date = $1`,
        [yesterdayStart]
      ),
      queryMany<DailySnapshot>(
        `SELECT * FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date < $2`,
        [thisMonthStart, todayStart]
      ),
      queryOne<MonthlyReport>(
        `SELECT * FROM "BrokerMonthlyReport"
         WHERE month = $1 AND year = $2`,
        [lastMonth, lastMonthYear]
      ),
      queryOne<{ totalRevenue: number; totalVolume: number; netProfit: number }>(
        `SELECT
          COALESCE(SUM("grossTradingRevenue"), 0) as "totalRevenue",
          COALESCE(SUM("totalTradeVolume"), 0) as "totalVolume",
          COALESCE(SUM("netProfit"), 0) as "netProfit"
         FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date < $2`,
        [yearStart, todayStart]
      ),
    ]);

    const thisMonth = {
      totalRevenue: thisMonthSnapshots.reduce((sum, s) => sum + Number(s.grossTradingRevenue), 0),
      totalVolume: thisMonthSnapshots.reduce((sum, s) => sum + Number(s.totalTradeVolume), 0),
      totalTrades: thisMonthSnapshots.reduce((sum, s) => sum + s.totalTrades, 0),
      netProfit: thisMonthSnapshots.reduce((sum, s) => sum + Number(s.netProfit), 0),
      daysReported: thisMonthSnapshots.length,
    };

    return {
      today,
      yesterday,
      thisMonth,
      lastMonth: lastMonthReport,
      yearToDate: {
        totalRevenue: Number(ytdResult?.totalRevenue || 0),
        totalVolume: Number(ytdResult?.totalVolume || 0),
        netProfit: Number(ytdResult?.netProfit || 0),
      },
    };
  }

  /**
   * Get top metrics for a period
   */
  async getTopMetrics(dateRange: DateRange): Promise<{
    topProfitableDays: { date: Date; revenue: number }[];
    topLossDays: { date: Date; revenue: number }[];
    topTradingDays: { date: Date; trades: number }[];
    topVolumesDays: { date: Date; volume: number }[];
  }> {
    const [topProfit, topLoss, topTrades, topVolume] = await Promise.all([
      queryMany<{ date: Date; grossTradingRevenue: number }>(
        `SELECT date, "grossTradingRevenue"
         FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date < $2
         ORDER BY "grossTradingRevenue" DESC
         LIMIT 5`,
        [dateRange.start, dateRange.end]
      ),
      queryMany<{ date: Date; grossTradingRevenue: number }>(
        `SELECT date, "grossTradingRevenue"
         FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date < $2 AND "grossTradingRevenue" < 0
         ORDER BY "grossTradingRevenue" ASC
         LIMIT 5`,
        [dateRange.start, dateRange.end]
      ),
      queryMany<{ date: Date; totalTrades: number }>(
        `SELECT date, "totalTrades"
         FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date < $2
         ORDER BY "totalTrades" DESC
         LIMIT 5`,
        [dateRange.start, dateRange.end]
      ),
      queryMany<{ date: Date; totalTradeVolume: number }>(
        `SELECT date, "totalTradeVolume"
         FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date < $2
         ORDER BY "totalTradeVolume" DESC
         LIMIT 5`,
        [dateRange.start, dateRange.end]
      ),
    ]);

    return {
      topProfitableDays: topProfit.map(d => ({ date: d.date, revenue: Number(d.grossTradingRevenue) })),
      topLossDays: topLoss.map(d => ({ date: d.date, revenue: Number(d.grossTradingRevenue) })),
      topTradingDays: topTrades.map(d => ({ date: d.date, trades: d.totalTrades })),
      topVolumesDays: topVolume.map(d => ({ date: d.date, volume: Number(d.totalTradeVolume) })),
    };
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  /**
   * Log financial action to audit trail
   */
  async logFinancialAction(
    actionType: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, unknown>,
    performedBy?: string
  ): Promise<void> {
    await query(
      `INSERT INTO "FinancialAuditLog" (
        id, "actionType", "entityType", "entityId", description, "newValue", "performedBy", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        actionType,
        entityType,
        entityId,
        `${actionType} on ${entityType}${entityId ? ` (${entityId})` : ''}`,
        JSON.stringify(details),
        performedBy || null,
        new Date(),
      ]
    );
  }

  /**
   * Get financial audit logs
   */
  async getAuditLogs(options: {
    page?: number;
    limit?: number;
    actionType?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    logs: {
      id: string;
      actionType: string;
      entityType: string;
      entityId: string | null;
      description: string;
      newValue: unknown;
      performedBy: string | null;
      createdAt: Date;
    }[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 50, actionType, entityType, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (actionType) {
      whereClause += ` AND "actionType" = $${paramIndex++}`;
      params.push(actionType);
    }
    if (entityType) {
      whereClause += ` AND "entityType" = $${paramIndex++}`;
      params.push(entityType);
    }
    if (startDate) {
      whereClause += ` AND "createdAt" >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND "createdAt" < $${paramIndex++}`;
      params.push(endDate);
    }

    const countParams = [...params];
    params.push(limit, offset);

    const [logs, countResult] = await Promise.all([
      queryMany<{
        id: string;
        actionType: string;
        entityType: string;
        entityId: string | null;
        description: string;
        newValue: unknown;
        performedBy: string | null;
        createdAt: Date;
      }>(
        `SELECT * FROM "FinancialAuditLog"
         WHERE ${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "FinancialAuditLog" WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // ANALYTICS & CHARTS
  // ==========================================

  /**
   * Get revenue trend for charts (last N days)
   */
  async getRevenueTrend(days: number = 30): Promise<{
    date: string;
    grossRevenue: number;
    netRevenue: number;
    netProfit: number;
    volume: number;
    trades: number;
    deposits: number;
    withdrawals: number;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await queryMany<{
      date: Date;
      grossTradingRevenue: number;
      netRevenue: number;
      netProfit: number;
      totalTradeVolume: number;
      totalTrades: number;
      totalDeposits: number;
      totalWithdrawals: number;
    }>(
      `SELECT date, "grossTradingRevenue", "netRevenue", "netProfit",
              "totalTradeVolume", "totalTrades", "totalDeposits", "totalWithdrawals"
       FROM "BrokerFinancialSnapshot"
       WHERE date >= $1
       ORDER BY date ASC`,
      [startDate]
    );

    return snapshots.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      grossRevenue: Number(s.grossTradingRevenue) || 0,
      netRevenue: Number(s.netRevenue) || 0,
      netProfit: Number(s.netProfit) || 0,
      volume: Number(s.totalTradeVolume) || 0,
      trades: Number(s.totalTrades) || 0,
      deposits: Number(s.totalDeposits) || 0,
      withdrawals: Number(s.totalWithdrawals) || 0,
    }));
  }

  /**
   * Get top depositors
   */
  async getTopDepositors(limit: number = 10): Promise<{
    userId: string;
    email: string;
    name: string;
    totalDeposits: number;
    depositCount: number;
    lastDeposit: Date | null;
  }[]> {
    const depositors = await queryMany<{
      userId: string;
      email: string;
      name: string;
      totalDeposits: string;
      depositCount: string;
      lastDeposit: Date | null;
    }>(
      `SELECT
        u.id as "userId",
        u.email,
        u.name,
        COALESCE(SUM(d.amount), 0) as "totalDeposits",
        COUNT(d.id)::text as "depositCount",
        MAX(d."createdAt") as "lastDeposit"
       FROM "User" u
       LEFT JOIN "Deposit" d ON d."userId" = u.id AND d.status = 'COMPLETED'
       WHERE u."userType" = 'REAL'
       GROUP BY u.id, u.email, u.name
       HAVING SUM(d.amount) > 0
       ORDER BY "totalDeposits" DESC
       LIMIT $1`,
      [limit]
    );

    return depositors.map((d) => ({
      userId: d.userId,
      email: d.email,
      name: d.name,
      totalDeposits: Number(d.totalDeposits) || 0,
      depositCount: parseInt(d.depositCount, 10) || 0,
      lastDeposit: d.lastDeposit,
    }));
  }

  /**
   * Get top traders by volume
   */
  async getTopTraders(limit: number = 10): Promise<{
    userId: string;
    email: string;
    name: string;
    totalVolume: number;
    totalTrades: number;
    wonTrades: number;
    lostTrades: number;
    winRate: number;
    netPnL: number;
  }[]> {
    const traders = await queryMany<{
      userId: string;
      email: string;
      name: string;
      totalVolume: string;
      totalTrades: string;
      wonTrades: string;
      lostTrades: string;
      totalProfit: string;
      totalLoss: string;
    }>(
      `SELECT
        u.id as "userId",
        u.email,
        u.name,
        COALESCE(SUM(t.amount), 0) as "totalVolume",
        COUNT(t.id)::text as "totalTrades",
        COUNT(CASE WHEN t.result = 'WIN' THEN 1 END)::text as "wonTrades",
        COUNT(CASE WHEN t.result = 'LOSS' THEN 1 END)::text as "lostTrades",
        COALESCE(SUM(CASE WHEN t.result = 'WIN' THEN t.profit ELSE 0 END), 0) as "totalProfit",
        COALESCE(SUM(CASE WHEN t.result = 'LOSS' THEN t.amount ELSE 0 END), 0) as "totalLoss"
       FROM "User" u
       LEFT JOIN "Trade" t ON t."userId" = u.id AND t."accountType" = 'LIVE' AND t.status = 'SETTLED'
       WHERE u."userType" = 'REAL'
       GROUP BY u.id, u.email, u.name
       HAVING COUNT(t.id) > 0
       ORDER BY "totalVolume" DESC
       LIMIT $1`,
      [limit]
    );

    return traders.map((t) => {
      const totalTrades = parseInt(t.totalTrades, 10) || 0;
      const wonTrades = parseInt(t.wonTrades, 10) || 0;
      const totalProfit = Number(t.totalProfit) || 0;
      const totalLoss = Number(t.totalLoss) || 0;

      return {
        userId: t.userId,
        email: t.email,
        name: t.name,
        totalVolume: Number(t.totalVolume) || 0,
        totalTrades,
        wonTrades,
        lostTrades: parseInt(t.lostTrades, 10) || 0,
        winRate: totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0,
        netPnL: totalProfit - totalLoss,
      };
    });
  }

  /**
   * Compare two date ranges
   */
  async compareDateRanges(
    range1Start: Date,
    range1End: Date,
    range2Start: Date,
    range2End: Date
  ): Promise<{
    range1: { start: string; end: string; metrics: Record<string, number> };
    range2: { start: string; end: string; metrics: Record<string, number> };
    comparison: Record<string, { diff: number; percentChange: number }>;
  }> {
    const getMetrics = async (start: Date, end: Date) => {
      const result = await queryOne<{
        totalRevenue: string;
        totalVolume: string;
        totalTrades: string;
        totalDeposits: string;
        totalWithdrawals: string;
        netProfit: string;
        avgWinRate: string;
      }>(
        `SELECT
          COALESCE(SUM("grossTradingRevenue"), 0) as "totalRevenue",
          COALESCE(SUM("totalTradeVolume"), 0) as "totalVolume",
          COALESCE(SUM("totalTrades"), 0) as "totalTrades",
          COALESCE(SUM("totalDeposits"), 0) as "totalDeposits",
          COALESCE(SUM("totalWithdrawals"), 0) as "totalWithdrawals",
          COALESCE(SUM("netProfit"), 0) as "netProfit",
          COALESCE(AVG("brokerWinRate"), 0) as "avgWinRate"
         FROM "BrokerFinancialSnapshot"
         WHERE date >= $1 AND date <= $2`,
        [start, end]
      );

      return {
        totalRevenue: Number(result?.totalRevenue) || 0,
        totalVolume: Number(result?.totalVolume) || 0,
        totalTrades: Number(result?.totalTrades) || 0,
        totalDeposits: Number(result?.totalDeposits) || 0,
        totalWithdrawals: Number(result?.totalWithdrawals) || 0,
        netProfit: Number(result?.netProfit) || 0,
        avgWinRate: Number(result?.avgWinRate) || 0,
      };
    };

    const [metrics1, metrics2] = await Promise.all([
      getMetrics(range1Start, range1End),
      getMetrics(range2Start, range2End),
    ]);

    const comparison: Record<string, { diff: number; percentChange: number }> = {};
    for (const key of Object.keys(metrics1)) {
      const val1 = metrics1[key as keyof typeof metrics1];
      const val2 = metrics2[key as keyof typeof metrics2];
      comparison[key] = {
        diff: val2 - val1,
        percentChange: val1 !== 0 ? ((val2 - val1) / val1) * 100 : val2 > 0 ? 100 : 0,
      };
    }

    return {
      range1: {
        start: range1Start.toISOString().split('T')[0],
        end: range1End.toISOString().split('T')[0],
        metrics: metrics1,
      },
      range2: {
        start: range2Start.toISOString().split('T')[0],
        end: range2End.toISOString().split('T')[0],
        metrics: metrics2,
      },
      comparison,
    };
  }

  /**
   * Get advanced analytics
   */
  async getAdvancedAnalytics(): Promise<{
    averageLTV: number;
    averageDepositSize: number;
    averageTradesPerUser: number;
    userRetentionRate: number;
    avgRevenuePerTrade: number;
    depositToWithdrawalRatio: number;
    activeUserPercentage: number;
    realVsTestRatio: number;
  }> {
    // Average LTV (Lifetime Value) - total deposits / total users who deposited
    const ltvResult = await queryOne<{ avgLtv: string; avgDepositSize: string }>(
      `SELECT
        COALESCE(AVG(user_totals.total), 0) as "avgLtv",
        COALESCE(AVG(d.amount), 0) as "avgDepositSize"
       FROM (
         SELECT "userId", SUM(amount) as total
         FROM "Deposit"
         WHERE status = 'COMPLETED'
         GROUP BY "userId"
       ) user_totals
       LEFT JOIN "Deposit" d ON d.status = 'COMPLETED'`
    );

    // Average trades per user
    const tradesResult = await queryOne<{ avgTrades: string }>(
      `SELECT AVG(trade_count) as "avgTrades"
       FROM (
         SELECT COUNT(*) as trade_count
         FROM "Trade"
         WHERE "accountType" = 'LIVE' AND status = 'SETTLED'
         GROUP BY "userId"
       ) user_trades`
    );

    // User retention (users who traded in last 30 days / total users who ever traded)
    const retentionResult = await queryOne<{ recentTraders: string; totalTraders: string }>(
      `SELECT
        COUNT(DISTINCT CASE WHEN t."createdAt" > NOW() - INTERVAL '30 days' THEN t."userId" END)::text as "recentTraders",
        COUNT(DISTINCT t."userId")::text as "totalTraders"
       FROM "Trade" t
       WHERE t."accountType" = 'LIVE'`
    );

    // Revenue per trade
    const rptResult = await queryOne<{ avgRevenue: string }>(
      `SELECT COALESCE(AVG("revenuePerTrade"), 0) as "avgRevenue"
       FROM "BrokerFinancialSnapshot"
       WHERE "totalTrades" > 0`
    );

    // Deposit to withdrawal ratio
    const flowResult = await queryOne<{ totalDeposits: string; totalWithdrawals: string }>(
      `SELECT
        COALESCE(SUM("totalDeposits"), 0) as "totalDeposits",
        COALESCE(SUM("totalWithdrawals"), 0) as "totalWithdrawals"
       FROM "BrokerFinancialSnapshot"`
    );

    // Active user percentage
    const activeResult = await queryOne<{ activeUsers: string; totalUsers: string }>(
      `SELECT
        COUNT(DISTINCT CASE WHEN t."createdAt" > NOW() - INTERVAL '7 days' THEN t."userId" END)::text as "activeUsers",
        COUNT(DISTINCT u.id)::text as "totalUsers"
       FROM "User" u
       LEFT JOIN "Trade" t ON t."userId" = u.id AND t."accountType" = 'LIVE'
       WHERE u."userType" = 'REAL'`
    );

    // Real vs Test ratio
    const typeResult = await queryOne<{ realUsers: string; testUsers: string }>(
      `SELECT
        COUNT(CASE WHEN "userType" = 'REAL' THEN 1 END)::text as "realUsers",
        COUNT(CASE WHEN "userType" != 'REAL' THEN 1 END)::text as "testUsers"
       FROM "User"`
    );

    const totalDeposits = Number(flowResult?.totalDeposits) || 0;
    const totalWithdrawals = Number(flowResult?.totalWithdrawals) || 0;
    const recentTraders = parseInt(retentionResult?.recentTraders || '0', 10);
    const totalTraders = parseInt(retentionResult?.totalTraders || '0', 10);
    const activeUsers = parseInt(activeResult?.activeUsers || '0', 10);
    const totalUsers = parseInt(activeResult?.totalUsers || '0', 10);
    const realUsers = parseInt(typeResult?.realUsers || '0', 10);
    const testUsers = parseInt(typeResult?.testUsers || '0', 10);

    return {
      averageLTV: Number(ltvResult?.avgLtv) || 0,
      averageDepositSize: Number(ltvResult?.avgDepositSize) || 0,
      averageTradesPerUser: Number(tradesResult?.avgTrades) || 0,
      userRetentionRate: totalTraders > 0 ? (recentTraders / totalTraders) * 100 : 0,
      avgRevenuePerTrade: Number(rptResult?.avgRevenue) || 0,
      depositToWithdrawalRatio: totalWithdrawals > 0 ? totalDeposits / totalWithdrawals : totalDeposits > 0 ? 100 : 0,
      activeUserPercentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      realVsTestRatio: testUsers > 0 ? realUsers / testUsers : realUsers,
    };
  }

  /**
   * Get budget/target configuration
   */
  async getBudgetTargets(): Promise<{
    monthlyRevenueTarget: number;
    monthlyProfitTarget: number;
    dailyVolumeTarget: number;
    newUsersTarget: number;
    depositsTarget: number;
  } | null> {
    const result = await queryOne<{
      monthlyRevenueTarget: number;
      monthlyProfitTarget: number;
      dailyVolumeTarget: number;
      newUsersTarget: number;
      depositsTarget: number;
    }>(
      `SELECT
        COALESCE((value->>'monthlyRevenueTarget')::numeric, 0) as "monthlyRevenueTarget",
        COALESCE((value->>'monthlyProfitTarget')::numeric, 0) as "monthlyProfitTarget",
        COALESCE((value->>'dailyVolumeTarget')::numeric, 0) as "dailyVolumeTarget",
        COALESCE((value->>'newUsersTarget')::numeric, 0) as "newUsersTarget",
        COALESCE((value->>'depositsTarget')::numeric, 0) as "depositsTarget"
       FROM "SystemSetting"
       WHERE key = 'financial_budget_targets'`
    );

    if (!result) return null;

    return {
      monthlyRevenueTarget: Number(result.monthlyRevenueTarget),
      monthlyProfitTarget: Number(result.monthlyProfitTarget),
      dailyVolumeTarget: Number(result.dailyVolumeTarget),
      newUsersTarget: Number(result.newUsersTarget),
      depositsTarget: Number(result.depositsTarget),
    };
  }

  /**
   * Set budget/target configuration
   */
  async setBudgetTargets(
    targets: {
      monthlyRevenueTarget?: number;
      monthlyProfitTarget?: number;
      dailyVolumeTarget?: number;
      newUsersTarget?: number;
      depositsTarget?: number;
    },
    adminId?: string
  ): Promise<void> {
    const existing = await this.getBudgetTargets();
    const merged = {
      monthlyRevenueTarget: targets.monthlyRevenueTarget ?? existing?.monthlyRevenueTarget ?? 0,
      monthlyProfitTarget: targets.monthlyProfitTarget ?? existing?.monthlyProfitTarget ?? 0,
      dailyVolumeTarget: targets.dailyVolumeTarget ?? existing?.dailyVolumeTarget ?? 0,
      newUsersTarget: targets.newUsersTarget ?? existing?.newUsersTarget ?? 0,
      depositsTarget: targets.depositsTarget ?? existing?.depositsTarget ?? 0,
    };

    await query(
      `INSERT INTO "SystemSetting" (key, value, "updatedAt")
       VALUES ('financial_budget_targets', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
      [JSON.stringify(merged)]
    );

    // Log the action
    await this.logFinancialAction(
      'BUDGET_UPDATE',
      'BUDGET_TARGETS',
      null,
      merged,
      adminId
    );

    logger.info('Budget targets updated', { targets: merged, adminId });
  }

  /**
   * Get alert thresholds configuration
   */
  async getAlertThresholds(): Promise<{
    exposureAlertThreshold: number;
    dailyLossLimit: number;
    lowBalanceAlert: number;
    highVolumeAlert: number;
  }> {
    const result = await queryOne<{
      exposureAlertThreshold: number;
      dailyLossLimit: number;
      lowBalanceAlert: number;
      highVolumeAlert: number;
    }>(
      `SELECT
        COALESCE((value->>'exposureAlertThreshold')::numeric, 100000) as "exposureAlertThreshold",
        COALESCE((value->>'dailyLossLimit')::numeric, 50000) as "dailyLossLimit",
        COALESCE((value->>'lowBalanceAlert')::numeric, 10000) as "lowBalanceAlert",
        COALESCE((value->>'highVolumeAlert')::numeric, 500000) as "highVolumeAlert"
       FROM "SystemSetting"
       WHERE key = 'financial_alert_thresholds'`
    );

    return {
      exposureAlertThreshold: Number(result?.exposureAlertThreshold) || 100000,
      dailyLossLimit: Number(result?.dailyLossLimit) || 50000,
      lowBalanceAlert: Number(result?.lowBalanceAlert) || 10000,
      highVolumeAlert: Number(result?.highVolumeAlert) || 500000,
    };
  }

  /**
   * Set alert thresholds configuration
   */
  async setAlertThresholds(
    thresholds: {
      exposureAlertThreshold?: number;
      dailyLossLimit?: number;
      lowBalanceAlert?: number;
      highVolumeAlert?: number;
    },
    adminId?: string
  ): Promise<void> {
    const existing = await this.getAlertThresholds();
    const merged = {
      exposureAlertThreshold: thresholds.exposureAlertThreshold ?? existing.exposureAlertThreshold,
      dailyLossLimit: thresholds.dailyLossLimit ?? existing.dailyLossLimit,
      lowBalanceAlert: thresholds.lowBalanceAlert ?? existing.lowBalanceAlert,
      highVolumeAlert: thresholds.highVolumeAlert ?? existing.highVolumeAlert,
    };

    await query(
      `INSERT INTO "SystemSetting" (key, value, "updatedAt")
       VALUES ('financial_alert_thresholds', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
      [JSON.stringify(merged)]
    );

    // Log the action
    await this.logFinancialAction(
      'THRESHOLD_UPDATE',
      'ALERT_THRESHOLDS',
      null,
      merged,
      adminId
    );

    logger.info('Alert thresholds updated', { thresholds: merged, adminId });
  }
}

export const brokerFinancialService = new BrokerFinancialService();
export { BrokerFinancialServiceError };
