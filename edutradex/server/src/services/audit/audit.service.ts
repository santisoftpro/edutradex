/**
 * Audit Service
 *
 * Centralized service for logging all admin and superadmin actions.
 * Provides a complete audit trail for compliance and security monitoring.
 */

import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

// Action types for audit logging
export type AdminActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_STATUS_CHANGE'
  | 'USER_BALANCE_RESET'
  | 'USER_IMPERSONATE'
  | 'USER_IMPERSONATE_END'
  | 'ROLE_CHANGE'
  | 'DEPOSIT_APPROVE'
  | 'DEPOSIT_REJECT'
  | 'WITHDRAWAL_APPROVE'
  | 'WITHDRAWAL_REJECT'
  | 'KYC_APPROVE'
  | 'KYC_REJECT'
  | 'SETTINGS_CHANGE'
  | 'ADMIN_CREATE'
  | 'ADMIN_UPDATE'
  | 'ADMIN_DELETE'
  | 'ADMIN_PASSWORD_RESET'
  | 'ADMIN_ACTIVATE'
  | 'ADMIN_DEACTIVATE'
  | 'LEADER_APPROVE'
  | 'LEADER_REJECT'
  | 'LEADER_SUSPEND'
  | 'OTC_CONFIG_CHANGE'
  | 'MARKET_CONFIG_CHANGE'
  | 'TICKET_REPLY'
  | 'TICKET_CLOSE'
  | 'PAYMENT_METHOD_CREATE'
  | 'PAYMENT_METHOD_UPDATE'
  | 'PAYMENT_METHOD_DELETE';

export type TargetType =
  | 'USER'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'SETTINGS'
  | 'ADMIN'
  | 'KYC'
  | 'LEADER'
  | 'TICKET'
  | 'OTC'
  | 'MARKET'
  | 'PAYMENT_METHOD';

export interface LogActivityInput {
  adminId: string;
  actionType: AdminActionType;
  targetType?: TargetType;
  targetId?: string;
  description: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  description: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface GetActivityLogsOptions {
  page?: number;
  limit?: number;
  adminId?: string;
  actionType?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface ActivityLogResult {
  logs: AdminActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivitySummary {
  totalActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  actionsByType: { actionType: string; count: number }[];
  topAdmins: { adminId: string; adminName: string; count: number }[];
  recentLogins: {
    adminId: string;
    adminName: string;
    loginAt: Date;
    ipAddress: string | null;
  }[];
}

class AuditService {
  /**
   * Log an admin action
   */
  async logAction(input: LogActivityInput): Promise<AdminActivityLog | null> {
    try {
      const result = await queryOne<AdminActivityLog>(`
        INSERT INTO "AdminActivityLog" (
          id, "adminId", "actionType", "targetType", "targetId",
          description, "previousValue", "newValue", "ipAddress", "userAgent", metadata
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING *
      `, [
        input.adminId,
        input.actionType,
        input.targetType || null,
        input.targetId || null,
        input.description,
        input.previousValue ? JSON.stringify(input.previousValue) : null,
        input.newValue ? JSON.stringify(input.newValue) : null,
        input.ipAddress || null,
        input.userAgent || null,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]);

      logger.debug('[Audit] Action logged', {
        adminId: input.adminId,
        actionType: input.actionType,
        targetType: input.targetType,
        targetId: input.targetId
      });

      return result;
    } catch (error) {
      logger.error('[Audit] Failed to log action', { input, error });
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  }

  /**
   * Log admin login
   */
  async logLogin(
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      adminId,
      actionType: 'LOGIN',
      description: 'Admin logged in',
      ipAddress,
      userAgent
    });

    // Update user's last login info
    await query(`
      UPDATE "User"
      SET "lastLoginAt" = NOW(), "lastLoginIp" = $2, "loginCount" = "loginCount" + 1
      WHERE id = $1
    `, [adminId, ipAddress || null]);
  }

  /**
   * Log admin logout
   */
  async logLogout(adminId: string): Promise<void> {
    await this.logAction({
      adminId,
      actionType: 'LOGOUT',
      description: 'Admin logged out'
    });
  }

  /**
   * Create admin session for tracking
   */
  async createSession(
    adminId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO "AdminSession" (id, "adminId", token, "expiresAt", "ipAddress", "userAgent")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      `, [adminId, token, expiresAt, ipAddress || null, userAgent || null]);
    } catch (error) {
      logger.error('[Audit] Failed to create admin session', { adminId, error });
    }
  }

  /**
   * Invalidate admin session on logout
   */
  async invalidateSession(token: string): Promise<void> {
    try {
      await query(`
        UPDATE "AdminSession"
        SET "isActive" = false, "logoutAt" = NOW()
        WHERE token = $1
      `, [token]);
    } catch (error) {
      logger.error('[Audit] Failed to invalidate session', { error });
    }
  }

  /**
   * Get activity logs with filtering and pagination
   */
  async getActivityLogs(options: GetActivityLogsOptions = {}): Promise<ActivityLogResult> {
    const {
      page = 1,
      limit = 20,
      adminId,
      actionType,
      targetType,
      targetId,
      from,
      to,
      search
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: (string | Date | number)[] = [];
    let paramIndex = 1;

    if (adminId) {
      conditions.push(`al."adminId" = $${paramIndex++}`);
      params.push(adminId);
    }

    if (actionType) {
      conditions.push(`al."actionType" = $${paramIndex++}`);
      params.push(actionType);
    }

    if (targetType) {
      conditions.push(`al."targetType" = $${paramIndex++}`);
      params.push(targetType);
    }

    if (targetId) {
      conditions.push(`al."targetId" = $${paramIndex++}`);
      params.push(targetId);
    }

    if (from) {
      conditions.push(`al."createdAt" >= $${paramIndex++}`);
      params.push(from);
    }

    if (to) {
      conditions.push(`al."createdAt" <= $${paramIndex++}`);
      params.push(to);
    }

    if (search) {
      conditions.push(`(al.description ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM "AdminActivityLog" al
      LEFT JOIN "User" u ON al."adminId" = u.id
      ${whereClause}
    `, params);

    const total = parseInt(countResult?.count || '0', 10);

    // Get logs
    const logs = await queryMany<AdminActivityLog & { adminName: string; adminEmail: string }>(`
      SELECT
        al.*,
        u.name as "adminName",
        u.email as "adminEmail"
      FROM "AdminActivityLog" al
      LEFT JOIN "User" u ON al."adminId" = u.id
      ${whereClause}
      ORDER BY al."createdAt" DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, limit, offset]);

    return {
      logs: logs.map(log => ({
        ...log,
        previousValue: typeof log.previousValue === 'string' ? JSON.parse(log.previousValue) : log.previousValue,
        newValue: typeof log.newValue === 'string' ? JSON.parse(log.newValue) : log.newValue,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get activity summary for dashboard
   */
  async getActivitySummary(): Promise<ActivitySummary> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Total actions
    const totalResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog"
    `);
    const totalActions = parseInt(totalResult?.count || '0', 10);

    // Actions today
    const todayResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "createdAt" >= $1
    `, [todayStart]);
    const actionsToday = parseInt(todayResult?.count || '0', 10);

    // Actions this week
    const weekResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "createdAt" >= $1
    `, [weekStart]);
    const actionsThisWeek = parseInt(weekResult?.count || '0', 10);

    // Actions this month
    const monthResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "createdAt" >= $1
    `, [monthStart]);
    const actionsThisMonth = parseInt(monthResult?.count || '0', 10);

    // Actions by type
    const actionsByType = await queryMany<{ actionType: string; count: string }>(`
      SELECT "actionType", COUNT(*) as count
      FROM "AdminActivityLog"
      WHERE "createdAt" >= $1
      GROUP BY "actionType"
      ORDER BY count DESC
      LIMIT 10
    `, [monthStart]);

    // Top admins by activity
    const topAdmins = await queryMany<{ adminId: string; adminName: string; count: string }>(`
      SELECT al."adminId", u.name as "adminName", COUNT(*) as count
      FROM "AdminActivityLog" al
      LEFT JOIN "User" u ON al."adminId" = u.id
      WHERE al."createdAt" >= $1
      GROUP BY al."adminId", u.name
      ORDER BY count DESC
      LIMIT 5
    `, [monthStart]);

    // Recent logins
    const recentLogins = await queryMany<{
      adminId: string;
      adminName: string;
      createdAt: Date;
      ipAddress: string | null;
    }>(`
      SELECT al."adminId", u.name as "adminName", al."createdAt" as "loginAt", al."ipAddress"
      FROM "AdminActivityLog" al
      LEFT JOIN "User" u ON al."adminId" = u.id
      WHERE al."actionType" = 'LOGIN'
      ORDER BY al."createdAt" DESC
      LIMIT 10
    `);

    return {
      totalActions,
      actionsToday,
      actionsThisWeek,
      actionsThisMonth,
      actionsByType: actionsByType.map(a => ({
        actionType: a.actionType,
        count: parseInt(a.count, 10)
      })),
      topAdmins: topAdmins.map(a => ({
        adminId: a.adminId,
        adminName: a.adminName,
        count: parseInt(a.count, 10)
      })),
      recentLogins: recentLogins.map(l => ({
        adminId: l.adminId,
        adminName: l.adminName,
        loginAt: l.createdAt,
        ipAddress: l.ipAddress
      }))
    };
  }

  /**
   * Get admin's activity summary
   */
  async getAdminActivitySummary(adminId: string): Promise<{
    totalActions: number;
    actionsThisMonth: number;
    lastAction: Date | null;
    actionBreakdown: { actionType: string; count: number }[];
  }> {
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const totalResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "adminId" = $1
    `, [adminId]);

    const monthResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "adminId" = $1 AND "createdAt" >= $2
    `, [adminId, monthStart]);

    const lastActionResult = await queryOne<{ createdAt: Date }>(`
      SELECT "createdAt" FROM "AdminActivityLog" WHERE "adminId" = $1 ORDER BY "createdAt" DESC LIMIT 1
    `, [adminId]);

    const breakdown = await queryMany<{ actionType: string; count: string }>(`
      SELECT "actionType", COUNT(*) as count
      FROM "AdminActivityLog"
      WHERE "adminId" = $1 AND "createdAt" >= $2
      GROUP BY "actionType"
      ORDER BY count DESC
    `, [adminId, monthStart]);

    return {
      totalActions: parseInt(totalResult?.count || '0', 10),
      actionsThisMonth: parseInt(monthResult?.count || '0', 10),
      lastAction: lastActionResult?.createdAt || null,
      actionBreakdown: breakdown.map(b => ({
        actionType: b.actionType,
        count: parseInt(b.count, 10)
      }))
    };
  }

  /**
   * Export activity logs to CSV format
   */
  async exportLogs(options: GetActivityLogsOptions = {}): Promise<string> {
    // Get all matching logs without pagination
    const { logs } = await this.getActivityLogs({ ...options, limit: 10000, page: 1 });

    const headers = [
      'Date',
      'Admin Name',
      'Admin Email',
      'Action Type',
      'Target Type',
      'Target ID',
      'Description',
      'IP Address'
    ];

    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.adminName || '',
      log.adminEmail || '',
      log.actionType,
      log.targetType || '',
      log.targetId || '',
      log.description,
      log.ipAddress || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

// Singleton instance
export const auditService = new AuditService();
