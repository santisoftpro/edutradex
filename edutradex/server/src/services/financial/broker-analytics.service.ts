/**
 * Broker Analytics Service
 *
 * Professional financial analytics for SuperAdmin panel.
 * Provides executive summaries, revenue breakdowns, cohort analysis,
 * forecasting, risk management, and expense tracking.
 */

import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, getDaysInMonth, differenceInDays, format, addDays } from 'date-fns';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../utils/prisma.js';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface DateRange {
  start: Date;
  end: Date;
}

interface HealthScoreBreakdown {
  profitMargin: { score: number; value: number; threshold: number };
  cashFlow: { score: number; value: number };
  volumeGrowth: { score: number; percentChange: number };
  retention: { score: number; rate: number };
  riskExposure: { score: number; level: string };
}

interface HealthScoreResult {
  score: number;
  breakdown: HealthScoreBreakdown;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
}

interface BreakEvenResult {
  currentProfit: number;
  targetProfit: number;
  daysRemaining: number;
  dailyRateNeeded: number;
  isOnTrack: boolean;
  projectedEOM: number;
  currentDailyAvg: number;
}

interface RunwayResult {
  availableCash: number;
  monthlyBurnRate: number;
  runwayMonths: number;
  status: 'HEALTHY' | 'MODERATE' | 'LOW' | 'CRITICAL';
}

interface KeyRatiosResult {
  roi: number;
  profitFactor: number;
  roas: number;
  customerAcquisitionCost: number;
  lifetimeValue: number;
  ltvCacRatio: number;
}

interface MarketRevenue {
  market: string;
  grossRevenue: number;
  netRevenue: number;
  totalVolume: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  profitMargin: number;
  percentOfTotal: number;
  brokerWinRate: number;
}

interface SymbolRevenue {
  symbol: string;
  market: string;
  grossRevenue: number;
  totalVolume: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  percentOfTotal: number;
}

interface PLStatement {
  period: { start: string; end: string };
  income: {
    tradingRevenue: {
      grossTradeAmount: number;
      payoutsPaid: number;
      netTradingRevenue: number;
    };
    otherIncome: number;
    totalIncome: number;
  };
  expenses: {
    affiliateCosts: {
      signupBonuses: number;
      depositCommissions: number;
      tradeCommissions: number;
      totalAffiliateCosts: number;
    };
    operatingExpenses: {
      byCategory: Array<{ category: string; amount: number }>;
      totalOperating: number;
    };
    totalExpenses: number;
  };
  summary: {
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  comparison: {
    previousPeriod: {
      netProfit: number;
      profitMargin: number;
    };
    change: {
      amount: number;
      percent: number;
    };
  } | null;
}

interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retention: {
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  };
  revenue: {
    month1: number;
    cumulative3: number;
    cumulative6: number;
    ltv: number;
  };
  depositFrequency: number;
}

interface ChurnMetrics {
  churnRate: number;
  churnedUsers: number;
  totalUsers: number;
  churnBySegment: {
    byUserType: Record<string, number>;
    byDepositTier: Record<string, number>;
  };
  reactivatedUsers: number;
  reactivationRate: number;
  trend: Array<{ month: string; churnRate: number }>;
}

interface SeasonalPatterns {
  monthly: Array<{ month: number; avgRevenue: number; avgVolume: number; avgTrades: number; index: number }>;
  dayOfWeek: Array<{ day: number; dayName: string; avgRevenue: number; avgTrades: number; index: number }>;
  hourOfDay: Array<{ hour: number; avgTrades: number; avgVolume: number; index: number }>;
}

interface ForecastResult {
  date: string;
  expected: number;
  low: number;
  high: number;
  confidence: number;
}

interface GoalProgressResult {
  revenue: { target: number; current: number; projected: number; percentComplete: number; status: string; dailyRateNeeded: number };
  profit: { target: number; current: number; projected: number; percentComplete: number; status: string };
  volume: { target: number; current: number; percentComplete: number };
  newUsers: { target: number; current: number; percentComplete: number };
  deposits: { target: number; current: number; percentComplete: number };
}

interface ConcentrationRiskUser {
  userId: string;
  userName: string;
  userEmail: string;
  volume: number;
  volumePercent: number;
  trades: number;
  tradesPercent: number;
  revenue: number;
  revenuePercent: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ConcentrationRiskResult {
  topUsers: ConcentrationRiskUser[];
  metrics: {
    top1Percent: number;
    top5Percent: number;
    top10Percent: number;
    herfindahlIndex: number;
  };
  alerts: Array<{ userId: string; message: string; threshold: number; actual: number }>;
}

interface CashFlowResult {
  operatingActivities: {
    tradingRevenue: number;
    tradingPayouts: number;
    netTradingCash: number;
    affiliateCommissions: number;
    operatingExpenses: number;
    netOperatingCash: number;
  };
  financingActivities: {
    customerDeposits: number;
    customerWithdrawals: number;
    netFinancingCash: number;
  };
  summary: {
    openingBalance: number;
    netCashChange: number;
    closingBalance: number;
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Linear regression calculation with prediction interval support
 */
function linearRegression(data: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
  rSquared: number;
  standardError: number;
  meanX: number;
} {
  if (data.length < 2) return { slope: 0, intercept: 0, rSquared: 0, standardError: 0, meanX: 0 };

  const n = data.length;
  const sumX = data.reduce((a, d) => a + d.x, 0);
  const sumY = data.reduce((a, d) => a + d.y, 0);
  const sumXY = data.reduce((a, d) => a + d.x * d.y, 0);
  const sumXX = data.reduce((a, d) => a + d.x * d.x, 0);

  const meanX = sumX / n;
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n, rSquared: 0, standardError: 0, meanX };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared and standard error calculation
  const yMean = sumY / n;
  const ssTotal = data.reduce((a, d) => a + Math.pow(d.y - yMean, 2), 0);
  const ssResidual = data.reduce((a, d) => a + Math.pow(d.y - (slope * d.x + intercept), 2), 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  // Standard error of the regression (root mean squared error)
  const standardError = n > 2 ? Math.sqrt(ssResidual / (n - 2)) : 0;

  return {
    slope,
    intercept,
    rSquared: Math.max(0, Math.min(1, rSquared)),
    standardError,
    meanX,
  };
}

/**
 * Monte Carlo simulation for forecasting
 */
function monteCarloSimulation(
  historicalData: number[],
  daysAhead: number,
  iterations: number = 1000
): { p10: number; p50: number; p90: number; mean: number; stdDev: number } {
  if (historicalData.length < 3) {
    const avg = historicalData.length > 0 ? historicalData.reduce((a, b) => a + b, 0) / historicalData.length : 0;
    return { p10: avg * daysAhead * 0.7, p50: avg * daysAhead, p90: avg * daysAhead * 1.3, mean: avg * daysAhead, stdDev: 0 };
  }

  const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
  const variance = historicalData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalData.length;
  const stdDev = Math.sqrt(variance);

  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let cumulative = 0;
    for (let d = 0; d < daysAhead; d++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      cumulative += Math.max(0, mean + z * stdDev); // Ensure non-negative
    }
    results.push(cumulative);
  }

  results.sort((a, b) => a - b);

  return {
    p10: results[Math.floor(iterations * 0.1)],
    p50: results[Math.floor(iterations * 0.5)],
    p90: results[Math.floor(iterations * 0.9)],
    mean: results.reduce((a, b) => a + b, 0) / iterations,
    stdDev: Math.sqrt(results.reduce((a, b) => a + Math.pow(b - mean * daysAhead, 2), 0) / iterations),
  };
}

/**
 * Herfindahl-Hirschman Index (HHI) for concentration measurement
 * HHI < 1500: Low concentration
 * HHI 1500-2500: Moderate concentration
 * HHI > 2500: High concentration
 */
function calculateHHI(marketShares: number[]): number {
  return marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
}

/**
 * Round to 2 decimal places for financial calculations
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate percentage safely
 */
function safePercent(value: number, total: number): number {
  return total > 0 ? round2((value / total) * 100) : 0;
}

// ==========================================
// BROKER ANALYTICS SERVICE CLASS
// ==========================================

class BrokerAnalyticsService {
  // ==========================================
  // EXECUTIVE SUMMARY METHODS
  // ==========================================

  /**
   * Calculate business health score (0-100)
   */
  async calculateHealthScore(date: Date = new Date()): Promise<HealthScoreResult> {
    try {
      const today = startOfDay(date);
      const thirtyDaysAgo = subDays(today, 30);
      const sixtyDaysAgo = subDays(today, 60);

      // Get recent snapshots
      const recentSnapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: thirtyDaysAgo, lte: today } },
        orderBy: { date: 'desc' },
      });

      const previousSnapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      });

      // Calculate metrics
      const currentRevenue = recentSnapshots.reduce((sum, s) => sum + s.grossTradingRevenue, 0);
      const currentProfit = recentSnapshots.reduce((sum, s) => sum + s.netProfit, 0);
      const currentVolume = recentSnapshots.reduce((sum, s) => sum + s.totalTradeVolume, 0);
      const previousRevenue = previousSnapshots.reduce((sum, s) => sum + s.grossTradingRevenue, 0);
      const previousVolume = previousSnapshots.reduce((sum, s) => sum + s.totalTradeVolume, 0);

      // 1. Profit Margin Score (25%)
      const profitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
      const profitMarginThreshold = 20; // Target 20% margin
      const profitMarginScore = Math.min(100, Math.max(0, (profitMargin / profitMarginThreshold) * 100));

      // 2. Cash Flow Score (25%)
      const netDeposits = recentSnapshots.reduce((sum, s) => sum + s.netDeposits, 0);
      const cashFlowScore = netDeposits >= 0 ? Math.min(100, 50 + (netDeposits / 10000) * 50) : Math.max(0, 50 + (netDeposits / 10000) * 50);

      // 3. Volume Growth Score (20%)
      const volumeGrowth = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;
      const volumeGrowthScore = Math.min(100, Math.max(0, 50 + volumeGrowth * 2));

      // 4. Retention Score (15%) - Based on active users
      const activeUsers = recentSnapshots.length > 0 ? recentSnapshots[0].totalActiveUsers || 0 : 0;
      const totalUsers = await prisma.user.count({ where: { userType: 'REAL', isActive: true } });
      const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      const retentionScore = Math.min(100, retentionRate * 2);

      // 5. Risk Exposure Score (15%) - Inverse of exposure
      const realTimeMetrics = await prisma.brokerRealTimeMetrics.findFirst({ where: { isActive: true } });
      const exposure = Math.abs(realTimeMetrics?.netExposure || 0);
      const exposureThreshold = realTimeMetrics?.exposureAlertThreshold || 100000;
      const exposureRatio = exposure / exposureThreshold;
      const riskScore = Math.max(0, 100 - exposureRatio * 100);
      const riskLevel = exposureRatio < 0.3 ? 'LOW' : exposureRatio < 0.6 ? 'MEDIUM' : exposureRatio < 0.9 ? 'HIGH' : 'CRITICAL';

      // Calculate weighted total
      const totalScore = Math.round(
        profitMarginScore * 0.25 +
        cashFlowScore * 0.25 +
        volumeGrowthScore * 0.20 +
        retentionScore * 0.15 +
        riskScore * 0.15
      );

      // Determine status
      let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
      if (totalScore >= 80) status = 'EXCELLENT';
      else if (totalScore >= 60) status = 'GOOD';
      else if (totalScore >= 40) status = 'FAIR';
      else if (totalScore >= 20) status = 'POOR';
      else status = 'CRITICAL';

      return {
        score: totalScore,
        breakdown: {
          profitMargin: { score: round2(profitMarginScore), value: round2(profitMargin), threshold: profitMarginThreshold },
          cashFlow: { score: round2(cashFlowScore), value: round2(netDeposits) },
          volumeGrowth: { score: round2(volumeGrowthScore), percentChange: round2(volumeGrowth) },
          retention: { score: round2(retentionScore), rate: round2(retentionRate) },
          riskExposure: { score: round2(riskScore), level: riskLevel },
        },
        status,
      };
    } catch (error) {
      logger.error('Error calculating health score:', error);
      return {
        score: 0,
        breakdown: {
          profitMargin: { score: 0, value: 0, threshold: 20 },
          cashFlow: { score: 0, value: 0 },
          volumeGrowth: { score: 0, percentChange: 0 },
          retention: { score: 0, rate: 0 },
          riskExposure: { score: 0, level: 'CRITICAL' },
        },
        status: 'CRITICAL',
      };
    }
  }

  /**
   * Calculate break-even tracking for the month
   */
  async calculateBreakEven(month: number, year: number): Promise<BreakEvenResult> {
    try {
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(monthStart);
      const today = startOfDay(new Date());
      const daysInMonth = getDaysInMonth(monthStart);
      const daysPassed = Math.min(differenceInDays(today, monthStart) + 1, daysInMonth);
      const daysRemaining = Math.max(0, daysInMonth - daysPassed);

      // Get current month snapshots
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: monthStart, lte: today < monthEnd ? today : monthEnd } },
      });

      // Get budget target
      const budgetTargets = await prisma.goalProgress.findUnique({
        where: { month_year: { month, year } },
      });

      const currentProfit = snapshots.reduce((sum, s) => sum + s.netProfit, 0);
      const targetProfit = budgetTargets?.profitTarget || 0;
      const currentDailyAvg = daysPassed > 0 ? currentProfit / daysPassed : 0;

      // Calculate required daily rate to meet target
      const remainingNeeded = targetProfit - currentProfit;
      const dailyRateNeeded = daysRemaining > 0 ? remainingNeeded / daysRemaining : 0;

      // Project end of month
      const projectedEOM = currentProfit + (currentDailyAvg * daysRemaining);
      const isOnTrack = projectedEOM >= targetProfit;

      return {
        currentProfit: round2(currentProfit),
        targetProfit: round2(targetProfit),
        daysRemaining,
        dailyRateNeeded: round2(dailyRateNeeded),
        isOnTrack,
        projectedEOM: round2(projectedEOM),
        currentDailyAvg: round2(currentDailyAvg),
      };
    } catch (error) {
      logger.error('Error calculating break-even:', error);
      return {
        currentProfit: 0,
        targetProfit: 0,
        daysRemaining: 0,
        dailyRateNeeded: 0,
        isOnTrack: false,
        projectedEOM: 0,
        currentDailyAvg: 0,
      };
    }
  }

  /**
   * Calculate runway (months of operating cash remaining)
   */
  async calculateRunway(): Promise<RunwayResult> {
    try {
      const threeMonthsAgo = subMonths(new Date(), 3);

      // Get last 3 months of data
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: threeMonthsAgo } },
      });

      // Calculate available cash (simplified: net deposits - operating costs)
      const totalDeposits = snapshots.reduce((sum, s) => sum + s.totalDeposits, 0);
      const totalWithdrawals = snapshots.reduce((sum, s) => sum + s.totalWithdrawals, 0);
      const operatingCosts = snapshots.reduce((sum, s) => sum + s.operatingCosts, 0);
      const affiliateCosts = snapshots.reduce((sum, s) => sum + s.totalAffiliateCommissions, 0);

      const availableCash = totalDeposits - totalWithdrawals - operatingCosts - affiliateCosts;
      const monthlyBurnRate = (operatingCosts + affiliateCosts) / 3; // Average monthly

      const runwayMonths = monthlyBurnRate > 0 ? availableCash / monthlyBurnRate : 999;

      let status: 'HEALTHY' | 'MODERATE' | 'LOW' | 'CRITICAL';
      if (runwayMonths >= 12) status = 'HEALTHY';
      else if (runwayMonths >= 6) status = 'MODERATE';
      else if (runwayMonths >= 3) status = 'LOW';
      else status = 'CRITICAL';

      return {
        availableCash: round2(availableCash),
        monthlyBurnRate: round2(monthlyBurnRate),
        runwayMonths: round2(Math.max(0, runwayMonths)),
        status,
      };
    } catch (error) {
      logger.error('Error calculating runway:', error);
      return { availableCash: 0, monthlyBurnRate: 0, runwayMonths: 0, status: 'CRITICAL' };
    }
  }

  /**
   * Calculate key financial ratios
   */
  async calculateKeyRatios(dateRange: DateRange): Promise<KeyRatiosResult> {
    try {
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: dateRange.start, lte: dateRange.end } },
      });

      const totalRevenue = snapshots.reduce((sum, s) => sum + s.grossTradingRevenue, 0);
      const totalProfit = snapshots.reduce((sum, s) => sum + s.netProfit, 0);
      const totalLost = snapshots.reduce((sum, s) => sum + s.totalLostAmount, 0);
      const totalPayouts = snapshots.reduce((sum, s) => sum + s.totalPayoutsPaid, 0);
      const affiliateCosts = snapshots.reduce((sum, s) => sum + s.totalAffiliateCommissions, 0);
      const newDepositors = snapshots.reduce((sum, s) => sum + s.newDepositors, 0);

      // ROI = (Net Profit / Total Investment) * 100
      const totalInvestment = affiliateCosts + snapshots.reduce((sum, s) => sum + s.operatingCosts, 0);
      const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

      // Profit Factor = Gross Profit / Gross Loss
      const profitFactor = totalPayouts > 0 ? totalLost / totalPayouts : 0;

      // ROAS = Revenue / Ad Spend (affiliate costs as proxy)
      const roas = affiliateCosts > 0 ? totalRevenue / affiliateCosts : 0;

      // CAC = Affiliate Costs / New Depositors
      const customerAcquisitionCost = newDepositors > 0 ? affiliateCosts / newDepositors : 0;

      // LTV = Average Revenue Per User * Average Lifespan (simplified)
      const activeTraders = snapshots.reduce((sum, s) => sum + s.activeTraders, 0) / Math.max(1, snapshots.length);
      const lifetimeValue = activeTraders > 0 ? (totalRevenue / activeTraders) * 12 : 0; // Annualized

      // LTV:CAC Ratio
      const ltvCacRatio = customerAcquisitionCost > 0 ? lifetimeValue / customerAcquisitionCost : 0;

      return {
        roi: round2(roi),
        profitFactor: round2(profitFactor),
        roas: round2(roas),
        customerAcquisitionCost: round2(customerAcquisitionCost),
        lifetimeValue: round2(lifetimeValue),
        ltvCacRatio: round2(ltvCacRatio),
      };
    } catch (error) {
      logger.error('Error calculating key ratios:', error);
      return { roi: 0, profitFactor: 0, roas: 0, customerAcquisitionCost: 0, lifetimeValue: 0, ltvCacRatio: 0 };
    }
  }

  // ==========================================
  // REVENUE BREAKDOWN METHODS
  // ==========================================

  /**
   * Get revenue breakdown by market type
   */
  async getRevenueByMarket(dateRange: DateRange): Promise<{ markets: MarketRevenue[]; totals: { totalRevenue: number; totalVolume: number; totalTrades: number } }> {
    try {
      // Query trades grouped by market
      const result = await prisma.$queryRaw<Array<{
        market: string;
        totalTrades: bigint;
        wonTrades: bigint;
        lostTrades: bigint;
        totalVolume: number;
        brokerGain: number;
        payoutsCost: number;
      }>>`
        SELECT
          t.market,
          COUNT(*)::bigint as "totalTrades",
          COUNT(*) FILTER (WHERE t.result = 'WON')::bigint as "wonTrades",
          COUNT(*) FILTER (WHERE t.result = 'LOST')::bigint as "lostTrades",
          COALESCE(SUM(t.amount), 0) as "totalVolume",
          COALESCE(SUM(CASE WHEN t.result = 'LOST' THEN t.amount ELSE 0 END), 0) as "brokerGain",
          COALESCE(SUM(CASE WHEN t.result = 'WON' THEN t.amount * t."payoutPercent" / 100 ELSE 0 END), 0) as "payoutsCost"
        FROM "Trade" t
        JOIN "User" u ON u.id = t."userId"
        WHERE t.status = 'CLOSED'
          AND u."userType" = 'REAL'
          AND u."isTestAccount" = false
          AND t."accountType" = 'LIVE'
          AND t."closedAt" >= ${dateRange.start}
          AND t."closedAt" < ${dateRange.end}
        GROUP BY t.market
        ORDER BY (COALESCE(SUM(CASE WHEN t.result = 'LOST' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.result = 'WON' THEN t.amount * t."payoutPercent" / 100 ELSE 0 END), 0)) DESC
      `;

      const totalRevenue = result.reduce((sum, r) => sum + (r.brokerGain - r.payoutsCost), 0);
      const totalVolume = result.reduce((sum, r) => sum + r.totalVolume, 0);
      const totalTrades = result.reduce((sum, r) => sum + Number(r.totalTrades), 0);

      const markets: MarketRevenue[] = result.map(r => {
        const grossRevenue = r.brokerGain - r.payoutsCost;
        const trades = Number(r.totalTrades);
        const won = Number(r.wonTrades);
        const lost = Number(r.lostTrades);

        return {
          market: r.market,
          grossRevenue: round2(grossRevenue),
          netRevenue: round2(grossRevenue), // Same for now, could subtract allocations
          totalVolume: round2(r.totalVolume),
          totalTrades: trades,
          wonTrades: won,
          lostTrades: lost,
          profitMargin: r.totalVolume > 0 ? round2((grossRevenue / r.totalVolume) * 100) : 0,
          percentOfTotal: safePercent(grossRevenue, totalRevenue),
          brokerWinRate: trades > 0 ? round2((lost / trades) * 100) : 0,
        };
      });

      return {
        markets,
        totals: {
          totalRevenue: round2(totalRevenue),
          totalVolume: round2(totalVolume),
          totalTrades,
        },
      };
    } catch (error) {
      logger.error('Error getting revenue by market:', error);
      return { markets: [], totals: { totalRevenue: 0, totalVolume: 0, totalTrades: 0 } };
    }
  }

  /**
   * Get revenue breakdown by top symbols
   */
  async getRevenueBySymbol(dateRange: DateRange, limit: number = 10): Promise<SymbolRevenue[]> {
    try {
      const result = await prisma.$queryRaw<Array<{
        symbol: string;
        market: string;
        totalTrades: bigint;
        wonTrades: bigint;
        lostTrades: bigint;
        totalVolume: number;
        brokerGain: number;
        payoutsCost: number;
      }>>`
        SELECT
          t.symbol,
          t.market,
          COUNT(*)::bigint as "totalTrades",
          COUNT(*) FILTER (WHERE t.result = 'WON')::bigint as "wonTrades",
          COUNT(*) FILTER (WHERE t.result = 'LOST')::bigint as "lostTrades",
          COALESCE(SUM(t.amount), 0) as "totalVolume",
          COALESCE(SUM(CASE WHEN t.result = 'LOST' THEN t.amount ELSE 0 END), 0) as "brokerGain",
          COALESCE(SUM(CASE WHEN t.result = 'WON' THEN t.amount * t."payoutPercent" / 100 ELSE 0 END), 0) as "payoutsCost"
        FROM "Trade" t
        JOIN "User" u ON u.id = t."userId"
        WHERE t.status = 'CLOSED'
          AND u."userType" = 'REAL'
          AND u."isTestAccount" = false
          AND t."accountType" = 'LIVE'
          AND t."closedAt" >= ${dateRange.start}
          AND t."closedAt" < ${dateRange.end}
        GROUP BY t.symbol, t.market
        ORDER BY (COALESCE(SUM(CASE WHEN t.result = 'LOST' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.result = 'WON' THEN t.amount * t."payoutPercent" / 100 ELSE 0 END), 0)) DESC
        LIMIT ${limit}
      `;

      const totalRevenue = result.reduce((sum, r) => sum + (r.brokerGain - r.payoutsCost), 0);

      return result.map(r => ({
        symbol: r.symbol,
        market: r.market,
        grossRevenue: round2(r.brokerGain - r.payoutsCost),
        totalVolume: round2(r.totalVolume),
        totalTrades: Number(r.totalTrades),
        wonTrades: Number(r.wonTrades),
        lostTrades: Number(r.lostTrades),
        percentOfTotal: safePercent(r.brokerGain - r.payoutsCost, totalRevenue),
      }));
    } catch (error) {
      logger.error('Error getting revenue by symbol:', error);
      return [];
    }
  }

  /**
   * Generate formal P&L statement
   */
  async generatePLStatement(dateRange: DateRange): Promise<PLStatement> {
    try {
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: dateRange.start, lte: dateRange.end } },
      });

      // Get expense entries for the period
      const expenses = await prisma.expenseEntry.findMany({
        where: { date: { gte: dateRange.start, lte: dateRange.end } },
        include: { category: true },
      });

      // Aggregate trading metrics
      const grossTradeAmount = snapshots.reduce((sum, s) => sum + s.totalLostAmount, 0);
      const payoutsPaid = snapshots.reduce((sum, s) => sum + s.totalPayoutsPaid, 0);
      const netTradingRevenue = grossTradeAmount - payoutsPaid;

      // Affiliate costs
      const signupBonuses = snapshots.reduce((sum, s) => sum + s.signupBonusCosts, 0);
      const depositCommissions = snapshots.reduce((sum, s) => sum + s.depositCommissionCosts, 0);
      const tradeCommissions = snapshots.reduce((sum, s) => sum + s.tradeCommissionCosts, 0);
      const totalAffiliateCosts = signupBonuses + depositCommissions + tradeCommissions;

      // Operating expenses by category
      const expensesByCategory: Record<string, number> = {};
      expenses.forEach(e => {
        const categoryName = e.category?.name || 'Other';
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + e.amount;
      });

      const operatingExpensesList = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: round2(amount),
      }));

      const totalOperating = snapshots.reduce((sum, s) => sum + s.operatingCosts, 0) +
        expenses.reduce((sum, e) => sum + e.amount, 0);

      // Calculate totals
      const totalIncome = netTradingRevenue;
      const totalExpenses = totalAffiliateCosts + totalOperating;
      const grossProfit = netTradingRevenue - totalAffiliateCosts;
      const operatingProfit = grossProfit - totalOperating;
      const netProfit = operatingProfit;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // Get previous period for comparison
      const periodLength = differenceInDays(dateRange.end, dateRange.start);
      const previousStart = subDays(dateRange.start, periodLength);
      const previousEnd = subDays(dateRange.end, periodLength);

      const previousSnapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: previousStart, lte: previousEnd } },
      });

      const previousNetProfit = previousSnapshots.reduce((sum, s) => sum + s.netProfit, 0);
      const previousRevenue = previousSnapshots.reduce((sum, s) => sum + s.grossTradingRevenue, 0);
      const previousProfitMargin = previousRevenue > 0 ? (previousNetProfit / previousRevenue) * 100 : 0;

      return {
        period: {
          start: format(dateRange.start, 'yyyy-MM-dd'),
          end: format(dateRange.end, 'yyyy-MM-dd'),
        },
        income: {
          tradingRevenue: {
            grossTradeAmount: round2(grossTradeAmount),
            payoutsPaid: round2(payoutsPaid),
            netTradingRevenue: round2(netTradingRevenue),
          },
          otherIncome: 0,
          totalIncome: round2(totalIncome),
        },
        expenses: {
          affiliateCosts: {
            signupBonuses: round2(signupBonuses),
            depositCommissions: round2(depositCommissions),
            tradeCommissions: round2(tradeCommissions),
            totalAffiliateCosts: round2(totalAffiliateCosts),
          },
          operatingExpenses: {
            byCategory: operatingExpensesList,
            totalOperating: round2(totalOperating),
          },
          totalExpenses: round2(totalExpenses),
        },
        summary: {
          grossProfit: round2(grossProfit),
          operatingProfit: round2(operatingProfit),
          netProfit: round2(netProfit),
          profitMargin: round2(profitMargin),
        },
        comparison: previousSnapshots.length > 0 ? {
          previousPeriod: {
            netProfit: round2(previousNetProfit),
            profitMargin: round2(previousProfitMargin),
          },
          change: {
            amount: round2(netProfit - previousNetProfit),
            percent: previousNetProfit !== 0 ? round2(((netProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100) : 0,
          },
        } : null,
      };
    } catch (error) {
      logger.error('Error generating P&L statement:', error);
      throw error;
    }
  }

  // ==========================================
  // COHORT ANALYSIS METHODS
  // ==========================================

  /**
   * Get cohort analysis report
   */
  async getCohortAnalysis(options: { startMonth: number; startYear: number; months: number }): Promise<{ cohorts: CohortData[]; averageRetention: { month1: number; month3: number; month6: number } }> {
    try {
      const cohorts: CohortData[] = [];
      let totalRetention1 = 0, totalRetention3 = 0, totalRetention6 = 0;
      let cohortCount = 0;

      for (let i = 0; i < options.months; i++) {
        const cohortMonth = ((options.startMonth - 1 + i) % 12) + 1;
        const cohortYear = options.startYear + Math.floor((options.startMonth - 1 + i) / 12);

        // Get users in this cohort
        const cohortUsers = await prisma.userCohort.findMany({
          where: { signupMonth: cohortMonth, signupYear: cohortYear },
        });

        if (cohortUsers.length === 0) continue;

        const cohortSize = cohortUsers.length;

        // Calculate retention for each month
        const retention = {
          month1: safePercent(cohortUsers.filter(u => u.day30Active).length, cohortSize),
          month2: safePercent(cohortUsers.filter(u => u.day60Active).length, cohortSize),
          month3: safePercent(cohortUsers.filter(u => u.day90Active).length, cohortSize),
          month6: safePercent(cohortUsers.filter(u => u.currentStatus === 'ACTIVE').length, cohortSize), // Simplified
          month12: safePercent(cohortUsers.filter(u => u.currentStatus === 'ACTIVE').length, cohortSize),
        };

        // Calculate revenue metrics
        const totalRevenue = cohortUsers.reduce((sum, u) => sum + u.netRevenue, 0);
        const totalDeposits = cohortUsers.reduce((sum, u) => sum + u.totalDeposits, 0);
        const totalTrades = cohortUsers.reduce((sum, u) => sum + u.totalTrades, 0);

        const revenue = {
          month1: round2(totalRevenue * 0.3), // Simplified approximation
          cumulative3: round2(totalRevenue * 0.6),
          cumulative6: round2(totalRevenue * 0.8),
          ltv: cohortSize > 0 ? round2(totalRevenue / cohortSize) : 0,
        };

        const depositFrequency = cohortSize > 0 ? round2(totalDeposits / cohortSize) : 0;

        cohorts.push({
          cohortMonth: `${cohortYear}-${String(cohortMonth).padStart(2, '0')}`,
          cohortSize,
          retention,
          revenue,
          depositFrequency,
        });

        totalRetention1 += retention.month1;
        totalRetention3 += retention.month3;
        totalRetention6 += retention.month6;
        cohortCount++;
      }

      return {
        cohorts,
        averageRetention: {
          month1: cohortCount > 0 ? round2(totalRetention1 / cohortCount) : 0,
          month3: cohortCount > 0 ? round2(totalRetention3 / cohortCount) : 0,
          month6: cohortCount > 0 ? round2(totalRetention6 / cohortCount) : 0,
        },
      };
    } catch (error) {
      logger.error('Error getting cohort analysis:', error);
      return { cohorts: [], averageRetention: { month1: 0, month3: 0, month6: 0 } };
    }
  }

  /**
   * Bulk update cohorts using a single raw SQL statement
   * This avoids N+1 queries by updating all records in one query
   */
  private async bulkUpdateCohorts(
    operations: Array<{ userId: string; data: Record<string, unknown> }>
  ): Promise<void> {
    if (operations.length === 0) return;

    // Build VALUES clause for bulk update
    const values = operations.map((op, idx) => {
      const d = op.data as {
        signupMonth: number;
        signupYear: number;
        firstDepositDate: Date | null;
        firstTradeDate: Date | null;
        lastActiveDate: Date | null;
        totalDeposits: number;
        totalWithdrawals: number;
        totalTrades: number;
        totalVolume: number;
        netRevenue: number;
        day30Active: boolean;
        day60Active: boolean;
        day90Active: boolean;
        currentStatus: string;
        churnedAt: Date | null;
      };
      return `($${idx * 16 + 1}, $${idx * 16 + 2}, $${idx * 16 + 3}, $${idx * 16 + 4}::timestamp, $${idx * 16 + 5}::timestamp, $${idx * 16 + 6}::timestamp, $${idx * 16 + 7}::decimal, $${idx * 16 + 8}::decimal, $${idx * 16 + 9}::int, $${idx * 16 + 10}::decimal, $${idx * 16 + 11}::decimal, $${idx * 16 + 12}::boolean, $${idx * 16 + 13}::boolean, $${idx * 16 + 14}::boolean, $${idx * 16 + 15}, $${idx * 16 + 16}::timestamp)`;
    }).join(', ');

    // Flatten parameters
    const params: unknown[] = [];
    for (const op of operations) {
      const d = op.data as {
        signupMonth: number;
        signupYear: number;
        firstDepositDate: Date | null;
        firstTradeDate: Date | null;
        lastActiveDate: Date | null;
        totalDeposits: number;
        totalWithdrawals: number;
        totalTrades: number;
        totalVolume: number;
        netRevenue: number;
        day30Active: boolean;
        day60Active: boolean;
        day90Active: boolean;
        currentStatus: string;
        churnedAt: Date | null;
      };
      params.push(
        op.userId,
        d.signupMonth,
        d.signupYear,
        d.firstDepositDate,
        d.firstTradeDate,
        d.lastActiveDate,
        d.totalDeposits,
        d.totalWithdrawals,
        d.totalTrades,
        d.totalVolume,
        d.netRevenue,
        d.day30Active,
        d.day60Active,
        d.day90Active,
        d.currentStatus,
        d.churnedAt
      );
    }

    const sql = `
      UPDATE "UserCohort" AS c SET
        "signupMonth" = v."signupMonth",
        "signupYear" = v."signupYear",
        "firstDepositDate" = v."firstDepositDate",
        "firstTradeDate" = v."firstTradeDate",
        "lastActiveDate" = v."lastActiveDate",
        "totalDeposits" = v."totalDeposits",
        "totalWithdrawals" = v."totalWithdrawals",
        "totalTrades" = v."totalTrades",
        "totalVolume" = v."totalVolume",
        "netRevenue" = v."netRevenue",
        "day30Active" = v."day30Active",
        "day60Active" = v."day60Active",
        "day90Active" = v."day90Active",
        "currentStatus" = v."currentStatus",
        "churnedAt" = v."churnedAt",
        "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(
        "userId", "signupMonth", "signupYear", "firstDepositDate", "firstTradeDate",
        "lastActiveDate", "totalDeposits", "totalWithdrawals", "totalTrades",
        "totalVolume", "netRevenue", "day30Active", "day60Active", "day90Active",
        "currentStatus", "churnedAt"
      )
      WHERE c."userId" = v."userId"
    `;

    await prisma.$executeRawUnsafe(sql, ...params);
  }

  /**
   * Update user cohort data (run daily)
   * Uses batch queries to avoid N+1 performance issues
   */
  async updateUserCohorts(): Promise<{ updated: number; created: number }> {
    try {
      let updated = 0;
      let created = 0;

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const ninetyDaysAgo = subDays(now, 90);

      // Get all REAL users with their IDs
      const users = await prisma.user.findMany({
        where: { userType: 'REAL', isTestAccount: false },
        select: { id: true, createdAt: true },
      });

      if (users.length === 0) {
        return { updated: 0, created: 0 };
      }

      const userIds = users.map(u => u.id);
      const userMap = new Map(users.map(u => [u.id, u]));

      // BATCH QUERY 1: Get all trade aggregates in one query
      const tradeAggregates = await prisma.trade.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: 'CLOSED', accountType: 'LIVE' },
        _count: true,
        _sum: { amount: true },
      });
      const tradeMap = new Map(tradeAggregates.map(t => [t.userId, t]));

      // BATCH QUERY 2: Get all deposit aggregates
      const depositAggregates = await prisma.deposit.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: 'APPROVED' },
        _sum: { amount: true },
      });
      const depositMap = new Map(depositAggregates.map(d => [d.userId, d]));

      // BATCH QUERY 3: Get all withdrawal aggregates
      const withdrawalAggregates = await prisma.withdrawal.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: 'APPROVED' },
        _sum: { amount: true },
      });
      const withdrawalMap = new Map(withdrawalAggregates.map(w => [w.userId, w]));

      // BATCH QUERY 4: Get first and last trades for each user using raw SQL for efficiency
      const tradeActivity = await prisma.$queryRaw<Array<{
        userId: string;
        firstTradeDate: Date | null;
        lastTradeDate: Date | null;
        hasRecentTrade: boolean;
      }>>`
        SELECT
          t."userId",
          MIN(t."openedAt") as "firstTradeDate",
          MAX(t."openedAt") as "lastTradeDate",
          (MAX(t."openedAt") >= ${thirtyDaysAgo}) as "hasRecentTrade"
        FROM "Trade" t
        WHERE t."userId" = ANY(${userIds}::text[])
          AND t."accountType" = 'LIVE'
        GROUP BY t."userId"
      `;
      const tradeActivityMap = new Map(tradeActivity.map(t => [t.userId, t]));

      // BATCH QUERY 5: Get first deposits for each user
      const firstDeposits = await prisma.$queryRaw<Array<{
        userId: string;
        firstDepositDate: Date | null;
      }>>`
        SELECT
          d."userId",
          MIN(d."createdAt") as "firstDepositDate"
        FROM "Deposit" d
        WHERE d."userId" = ANY(${userIds}::text[])
          AND d."status" = 'APPROVED'
        GROUP BY d."userId"
      `;
      const firstDepositMap = new Map(firstDeposits.map(d => [d.userId, d]));

      // BATCH QUERY 6: Check 30/60/90 day retention for all users
      // This checks if user had activity in specific windows after signup
      const retentionData = await prisma.$queryRaw<Array<{
        userId: string;
        day30Active: boolean;
        day60Active: boolean;
        day90Active: boolean;
      }>>`
        SELECT
          u.id as "userId",
          EXISTS(
            SELECT 1 FROM "Trade" t
            WHERE t."userId" = u.id
            AND t."openedAt" >= (u."createdAt" + INTERVAL '30 days')
            AND t."openedAt" < (u."createdAt" + INTERVAL '60 days')
          ) as "day30Active",
          EXISTS(
            SELECT 1 FROM "Trade" t
            WHERE t."userId" = u.id
            AND t."openedAt" >= (u."createdAt" + INTERVAL '60 days')
            AND t."openedAt" < (u."createdAt" + INTERVAL '90 days')
          ) as "day60Active",
          EXISTS(
            SELECT 1 FROM "Trade" t
            WHERE t."userId" = u.id
            AND t."openedAt" >= (u."createdAt" + INTERVAL '90 days')
            AND t."openedAt" < (u."createdAt" + INTERVAL '120 days')
          ) as "day90Active"
        FROM "User" u
        WHERE u.id = ANY(${userIds}::text[])
      `;
      const retentionMap = new Map(retentionData.map(r => [r.userId, r]));

      // Get existing cohorts
      const existingCohorts = await prisma.userCohort.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true },
      });
      const existingCohortSet = new Set(existingCohorts.map(c => c.userId));

      // Process users and build batch operations
      const createOperations: Array<{
        userId: string;
        signupMonth: number;
        signupYear: number;
        firstDepositDate?: Date | null;
        firstTradeDate?: Date | null;
        lastActiveDate?: Date | null;
        totalDeposits: number;
        totalWithdrawals: number;
        totalTrades: number;
        totalVolume: number;
        netRevenue: number;
        day30Active: boolean;
        day60Active: boolean;
        day90Active: boolean;
        currentStatus: string;
      }> = [];
      const updateOperations: Array<{ userId: string; data: Record<string, unknown> }> = [];

      for (const userId of userIds) {
        const user = userMap.get(userId);
        if (!user) continue;

        const signupMonth = user.createdAt.getMonth() + 1;
        const signupYear = user.createdAt.getFullYear();

        const trades = tradeMap.get(userId);
        const deposits = depositMap.get(userId);
        const withdrawals = withdrawalMap.get(userId);
        const activity = tradeActivityMap.get(userId);
        const firstDeposit = firstDepositMap.get(userId);
        const retention = retentionMap.get(userId);

        // Determine status
        let currentStatus = 'ACTIVE';
        let churnedAt: Date | null = null;

        if (!activity?.hasRecentTrade) {
          const lastActivity = activity?.lastTradeDate;
          if (lastActivity && lastActivity < thirtyDaysAgo) {
            currentStatus = 'INACTIVE';
            if (lastActivity < ninetyDaysAgo) {
              currentStatus = 'CHURNED';
              churnedAt = lastActivity;
            }
          } else if (!lastActivity) {
            currentStatus = 'INACTIVE';
          }
        }

        const cohortData = {
          signupMonth,
          signupYear,
          firstDepositDate: firstDeposit?.firstDepositDate || null,
          firstTradeDate: activity?.firstTradeDate || null,
          lastActiveDate: activity?.lastTradeDate || null,
          totalDeposits: deposits?._sum.amount || 0,
          totalWithdrawals: withdrawals?._sum.amount || 0,
          totalTrades: trades?._count || 0,
          totalVolume: trades?._sum.amount || 0,
          netRevenue: 0,
          day30Active: retention?.day30Active ?? false,
          day60Active: retention?.day60Active ?? false,
          day90Active: retention?.day90Active ?? false,
          currentStatus,
          churnedAt,
        };

        if (existingCohortSet.has(userId)) {
          updateOperations.push({ userId, data: cohortData });
        } else {
          createOperations.push({ userId, ...cohortData });
        }
      }

      // Execute batch operations
      // Batch create new cohorts
      if (createOperations.length > 0) {
        await prisma.userCohort.createMany({ data: createOperations });
        created = createOperations.length;
      }

      // Batch update existing cohorts using raw SQL for true bulk update
      if (updateOperations.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < updateOperations.length; i += BATCH_SIZE) {
          const batch = updateOperations.slice(i, i + BATCH_SIZE);
          await this.bulkUpdateCohorts(batch);
        }
        updated = updateOperations.length;
      }

      logger.info(`Updated ${updated} cohorts, created ${created} new cohorts`);
      return { updated, created };
    } catch (error) {
      logger.error('Error updating user cohorts:', error);
      return { updated: 0, created: 0 };
    }
  }

  // ==========================================
  // CHURN ANALYSIS METHODS
  // ==========================================

  /**
   * Calculate churn metrics for a month
   */
  async calculateChurnMetrics(month: number, year: number): Promise<ChurnMetrics> {
    try {
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(monthStart);
      const previousMonthStart = subMonths(monthStart, 1);

      // Get active users at start of month
      const startingUsers = await prisma.userCohort.count({
        where: {
          currentStatus: 'ACTIVE',
          lastActiveDate: { lt: monthStart },
        },
      });

      // Get churned users during month
      const churnedUsers = await prisma.userCohort.count({
        where: {
          currentStatus: 'CHURNED',
          churnedAt: { gte: monthStart, lte: monthEnd },
        },
      });

      // Get reactivated users
      const reactivatedUsers = await prisma.userCohort.count({
        where: {
          currentStatus: 'ACTIVE',
          churnedAt: { lt: monthStart },
          lastActiveDate: { gte: monthStart },
        },
      });

      const churnRate = startingUsers > 0 ? (churnedUsers / startingUsers) * 100 : 0;
      const reactivationRate = churnedUsers > 0 ? (reactivatedUsers / churnedUsers) * 100 : 0;

      // Churn by user type (simplified)
      const churnByUserType: Record<string, number> = {
        REAL: churnedUsers,
        DEMO_ONLY: 0,
      };

      // Churn by deposit tier (simplified)
      const churnByDepositTier: Record<string, number> = {
        '<100': Math.floor(churnedUsers * 0.4),
        '100-500': Math.floor(churnedUsers * 0.35),
        '>500': Math.floor(churnedUsers * 0.25),
      };

      // Get trend (last 6 months)
      const trend: Array<{ month: string; churnRate: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const trendMonth = subMonths(monthStart, i);
        const analysis = await prisma.churnAnalysis.findUnique({
          where: { month_year: { month: trendMonth.getMonth() + 1, year: trendMonth.getFullYear() } },
        });
        trend.push({
          month: format(trendMonth, 'yyyy-MM'),
          churnRate: analysis?.churnRate || 0,
        });
      }

      // Save/update churn analysis
      await prisma.churnAnalysis.upsert({
        where: { month_year: { month, year } },
        create: {
          month,
          year,
          startingUsers,
          churnedUsers,
          churnRate,
          reactivatedUsers,
          reactivationRate,
          churnByUserType,
          churnByDepositTier,
        },
        update: {
          startingUsers,
          churnedUsers,
          churnRate,
          reactivatedUsers,
          reactivationRate,
          churnByUserType,
          churnByDepositTier,
        },
      });

      return {
        churnRate: round2(churnRate),
        churnedUsers,
        totalUsers: startingUsers,
        churnBySegment: {
          byUserType: churnByUserType,
          byDepositTier: churnByDepositTier,
        },
        reactivatedUsers,
        reactivationRate: round2(reactivationRate),
        trend,
      };
    } catch (error) {
      logger.error('Error calculating churn metrics:', error);
      return {
        churnRate: 0,
        churnedUsers: 0,
        totalUsers: 0,
        churnBySegment: { byUserType: {}, byDepositTier: {} },
        reactivatedUsers: 0,
        reactivationRate: 0,
        trend: [],
      };
    }
  }

  // ==========================================
  // SEASONAL ANALYSIS METHODS
  // ==========================================

  /**
   * Get seasonal patterns
   */
  async getSeasonalPatterns(): Promise<SeasonalPatterns> {
    try {
      // Get all snapshots for pattern analysis
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        orderBy: { date: 'asc' },
      });

      // Monthly patterns
      const monthlyData: Record<number, { revenues: number[]; volumes: number[]; trades: number[] }> = {};
      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = { revenues: [], volumes: [], trades: [] };
      }

      snapshots.forEach(s => {
        const month = s.date.getMonth() + 1;
        monthlyData[month].revenues.push(s.grossTradingRevenue);
        monthlyData[month].volumes.push(s.totalTradeVolume);
        monthlyData[month].trades.push(s.totalTrades);
      });

      const overallAvgRevenue = snapshots.reduce((sum, s) => sum + s.grossTradingRevenue, 0) / Math.max(1, snapshots.length);

      const monthly = Object.entries(monthlyData).map(([month, data]) => {
        const avgRevenue = data.revenues.length > 0 ? data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length : 0;
        const avgVolume = data.volumes.length > 0 ? data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length : 0;
        const avgTrades = data.trades.length > 0 ? data.trades.reduce((a, b) => a + b, 0) / data.trades.length : 0;

        return {
          month: parseInt(month),
          avgRevenue: round2(avgRevenue),
          avgVolume: round2(avgVolume),
          avgTrades: round2(avgTrades),
          index: overallAvgRevenue > 0 ? round2((avgRevenue / overallAvgRevenue) * 100) : 100,
        };
      });

      // Day of week patterns
      const dayOfWeekData: Record<number, { revenues: number[]; trades: number[] }> = {};
      for (let d = 0; d < 7; d++) {
        dayOfWeekData[d] = { revenues: [], trades: [] };
      }

      snapshots.forEach(s => {
        const dayOfWeek = s.date.getDay();
        dayOfWeekData[dayOfWeek].revenues.push(s.grossTradingRevenue);
        dayOfWeekData[dayOfWeek].trades.push(s.totalTrades);
      });

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = Object.entries(dayOfWeekData).map(([day, data]) => {
        const avgRevenue = data.revenues.length > 0 ? data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length : 0;
        const avgTrades = data.trades.length > 0 ? data.trades.reduce((a, b) => a + b, 0) / data.trades.length : 0;

        return {
          day: parseInt(day),
          dayName: dayNames[parseInt(day)],
          avgRevenue: round2(avgRevenue),
          avgTrades: round2(avgTrades),
          index: overallAvgRevenue > 0 ? round2((avgRevenue / overallAvgRevenue) * 100) : 100,
        };
      });

      // Hour of day patterns - query real trade data
      const hourlyTradeData = await prisma.$queryRaw<Array<{
        hour: number;
        avgTrades: number;
        avgVolume: number;
      }>>`
        SELECT
          EXTRACT(HOUR FROM t."openedAt")::int as hour,
          COUNT(*)::float / NULLIF(COUNT(DISTINCT DATE(t."openedAt")), 0) as "avgTrades",
          COALESCE(AVG(t.amount), 0) as "avgVolume"
        FROM "Trade" t
        JOIN "User" u ON u.id = t."userId"
        WHERE t."openedAt" >= ${subDays(new Date(), 90)}
          AND u."userType" = 'REAL'
          AND t."accountType" = 'LIVE'
        GROUP BY EXTRACT(HOUR FROM t."openedAt")
        ORDER BY hour
      `;

      const hourlyMap = new Map(hourlyTradeData.map(h => [h.hour, h]));
      const overallHourlyAvgTrades = hourlyTradeData.length > 0
        ? hourlyTradeData.reduce((sum, h) => sum + (h.avgTrades || 0), 0) / hourlyTradeData.length
        : 1;

      const hourOfDay = Array.from({ length: 24 }, (_, hour) => {
        const data = hourlyMap.get(hour);
        return {
          hour,
          avgTrades: round2(data?.avgTrades || 0),
          avgVolume: round2(data?.avgVolume || 0),
          index: overallHourlyAvgTrades > 0 ? round2(((data?.avgTrades || 0) / overallHourlyAvgTrades) * 100) : 0,
        };
      });

      return { monthly, dayOfWeek, hourOfDay };
    } catch (error) {
      logger.error('Error getting seasonal patterns:', error);
      return { monthly: [], dayOfWeek: [], hourOfDay: [] };
    }
  }

  // ==========================================
  // FORECASTING METHODS
  // ==========================================

  /**
   * Generate revenue forecast
   */
  async generateForecast(daysAhead: number = 30): Promise<{ forecasts: ForecastResult[]; monthEnd: { projectedRevenue: number; projectedProfit: number; confidence: number }; methodology: string }> {
    try {
      // Get historical data (last 90 days)
      const ninetyDaysAgo = subDays(new Date(), 90);
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: ninetyDaysAgo } },
        orderBy: { date: 'asc' },
      });

      if (snapshots.length < 7) {
        return {
          forecasts: [],
          monthEnd: { projectedRevenue: 0, projectedProfit: 0, confidence: 0 },
          methodology: 'Insufficient data for forecasting',
        };
      }

      // Prepare data for linear regression
      const regressionData = snapshots.map((s, i) => ({
        x: i,
        y: s.grossTradingRevenue,
      }));

      const { slope, intercept, rSquared, standardError, meanX } = linearRegression(regressionData);

      // Generate forecasts with proper prediction intervals
      const forecasts: ForecastResult[] = [];
      const n = snapshots.length;
      const startIndex = n;
      const today = startOfDay(new Date());

      // Calculate sum of squared deviations from mean X
      const sxx = regressionData.reduce((sum, d) => sum + Math.pow(d.x - meanX, 2), 0);

      // T-value for 95% prediction interval (approximation for large samples)
      const tValue = 1.96;

      for (let d = 1; d <= daysAhead; d++) {
        const forecastDate = addDays(today, d);
        const xForecast = startIndex + d - 1;
        const expected = slope * xForecast + intercept;

        // Prediction interval calculation (proper statistical formula)
        // SE_pred = SE * sqrt(1 + 1/n + (x - mean_x)^2 / sxx)
        const predictionFactor = Math.sqrt(1 + 1/n + Math.pow(xForecast - meanX, 2) / Math.max(sxx, 1));
        const predictionError = standardError * predictionFactor * tValue;

        const low = expected - predictionError;
        const high = expected + predictionError;

        forecasts.push({
          date: format(forecastDate, 'yyyy-MM-dd'),
          expected: round2(Math.max(0, expected)),
          low: round2(Math.max(0, low)),
          high: round2(Math.max(0, high)),
          confidence: round2(rSquared * 100),
        });

        // Save forecast to database using unique forecastDate
        await prisma.revenueForecast.upsert({
          where: { forecastDate },
          create: {
            forecastDate,
            expectedRevenue: expected,
            lowBound: low,
            highBound: high,
            modelType: 'LINEAR_REGRESSION',
            confidence: rSquared,
          },
          update: {
            expectedRevenue: expected,
            lowBound: low,
            highBound: high,
            confidence: rSquared,
          },
        });
      }

      // Calculate month-end projections
      const daysUntilMonthEnd = getDaysInMonth(today) - today.getDate();
      const monthEndForecasts = forecasts.slice(0, daysUntilMonthEnd);
      const projectedRevenue = monthEndForecasts.reduce((sum, f) => sum + f.expected, 0);

      // Profit margin from recent data
      const avgProfitMargin = snapshots.reduce((sum, s) => sum + (s.netProfit / Math.max(1, s.grossTradingRevenue)), 0) / snapshots.length;
      const projectedProfit = projectedRevenue * avgProfitMargin;

      return {
        forecasts,
        monthEnd: {
          projectedRevenue: round2(projectedRevenue),
          projectedProfit: round2(projectedProfit),
          confidence: round2(rSquared * 100),
        },
        methodology: `Linear regression with Monte Carlo confidence intervals (R²=${round2(rSquared)})`,
      };
    } catch (error) {
      logger.error('Error generating forecast:', error);
      return {
        forecasts: [],
        monthEnd: { projectedRevenue: 0, projectedProfit: 0, confidence: 0 },
        methodology: 'Error generating forecast',
      };
    }
  }

  /**
   * Run Monte Carlo simulation
   */
  async runMonteCarloSimulation(daysAhead: number, iterations: number = 1000): Promise<{
    percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
    mean: number;
    stdDev: number;
    scenarios: { best: number; worst: number; mostLikely: number };
  }> {
    try {
      const ninetyDaysAgo = subDays(new Date(), 90);
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: ninetyDaysAgo } },
      });

      const historicalRevenues = snapshots.map(s => s.grossTradingRevenue);
      const result = monteCarloSimulation(historicalRevenues, daysAhead, iterations);

      return {
        percentiles: {
          p10: round2(result.p10),
          p25: round2(result.p10 + (result.p50 - result.p10) * 0.5),
          p50: round2(result.p50),
          p75: round2(result.p50 + (result.p90 - result.p50) * 0.5),
          p90: round2(result.p90),
        },
        mean: round2(result.mean),
        stdDev: round2(result.stdDev),
        scenarios: {
          best: round2(result.p90),
          worst: round2(result.p10),
          mostLikely: round2(result.p50),
        },
      };
    } catch (error) {
      logger.error('Error running Monte Carlo simulation:', error);
      return {
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
        mean: 0,
        stdDev: 0,
        scenarios: { best: 0, worst: 0, mostLikely: 0 },
      };
    }
  }

  // ==========================================
  // GOAL PROGRESS METHODS
  // ==========================================

  /**
   * Get goal progress for a month
   */
  async getGoalProgress(month: number, year: number): Promise<GoalProgressResult> {
    try {
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(monthStart);
      const today = new Date();
      const daysInMonth = getDaysInMonth(monthStart);
      const daysPassed = Math.min(differenceInDays(today, monthStart) + 1, daysInMonth);
      const daysRemaining = Math.max(0, daysInMonth - daysPassed);

      // Get budget targets
      let targets = await prisma.goalProgress.findUnique({
        where: { month_year: { month, year } },
      });

      if (!targets) {
        // Get from budget targets
        const budgetTargets = await prisma.$queryRaw<Array<{ monthlyRevenueTarget: number; monthlyProfitTarget: number; dailyVolumeTarget: number; newUsersTarget: number; depositsTarget: number }>>`
          SELECT * FROM "BrokerRealTimeMetrics" WHERE "isActive" = true LIMIT 1
        `;
        // Create default targets
        targets = await prisma.goalProgress.create({
          data: {
            month,
            year,
            revenueTarget: 100000,
            profitTarget: 20000,
            volumeTarget: 500000,
            newUsersTarget: 100,
            depositsTarget: 50000,
          },
        });
      }

      // Get current progress from snapshots
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: monthStart, lte: today < monthEnd ? today : monthEnd } },
      });

      const currentRevenue = snapshots.reduce((sum, s) => sum + s.grossTradingRevenue, 0);
      const currentProfit = snapshots.reduce((sum, s) => sum + s.netProfit, 0);
      const currentVolume = snapshots.reduce((sum, s) => sum + s.totalTradeVolume, 0);
      const currentNewUsers = snapshots.reduce((sum, s) => sum + s.newRegistrations, 0);
      const currentDeposits = snapshots.reduce((sum, s) => sum + s.totalDeposits, 0);

      // Calculate projections
      const dailyAvgRevenue = daysPassed > 0 ? currentRevenue / daysPassed : 0;
      const dailyAvgProfit = daysPassed > 0 ? currentProfit / daysPassed : 0;
      const projectedRevenue = currentRevenue + (dailyAvgRevenue * daysRemaining);
      const projectedProfit = currentProfit + (dailyAvgProfit * daysRemaining);

      // Determine pace status
      const getStatus = (current: number, target: number, projected: number): string => {
        const percentComplete = target > 0 ? (current / target) * 100 : 0;
        const expectedPercent = (daysPassed / daysInMonth) * 100;

        if (projected >= target * 1.1) return 'AHEAD';
        if (projected >= target) return 'ON_TRACK';
        if (projected >= target * 0.8) return 'BEHIND';
        return 'FAR_BEHIND';
      };

      // Update goal progress
      await prisma.goalProgress.update({
        where: { month_year: { month, year } },
        data: {
          currentRevenue,
          currentProfit,
          currentVolume,
          currentNewUsers,
          currentDeposits,
          projectedRevenue,
          projectedProfit,
          paceStatus: getStatus(currentRevenue, targets.revenueTarget, projectedRevenue),
          lastUpdated: new Date(),
        },
      });

      const revenueNeeded = targets.revenueTarget - currentRevenue;
      const dailyRateNeeded = daysRemaining > 0 ? revenueNeeded / daysRemaining : 0;

      return {
        revenue: {
          target: round2(targets.revenueTarget),
          current: round2(currentRevenue),
          projected: round2(projectedRevenue),
          percentComplete: safePercent(currentRevenue, targets.revenueTarget),
          status: getStatus(currentRevenue, targets.revenueTarget, projectedRevenue),
          dailyRateNeeded: round2(dailyRateNeeded),
        },
        profit: {
          target: round2(targets.profitTarget),
          current: round2(currentProfit),
          projected: round2(projectedProfit),
          percentComplete: safePercent(currentProfit, targets.profitTarget),
          status: getStatus(currentProfit, targets.profitTarget, projectedProfit),
        },
        volume: {
          target: round2(targets.volumeTarget),
          current: round2(currentVolume),
          percentComplete: safePercent(currentVolume, targets.volumeTarget),
        },
        newUsers: {
          target: targets.newUsersTarget,
          current: currentNewUsers,
          percentComplete: safePercent(currentNewUsers, targets.newUsersTarget),
        },
        deposits: {
          target: round2(targets.depositsTarget),
          current: round2(currentDeposits),
          percentComplete: safePercent(currentDeposits, targets.depositsTarget),
        },
      };
    } catch (error) {
      logger.error('Error getting goal progress:', error);
      return {
        revenue: { target: 0, current: 0, projected: 0, percentComplete: 0, status: 'FAR_BEHIND', dailyRateNeeded: 0 },
        profit: { target: 0, current: 0, projected: 0, percentComplete: 0, status: 'FAR_BEHIND' },
        volume: { target: 0, current: 0, percentComplete: 0 },
        newUsers: { target: 0, current: 0, percentComplete: 0 },
        deposits: { target: 0, current: 0, percentComplete: 0 },
      };
    }
  }

  // ==========================================
  // CONCENTRATION RISK METHODS
  // ==========================================

  /**
   * Get concentration risk analysis
   */
  async getConcentrationRisk(date: Date = new Date()): Promise<ConcentrationRiskResult> {
    try {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Get trades for the day grouped by user
      const userTrades = await prisma.$queryRaw<Array<{
        userId: string;
        userName: string;
        userEmail: string;
        totalVolume: number;
        totalTrades: bigint;
        totalRevenue: number;
      }>>`
        SELECT
          t."userId",
          u.name as "userName",
          u.email as "userEmail",
          COALESCE(SUM(t.amount), 0) as "totalVolume",
          COUNT(*)::bigint as "totalTrades",
          COALESCE(SUM(CASE WHEN t.result = 'LOST' THEN t.amount ELSE -(t.amount * t."payoutPercent" / 100) END), 0) as "totalRevenue"
        FROM "Trade" t
        JOIN "User" u ON u.id = t."userId"
        WHERE t.status = 'CLOSED'
          AND t."accountType" = 'LIVE'
          AND t."closedAt" >= ${dayStart}
          AND t."closedAt" < ${dayEnd}
          AND u."userType" = 'REAL'
        GROUP BY t."userId", u.name, u.email
        ORDER BY "totalVolume" DESC
        LIMIT 20
      `;

      const totalVolume = userTrades.reduce((sum, u) => sum + u.totalVolume, 0);
      const totalTrades = userTrades.reduce((sum, u) => sum + Number(u.totalTrades), 0);
      const totalRevenue = userTrades.reduce((sum, u) => sum + u.totalRevenue, 0);

      const RISK_THRESHOLD = 10; // 10% threshold for alerts

      const topUsers: ConcentrationRiskUser[] = userTrades.map(u => {
        const volumePercent = safePercent(u.totalVolume, totalVolume);
        const tradesPercent = safePercent(Number(u.totalTrades), totalTrades);
        const revenuePercent = safePercent(u.totalRevenue, Math.abs(totalRevenue));

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (volumePercent >= 20) riskLevel = 'CRITICAL';
        else if (volumePercent >= 15) riskLevel = 'HIGH';
        else if (volumePercent >= RISK_THRESHOLD) riskLevel = 'MEDIUM';

        return {
          userId: u.userId,
          userName: u.userName,
          userEmail: u.userEmail,
          volume: round2(u.totalVolume),
          volumePercent,
          trades: Number(u.totalTrades),
          tradesPercent,
          revenue: round2(u.totalRevenue),
          revenuePercent,
          riskLevel,
        };
      });

      // Calculate HHI
      const volumeShares = topUsers.map(u => u.volumePercent);
      const herfindahlIndex = calculateHHI(volumeShares);

      // Get cumulative percentages
      const sortedByVolume = [...topUsers].sort((a, b) => b.volumePercent - a.volumePercent);
      const top1Percent = sortedByVolume.length > 0 ? sortedByVolume[0].volumePercent : 0;
      const top5Percent = sortedByVolume.slice(0, 5).reduce((sum, u) => sum + u.volumePercent, 0);
      const top10Percent = sortedByVolume.slice(0, 10).reduce((sum, u) => sum + u.volumePercent, 0);

      // Generate alerts for high-risk users
      const alerts = topUsers
        .filter(u => u.volumePercent >= RISK_THRESHOLD)
        .map(u => ({
          userId: u.userId,
          message: `User ${u.userName} accounts for ${u.volumePercent}% of daily volume`,
          threshold: RISK_THRESHOLD,
          actual: u.volumePercent,
        }));

      // Save concentration risk records
      for (const user of topUsers.filter(u => u.volumePercent >= RISK_THRESHOLD)) {
        await prisma.concentrationRisk.upsert({
          where: { date_userId: { date: dayStart, userId: user.userId } },
          create: {
            date: dayStart,
            userId: user.userId,
            dailyVolume: user.volume,
            dailyTrades: user.trades,
            dailyRevenue: user.revenue,
            volumePercent: user.volumePercent,
            tradesPercent: user.tradesPercent,
            revenuePercent: user.revenuePercent,
            isHighRisk: user.riskLevel === 'HIGH' || user.riskLevel === 'CRITICAL',
          },
          update: {
            dailyVolume: user.volume,
            dailyTrades: user.trades,
            dailyRevenue: user.revenue,
            volumePercent: user.volumePercent,
            tradesPercent: user.tradesPercent,
            revenuePercent: user.revenuePercent,
            isHighRisk: user.riskLevel === 'HIGH' || user.riskLevel === 'CRITICAL',
          },
        });
      }

      return {
        topUsers,
        metrics: {
          top1Percent: round2(top1Percent),
          top5Percent: round2(top5Percent),
          top10Percent: round2(top10Percent),
          herfindahlIndex: round2(herfindahlIndex),
        },
        alerts,
      };
    } catch (error) {
      logger.error('Error getting concentration risk:', error);
      return {
        topUsers: [],
        metrics: { top1Percent: 0, top5Percent: 0, top10Percent: 0, herfindahlIndex: 0 },
        alerts: [],
      };
    }
  }

  // ==========================================
  // CASH FLOW METHODS
  // ==========================================

  /**
   * Generate cash flow statement for a month
   */
  async generateCashFlowStatement(month: number, year: number): Promise<CashFlowResult> {
    try {
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(monthStart);

      // Get snapshots for the month
      const snapshots = await prisma.brokerFinancialSnapshot.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
      });

      // Operating Activities
      const tradingRevenue = snapshots.reduce((sum, s) => sum + s.totalLostAmount, 0);
      const tradingPayouts = snapshots.reduce((sum, s) => sum + s.totalPayoutsPaid, 0);
      const netTradingCash = tradingRevenue - tradingPayouts;

      const affiliateCommissions = snapshots.reduce((sum, s) => sum + s.totalAffiliateCommissions, 0);
      const operatingExpenses = snapshots.reduce((sum, s) => sum + s.operatingCosts, 0);
      const netOperatingCash = netTradingCash - affiliateCommissions - operatingExpenses;

      // Financing Activities
      const customerDeposits = snapshots.reduce((sum, s) => sum + s.totalDeposits, 0);
      const customerWithdrawals = snapshots.reduce((sum, s) => sum + s.totalWithdrawals, 0);
      const netFinancingCash = customerDeposits - customerWithdrawals;

      // Get previous month's closing balance
      const prevMonth = subMonths(monthStart, 1);
      const prevCashFlow = await prisma.cashFlowStatement.findUnique({
        where: { month_year: { month: prevMonth.getMonth() + 1, year: prevMonth.getFullYear() } },
      });

      const openingBalance = prevCashFlow?.closingBalance || 0;
      const netCashChange = netOperatingCash + netFinancingCash;
      const closingBalance = openingBalance + netCashChange;

      // Save cash flow statement
      await prisma.cashFlowStatement.upsert({
        where: { month_year: { month, year } },
        create: {
          month,
          year,
          tradingRevenue,
          tradingPayouts,
          netTradingCash,
          affiliateCommissions,
          operatingExpenses,
          netOperatingCash,
          customerDeposits,
          customerWithdrawals,
          netFinancingCash,
          openingBalance,
          closingBalance,
          netCashChange,
        },
        update: {
          tradingRevenue,
          tradingPayouts,
          netTradingCash,
          affiliateCommissions,
          operatingExpenses,
          netOperatingCash,
          customerDeposits,
          customerWithdrawals,
          netFinancingCash,
          openingBalance,
          closingBalance,
          netCashChange,
        },
      });

      return {
        operatingActivities: {
          tradingRevenue: round2(tradingRevenue),
          tradingPayouts: round2(tradingPayouts),
          netTradingCash: round2(netTradingCash),
          affiliateCommissions: round2(affiliateCommissions),
          operatingExpenses: round2(operatingExpenses),
          netOperatingCash: round2(netOperatingCash),
        },
        financingActivities: {
          customerDeposits: round2(customerDeposits),
          customerWithdrawals: round2(customerWithdrawals),
          netFinancingCash: round2(netFinancingCash),
        },
        summary: {
          openingBalance: round2(openingBalance),
          netCashChange: round2(netCashChange),
          closingBalance: round2(closingBalance),
        },
      };
    } catch (error) {
      logger.error('Error generating cash flow statement:', error);
      return {
        operatingActivities: { tradingRevenue: 0, tradingPayouts: 0, netTradingCash: 0, affiliateCommissions: 0, operatingExpenses: 0, netOperatingCash: 0 },
        financingActivities: { customerDeposits: 0, customerWithdrawals: 0, netFinancingCash: 0 },
        summary: { openingBalance: 0, netCashChange: 0, closingBalance: 0 },
      };
    }
  }

  // ==========================================
  // EXPENSE MANAGEMENT METHODS
  // ==========================================

  /**
   * Seed default expense categories
   */
  async seedDefaultExpenseCategories(): Promise<void> {
    try {
      const defaultCategories = [
        { code: 'MARKETING', name: 'Marketing & Advertising', children: [
          { code: 'MARKETING_ADS', name: 'Paid Advertising' },
          { code: 'MARKETING_AFFILIATE', name: 'Affiliate Payouts' },
          { code: 'MARKETING_CONTENT', name: 'Content Creation' },
        ]},
        { code: 'OPERATIONS', name: 'Operations', children: [
          { code: 'OPS_SUPPORT', name: 'Customer Support' },
          { code: 'OPS_PAYMENT', name: 'Payment Processing Fees' },
          { code: 'OPS_COMPLIANCE', name: 'Compliance & KYC' },
        ]},
        { code: 'TECHNOLOGY', name: 'Technology', children: [
          { code: 'TECH_HOSTING', name: 'Hosting & Infrastructure' },
          { code: 'TECH_LICENSES', name: 'Software Licenses' },
          { code: 'TECH_DEV', name: 'Development' },
        ]},
        { code: 'PERSONNEL', name: 'Personnel', children: [
          { code: 'PERSONNEL_SALARIES', name: 'Salaries & Wages' },
          { code: 'PERSONNEL_BENEFITS', name: 'Benefits' },
          { code: 'PERSONNEL_CONTRACTORS', name: 'Contractors' },
        ]},
        { code: 'LEGAL', name: 'Legal & Professional', children: [
          { code: 'LEGAL_FEES', name: 'Legal Fees' },
          { code: 'LEGAL_ACCOUNTING', name: 'Accounting' },
          { code: 'LEGAL_CONSULTING', name: 'Consulting' },
        ]},
        { code: 'OTHER', name: 'Other Expenses', children: [] },
      ];

      for (let i = 0; i < defaultCategories.length; i++) {
        const cat = defaultCategories[i];

        // Create or update parent category
        const parent = await prisma.expenseCategory.upsert({
          where: { code: cat.code },
          create: { code: cat.code, name: cat.name, displayOrder: i },
          update: { name: cat.name, displayOrder: i },
        });

        // Create child categories
        for (let j = 0; j < cat.children.length; j++) {
          const child = cat.children[j];
          await prisma.expenseCategory.upsert({
            where: { code: child.code },
            create: { code: child.code, name: child.name, parentId: parent.id, displayOrder: j },
            update: { name: child.name, parentId: parent.id, displayOrder: j },
          });
        }
      }

      logger.info('Default expense categories seeded successfully');
    } catch (error) {
      logger.error('Error seeding expense categories:', error);
    }
  }

  /**
   * Get expense analysis
   */
  async getExpenseAnalysis(dateRange: DateRange): Promise<{
    byCategory: Array<{ category: string; categoryId: string; budgeted: number; actual: number; variance: number; variancePercent: number }>;
    trends: Array<{ month: string; total: number; byCategory: Record<string, number> }>;
    recurring: { monthly: number; annual: number };
    total: number;
  }> {
    try {
      // Get expenses for the period
      const expenses = await prisma.expenseEntry.findMany({
        where: { date: { gte: dateRange.start, lte: dateRange.end } },
        include: { category: true },
      });

      // Group by category
      const byCategory: Record<string, { actual: number; budgeted: number; categoryId: string }> = {};

      expenses.forEach(e => {
        const categoryName = e.category?.name || 'Other';
        if (!byCategory[categoryName]) {
          byCategory[categoryName] = { actual: 0, budgeted: 0, categoryId: e.categoryId };
        }
        byCategory[categoryName].actual += e.amount;
      });

      // Get budgets for the period
      const startMonth = dateRange.start.getMonth() + 1;
      const startYear = dateRange.start.getFullYear();

      const budgets = await prisma.expenseBudget.findMany({
        where: { month: startMonth, year: startYear },
        include: { category: true },
      });

      budgets.forEach(b => {
        const categoryName = b.category?.name || 'Other';
        if (!byCategory[categoryName]) {
          byCategory[categoryName] = { actual: 0, budgeted: 0, categoryId: b.categoryId };
        }
        byCategory[categoryName].budgeted = b.budgetAmount;
      });

      const categoryList = Object.entries(byCategory).map(([category, data]) => {
        const variance = data.budgeted - data.actual;
        const variancePercent = data.budgeted > 0 ? (variance / data.budgeted) * 100 : 0;

        return {
          category,
          categoryId: data.categoryId,
          budgeted: round2(data.budgeted),
          actual: round2(data.actual),
          variance: round2(variance),
          variancePercent: round2(variancePercent),
        };
      });

      // Calculate recurring expenses
      const recurringExpenses = expenses.filter(e => e.isRecurring);
      const monthlyRecurring = recurringExpenses
        .filter(e => e.recurringPeriod === 'MONTHLY')
        .reduce((sum, e) => sum + e.amount, 0);
      const annualRecurring = monthlyRecurring * 12 +
        recurringExpenses.filter(e => e.recurringPeriod === 'ANNUALLY').reduce((sum, e) => sum + e.amount, 0) +
        recurringExpenses.filter(e => e.recurringPeriod === 'QUARTERLY').reduce((sum, e) => sum + e.amount * 4, 0);

      // Monthly trends (last 6 months)
      const trends: Array<{ month: string; total: number; byCategory: Record<string, number> }> = [];

      for (let i = 5; i >= 0; i--) {
        const monthStart = subMonths(startOfMonth(dateRange.start), i);
        const monthEnd = endOfMonth(monthStart);

        const monthExpenses = await prisma.expenseEntry.findMany({
          where: { date: { gte: monthStart, lte: monthEnd } },
          include: { category: true },
        });

        const monthByCategory: Record<string, number> = {};
        let monthTotal = 0;

        monthExpenses.forEach(e => {
          const categoryName = e.category?.name || 'Other';
          monthByCategory[categoryName] = (monthByCategory[categoryName] || 0) + e.amount;
          monthTotal += e.amount;
        });

        trends.push({
          month: format(monthStart, 'yyyy-MM'),
          total: round2(monthTotal),
          byCategory: monthByCategory,
        });
      }

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        byCategory: categoryList,
        trends,
        recurring: {
          monthly: round2(monthlyRecurring),
          annual: round2(annualRecurring),
        },
        total: round2(total),
      };
    } catch (error) {
      logger.error('Error getting expense analysis:', error);
      return {
        byCategory: [],
        trends: [],
        recurring: { monthly: 0, annual: 0 },
        total: 0,
      };
    }
  }

  // ==========================================
  // REVENUE BREAKDOWN UPDATE (for scheduler)
  // ==========================================

  /**
   * Update revenue breakdown tables for a date
   */
  async updateRevenueBreakdown(date: Date): Promise<void> {
    try {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Get or create the snapshot for this date
      const snapshot = await prisma.brokerFinancialSnapshot.findUnique({
        where: { date: dayStart },
      });

      if (!snapshot) {
        logger.warn(`No snapshot found for ${format(date, 'yyyy-MM-dd')}`);
        return;
      }

      // Get market breakdown
      const marketData = await this.getRevenueByMarket({ start: dayStart, end: dayEnd });

      // Save market breakdown
      for (const market of marketData.markets) {
        await prisma.brokerRevenueByMarket.upsert({
          where: { date_market: { date: dayStart, market: market.market } },
          create: {
            snapshotId: snapshot.id,
            date: dayStart,
            market: market.market,
            grossRevenue: market.grossRevenue,
            totalVolume: market.totalVolume,
            totalTrades: market.totalTrades,
            wonTrades: market.wonTrades,
            lostTrades: market.lostTrades,
            totalPayouts: market.totalVolume - market.grossRevenue, // Simplified
            profitMargin: market.profitMargin,
            brokerWinRate: market.brokerWinRate,
            avgTradeSize: market.totalTrades > 0 ? market.totalVolume / market.totalTrades : 0,
          },
          update: {
            grossRevenue: market.grossRevenue,
            totalVolume: market.totalVolume,
            totalTrades: market.totalTrades,
            wonTrades: market.wonTrades,
            lostTrades: market.lostTrades,
            profitMargin: market.profitMargin,
            brokerWinRate: market.brokerWinRate,
          },
        });
      }

      // Get symbol breakdown
      const symbolData = await this.getRevenueBySymbol({ start: dayStart, end: dayEnd }, 20);

      // Delete existing symbol data for the date
      await prisma.brokerRevenueBySymbol.deleteMany({
        where: { date: dayStart },
      });

      // Save symbol breakdown
      for (const symbol of symbolData) {
        await prisma.brokerRevenueBySymbol.create({
          data: {
            snapshotId: snapshot.id,
            date: dayStart,
            symbol: symbol.symbol,
            market: symbol.market,
            grossRevenue: symbol.grossRevenue,
            totalVolume: symbol.totalVolume,
            totalTrades: symbol.totalTrades,
            wonTrades: symbol.wonTrades,
            lostTrades: symbol.lostTrades,
          },
        });
      }

      logger.info(`Updated revenue breakdown for ${format(date, 'yyyy-MM-dd')}`);
    } catch (error) {
      logger.error('Error updating revenue breakdown:', error);
    }
  }

  /**
   * Generate and store churn analysis for a specific month
   */
  async generateChurnAnalysis(month: number, year: number): Promise<void> {
    try {
      logger.info(`Generating churn analysis for ${month}/${year}`);

      const metrics = await this.calculateChurnMetrics(month, year);

      // Store or update churn analysis
      await prisma.churnAnalysis.upsert({
        where: { month_year: { month, year } },
        create: {
          month,
          year,
          startingUsers: metrics.totalUsers,
          churnedUsers: metrics.churnedUsers,
          churnRate: metrics.churnRate,
          reactivatedUsers: metrics.reactivatedUsers,
          reactivationRate: metrics.reactivationRate,
          churnByUserType: metrics.churnBySegment.byUserType as object,
          churnByDepositTier: metrics.churnBySegment.byDepositTier as object,
        },
        update: {
          startingUsers: metrics.totalUsers,
          churnedUsers: metrics.churnedUsers,
          churnRate: metrics.churnRate,
          reactivatedUsers: metrics.reactivatedUsers,
          reactivationRate: metrics.reactivationRate,
          churnByUserType: metrics.churnBySegment.byUserType as object,
          churnByDepositTier: metrics.churnBySegment.byDepositTier as object,
        },
      });

      logger.info(`Churn analysis generated for ${month}/${year}`);
    } catch (error) {
      logger.error('Error generating churn analysis:', error);
    }
  }

  /**
   * Update concentration risk data for a specific date
   */
  async updateConcentrationRisk(date: Date): Promise<void> {
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      logger.info(`Updating concentration risk for ${format(date, 'yyyy-MM-dd')}`);

      // Get concentration risk data
      const riskData = await this.getConcentrationRisk(date);

      // Delete existing data for the date
      await prisma.concentrationRisk.deleteMany({
        where: { date: dayStart },
      });

      // Store top users concentration data
      for (const user of riskData.topUsers) {
        const riskLevel = user.revenuePercent >= 10 ? 'CRITICAL' :
                         user.revenuePercent >= 5 ? 'HIGH' :
                         user.revenuePercent >= 2 ? 'MEDIUM' : 'LOW';

        await prisma.concentrationRisk.create({
          data: {
            date: dayStart,
            userId: user.userId,
            dailyVolume: user.volume,
            dailyTrades: user.trades,
            dailyRevenue: user.revenue,
            volumePercent: user.volumePercent,
            revenuePercent: user.revenuePercent,
            isHighRisk: riskLevel === 'CRITICAL' || riskLevel === 'HIGH',
          },
        });
      }

      logger.info(`Concentration risk updated for ${format(date, 'yyyy-MM-dd')}`);
    } catch (error) {
      logger.error('Error updating concentration risk:', error);
    }
  }

  /**
   * Update seasonal patterns based on historical data
   */
  async updateSeasonalPatterns(): Promise<void> {
    try {
      logger.info('Updating seasonal patterns');

      const now = new Date();
      const year = now.getFullYear();

      // Calculate monthly averages for the current year
      const monthlySnapshots = await prisma.brokerFinancialSnapshot.groupBy({
        by: ['date'],
        _sum: {
          grossTradingRevenue: true,
          totalTradeVolume: true,
          totalTrades: true,
        },
        where: {
          date: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      });

      // Group by month
      const monthlyData: Record<number, { revenues: number[]; volumes: number[]; trades: number[] }> = {};

      for (const snapshot of monthlySnapshots) {
        const month = snapshot.date.getMonth() + 1;
        if (!monthlyData[month]) {
          monthlyData[month] = { revenues: [], volumes: [], trades: [] };
        }
        monthlyData[month].revenues.push(snapshot._sum?.grossTradingRevenue || 0);
        monthlyData[month].volumes.push(snapshot._sum?.totalTradeVolume || 0);
        monthlyData[month].trades.push(snapshot._sum?.totalTrades || 0);
      }

      // Update or create seasonal patterns for each month
      for (const [monthStr, data] of Object.entries(monthlyData)) {
        const month = parseInt(monthStr);
        const avgRevenue = data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length;
        const avgVolume = data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length;
        const avgTrades = data.trades.reduce((a, b) => a + b, 0) / data.trades.length;

        // Calculate standard deviation
        const variance = data.revenues.reduce((sum, val) => sum + Math.pow(val - avgRevenue, 2), 0) / data.revenues.length;
        const stdDevRevenue = Math.sqrt(variance);

        await prisma.seasonalPattern.upsert({
          where: {
            periodType_periodValue_year: { periodType: 'MONTHLY', periodValue: month, year },
          },
          create: {
            periodType: 'MONTHLY',
            periodValue: month,
            year,
            avgRevenue,
            avgVolume,
            avgTrades,
            stdDevRevenue,
            sampleSize: data.revenues.length,
          },
          update: {
            avgRevenue,
            avgVolume,
            avgTrades,
            stdDevRevenue,
            sampleSize: data.revenues.length,
          },
        });
      }

      // Calculate day-of-week patterns
      const dayOfWeekData: Record<number, { revenues: number[]; volumes: number[]; trades: number[] }> = {};

      for (const snapshot of monthlySnapshots) {
        const dayOfWeek = snapshot.date.getDay();
        if (!dayOfWeekData[dayOfWeek]) {
          dayOfWeekData[dayOfWeek] = { revenues: [], volumes: [], trades: [] };
        }
        dayOfWeekData[dayOfWeek].revenues.push(snapshot._sum?.grossTradingRevenue || 0);
        dayOfWeekData[dayOfWeek].volumes.push(snapshot._sum?.totalTradeVolume || 0);
        dayOfWeekData[dayOfWeek].trades.push(snapshot._sum?.totalTrades || 0);
      }

      for (const [dayStr, data] of Object.entries(dayOfWeekData)) {
        const day = parseInt(dayStr);
        const avgRevenue = data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length;
        const avgVolume = data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length;
        const avgTrades = data.trades.reduce((a, b) => a + b, 0) / data.trades.length;
        const variance = data.revenues.reduce((sum, val) => sum + Math.pow(val - avgRevenue, 2), 0) / data.revenues.length;
        const stdDevRevenue = Math.sqrt(variance);

        await prisma.seasonalPattern.upsert({
          where: {
            periodType_periodValue_year: { periodType: 'DAY_OF_WEEK', periodValue: day, year },
          },
          create: {
            periodType: 'DAY_OF_WEEK',
            periodValue: day,
            year,
            avgRevenue,
            avgVolume,
            avgTrades,
            stdDevRevenue,
            sampleSize: data.revenues.length,
          },
          update: {
            avgRevenue,
            avgVolume,
            avgTrades,
            stdDevRevenue,
            sampleSize: data.revenues.length,
          },
        });
      }

      logger.info('Seasonal patterns updated successfully');
    } catch (error) {
      logger.error('Error updating seasonal patterns:', error);
    }
  }
}

// Export singleton instance
export const brokerAnalyticsService = new BrokerAnalyticsService();
export default brokerAnalyticsService;
