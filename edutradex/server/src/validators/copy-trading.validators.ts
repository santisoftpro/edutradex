import { z } from 'zod';

// Body schemas
export const becomeLeaderBodySchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

export const updateLeaderProfileBodySchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  isPublic: z.boolean().optional(),
});

export const followLeaderBodySchema = z.object({
  copyMode: z.enum(['AUTOMATIC', 'MANUAL'], {
    message: 'Copy mode must be AUTOMATIC or MANUAL',
  }),
  fixedAmount: z.coerce
    .number()
    .positive('Fixed amount must be positive')
    .min(1, 'Minimum amount is $1')
    .max(10000, 'Maximum amount is $10,000'),
  maxDailyTrades: z.coerce
    .number()
    .int()
    .positive()
    .min(1, 'Minimum is 1 trade per day')
    .max(500, 'Maximum is 500 trades per day')
    .optional()
    .default(50),
});

export const updateFollowSettingsBodySchema = z.object({
  copyMode: z
    .enum(['AUTOMATIC', 'MANUAL'], {
      message: 'Copy mode must be AUTOMATIC or MANUAL',
    })
    .optional(),
  fixedAmount: z.coerce
    .number()
    .positive('Fixed amount must be positive')
    .min(1, 'Minimum amount is $1')
    .max(10000, 'Maximum amount is $10,000')
    .optional(),
  maxDailyTrades: z.coerce
    .number()
    .int()
    .positive()
    .min(1, 'Minimum is 1 trade per day')
    .max(500, 'Maximum is 500 trades per day')
    .optional(),
  isActive: z.boolean().optional(),
});

// Params schemas
export const leaderIdParamsSchema = z.object({
  leaderId: z.string().uuid('Invalid leader ID'),
});

export const idParamsSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});

// Query schemas
export const discoverLeadersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
  sortBy: z
    .enum(['winRate', 'totalTrades', 'totalProfit', 'followers'])
    .optional()
    .default('winRate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  minWinRate: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().min(0).max(100).optional()),
  minTrades: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(0).optional()),
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
});

// Admin schemas
export const adminLeaderListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'winRate', 'totalTrades', 'followers'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminLeaderActionBodySchema = z.object({
  adminNote: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const adminUpdateLeaderSettingsBodySchema = z.object({
  maxFollowers: z
    .number()
    .int()
    .positive()
    .min(1, 'Minimum is 1 follower')
    .max(10000, 'Maximum is 10,000 followers')
    .optional(),
  isPublic: z.boolean().optional(),
});

// Combined schemas for admin routes (using manual safeParse pattern)
export const adminLeaderListSchema = z.object({
  query: adminLeaderListQuerySchema,
});

export const adminLeaderIdSchema = z.object({
  params: idParamsSchema,
});

export const adminLeaderActionSchema = z.object({
  params: idParamsSchema,
  body: adminLeaderActionBodySchema,
});

export const adminUpdateLeaderSettingsSchema = z.object({
  params: idParamsSchema,
  body: adminUpdateLeaderSettingsBodySchema,
});

export const adminUpdateLeaderStatsBodySchema = z.object({
  winRate: z.number().min(0).max(100).optional(),
  totalTrades: z.number().int().min(0).optional(),
  winningTrades: z.number().int().min(0).optional(),
  totalProfit: z.number().optional(),
});

export const adminUpdateLeaderStatsSchema = z.object({
  params: idParamsSchema,
  body: adminUpdateLeaderStatsBodySchema,
});

export const adminLeaderFollowersSchema = z.object({
  params: idParamsSchema,
  query: paginationQuerySchema,
});
