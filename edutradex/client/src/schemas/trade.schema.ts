import { z } from 'zod';

export const tradeDirectionEnum = z.enum(['UP', 'DOWN']);
export const marketTypeEnum = z.enum(['FOREX', 'CRYPTO', 'STOCKS', 'INDICES', 'OTC']);

export const placeTradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  direction: tradeDirectionEnum,
  amount: z.number().positive('Amount must be positive').min(1, 'Minimum trade is $1'),
  duration: z.number().int().positive('Duration must be a positive integer'),
  entryPrice: z.number().positive('Entry price must be positive'),
  marketType: marketTypeEnum.optional(),
});

export const getTradesQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'WON', 'LOST', 'DRAW']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Dynamic trade validation - creates schema based on balance
export function createTradeSchema(balance: number, minAmount: number = 1, maxAmount: number = 100000) {
  const effectiveMax = Math.min(maxAmount, balance);

  return z.object({
    amount: z.number()
      .min(minAmount, `Minimum trade is $${minAmount}`)
      .max(effectiveMax, balance < minAmount
        ? 'Insufficient balance'
        : `Maximum trade is $${effectiveMax.toFixed(2)}`),
    duration: z.number()
      .int('Duration must be a whole number')
      .min(5, 'Minimum duration is 5 seconds')
      .max(86400, 'Maximum duration is 24 hours'),
  });
}

// Validation function for quick use
export function validateTrade(
  amount: number,
  duration: number,
  balance: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }
  if (duration < 5) {
    return { valid: false, error: 'Minimum duration is 5 seconds' };
  }
  if (duration > 86400) {
    return { valid: false, error: 'Maximum duration is 24 hours' };
  }
  return { valid: true };
}

export type TradeDirection = z.infer<typeof tradeDirectionEnum>;
export type MarketType = z.infer<typeof marketTypeEnum>;
export type PlaceTradeInput = z.infer<typeof placeTradeSchema>;
export type GetTradesQuery = z.infer<typeof getTradesQuerySchema>;
