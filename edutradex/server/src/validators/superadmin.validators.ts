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

// ============= Financial Management Schemas =============

export const financialSummaryQuerySchema = z.object({
  forceRefresh: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export const dailySnapshotQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  from: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  to: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dailySnapshotDateParamSchema = z.object({
  params: z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  }),
});

export const monthlyReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export const monthlyReportParamSchema = z.object({
  params: z.object({
    year: z.coerce.number().int().min(2020).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  }),
});

export const setOperatingCostsSchema = z.object({
  operatingCosts: z.number().min(0),
});

export const generateDailySnapshotSchema = z.object({
  date: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
});

export const generateMonthlyReportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const backfillSnapshotsSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format',
  }),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
});

export const financialAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  actionType: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  endDate: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
});

export const topMetricsQuerySchema = z.object({
  from: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid from date format',
  }),
  to: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid to date format',
  }),
});

// User Type Management Schemas

const userTypeEnum = z.enum(['REAL', 'TEST', 'DEMO_ONLY', 'AFFILIATE_TEST']);

export const usersByTypeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  userType: userTypeEnum,
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export const updateUserTypeSchema = z.object({
  userType: userTypeEnum,
});

export const bulkUpdateUserTypesSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  userType: userTypeEnum,
});

// ============= Type Exports =============

export type GetAdminsQuery = z.infer<typeof getAdminsQuerySchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
export type DailySnapshotQuery = z.infer<typeof dailySnapshotQuerySchema>;
export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
export type FinancialAuditLogsQuery = z.infer<typeof financialAuditLogsQuerySchema>;
export type UsersByTypeQuery = z.infer<typeof usersByTypeQuerySchema>;
export type UpdateUserTypeInput = z.infer<typeof updateUserTypeSchema>;
export type BulkUpdateUserTypesInput = z.infer<typeof bulkUpdateUserTypesSchema>;
