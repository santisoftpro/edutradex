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
  DEFAULT_DEMO_BALANCE: z.string().default('0'),
  DEFAULT_PAYOUT_PERCENTAGE: z.string().default('80'),
  MIN_TRADE_AMOUNT: z.string().default('1'),
  MAX_TRADE_AMOUNT: z.string().default('100000'),

  // Deriv API
  DERIV_APP_ID: z.string().default('1089'),
  DERIV_WS_URL: z.string().default('wss://ws.derivws.com/websockets/v3?app_id='),
  USE_DERIV_API: z.string().default('true'),
  FALLBACK_TO_SIMULATION: z.string().default('true'),

  // Spread Management
  DEFAULT_SPREAD_MARKUP: z.string().default('2'),
  MIN_SPREAD_MARKUP: z.string().default('0.5'),
  MAX_SPREAD_MARKUP: z.string().default('10'),

  // Email/SMTP Configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('OptigoBroker'),
  SMTP_FROM_EMAIL: z.string().default('noreply@optigobroker.com'),
  EMAIL_VERIFICATION_ENABLED: z.string().default('false'),
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

  deriv: {
    appId: env.DERIV_APP_ID,
    wsUrl: env.DERIV_WS_URL,
    useDerivApi: env.USE_DERIV_API === 'true',
    fallbackToSimulation: env.FALLBACK_TO_SIMULATION === 'true',
  },

  spread: {
    defaultMarkup: parseFloat(env.DEFAULT_SPREAD_MARKUP),
    minMarkup: parseFloat(env.MIN_SPREAD_MARKUP),
    maxMarkup: parseFloat(env.MAX_SPREAD_MARKUP),
  },

  email: {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL,
    verificationEnabled: env.EMAIL_VERIFICATION_ENABLED === 'true',
  },
};
