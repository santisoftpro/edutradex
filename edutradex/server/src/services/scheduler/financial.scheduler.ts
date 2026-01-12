import { brokerFinancialService } from '../financial/index.js';
import { brokerAnalyticsService } from '../financial/broker-analytics.service.js';
import { logger } from '../../utils/logger.js';

// ==========================================
// RETRY CONFIGURATION
// ==========================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface FailedTask {
  taskName: string;
  error: Error;
  attemptCount: number;
  lastAttempt: Date;
  nextRetry: Date | null;
  context?: Record<string, unknown>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,        // Start with 1 second
  maxDelayMs: 60 * 1000,    // Cap at 1 minute
  backoffMultiplier: 2,      // Double delay each retry
};

/**
 * Execute a task with exponential backoff retry
 */
async function executeWithRetry<T>(
  taskName: string,
  task: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: Record<string, unknown>,
): Promise<{ success: boolean; result?: T; error?: Error; attempts: number }> {
  let lastError: Error | undefined;
  let attempts = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      const result = await task();

      if (attempt > 0) {
        logger.info(`Task succeeded after retry`, {
          taskName,
          attempt: attempts,
          context,
        });
      }

      return { success: true, result, attempts };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
        const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
        const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

        logger.warn(`Task failed, retrying...`, {
          taskName,
          attempt: attempts,
          maxRetries: config.maxRetries,
          nextRetryMs: Math.round(delay),
          error: lastError.message,
          context,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Task failed after all retries`, {
    taskName,
    attempts,
    error: lastError?.message,
    stack: lastError?.stack,
    context,
  });

  return { success: false, error: lastError, attempts };
}

/**
 * Financial Reporting Scheduler
 *
 * Automated scheduler for financial report generation:
 * - Daily snapshots generated at end of day (or on-demand)
 * - Monthly reports generated on the 1st of each month
 * - Real-time metrics updated every minute
 * - Daily counters reset at midnight
 *
 * Features:
 * - Exponential backoff retry for failed tasks
 * - Failed task tracking and recovery
 * - Detailed logging with context
 */
class FinancialScheduler {
  private dailySnapshotInterval: NodeJS.Timeout | null = null;
  private realTimeMetricsInterval: NodeJS.Timeout | null = null;
  private midnightTimeout: NodeJS.Timeout | null = null;
  private monthlyCheckInterval: NodeJS.Timeout | null = null;
  private analyticsInterval: NodeJS.Timeout | null = null;
  private weeklyCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSnapshotDate: string | null = null;
  private lastMonthlyReport: string | null = null;
  private lastAnalyticsUpdate: string | null = null;
  private lastWeeklyUpdate: string | null = null;

  // Configuration
  private readonly REAL_TIME_INTERVAL_MS = 60 * 1000;       // Update real-time metrics every 1 minute
  private readonly SNAPSHOT_CHECK_INTERVAL_MS = 60 * 1000;  // Check for snapshot generation every 1 minute
  private readonly MONTHLY_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check for monthly report every 1 hour
  private readonly ANALYTICS_INTERVAL_MS = 4 * 60 * 60 * 1000; // Update analytics every 4 hours
  private readonly WEEKLY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check for weekly tasks every 24 hours

  /**
   * Start all financial schedulers
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Financial scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Start real-time metrics updates
    this.startRealTimeMetricsUpdater();

    // Start daily snapshot checker
    this.startDailySnapshotChecker();

    // Start monthly report checker
    this.startMonthlyReportChecker();

    // Start analytics updater (cohorts, revenue breakdown, concentration risk)
    this.startAnalyticsUpdater();

    // Start weekly task checker (seasonal patterns)
    this.startWeeklyTaskChecker();

    // Schedule midnight reset
    this.scheduleMidnightReset();

    logger.info('Financial scheduler started', {
      realTimeIntervalMs: this.REAL_TIME_INTERVAL_MS,
      snapshotCheckIntervalMs: this.SNAPSHOT_CHECK_INTERVAL_MS,
      analyticsIntervalMs: this.ANALYTICS_INTERVAL_MS,
    });
  }

  /**
   * Stop all schedulers
   */
  stop(): void {
    if (this.dailySnapshotInterval) {
      clearInterval(this.dailySnapshotInterval);
      this.dailySnapshotInterval = null;
    }

    if (this.realTimeMetricsInterval) {
      clearInterval(this.realTimeMetricsInterval);
      this.realTimeMetricsInterval = null;
    }

    if (this.midnightTimeout) {
      clearTimeout(this.midnightTimeout);
      this.midnightTimeout = null;
    }

    if (this.monthlyCheckInterval) {
      clearInterval(this.monthlyCheckInterval);
      this.monthlyCheckInterval = null;
    }

    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }

    if (this.weeklyCheckInterval) {
      clearInterval(this.weeklyCheckInterval);
      this.weeklyCheckInterval = null;
    }

    this.isRunning = false;
    logger.info('Financial scheduler stopped');
  }

  /**
   * Start real-time metrics updater
   */
  private startRealTimeMetricsUpdater(): void {
    // Run immediately
    this.updateRealTimeMetrics();

    // Schedule periodic updates
    this.realTimeMetricsInterval = setInterval(() => {
      this.updateRealTimeMetrics();
    }, this.REAL_TIME_INTERVAL_MS);

    logger.info('Real-time metrics updater started');
  }

  /**
   * Update real-time metrics
   */
  private async updateRealTimeMetrics(): Promise<void> {
    await executeWithRetry(
      'updateRealTimeMetrics',
      () => brokerFinancialService.updateRealTimeMetrics(),
      { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 }, // Fewer retries for real-time metrics
    );
  }

  /**
   * Start daily snapshot checker
   */
  private startDailySnapshotChecker(): void {
    // Check and generate snapshot for previous day if needed
    this.checkAndGenerateDailySnapshot();

    // Schedule periodic checks
    this.dailySnapshotInterval = setInterval(() => {
      this.checkAndGenerateDailySnapshot();
    }, this.SNAPSHOT_CHECK_INTERVAL_MS);

    logger.info('Daily snapshot checker started');
  }

  /**
   * Check and generate daily snapshot if needed
   */
  private async checkAndGenerateDailySnapshot(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Generate snapshot for today (updates throughout the day)
    if (this.lastSnapshotDate !== today) {
      const result = await executeWithRetry(
        'generateDailySnapshot',
        () => brokerFinancialService.generateDailySnapshot(now),
        DEFAULT_RETRY_CONFIG,
        { date: today },
      );

      if (result.success) {
        this.lastSnapshotDate = today;
        logger.debug('Daily snapshot generated/updated', { date: today });
      }
    }

    // Also ensure yesterday's snapshot is finalized if it's a new day
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (this.lastSnapshotDate && this.lastSnapshotDate !== yesterdayStr) {
      // Finalize yesterday's snapshot
      await executeWithRetry(
        'finalizePreviousDaySnapshot',
        () => brokerFinancialService.generateDailySnapshot(yesterday),
        DEFAULT_RETRY_CONFIG,
        { date: yesterdayStr },
      );
    }
  }

  /**
   * Start monthly report checker
   */
  private startMonthlyReportChecker(): void {
    // Check for monthly report on startup
    this.checkAndGenerateMonthlyReport();

    // Schedule periodic checks
    this.monthlyCheckInterval = setInterval(() => {
      this.checkAndGenerateMonthlyReport();
    }, this.MONTHLY_CHECK_INTERVAL_MS);

    logger.info('Monthly report checker started');
  }

  /**
   * Check and generate monthly report if needed
   */
  private async checkAndGenerateMonthlyReport(): Promise<void> {
    const now = new Date();

    // On the 1st of each month, generate report for previous month
    if (now.getDate() !== 1) {
      return;
    }

    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const reportKey = `${lastMonthYear}-${lastMonth}`;

    if (this.lastMonthlyReport === reportKey) {
      return;
    }

    const context = { month: lastMonth, year: lastMonthYear };
    const results: { task: string; success: boolean }[] = [];

    // Generate standard monthly report
    const standardResult = await executeWithRetry(
      'generateMonthlyReport',
      () => brokerFinancialService.generateMonthlyReport(lastMonth, lastMonthYear),
      DEFAULT_RETRY_CONFIG,
      context,
    );
    results.push({ task: 'standard', success: standardResult.success });

    // Generate churn analysis for the previous month
    const churnResult = await executeWithRetry(
      'generateChurnAnalysis',
      () => brokerAnalyticsService.generateChurnAnalysis(lastMonth, lastMonthYear),
      DEFAULT_RETRY_CONFIG,
      context,
    );
    results.push({ task: 'churn', success: churnResult.success });

    // Generate cash flow statement for the previous month
    const cashFlowResult = await executeWithRetry(
      'generateCashFlowStatement',
      () => brokerAnalyticsService.generateCashFlowStatement(lastMonth, lastMonthYear),
      DEFAULT_RETRY_CONFIG,
      context,
    );
    results.push({ task: 'cash-flow', success: cashFlowResult.success });

    // Only mark as complete if all reports succeeded
    const allSucceeded = results.every(r => r.success);
    if (allSucceeded) {
      this.lastMonthlyReport = reportKey;
    }

    logger.info('Monthly reports generation completed', {
      month: lastMonth,
      year: lastMonthYear,
      results,
      allSucceeded,
    });
  }

  /**
   * Start analytics updater (cohorts, revenue breakdown, concentration risk)
   */
  private startAnalyticsUpdater(): void {
    // Run immediately
    this.runAnalyticsUpdates();

    // Schedule periodic updates
    this.analyticsInterval = setInterval(() => {
      this.runAnalyticsUpdates();
    }, this.ANALYTICS_INTERVAL_MS);

    logger.info('Analytics updater started');
  }

  /**
   * Run analytics updates
   */
  private async runAnalyticsUpdates(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Only run once per day per analytics type
    if (this.lastAnalyticsUpdate === today) {
      return;
    }

    logger.info('Running analytics updates');
    const context = { date: today };
    const results: { task: string; success: boolean }[] = [];

    // Update revenue breakdown
    const revenueResult = await executeWithRetry(
      'updateRevenueBreakdown',
      () => brokerAnalyticsService.updateRevenueBreakdown(now),
      DEFAULT_RETRY_CONFIG,
      context,
    );
    results.push({ task: 'revenueBreakdown', success: revenueResult.success });

    // Update user cohorts
    const cohortsResult = await executeWithRetry(
      'updateUserCohorts',
      () => brokerAnalyticsService.updateUserCohorts(),
      DEFAULT_RETRY_CONFIG,
      context,
    );
    results.push({ task: 'userCohorts', success: cohortsResult.success });

    // Update concentration risk
    const riskResult = await executeWithRetry(
      'updateConcentrationRisk',
      () => brokerAnalyticsService.updateConcentrationRisk(now),
      DEFAULT_RETRY_CONFIG,
      context,
    );
    results.push({ task: 'concentrationRisk', success: riskResult.success });

    // Only mark as complete if all updates succeeded
    const allSucceeded = results.every(r => r.success);
    if (allSucceeded) {
      this.lastAnalyticsUpdate = today;
    }

    logger.info('Analytics updates completed', { results, allSucceeded });
  }

  /**
   * Start weekly task checker
   */
  private startWeeklyTaskChecker(): void {
    // Check and run weekly tasks
    this.checkAndRunWeeklyTasks();

    // Schedule periodic checks
    this.weeklyCheckInterval = setInterval(() => {
      this.checkAndRunWeeklyTasks();
    }, this.WEEKLY_CHECK_INTERVAL_MS);

    logger.info('Weekly task checker started');
  }

  /**
   * Check and run weekly tasks (seasonal patterns, etc.)
   */
  private async checkAndRunWeeklyTasks(): Promise<void> {
    const now = new Date();
    const weekNumber = this.getWeekNumber(now);
    const weekKey = `${now.getFullYear()}-W${weekNumber}`;

    if (this.lastWeeklyUpdate === weekKey) {
      return;
    }

    // Only run on Sundays
    if (now.getDay() !== 0) {
      return;
    }

    logger.info('Running weekly analytics tasks');

    // Update seasonal patterns
    const result = await executeWithRetry(
      'updateSeasonalPatterns',
      () => brokerAnalyticsService.updateSeasonalPatterns(),
      DEFAULT_RETRY_CONFIG,
      { week: weekKey },
    );

    if (result.success) {
      this.lastWeeklyUpdate = weekKey;
    }

    logger.info('Weekly analytics tasks completed', { success: result.success });
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Schedule midnight reset of daily counters
   */
  private scheduleMidnightReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    this.midnightTimeout = setTimeout(async () => {
      await this.runMidnightTasks();
      // Reschedule for next midnight
      this.scheduleMidnightReset();
    }, msUntilMidnight);

    logger.info('Midnight reset scheduled', {
      msUntilMidnight,
      scheduledTime: tomorrow.toISOString(),
    });
  }

  /**
   * Run tasks at midnight
   */
  private async runMidnightTasks(): Promise<void> {
    logger.info('Running midnight financial tasks');

    const results: { task: string; success: boolean }[] = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Finalize yesterday's snapshot
    const finalizeResult = await executeWithRetry(
      'finalizeDailySnapshot',
      () => brokerFinancialService.generateDailySnapshot(yesterday),
      DEFAULT_RETRY_CONFIG,
      { date: yesterdayStr },
    );
    results.push({ task: 'finalizeDailySnapshot', success: finalizeResult.success });

    // Reset daily counters
    const resetResult = await executeWithRetry(
      'resetDailyCounters',
      () => brokerFinancialService.resetDailyCounters(),
      DEFAULT_RETRY_CONFIG,
    );
    results.push({ task: 'resetDailyCounters', success: resetResult.success });

    // Generate new snapshot for today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const newSnapshotResult = await executeWithRetry(
      'generateNewDaySnapshot',
      () => brokerFinancialService.generateDailySnapshot(today),
      DEFAULT_RETRY_CONFIG,
      { date: todayStr },
    );
    results.push({ task: 'generateNewDaySnapshot', success: newSnapshotResult.success });

    const allSucceeded = results.every(r => r.success);
    logger.info('Midnight financial tasks completed', { results, allSucceeded });
  }

  /**
   * Manually trigger daily snapshot generation
   */
  async triggerDailySnapshot(date?: Date): Promise<void> {
    logger.info('Manual daily snapshot triggered', { date: date?.toISOString() });
    await brokerFinancialService.generateDailySnapshot(date || new Date());
  }

  /**
   * Manually trigger monthly report generation
   */
  async triggerMonthlyReport(month: number, year: number): Promise<void> {
    logger.info('Manual monthly report triggered', { month, year });
    await brokerFinancialService.generateMonthlyReport(month, year);
  }

  /**
   * Generate snapshots for a date range (backfill)
   */
  async backfillSnapshots(startDate: Date, endDate: Date): Promise<{ generated: number; failed: number }> {
    logger.info('Backfilling financial snapshots', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let generated = 0;
    let failed = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];

      const result = await executeWithRetry(
        'backfillSnapshot',
        () => brokerFinancialService.generateDailySnapshot(new Date(current)),
        DEFAULT_RETRY_CONFIG,
        { date: dateStr },
      );

      if (result.success) {
        generated++;
        logger.debug('Backfill snapshot generated', { date: dateStr });
      } else {
        failed++;
        logger.warn('Backfill snapshot failed after retries', { date: dateStr });
      }

      current.setDate(current.getDate() + 1);
    }

    logger.info('Backfill completed', { generated, failed, total: generated + failed });
    return { generated, failed };
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    lastSnapshotDate: string | null;
    lastMonthlyReport: string | null;
    lastAnalyticsUpdate: string | null;
    lastWeeklyUpdate: string | null;
    intervals: {
      realTimeMetrics: boolean;
      dailySnapshot: boolean;
      monthlyReport: boolean;
      midnightReset: boolean;
      analytics: boolean;
      weekly: boolean;
    };
  } {
    return {
      running: this.isRunning,
      lastSnapshotDate: this.lastSnapshotDate,
      lastMonthlyReport: this.lastMonthlyReport,
      lastAnalyticsUpdate: this.lastAnalyticsUpdate,
      lastWeeklyUpdate: this.lastWeeklyUpdate,
      intervals: {
        realTimeMetrics: this.realTimeMetricsInterval !== null,
        dailySnapshot: this.dailySnapshotInterval !== null,
        monthlyReport: this.monthlyCheckInterval !== null,
        midnightReset: this.midnightTimeout !== null,
        analytics: this.analyticsInterval !== null,
        weekly: this.weeklyCheckInterval !== null,
      },
    };
  }
}

export const financialScheduler = new FinancialScheduler();
