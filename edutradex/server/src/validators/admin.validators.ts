import { z } from 'zod';

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'demoBalance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const resetUserBalanceSchema = z.object({
  newBalance: z.number().min(0).optional(),
});

export const updateMarketConfigSchema = z.object({
  isActive: z.boolean().optional(),
  payoutPercent: z.number().min(50).max(100).optional(),
  minTradeAmount: z.number().min(0.01).optional(),
  maxTradeAmount: z.number().min(1).optional(),
  volatilityMode: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const setSystemSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(10000),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ResetUserBalanceInput = z.infer<typeof resetUserBalanceSchema>;
export type UpdateMarketConfigInput = z.infer<typeof updateMarketConfigSchema>;
export type SetSystemSettingInput = z.infer<typeof setSystemSettingSchema>;
