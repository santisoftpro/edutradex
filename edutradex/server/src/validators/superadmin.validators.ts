import { z } from 'zod';

// ============= Admin Management Schemas =============

export const getAdminsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'SUPERADMIN', '']).optional(),
  isActive: z
    .string()
    .transform((val) => (val === '' ? undefined : val === 'true'))
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastLoginAt', 'loginCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminIdParamSchema = z.object({
  params: z.object({
    adminId: z.string().uuid('Invalid admin ID format'),
  }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('Invalid session ID format'),
  }),
});

export const createAdminSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .optional(),
});

export const updateAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
}).refine(data => data.name || data.email, {
  message: 'At least one field (name or email) must be provided',
});

// ============= Audit Log Schemas =============

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  adminId: z.string().uuid().optional(),
  actionType: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  from: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  to: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  search: z.string().optional(),
});

// ============= Type Exports =============

export type GetAdminsQuery = z.infer<typeof getAdminsQuerySchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
