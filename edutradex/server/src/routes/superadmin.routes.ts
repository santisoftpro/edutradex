import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, superAdminMiddleware } from '../middleware/auth.middleware.js';
import {
  requirePasswordMiddleware,
  validateSuperAdminSession,
  superAdminSensitiveRateLimiter,
} from '../middleware/superadmin-auth.middleware.js';
import { superAdminService, SuperAdminServiceError } from '../services/superadmin/superadmin.service.js';
import { auditService } from '../services/audit/audit.service.js';
import {
  getAdminsQuerySchema,
  adminIdParamSchema,
  createAdminSchema,
  updateAdminSchema,
  sessionIdParamSchema,
  auditLogsQuerySchema,
} from '../validators/superadmin.validators.js';

const router = Router();

// All routes require authentication and SuperAdmin role
router.use(authMiddleware);
router.use(superAdminMiddleware);
router.use(validateSuperAdminSession); // Validate session is still active

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

export default router;
