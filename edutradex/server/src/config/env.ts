import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables before validation
dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Client
  CLIENT_URL: z.string().default('http://localhost:3000'),

  // Demo settings
  DEFAULT_DEMO_BALANCE: z.string().default('10000'),
  DEFAULT_PAYOUT_PERCENTAGE: z.string().default('80'),
  MIN_TRADE_AMOUNT: z.string().default('1'),
  MAX_TRADE_AMOUNT: z.string().default('1000'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Environment validation failed:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();

export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',

  database: {
    url: env.DATABASE_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  client: {
    url: env.CLIENT_URL,
  },

  trading: {
    defaultDemoBalance: parseFloat(env.DEFAULT_DEMO_BALANCE),
    defaultPayoutPercentage: parseFloat(env.DEFAULT_PAYOUT_PERCENTAGE),
    minTradeAmount: parseFloat(env.MIN_TRADE_AMOUNT),
    maxTradeAmount: parseFloat(env.MAX_TRADE_AMOUNT),
  },
};
