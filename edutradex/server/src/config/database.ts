import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const logConfig: Prisma.LogLevel[] = process.env.NODE_ENV === 'development'
  ? ['error', 'warn']
  : ['error'];

// Prevent multiple instances of Prisma Client in development
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: logConfig,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Database disconnection error', { error });
  }
}
