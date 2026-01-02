import { z } from 'zod';

/**
 * Profile Validators
 *
 * Zod schemas for profile-related endpoints
 */

export const deviceIdParamsSchema = z.object({
  deviceId: z.string().uuid('Invalid device ID format'),
});

export const loginHistoryQuerySchema = z.object({
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  offset: z.coerce
    .number()
    .min(0, 'Offset cannot be negative')
    .optional()
    .default(0),
});
