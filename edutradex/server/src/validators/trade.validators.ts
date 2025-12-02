import { z } from 'zod';

export const placeTradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  direction: z.enum(['UP', 'DOWN']),
  amount: z.number().positive('Amount must be positive'),
  duration: z.number().int().positive('Duration must be a positive integer'),
  entryPrice: z.number().positive('Entry price must be positive'),
  marketType: z.enum(['forex', 'otc']),
});

export const getTradesQuerySchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .refine((val) => val >= 0, 'Offset must be non-negative'),
});

export type PlaceTradeInput = z.infer<typeof placeTradeSchema>;
export type GetTradesQuery = z.infer<typeof getTradesQuerySchema>;
