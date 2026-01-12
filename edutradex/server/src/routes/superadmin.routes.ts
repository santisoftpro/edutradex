import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import {
  requirePasswordMiddleware,
  validateSuperAdminSession,
  superAdminSensitiveRateLimiter,
} from '../middleware/superadmin-auth.middleware.js';
import { superAdminService, SuperAdminServiceError } from '../services/superadmin/superadmin.service.js';
import { auditService } from '../services/audit/audit.service.js';
import { brokerFinancialService, BrokerFinancialServiceError } from '../services/financial/index.js';
import { brokerAnalyticsService } from '../services/financial/broker-analytics.service.js';
import { pdfExportService } from '../services/financial/pdf-export.service.js';
import { financialScheduler } from '../services/scheduler/financial.scheduler.js';
import {
  getAdminsQuerySchema,
  adminIdParamSchema,
  createAdminSchema,
  updateAdminSchema,
  sessionIdParamSchema,
  auditLogsQuerySchema,
  financialSummaryQuerySchema,
  dailySnapshotQuerySchema,
  dailySnapshotDateParamSchema,
  monthlyReportQuerySchema,
  monthlyReportParamSchema,
  setOperatingCostsSchema,
  generateDailySnapshotSchema,
  generateMonthlyReportSchema,
  backfillSnapshotsSchema,
  financialAuditLogsQuerySchema,
  topMetricsQuerySchema,
  usersByTypeQuerySchema,
  userIdParamSchema,
  updateUserTypeSchema,
  bulkUpdateUserTypesSchema,
  dateRangeQuerySchema,
  monthYearQuerySchema,
  cohortQuerySchema,
  forecastQuerySchema,
  monteCarloQuerySchema,
  symbolLimitQuerySchema,
  dateParamSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseEntrySchema,
  updateExpenseEntrySchema,
  expenseIdParamSchema,
  categoryIdParamSchema,
  expenseQuerySchema,
  setExpenseBudgetSchema,
  setGoalTargetsSchema,
} from '../validators/superadmin.validators.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// All routes require authentication and Admin role (both ADMIN and SUPERADMIN can access)
router.use(authMiddleware);
router.use(adminMiddleware);
router.use(validateSuperAdminSession);

// ============= Dashboard Stats =============

router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await superAdminService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Admin Management =============

// Get all admins
router.get(
  '/admins',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = getAdminsQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await superAdminService.getAllAdmins(parsed.data);

      res.json({
        success: true,
        data: result.admins,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get admin detail
router.get(
  '/admins/:adminId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: parsed.error.issues,
        });
        return;
      }

      const admin = await superAdminService.getAdminDetail(parsed.data.params.adminId);

      res.json({
        success: true,
        data: admin,
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Create new admin (requires password confirmation)
router.post(
  '/admins',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createAdminSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await superAdminService.createAdmin(
        parsed.data,
        req.userId!,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: {
          admin: result.admin,
          tempPassword: result.tempPassword, // Only shown once if auto-generated
        },
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Update admin
router.patch(
  '/admins/:adminId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramsParsed = adminIdParamSchema.safeParse({ params: req.params });
      const bodyParsed = updateAdminSchema.safeParse(req.body);

      if (!paramsParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: paramsParsed.error.issues,
        });
        return;
      }

      if (!bodyParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: bodyParsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const admin = await superAdminService.updateAdmin(
        paramsParsed.data.params.adminId,
        bodyParsed.data,
        req.userId!,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Admin updated successfully',
        data: admin,
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Reset admin password (requires password confirmation)
router.post(
  '/admins/:adminId/reset-password',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: parsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const tempPassword = await superAdminService.resetAdminPassword(
        parsed.data.params.adminId,
        req.userId!,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Password reset successfully',
        data: {
          tempPassword, // Only shown once
        },
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Activate admin
router.post(
  '/admins/:adminId/activate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: parsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const admin = await superAdminService.activateAdmin(
        parsed.data.params.adminId,
        req.userId!,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Admin activated successfully',
        data: admin,
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Deactivate admin (requires password confirmation)
router.post(
  '/admins/:adminId/deactivate',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: parsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const admin = await superAdminService.deactivateAdmin(
        parsed.data.params.adminId,
        req.userId!,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Admin deactivated successfully',
        data: admin,
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Delete admin (requires password confirmation)
router.delete(
  '/admins/:adminId',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: parsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      await superAdminService.deleteAdmin(
        parsed.data.params.adminId,
        req.userId!,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Admin deleted successfully',
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// ============= Session Management =============

// Get admin sessions
router.get(
  '/admins/:adminId/sessions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = adminIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid admin ID',
          details: parsed.error.issues,
        });
        return;
      }

      const sessions = await superAdminService.getAdminSessions(parsed.data.params.adminId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Terminate session
router.delete(
  '/sessions/:sessionId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = sessionIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid session ID',
          details: parsed.error.issues,
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      await superAdminService.terminateSession(
        parsed.data.params.sessionId,
        req.userId!,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Session terminated successfully',
      });
    } catch (error) {
      if (error instanceof SuperAdminServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// ============= Audit Logs =============

// Get audit logs
router.get(
  '/audit-logs',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = auditLogsQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await auditService.getActivityLogs(parsed.data);

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get audit logs summary
router.get(
  '/audit-logs/summary',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await auditService.getActivitySummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Export audit logs to CSV
router.get(
  '/audit-logs/export',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = auditLogsQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const csvContent = await auditService.exportLogs(parsed.data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

// ============= Financial Management =============

// Get financial summary (dashboard overview)
router.get(
  '/financial/summary',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await brokerFinancialService.getFinancialSummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get real-time metrics
router.get(
  '/financial/realtime',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await brokerFinancialService.updateRealTimeMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get daily snapshots (with date range and pagination)
router.get(
  '/financial/daily',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dailySnapshotQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const { from, to, page, limit, sortOrder } = parsed.data;

      // Default date range: last 30 days
      const endDate = to || new Date();
      const startDate = from || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const snapshots = await brokerFinancialService.getDailySnapshots({
        start: startDate,
        end: endDate,
      });

      // Sort and paginate
      const sorted = sortOrder === 'desc' ? snapshots.reverse() : snapshots;
      const offset = (page - 1) * limit;
      const paginated = sorted.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          page,
          limit,
          total: snapshots.length,
          totalPages: Math.ceil(snapshots.length / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single daily snapshot
router.get(
  '/financial/daily/:date',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dailySnapshotDateParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format',
          details: parsed.error.issues,
        });
        return;
      }

      const snapshotDate = new Date(parsed.data.params.date);
      snapshotDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(snapshotDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const snapshots = await brokerFinancialService.getDailySnapshots({
        start: snapshotDate,
        end: nextDay,
      });

      if (snapshots.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No snapshot found for this date',
        });
        return;
      }

      res.json({
        success: true,
        data: snapshots[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set operating costs for a daily snapshot (requires password)
router.post(
  '/financial/daily/:date/costs',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramsParsed = dailySnapshotDateParamSchema.safeParse({ params: req.params });
      const bodyParsed = setOperatingCostsSchema.safeParse(req.body);

      if (!paramsParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format',
          details: paramsParsed.error.issues,
        });
        return;
      }

      if (!bodyParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: bodyParsed.error.issues,
        });
        return;
      }

      const snapshotDate = new Date(paramsParsed.data.params.date);
      const snapshot = await brokerFinancialService.setOperatingCosts(
        snapshotDate,
        bodyParsed.data.operatingCosts,
        req.userId
      );

      res.json({
        success: true,
        message: 'Operating costs updated successfully',
        data: snapshot,
      });
    } catch (error) {
      if (error instanceof BrokerFinancialServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Get monthly reports for a year
router.get(
  '/financial/monthly',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthlyReportQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const year = parsed.data.year || new Date().getFullYear();
      const reports = await brokerFinancialService.getMonthlyReports(year);

      res.json({
        success: true,
        data: reports,
        year,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single monthly report
router.get(
  '/financial/monthly/:year/:month',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthlyReportParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid year/month format',
          details: parsed.error.issues,
        });
        return;
      }

      const { year, month } = parsed.data.params;
      const reports = await brokerFinancialService.getMonthlyReports(year);
      const report = reports.find((r) => r.month === month);

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'No report found for this month',
        });
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger daily snapshot generation
router.post(
  '/financial/generate/daily',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = generateDailySnapshotSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const date = parsed.data.date || new Date();
      await financialScheduler.triggerDailySnapshot(date);

      res.json({
        success: true,
        message: 'Daily snapshot generation triggered',
        date: date.toISOString().split('T')[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger monthly report generation
router.post(
  '/financial/generate/monthly',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = generateMonthlyReportSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const { month, year } = parsed.data;
      await financialScheduler.triggerMonthlyReport(month, year);

      res.json({
        success: true,
        message: 'Monthly report generation triggered',
        month,
        year,
      });
    } catch (error) {
      if (error instanceof BrokerFinancialServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Backfill historical snapshots
router.post(
  '/financial/backfill',
  superAdminSensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = backfillSnapshotsSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const { startDate, endDate } = parsed.data;
      const result = await financialScheduler.backfillSnapshots(
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        message: 'Backfill completed',
        generated: result.generated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get financial audit logs
router.get(
  '/financial/audit-logs',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = financialAuditLogsQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerFinancialService.getAuditLogs(parsed.data);

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get top metrics for a date range
router.get(
  '/financial/top-metrics',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = topMetricsQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const { from, to } = parsed.data;
      const metrics = await brokerFinancialService.getTopMetrics({
        start: new Date(from),
        end: new Date(to),
      });

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get financial scheduler status
router.get(
  '/financial/scheduler-status',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = financialScheduler.getStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Analytics & Charts =============

// Get revenue trend for charts
router.get(
  '/financial/analytics/revenue-trend',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trend = await brokerFinancialService.getRevenueTrend(days);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get top depositors
router.get(
  '/financial/analytics/top-depositors',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const depositors = await brokerFinancialService.getTopDepositors(limit);

      res.json({
        success: true,
        data: depositors,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get top traders
router.get(
  '/financial/analytics/top-traders',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const traders = await brokerFinancialService.getTopTraders(limit);

      res.json({
        success: true,
        data: traders,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Compare date ranges
router.post(
  '/financial/analytics/compare',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { range1Start, range1End, range2Start, range2End } = req.body;

      if (!range1Start || !range1End || !range2Start || !range2End) {
        res.status(400).json({
          success: false,
          error: 'All date range parameters are required',
        });
        return;
      }

      const comparison = await brokerFinancialService.compareDateRanges(
        new Date(range1Start),
        new Date(range1End),
        new Date(range2Start),
        new Date(range2End)
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get advanced analytics
router.get(
  '/financial/analytics/advanced',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analytics = await brokerFinancialService.getAdvancedAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get budget targets
router.get(
  '/financial/budget-targets',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targets = await brokerFinancialService.getBudgetTargets();

      res.json({
        success: true,
        data: targets || {
          monthlyRevenueTarget: 0,
          monthlyProfitTarget: 0,
          dailyVolumeTarget: 0,
          newUsersTarget: 0,
          depositsTarget: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set budget targets
router.post(
  '/financial/budget-targets',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { monthlyRevenueTarget, monthlyProfitTarget, dailyVolumeTarget, newUsersTarget, depositsTarget } = req.body;

      await brokerFinancialService.setBudgetTargets(
        { monthlyRevenueTarget, monthlyProfitTarget, dailyVolumeTarget, newUsersTarget, depositsTarget },
        req.userId
      );

      res.json({
        success: true,
        message: 'Budget targets updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get alert thresholds
router.get(
  '/financial/alert-thresholds',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const thresholds = await brokerFinancialService.getAlertThresholds();

      res.json({
        success: true,
        data: thresholds,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set alert thresholds
router.post(
  '/financial/alert-thresholds',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { exposureAlertThreshold, dailyLossLimit, lowBalanceAlert, highVolumeAlert } = req.body;

      await brokerFinancialService.setAlertThresholds(
        { exposureAlertThreshold, dailyLossLimit, lowBalanceAlert, highVolumeAlert },
        req.userId
      );

      res.json({
        success: true,
        message: 'Alert thresholds updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= User Type Management =============

// Get users by type
router.get(
  '/users/by-type',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = usersByTypeQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const { userType, page, limit, search } = parsed.data;
      const result = await brokerFinancialService.getUsersByType(userType, {
        page,
        limit,
        search,
      });

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user type (requires password confirmation)
router.patch(
  '/users/:userId/type',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramsParsed = userIdParamSchema.safeParse({ params: req.params });
      const bodyParsed = updateUserTypeSchema.safeParse(req.body);

      if (!paramsParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          details: paramsParsed.error.issues,
        });
        return;
      }

      if (!bodyParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: bodyParsed.error.issues,
        });
        return;
      }

      const result = await brokerFinancialService.updateUserType(
        paramsParsed.data.params.userId,
        bodyParsed.data.userType,
        req.userId
      );

      res.json({
        success: true,
        message: 'User type updated successfully',
        previousType: result.previousType,
        newType: bodyParsed.data.userType,
      });
    } catch (error) {
      if (error instanceof BrokerFinancialServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
);

// Bulk update user types (requires password confirmation)
router.post(
  '/users/bulk-type',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = bulkUpdateUserTypesSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerFinancialService.bulkUpdateUserTypes(
        parsed.data.userIds,
        parsed.data.userType,
        req.userId
      );

      res.json({
        success: true,
        message: 'User types updated successfully',
        updated: result.updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Preview demo-only classification (see which users would be classified)
router.get(
  '/users/demo-only/preview',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await brokerFinancialService.previewDemoOnlyClassification();
      res.json({
        success: true,
        count: result.count,
        users: result.users,
        message: `${result.count} user(s) would be classified as DEMO_ONLY`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Auto-classify demo-only users (requires password confirmation)
router.post(
  '/users/demo-only/classify',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await brokerFinancialService.autoClassifyDemoOnlyUsers(req.userId);
      res.json({
        success: true,
        classified: result.classified,
        userIds: result.userIds,
        message: `${result.classified} user(s) have been classified as DEMO_ONLY`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Professional Financial Analytics =============

// Get executive summary
router.get(
  '/financial/executive-summary',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const today = new Date();
      const [healthScore, breakEven, runway, keyRatios] = await Promise.all([
        brokerAnalyticsService.calculateHealthScore(today),
        brokerAnalyticsService.calculateBreakEven(today.getMonth() + 1, today.getFullYear()),
        brokerAnalyticsService.calculateRunway(),
        brokerAnalyticsService.calculateKeyRatios({
          start: new Date(today.getFullYear(), today.getMonth(), 1),
          end: today,
        }),
      ]);

      res.json({
        success: true,
        data: {
          healthScore,
          breakEven,
          runway,
          keyRatios,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get health score
router.get(
  '/financial/health-score',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const healthScore = await brokerAnalyticsService.calculateHealthScore(date);

      res.json({
        success: true,
        data: healthScore,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get break-even tracking
router.get(
  '/financial/break-even',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthYearQuerySchema.safeParse(req.query);
      const month = parsed.success ? parsed.data.month : new Date().getMonth() + 1;
      const year = parsed.success ? parsed.data.year : new Date().getFullYear();

      const breakEven = await brokerAnalyticsService.calculateBreakEven(month, year);

      res.json({
        success: true,
        data: breakEven,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get runway calculation
router.get(
  '/financial/runway',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const runway = await brokerAnalyticsService.calculateRunway();

      res.json({
        success: true,
        data: runway,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get key financial ratios
router.get(
  '/financial/key-ratios',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dateRangeQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        // Default to current month
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const keyRatios = await brokerAnalyticsService.calculateKeyRatios({ start, end: today });

        res.json({
          success: true,
          data: keyRatios,
        });
        return;
      }

      const keyRatios = await brokerAnalyticsService.calculateKeyRatios({
        start: new Date(parsed.data.from),
        end: new Date(parsed.data.to),
      });

      res.json({
        success: true,
        data: keyRatios,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Revenue Breakdown =============

// Get revenue by market type
router.get(
  '/financial/revenue/by-market',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dateRangeQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerAnalyticsService.getRevenueByMarket({
        start: new Date(parsed.data.from),
        end: new Date(parsed.data.to),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get revenue by symbol
router.get(
  '/financial/revenue/by-symbol',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = symbolLimitQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerAnalyticsService.getRevenueBySymbol(
        {
          start: new Date(parsed.data.from),
          end: new Date(parsed.data.to),
        },
        parsed.data.limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get P&L statement
router.get(
  '/financial/pl-statement',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dateRangeQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerAnalyticsService.generatePLStatement({
        start: new Date(parsed.data.from),
        end: new Date(parsed.data.to),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Cohort Analysis =============

// Get cohort analysis
router.get(
  '/financial/cohorts',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = cohortQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerAnalyticsService.getCohortAnalysis(parsed.data);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Trigger cohort update
router.post(
  '/financial/cohorts/update',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await brokerAnalyticsService.updateUserCohorts();

      res.json({
        success: true,
        message: 'Cohort data updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Churn Analysis =============

// Get churn metrics
router.get(
  '/financial/churn',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthYearQuerySchema.safeParse(req.query);
      const month = parsed.success ? parsed.data.month : new Date().getMonth() + 1;
      const year = parsed.success ? parsed.data.year : new Date().getFullYear();

      const result = await brokerAnalyticsService.calculateChurnMetrics(month, year);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Seasonal Patterns =============

// Get seasonal patterns
router.get(
  '/financial/seasonal-patterns',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await brokerAnalyticsService.getSeasonalPatterns();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Forecasting =============

// Get revenue forecast
router.get(
  '/financial/forecast',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = forecastQuerySchema.safeParse(req.query);
      const daysAhead = parsed.success ? parsed.data.daysAhead : 30;

      const result = await brokerAnalyticsService.generateForecast(daysAhead);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Run Monte Carlo simulation
router.get(
  '/financial/monte-carlo',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monteCarloQuerySchema.safeParse(req.query);
      const daysAhead = parsed.success ? parsed.data.daysAhead : 30;
      const iterations = parsed.success ? parsed.data.iterations : 1000;

      const result = await brokerAnalyticsService.runMonteCarloSimulation(daysAhead, iterations);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Goal Progress =============

// Get goal progress
router.get(
  '/financial/goal-progress',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthYearQuerySchema.safeParse(req.query);
      const month = parsed.success ? parsed.data.month : new Date().getMonth() + 1;
      const year = parsed.success ? parsed.data.year : new Date().getFullYear();

      const result = await brokerAnalyticsService.getGoalProgress(month, year);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set goal targets
router.post(
  '/financial/goal-targets',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = setGoalTargetsSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const { month, year, ...targets } = parsed.data;

      await prisma.goalProgress.upsert({
        where: { month_year: { month, year } },
        create: {
          month,
          year,
          revenueTarget: targets.revenueTarget || 0,
          profitTarget: targets.profitTarget || 0,
          volumeTarget: targets.volumeTarget || 0,
          newUsersTarget: targets.newUsersTarget || 0,
          depositsTarget: targets.depositsTarget || 0,
        },
        update: {
          ...(targets.revenueTarget !== undefined && { revenueTarget: targets.revenueTarget }),
          ...(targets.profitTarget !== undefined && { profitTarget: targets.profitTarget }),
          ...(targets.volumeTarget !== undefined && { volumeTarget: targets.volumeTarget }),
          ...(targets.newUsersTarget !== undefined && { newUsersTarget: targets.newUsersTarget }),
          ...(targets.depositsTarget !== undefined && { depositsTarget: targets.depositsTarget }),
        },
      });

      res.json({
        success: true,
        message: 'Goal targets updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Concentration Risk =============

// Get concentration risk
router.get(
  '/financial/concentration-risk',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const result = await brokerAnalyticsService.getConcentrationRisk(date);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Cash Flow =============

// Get cash flow statement
router.get(
  '/financial/cash-flow',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthYearQuerySchema.safeParse(req.query);
      const month = parsed.success ? parsed.data.month : new Date().getMonth() + 1;
      const year = parsed.success ? parsed.data.year : new Date().getFullYear();

      const result = await brokerAnalyticsService.generateCashFlowStatement(month, year);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Expense Management =============

// Get expense categories
router.get(
  '/financial/expenses/categories',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await prisma.expenseCategory.findMany({
        where: { isActive: true },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      // Filter to only get top-level categories
      const topLevel = categories.filter(c => c.parentId === null);

      res.json({
        success: true,
        data: topLevel,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create expense category
router.post(
  '/financial/expenses/categories',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createExpenseCategorySchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const category = await prisma.expenseCategory.create({
        data: parsed.data,
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update expense category
router.patch(
  '/financial/expenses/categories/:categoryId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramsParsed = categoryIdParamSchema.safeParse({ params: req.params });
      const bodyParsed = updateExpenseCategorySchema.safeParse(req.body);

      if (!paramsParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid category ID',
          details: paramsParsed.error.issues,
        });
        return;
      }

      if (!bodyParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: bodyParsed.error.issues,
        });
        return;
      }

      const category = await prisma.expenseCategory.update({
        where: { id: paramsParsed.data.params.categoryId },
        data: bodyParsed.data,
      });

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Seed default expense categories
router.post(
  '/financial/expenses/categories/seed',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await brokerAnalyticsService.seedDefaultExpenseCategories();

      res.json({
        success: true,
        message: 'Default expense categories seeded successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get expense entries
router.get(
  '/financial/expenses',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = expenseQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const { page, limit, categoryId, from, to, isRecurring } = parsed.data;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (categoryId) where.categoryId = categoryId;
      if (from) where.date = { ...(where.date as object || {}), gte: from };
      if (to) where.date = { ...(where.date as object || {}), lte: to };
      if (isRecurring !== undefined) where.isRecurring = isRecurring;

      const [expenses, total] = await Promise.all([
        prisma.expenseEntry.findMany({
          where,
          include: { category: true },
          orderBy: { date: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.expenseEntry.count({ where }),
      ]);

      res.json({
        success: true,
        data: expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create expense entry
router.post(
  '/financial/expenses',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createExpenseEntrySchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const expense = await prisma.expenseEntry.create({
        data: {
          ...parsed.data,
          date: new Date(parsed.data.date),
          createdBy: req.userId,
        },
        include: { category: true },
      });

      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update expense entry
router.patch(
  '/financial/expenses/:expenseId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramsParsed = expenseIdParamSchema.safeParse({ params: req.params });
      const bodyParsed = updateExpenseEntrySchema.safeParse(req.body);

      if (!paramsParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid expense ID',
          details: paramsParsed.error.issues,
        });
        return;
      }

      if (!bodyParsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: bodyParsed.error.issues,
        });
        return;
      }

      const updateData: Record<string, unknown> = { ...bodyParsed.data };
      if (bodyParsed.data.date) {
        updateData.date = new Date(bodyParsed.data.date);
      }

      const expense = await prisma.expenseEntry.update({
        where: { id: paramsParsed.data.params.expenseId },
        data: updateData,
        include: { category: true },
      });

      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete expense entry
router.delete(
  '/financial/expenses/:expenseId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = expenseIdParamSchema.safeParse({ params: req.params });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid expense ID',
          details: parsed.error.issues,
        });
        return;
      }

      await prisma.expenseEntry.delete({
        where: { id: parsed.data.params.expenseId },
      });

      res.json({
        success: true,
        message: 'Expense entry deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get expense analysis
router.get(
  '/financial/expenses/analysis',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = dateRangeQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await brokerAnalyticsService.getExpenseAnalysis({
        start: new Date(parsed.data.from),
        end: new Date(parsed.data.to),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get expense budgets
router.get(
  '/financial/expenses/budgets',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = monthYearQuerySchema.safeParse(req.query);
      const month = parsed.success ? parsed.data.month : new Date().getMonth() + 1;
      const year = parsed.success ? parsed.data.year : new Date().getFullYear();

      const budgets = await prisma.expenseBudget.findMany({
        where: { month, year },
        include: { category: true },
      });

      res.json({
        success: true,
        data: budgets,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set expense budget
router.post(
  '/financial/expenses/budgets',
  superAdminSensitiveRateLimiter,
  requirePasswordMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = setExpenseBudgetSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        });
        return;
      }

      const { categoryId, month, year, budgetAmount } = parsed.data;

      const budget = await prisma.expenseBudget.upsert({
        where: {
          categoryId_month_year: { categoryId, month, year },
        },
        create: {
          categoryId,
          month,
          year,
          budgetAmount,
        },
        update: {
          budgetAmount,
        },
        include: { category: true },
      });

      res.json({
        success: true,
        data: budget,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= Revenue Breakdown Update (Scheduler) =============

// Trigger revenue breakdown update
router.post(
  '/financial/revenue/update',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      await brokerAnalyticsService.updateRevenueBreakdown(date);

      res.json({
        success: true,
        message: 'Revenue breakdown updated successfully',
        date: date.toISOString().split('T')[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= PDF Export =============

// Export Executive Summary as PDF
router.get(
  '/financial/export/pdf/executive-summary',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Create date range for this month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      const dateRange = { start: startOfMonth, end: endOfMonth };

      // Gather all data for executive summary
      const [healthScore, breakEven, runway, keyRatios] = await Promise.all([
        brokerAnalyticsService.calculateHealthScore(now),
        brokerAnalyticsService.calculateBreakEven(month, year),
        brokerAnalyticsService.calculateRunway(),
        brokerAnalyticsService.calculateKeyRatios(dateRange),
      ]);

      const pdfData = {
        healthScore,
        breakEven,
        runway,
        keyRatios,
      };

      const pdfBuffer = await pdfExportService.generateExecutiveSummaryPDF(pdfData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="executive-summary-${year}-${String(month).padStart(2, '0')}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

// Export P&L Statement as PDF
router.get(
  '/financial/export/pdf/pl-statement',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
      const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

      // Create date range for the specified month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      const dateRange = { start: startOfMonth, end: endOfMonth };

      const plStatement = await brokerAnalyticsService.generatePLStatement(dateRange);

      const pdfBuffer = await pdfExportService.generatePLStatementPDF(plStatement);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="pl-statement-${year}-${String(month).padStart(2, '0')}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
