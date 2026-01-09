import { brokerFinancialService } from '../financial/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Financial Reporting Scheduler
 *
 * Automated scheduler for financial report generation:
 * - Daily snapshots generated at end of day (or on-demand)
 * - Monthly reports generated on the 1st of each month
 * - Real-time metrics updated every minute
 * - Daily counters reset at midnight
 */
class FinancialScheduler {
  private dailySnapshotInterval: NodeJS.Timeout | null = null;
  private realTimeMetricsInterval: NodeJS.Timeout | null = null;
  private midnightTimeout: NodeJS.Timeout | null = null;
  private monthlyCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSnapshotDate: string | null = null;
  private lastMonthlyReport: string | null = null;

  // Configuration
  private readonly REAL_TIME_INTERVAL_MS = 60 * 1000;       // Update real-time metrics every 1 minute
  private readonly SNAPSHOT_CHECK_INTERVAL_MS = 60 * 1000;  // Check for snapshot generation every 1 minute
  private readonly MONTHLY_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check for monthly report every 1 hour

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

    // Schedule midnight reset
    this.scheduleMidnightReset();

    logger.info('Financial scheduler started', {
      realTimeIntervalMs: this.REAL_TIME_INTERVAL_MS,
      snapshotCheckIntervalMs: this.SNAPSHOT_CHECK_INTERVAL_MS,
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
    try {
      await brokerFinancialService.updateRealTimeMetrics();
    } catch (error) {
      logger.error('Error updating real-time metrics', { error });
    }
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
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Generate snapshot for today (updates throughout the day)
      if (this.lastSnapshotDate !== today) {
        await brokerFinancialService.generateDailySnapshot(now);
        this.lastSnapshotDate = today;
        logger.debug('Daily snapshot generated/updated', { date: today });
      }

      // Also ensure yesterday's snapshot is finalized if it's a new day
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (this.lastSnapshotDate && this.lastSnapshotDate !== yesterdayStr) {
        // Finalize yesterday's snapshot
        await brokerFinancialService.generateDailySnapshot(yesterday);
      }
    } catch (error) {
      logger.error('Error in daily snapshot checker', { error });
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
    try {
      const now = new Date();

      // On the 1st of each month, generate report for previous month
      if (now.getDate() === 1) {
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const reportKey = `${lastMonthYear}-${lastMonth}`;

        if (this.lastMonthlyReport !== reportKey) {
          await brokerFinancialService.generateMonthlyReport(lastMonth, lastMonthYear);
          this.lastMonthlyReport = reportKey;
          logger.info('Monthly report generated', { month: lastMonth, year: lastMonthYear });
        }
      }
    } catch (error) {
      logger.error('Error in monthly report checker', { error });
    }
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

    try {
      // Finalize yesterday's snapshot
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await brokerFinancialService.generateDailySnapshot(yesterday);

      // Reset daily counters
      await brokerFinancialService.resetDailyCounters();

      // Generate new snapshot for today
      await brokerFinancialService.generateDailySnapshot(new Date());

      logger.info('Midnight financial tasks completed');
    } catch (error) {
      logger.error('Error in midnight financial tasks', { error });
    }
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
  async backfillSnapshots(startDate: Date, endDate: Date): Promise<{ generated: number }> {
    logger.info('Backfilling financial snapshots', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    let generated = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      try {
        await brokerFinancialService.generateDailySnapshot(new Date(current));
        generated++;
        logger.debug('Backfill snapshot generated', { date: current.toISOString() });
      } catch (error) {
        logger.error('Error generating backfill snapshot', {
          date: current.toISOString(),
          error,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    logger.info('Backfill completed', { generated });
    return { generated };
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    lastSnapshotDate: string | null;
    lastMonthlyReport: string | null;
    intervals: {
      realTimeMetrics: boolean;
      dailySnapshot: boolean;
      monthlyReport: boolean;
      midnightReset: boolean;
    };
  } {
    return {
      running: this.isRunning,
      lastSnapshotDate: this.lastSnapshotDate,
      lastMonthlyReport: this.lastMonthlyReport,
      intervals: {
        realTimeMetrics: this.realTimeMetricsInterval !== null,
        dailySnapshot: this.dailySnapshotInterval !== null,
        monthlyReport: this.monthlyCheckInterval !== null,
        midnightReset: this.midnightTimeout !== null,
      },
    };
  }
}

export const financialScheduler = new FinancialScheduler();
