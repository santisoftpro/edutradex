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

  // Finnhub API (for stocks/indices)
  FINNHUB_API_KEY: z.string().default(''),

  // Email/SMTP Configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('OptigoBroker'),
  SMTP_FROM_EMAIL: z.string().default('noreply@optigobroker.com'),
  EMAIL_VERIFICATION_ENABLED: z.string().default('false'),

  // OTC Market Configuration (intervals in milliseconds)
  OTC_PRICE_UPDATE_INTERVAL: z.string().default('1000'),
  OTC_PRICE_HISTORY_SAVE_INTERVAL: z.string().default('5000'),
  OTC_CLEANUP_INTERVAL: z.string().default('60000'),
  OTC_DIAGNOSTIC_LOG_INTERVAL: z.string().default('30000'),

  // WebSocket Configuration
  WS_PING_INTERVAL: z.string().default('30000'),
  WS_RECONNECT_INTERVAL: z.string().default('3000'),
  WS_MAX_HISTORY_LENGTH: z.string().default('300'),

  // Trade Settlement Configuration
  TRADE_SETTLEMENT_CHECK_INTERVAL: z.string().default('10000'),
  TRADE_SETTLEMENT_MAX_RETRIES: z.string().default('3'),
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

  finnhub: {
    apiKey: env.FINNHUB_API_KEY,
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

  otc: {
    priceUpdateInterval: parseInt(env.OTC_PRICE_UPDATE_INTERVAL, 10),
    priceHistorySaveInterval: parseInt(env.OTC_PRICE_HISTORY_SAVE_INTERVAL, 10),
    cleanupInterval: parseInt(env.OTC_CLEANUP_INTERVAL, 10),
    diagnosticLogInterval: parseInt(env.OTC_DIAGNOSTIC_LOG_INTERVAL, 10),
  },

  websocket: {
    pingInterval: parseInt(env.WS_PING_INTERVAL, 10),
    reconnectInterval: parseInt(env.WS_RECONNECT_INTERVAL, 10),
    maxHistoryLength: parseInt(env.WS_MAX_HISTORY_LENGTH, 10),
  },

  tradeSettlement: {
    checkInterval: parseInt(env.TRADE_SETTLEMENT_CHECK_INTERVAL, 10),
    maxRetries: parseInt(env.TRADE_SETTLEMENT_MAX_RETRIES, 10),
  },
};
