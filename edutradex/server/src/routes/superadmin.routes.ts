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
} from '../validators/superadmin.validators.js';

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

export default router;
