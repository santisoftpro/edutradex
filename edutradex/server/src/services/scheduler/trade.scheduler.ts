import { prisma } from '../../config/database.js';
import { tradeService } from '../trade/trade.service.js';
import { logger } from '../../utils/logger.js';

class TradeSettlementScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the scheduler (runs every 5 seconds to catch expired trades)
  start() {
    if (this.intervalId) {
      logger.warn('Trade settlement scheduler is already running');
      return;
    }

    // Run every 5 seconds to catch any expired trades
    const INTERVAL = 5 * 1000;

    // Run immediately on start to settle any trades that expired during downtime
    this.settleExpiredTrades();

    this.intervalId = setInterval(() => {
      this.settleExpiredTrades();
    }, INTERVAL);

    logger.info('Trade settlement scheduler started - checking every 5 seconds');
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Trade settlement scheduler stopped');
    }
  }

  // Find and settle all expired trades
  private async settleExpiredTrades() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Find all trades that are OPEN and have expired
      const expiredTrades = await prisma.trade.findMany({
        where: {
          status: 'OPEN',
          expiresAt: {
            lte: new Date(),
          },
        },
        select: {
          id: true,
        },
      });

      if (expiredTrades.length > 0) {
        logger.info(`Found ${expiredTrades.length} expired trades to settle`);

        // Settle each expired trade
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

  // Manually trigger settlement check (for admin/testing use)
  async triggerManually() {
    logger.info('Manual trade settlement check triggered');
    return this.settleExpiredTrades();
  }
}

export const tradeSettlementScheduler = new TradeSettlementScheduler();
