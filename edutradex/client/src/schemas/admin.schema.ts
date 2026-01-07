import { z } from 'zod';

export const userRoleEnum = z.enum(['USER', 'ADMIN', 'SUPERADMIN']);
export const sortOrderEnum = z.enum(['asc', 'desc']);

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: userRoleEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'demoBalance']).default('createdAt'),
  sortOrder: sortOrderEnum.default('desc'),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const resetUserBalanceSchema = z.object({
  amount: z.number().min(0).max(1000000),
});

export const updateMarketConfigSchema = z.object({
  isActive: z.boolean().optional(),
  payoutPercent: z.number().min(50).max(100).optional(),
  tradeAmounts: z.array(z.number().positive()).optional(),
  volatilityMode: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const setSystemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export type UserRole = z.infer<typeof userRoleEnum>;
export type SortOrder = z.infer<typeof sortOrderEnum>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ResetUserBalanceInput = z.infer<typeof resetUserBalanceSchema>;
export type UpdateMarketConfigInput = z.infer<typeof updateMarketConfigSchema>;
export type SetSystemSettingInput = z.infer<typeof setSystemSettingSchema>;
