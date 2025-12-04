import { referralService } from '../referral/referral.service.js';
import { logger } from '../../utils/logger.js';

class CommissionScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the scheduler (runs every 24 hours)
  start() {
    if (this.intervalId) {
      logger.warn('Commission scheduler is already running');
      return;
    }

    // Run every 24 hours (86400000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Run immediately on start, then every 24 hours
    this.runCalculation();

    this.intervalId = setInterval(() => {
      this.runCalculation();
    }, TWENTY_FOUR_HOURS);

    logger.info('Commission scheduler started - will run every 24 hours');
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Commission scheduler stopped');
    }
  }

  // Run the commission calculation
  private async runCalculation() {
    if (this.isRunning) {
      logger.warn('Commission calculation already in progress, skipping');
      return;
    }

    this.isRunning = true;
    logger.info('Starting scheduled commission calculation');

    try {
      const result = await referralService.calculateDailyProfitCommissions();
      logger.info('Scheduled commission calculation completed', result);
    } catch (error) {
      logger.error('Scheduled commission calculation failed', { error });
    } finally {
      this.isRunning = false;
    }
  }

  // Manually trigger calculation (for admin use)
  async triggerManually() {
    logger.info('Manual commission calculation triggered');
    return this.runCalculation();
  }
}

export const commissionScheduler = new CommissionScheduler();
