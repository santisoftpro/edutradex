import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid ID format');

export const idParamsSchema = z.object({
  id: uuidSchema,
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const searchQuerySchema = z.object({
  search: z.string().optional(),
  ...paginationQuerySchema.shape,
});

export type IdParams = z.infer<typeof idParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
