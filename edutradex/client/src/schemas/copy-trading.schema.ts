import { z } from 'zod';

export const copyModeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
export const leaderStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']);

export const becomeLeaderSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters').max(50),
  description: z.string().max(500).optional(),
});

export const updateLeaderProfileSchema = z.object({
  displayName: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export const followLeaderSchema = z.object({
  copyMode: copyModeEnum,
  copyAmount: z.number().positive().optional(),
  copyPercentage: z.number().min(1).max(100).optional(),
  maxDailyAmount: z.number().positive().optional(),
  maxTradesPerDay: z.number().int().positive().optional(),
});

export const updateFollowSettingsSchema = z.object({
  copyMode: copyModeEnum.optional(),
  copyAmount: z.number().positive().optional(),
  copyPercentage: z.number().min(1).max(100).optional(),
  maxDailyAmount: z.number().positive().optional(),
  maxTradesPerDay: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const discoverLeadersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['winRate', 'totalProfit', 'followersCount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  minWinRate: z.coerce.number().min(0).max(100).optional(),
  minTrades: z.coerce.number().int().min(0).optional(),
});

export type CopyMode = z.infer<typeof copyModeEnum>;
export type LeaderStatus = z.infer<typeof leaderStatusEnum>;
export type BecomeLeaderInput = z.infer<typeof becomeLeaderSchema>;
export type UpdateLeaderProfileInput = z.infer<typeof updateLeaderProfileSchema>;
export type FollowLeaderInput = z.infer<typeof followLeaderSchema>;
export type UpdateFollowSettingsInput = z.infer<typeof updateFollowSettingsSchema>;
export type DiscoverLeadersQuery = z.infer<typeof discoverLeadersQuerySchema>;
