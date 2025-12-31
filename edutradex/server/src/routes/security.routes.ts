import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { query, queryOne, queryMany } from '../config/db.js';
import { securityService } from '../services/security/security.service.js';
import { deviceService } from '../services/security/device.service.js';
import { ipService } from '../services/security/ip.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * GET /api/admin/security/users/:userId/devices
 * Get all devices for a user
 */
router.get(
  '/users/:userId/devices',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const devices = await deviceService.getUserDevices(userId);

      res.json({
        success: true,
        data: { devices },
      });
    } catch (error) {
      logger.error('Failed to get user devices', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get user devices',
      });
    }
  }
);

/**
 * GET /api/admin/security/users/:userId/login-attempts
 * Get login attempts for a user
 */
router.get(
  '/users/:userId/login-attempts',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await query(
        `SELECT * FROM "LoginAttempt"
         WHERE "userId" = $1
         ORDER BY "attemptedAt" DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "LoginAttempt" WHERE "userId" = $1`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          attempts: result?.rows || [],
          total: parseInt(countResult?.count || '0'),
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Failed to get login attempts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get login attempts',
      });
    }
  }
);

/**
 * GET /api/admin/security/users/:userId/alerts
 * Get security alerts for a user
 */
router.get(
  '/users/:userId/alerts',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const status = req.query.status as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      let whereClause = '"userId" = $1';
      const params: (string | number)[] = [userId];

      if (status) {
        whereClause += ' AND status = $2';
        params.push(status);
      }

      const result = await query(
        `SELECT * FROM "SecurityAlert"
         WHERE ${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "SecurityAlert" WHERE ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: {
          alerts: result?.rows || [],
          total: parseInt(countResult?.count || '0'),
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Failed to get security alerts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get security alerts',
      });
    }
  }
);

/**
 * GET /api/admin/security/users/:userId/risk-profile
 * Get risk profile for a user
 */
router.get(
  '/users/:userId/risk-profile',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const profile = await queryOne(
        `SELECT * FROM "UserRiskProfile" WHERE "userId" = $1`,
        [userId]
      );

      const securityStatus = await securityService.getUserSecurityStatus(userId);

      res.json({
        success: true,
        data: {
          profile,
          status: securityStatus,
        },
      });
    } catch (error) {
      logger.error('Failed to get risk profile', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get risk profile',
      });
    }
  }
);

/**
 * POST /api/admin/security/devices/:deviceId/trust
 * Trust a device
 */
router.post(
  '/devices/:deviceId/trust',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;

      await deviceService.trustDevice(deviceId, req.userId!);

      res.json({
        success: true,
        message: 'Device trusted successfully',
      });
    } catch (error) {
      logger.error('Failed to trust device', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to trust device',
      });
    }
  }
);

/**
 * POST /api/admin/security/devices/:deviceId/block
 * Block a device
 */
router.post(
  '/devices/:deviceId/block',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Block reason is required',
        });
        return;
      }

      await deviceService.blockDevice(deviceId, reason);

      res.json({
        success: true,
        message: 'Device blocked successfully',
      });
    } catch (error) {
      logger.error('Failed to block device', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to block device',
      });
    }
  }
);

/**
 * POST /api/admin/security/devices/:deviceId/unblock
 * Unblock a device
 */
router.post(
  '/devices/:deviceId/unblock',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;

      await deviceService.unblockDevice(deviceId);

      res.json({
        success: true,
        message: 'Device unblocked successfully',
      });
    } catch (error) {
      logger.error('Failed to unblock device', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to unblock device',
      });
    }
  }
);

/**
 * POST /api/admin/security/ip/block
 * Block an IP address
 */
router.post(
  '/ip/block',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ip, reason, permanent } = req.body;

      if (!ip || !reason) {
        res.status(400).json({
          success: false,
          error: 'IP address and reason are required',
        });
        return;
      }

      await ipService.blockIp(ip, reason, req.userId!, permanent === true);

      res.json({
        success: true,
        message: `IP ${ip} blocked successfully`,
      });
    } catch (error) {
      logger.error('Failed to block IP', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to block IP',
      });
    }
  }
);

/**
 * POST /api/admin/security/ip/unblock
 * Unblock an IP address
 */
router.post(
  '/ip/unblock',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ip } = req.body;

      if (!ip) {
        res.status(400).json({
          success: false,
          error: 'IP address is required',
        });
        return;
      }

      await ipService.unblockIp(ip);

      res.json({
        success: true,
        message: `IP ${ip} unblocked successfully`,
      });
    } catch (error) {
      logger.error('Failed to unblock IP', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to unblock IP',
      });
    }
  }
);

/**
 * GET /api/admin/security/blocklist
 * Get all blocked IPs and devices
 */
router.get(
  '/blocklist',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const type = req.query.type as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      let whereClause = '("expiresAt" IS NULL OR "expiresAt" > NOW())';
      const params: (string | number)[] = [];

      if (type) {
        whereClause += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      const result = await query(
        `SELECT * FROM "SecurityBlocklist"
         WHERE ${whereClause}
         ORDER BY "createdAt" DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "SecurityBlocklist" WHERE ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: {
          items: result?.rows || [],
          total: parseInt(countResult?.count || '0'),
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Failed to get blocklist', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get blocklist',
      });
    }
  }
);

/**
 * DELETE /api/admin/security/blocklist/:id
 * Remove item from blocklist
 */
router.delete(
  '/blocklist/:id',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await query(
        `DELETE FROM "SecurityBlocklist" WHERE id = $1`,
        [id]
      );

      res.json({
        success: true,
        message: 'Item removed from blocklist',
      });
    } catch (error) {
      logger.error('Failed to remove from blocklist', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to remove from blocklist',
      });
    }
  }
);

/**
 * PATCH /api/admin/security/alerts/:alertId/acknowledge
 * Acknowledge a security alert
 */
router.patch(
  '/alerts/:alertId/acknowledge',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const { notes } = req.body;

      await query(
        `UPDATE "SecurityAlert"
         SET status = 'ACKNOWLEDGED', "acknowledgedBy" = $1, "acknowledgedAt" = NOW(),
             "adminNotes" = $2
         WHERE id = $3`,
        [req.userId, notes, alertId]
      );

      res.json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error) {
      logger.error('Failed to acknowledge alert', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
      });
    }
  }
);

/**
 * PATCH /api/admin/security/alerts/:alertId/resolve
 * Resolve a security alert
 */
router.patch(
  '/alerts/:alertId/resolve',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const { resolution, notes } = req.body;

      await query(
        `UPDATE "SecurityAlert"
         SET status = 'RESOLVED', "resolvedBy" = $1, "resolvedAt" = NOW(),
             resolution = $2, "adminNotes" = $3
         WHERE id = $4`,
        [req.userId, resolution, notes, alertId]
      );

      res.json({
        success: true,
        message: 'Alert resolved',
      });
    } catch (error) {
      logger.error('Failed to resolve alert', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert',
      });
    }
  }
);

/**
 * POST /api/admin/security/users/:userId/unlock
 * Unlock a user account
 */
router.post(
  '/users/:userId/unlock',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      await query(
        `UPDATE "User"
         SET "lockedUntil" = NULL, "lockReason" = NULL, "failedLoginAttempts" = 0
         WHERE id = $1`,
        [userId]
      );

      logger.info('User account unlocked by admin', { userId, adminId: req.userId });

      res.json({
        success: true,
        message: 'Account unlocked successfully',
      });
    } catch (error) {
      logger.error('Failed to unlock account', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to unlock account',
      });
    }
  }
);

/**
 * GET /api/admin/security/stats
 * Get security statistics
 */
router.get(
  '/stats',
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Get counts for various security metrics
      const [
        failedLoginsToday,
        lockedAccounts,
        openAlerts,
        suspiciousLogins,
        blockedIps,
        blockedDevices,
        newDevicesToday,
      ] = await Promise.all([
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "LoginAttempt"
           WHERE success = false AND "attemptedAt" > NOW() - INTERVAL '24 hours'`
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "User"
           WHERE "lockedUntil" > NOW()`
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "SecurityAlert"
           WHERE status = 'OPEN'`
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "LoginAttempt"
           WHERE "isSuspicious" = true AND "attemptedAt" > NOW() - INTERVAL '24 hours'`
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "SecurityBlocklist"
           WHERE type = 'IP' AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "SecurityBlocklist"
           WHERE type = 'FINGERPRINT' AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "UserDevice"
           WHERE "firstSeenAt" > NOW() - INTERVAL '24 hours'`
        ),
      ]);

      // Get recent security alerts
      const recentAlerts = await queryMany(
        `SELECT sa.*, u.email as "userEmail", u.name as "userName"
         FROM "SecurityAlert" sa
         LEFT JOIN "User" u ON sa."userId" = u.id
         WHERE sa.status = 'OPEN'
         ORDER BY sa."createdAt" DESC
         LIMIT 10`
      );

      // Get high-risk users
      const highRiskUsers = await queryMany(
        `SELECT urp.*, u.email, u.name
         FROM "UserRiskProfile" urp
         JOIN "User" u ON urp."userId" = u.id
         WHERE urp."riskLevel" IN ('HIGH', 'CRITICAL')
         ORDER BY urp."riskScore" DESC
         LIMIT 10`
      );

      res.json({
        success: true,
        data: {
          stats: {
            failedLoginsToday: parseInt(failedLoginsToday?.count || '0'),
            lockedAccounts: parseInt(lockedAccounts?.count || '0'),
            openAlerts: parseInt(openAlerts?.count || '0'),
            suspiciousLogins: parseInt(suspiciousLogins?.count || '0'),
            blockedIps: parseInt(blockedIps?.count || '0'),
            blockedDevices: parseInt(blockedDevices?.count || '0'),
            newDevicesToday: parseInt(newDevicesToday?.count || '0'),
          },
          recentAlerts,
          highRiskUsers,
        },
      });
    } catch (error) {
      logger.error('Failed to get security stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get security stats',
      });
    }
  }
);

export default router;
