import { queryMany } from '../../config/db.js';
import { tradeService } from '../trade/trade.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Trade Settlement Scheduler
 *
 * High-performance scheduler for settling expired trades.
 *
 * Architecture:
 * - Runs every 5 seconds to check for expired trades
 * - Uses batch processing with configurable batch size
 * - Processes trades concurrently for better throughput
 * - Prevents duplicate runs with mutex lock
 * - Uses optimized query with composite index (status, expiresAt)
 */
class TradeSettlementScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Configuration
  private readonly INTERVAL_MS = 5 * 1000;           // Check every 5 seconds
  private readonly BATCH_SIZE = 100;                  // Max trades per batch
  private readonly CONCURRENCY_LIMIT = 10;            // Parallel settlements

  start(): void {
    if (this.intervalId) {
      logger.warn('Trade settlement scheduler is already running');
      return;
    }

    // Run immediately on start
    this.settleExpiredTrades();

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.settleExpiredTrades();
    }, this.INTERVAL_MS);

    logger.info('Trade settlement scheduler started', {
      intervalMs: this.INTERVAL_MS,
      batchSize: this.BATCH_SIZE,
      concurrencyLimit: this.CONCURRENCY_LIMIT
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Trade settlement scheduler stopped');
    }
  }

  /**
   * Main settlement loop - processes expired trades in batches
   */
  private async settleExpiredTrades(): Promise<void> {
    // Mutex lock - prevent concurrent runs
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Query uses composite index: idx_trade_status_expires (status, expiresAt)
      // LIMIT prevents memory issues with large result sets
      const expiredTrades = await queryMany<{ id: string }>(
        `SELECT id FROM "Trade"
         WHERE status = 'OPEN' AND "expiresAt" <= $1
         ORDER BY "expiresAt" ASC
         LIMIT $2`,
        [new Date(), this.BATCH_SIZE]
      );

      if (expiredTrades.length === 0) {
        return;
      }

      logger.info('Processing expired trades', { count: expiredTrades.length });

      // Process in concurrent batches for better throughput
      const results = await this.processTradesInBatches(expiredTrades);

      const duration = Date.now() - startTime;
      logger.info('Trade settlement batch completed', {
        total: expiredTrades.length,
        succeeded: results.succeeded,
        failed: results.failed,
        durationMs: duration
      });

    } catch (error) {
      logger.error('Error in trade settlement scheduler', { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process trades in parallel batches with concurrency control
   */
  private async processTradesInBatches(
    trades: { id: string }[]
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    // Process in chunks to control concurrency
    for (let i = 0; i < trades.length; i += this.CONCURRENCY_LIMIT) {
      const chunk = trades.slice(i, i + this.CONCURRENCY_LIMIT);

      const results = await Promise.allSettled(
        chunk.map(trade => this.settleSingleTrade(trade.id))
      );

      // Count results
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          succeeded++;
        } else {
          failed++;
        }
      }
    }

    return { succeeded, failed };
  }

  /**
   * Settle a single trade with error handling
   */
  private async settleSingleTrade(tradeId: string): Promise<boolean> {
    try {
      await tradeService.settleTrade(tradeId);
      return true;
    } catch (error) {
      logger.error('Failed to settle trade', { tradeId, error });
      return false;
    }
  }

  /**
   * Manual trigger for testing/admin purposes
   */
  async triggerManually(): Promise<{ processed: number }> {
    logger.info('Manual trade settlement triggered');

    const expiredTrades = await queryMany<{ id: string }>(
      `SELECT id FROM "Trade"
       WHERE status = 'OPEN' AND "expiresAt" <= $1
       ORDER BY "expiresAt" ASC
       LIMIT $2`,
      [new Date(), this.BATCH_SIZE]
    );

    if (expiredTrades.length === 0) {
      return { processed: 0 };
    }

    const results = await this.processTradesInBatches(expiredTrades);

    return { processed: results.succeeded };
  }

  /**
   * Get scheduler status for monitoring
   */
  getStatus(): { running: boolean; active: boolean } {
    return {
      running: this.intervalId !== null,
      active: this.isRunning
    };
  }
}

export const tradeSettlementScheduler = new TradeSettlementScheduler();
