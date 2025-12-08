import { queryMany } from '../../config/db.js';
import { tradeService } from '../trade/trade.service.js';
import { logger } from '../../utils/logger.js';

class TradeSettlementScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.intervalId) {
      logger.warn('Trade settlement scheduler is already running');
      return;
    }

    const INTERVAL = 5 * 1000;

    this.settleExpiredTrades();

    this.intervalId = setInterval(() => {
      this.settleExpiredTrades();
    }, INTERVAL);

    logger.info('Trade settlement scheduler started - checking every 5 seconds');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Trade settlement scheduler stopped');
    }
  }

  private async settleExpiredTrades() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const expiredTrades = await queryMany<{ id: string }>(
        `SELECT id FROM "Trade" WHERE status = 'OPEN' AND "expiresAt" <= $1`,
        [new Date()]
      );

      if (expiredTrades.length > 0) {
        logger.info(`Found ${expiredTrades.length} expired trades to settle`);

        for (const trade of expiredTrades) {
          try {
            await tradeService.settleTrade(trade.id);
          } catch (error) {
            logger.error('Failed to settle expired trade', { tradeId: trade.id, error });
          }
        }
      }
    } catch (error) {
      logger.error('Error in trade settlement scheduler', { error });
    } finally {
      this.isRunning = false;
    }
  }

  async triggerManually() {
    logger.info('Manual trade settlement check triggered');
    return this.settleExpiredTrades();
  }
}

export const tradeSettlementScheduler = new TradeSettlementScheduler();
