/**
 * Centralized Prisma Client Singleton
 *
 * Prevents multiple PrismaClient instances from being created,
 * which can cause connection pool exhaustion.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// Declare global type for Prisma singleton
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Create singleton instance
const prisma = global.__prisma || new PrismaClient({
  log: ['warn', 'error'],
});

// Store in global for hot reloading in development
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Log connection status
prisma.$connect()
  .then(() => {
    logger.info('Prisma client connected successfully');
  })
  .catch((error) => {
    logger.error('Prisma client connection failed', { error });
  });

export { prisma };
export default prisma;
