/**
 * SuperAdmin Service
 *
 * Handles all SuperAdmin operations including:
 * - Admin account management (create, update, delete, activate, deactivate)
 * - Password reset for admins
 * - Admin session management
 * - Platform statistics for SuperAdmin dashboard
 */

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { auditService } from '../audit/audit.service.js';

const SALT_ROUNDS = 10;

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isProtected: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDetail extends AdminUser {
  actionsCount: number;
  actionsThisMonth: number;
  lastAction: Date | null;
  activeSessions: AdminSession[];
  recentActions: {
    id: string;
    actionType: string;
    description: string;
    createdAt: Date;
  }[];
}

export interface AdminSession {
  id: string;
  adminId: string;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: Date;
  logoutAt: Date | null;
  isActive: boolean;
}

export interface CreateAdminInput {
  email: string;
  name: string;
  password?: string; // If not provided, generate temp password
}

export interface UpdateAdminInput {
  name?: string;
  email?: string;
}

export interface GetAdminsOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | '';
  role?: 'ADMIN' | 'SUPERADMIN' | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SuperAdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  superAdmins: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  recentLogins: {
    adminId: string;
    adminName: string;
    adminEmail: string;
    loginAt: Date;
    ipAddress: string | null;
  }[];
  topAdminsByActivity: {
    adminId: string;
    adminName: string;
    count: number;
  }[];
}

class SuperAdminServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'SuperAdminServiceError';
  }
}

class SuperAdminService {
  /**
   * Generate a secure temporary password
   */
  private generateTempPassword(length: number = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const bytes = randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    // Ensure at least one of each required type
    password = password.substring(0, length - 4) + 'Aa1!';
    // Shuffle the last 4 characters into the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get all admins with filtering and pagination
   */
  async getAllAdmins(options: GetAdminsOptions = {}): Promise<{
    admins: AdminUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['role IN (\'ADMIN\', \'SUPERADMIN\')'];
    const params: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== '' && isActive !== undefined) {
      conditions.push(`"isActive" = $${paramIndex++}`);
      params.push(isActive);
    }

    if (role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column
    const validSortColumns = ['createdAt', 'name', 'email', 'lastLoginAt', 'loginCount'];
    const sortColumn = validSortColumns.includes(sortBy) ? `"${sortBy}"` : '"createdAt"';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "User" ${whereClause}
    `, params);
    const total = parseInt(countResult?.count || '0', 10);

    // Get admins
    const admins = await queryMany<AdminUser>(`
      SELECT id, email, name, role, "isActive", "isProtected",
             "lastLoginAt", "lastLoginIp", "loginCount", "createdAt", "updatedAt"
      FROM "User"
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, limit, offset]);

    return {
      admins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get admin details with activity stats
   */
  async getAdminDetail(adminId: string): Promise<AdminDetail> {
    const admin = await queryOne<AdminUser>(`
      SELECT id, email, name, role, "isActive", "isProtected",
             "lastLoginAt", "lastLoginIp", "loginCount", "createdAt", "updatedAt"
      FROM "User"
      WHERE id = $1 AND role IN ('ADMIN', 'SUPERADMIN')
    `, [adminId]);

    if (!admin) {
      throw new SuperAdminServiceError('Admin not found', 404);
    }

    // Get activity stats
    const activitySummary = await auditService.getAdminActivitySummary(adminId);

    // Get active sessions
    const activeSessions = await queryMany<AdminSession>(`
      SELECT id, "adminId", "ipAddress", "userAgent", "loginAt", "logoutAt", "isActive"
      FROM "AdminSession"
      WHERE "adminId" = $1 AND "isActive" = true
      ORDER BY "loginAt" DESC
    `, [adminId]);

    // Get recent actions
    const recentActions = await queryMany<{
      id: string;
      actionType: string;
      description: string;
      createdAt: Date;
    }>(`
      SELECT id, "actionType", description, "createdAt"
      FROM "AdminActivityLog"
      WHERE "adminId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 10
    `, [adminId]);

    return {
      ...admin,
      actionsCount: activitySummary.totalActions,
      actionsThisMonth: activitySummary.actionsThisMonth,
      lastAction: activitySummary.lastAction,
      activeSessions,
      recentActions
    };
  }

  /**
   * Create a new admin account
   */
  async createAdmin(
    input: CreateAdminInput,
    superAdminId: string,
    ipAddress?: string
  ): Promise<{ admin: AdminUser; tempPassword?: string }> {
    // Check if email already exists
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM "User" WHERE email = $1
    `, [input.email.toLowerCase()]);

    if (existing) {
      throw new SuperAdminServiceError('Email already in use', 409);
    }

    // Generate or use provided password
    const tempPassword = input.password || this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const admin = await queryOne<AdminUser>(`
      INSERT INTO "User" (
        id, email, password, name, role, "isActive", "isProtected",
        "demoBalance", "liveBalance", "activeAccountType", "emailVerified",
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'ADMIN', true, false,
        0, 0, 'LIVE', true, NOW(), NOW()
      )
      RETURNING id, email, name, role, "isActive", "isProtected",
                "lastLoginAt", "lastLoginIp", "loginCount", "createdAt", "updatedAt"
    `, [input.email.toLowerCase(), hashedPassword, input.name]);

    if (!admin) {
      throw new SuperAdminServiceError('Failed to create admin', 500);
    }

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'ADMIN_CREATE',
      targetType: 'ADMIN',
      targetId: admin.id,
      description: `Created admin account for ${input.name} (${input.email})`,
      newValue: { email: input.email, name: input.name, role: 'ADMIN' },
      ipAddress
    });

    logger.info('[SuperAdmin] Admin created', { adminId: admin.id, email: input.email, by: superAdminId });

    return {
      admin,
      tempPassword: input.password ? undefined : tempPassword
    };
  }

  /**
   * Update admin details
   */
  async updateAdmin(
    adminId: string,
    input: UpdateAdminInput,
    superAdminId: string,
    ipAddress?: string
  ): Promise<AdminUser> {
    const existing = await queryOne<AdminUser>(`
      SELECT * FROM "User" WHERE id = $1 AND role IN ('ADMIN', 'SUPERADMIN')
    `, [adminId]);

    if (!existing) {
      throw new SuperAdminServiceError('Admin not found', 404);
    }

    // Check if trying to update a protected SuperAdmin (only allow name changes)
    if (existing.isProtected && existing.role === 'SUPERADMIN' && input.email) {
      throw new SuperAdminServiceError('Cannot change email of protected SuperAdmin', 403);
    }

    // Check email uniqueness if changing email
    if (input.email && input.email.toLowerCase() !== existing.email) {
      const emailExists = await queryOne<{ id: string }>(`
        SELECT id FROM "User" WHERE email = $1 AND id != $2
      `, [input.email.toLowerCase(), adminId]);

      if (emailExists) {
        throw new SuperAdminServiceError('Email already in use', 409);
      }
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (input.name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }

    if (input.email) {
      updates.push(`email = $${paramIndex++}`);
      params.push(input.email.toLowerCase());
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`"updatedAt" = NOW()`);
    params.push(adminId);

    const admin = await queryOne<AdminUser>(`
      UPDATE "User"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, "isActive", "isProtected",
                "lastLoginAt", "lastLoginIp", "loginCount", "createdAt", "updatedAt"
    `, params);

    if (!admin) {
      throw new SuperAdminServiceError('Failed to update admin', 500);
    }

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'ADMIN_UPDATE',
      targetType: 'ADMIN',
      targetId: adminId,
      description: `Updated admin ${existing.name}`,
      previousValue: { name: existing.name, email: existing.email },
      newValue: input,
      ipAddress
    });

    logger.info('[SuperAdmin] Admin updated', { adminId, by: superAdminId });

    return admin;
  }

  /**
   * Reset admin password
   */
  async resetAdminPassword(
    adminId: string,
    superAdminId: string,
    ipAddress?: string
  ): Promise<string> {
    const admin = await queryOne<AdminUser>(`
      SELECT * FROM "User" WHERE id = $1 AND role IN ('ADMIN', 'SUPERADMIN')
    `, [adminId]);

    if (!admin) {
      throw new SuperAdminServiceError('Admin not found', 404);
    }

    // Cannot reset password for protected SuperAdmin
    if (admin.isProtected && admin.role === 'SUPERADMIN' && adminId !== superAdminId) {
      throw new SuperAdminServiceError('Cannot reset password of protected SuperAdmin', 403);
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await query(`
      UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2
    `, [hashedPassword, adminId]);

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'ADMIN_PASSWORD_RESET',
      targetType: 'ADMIN',
      targetId: adminId,
      description: `Reset password for admin ${admin.name} (${admin.email})`,
      ipAddress
    });

    logger.info('[SuperAdmin] Admin password reset', { adminId, by: superAdminId });

    return tempPassword;
  }

  /**
   * Activate admin account
   */
  async activateAdmin(
    adminId: string,
    superAdminId: string,
    ipAddress?: string
  ): Promise<AdminUser> {
    const admin = await queryOne<AdminUser>(`
      SELECT * FROM "User" WHERE id = $1 AND role IN ('ADMIN', 'SUPERADMIN')
    `, [adminId]);

    if (!admin) {
      throw new SuperAdminServiceError('Admin not found', 404);
    }

    if (admin.isActive) {
      throw new SuperAdminServiceError('Admin is already active', 400);
    }

    const updated = await queryOne<AdminUser>(`
      UPDATE "User" SET "isActive" = true, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, "isActive", "isProtected",
                "lastLoginAt", "lastLoginIp", "loginCount", "createdAt", "updatedAt"
    `, [adminId]);

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'ADMIN_ACTIVATE',
      targetType: 'ADMIN',
      targetId: adminId,
      description: `Activated admin ${admin.name} (${admin.email})`,
      previousValue: { isActive: false },
      newValue: { isActive: true },
      ipAddress
    });

    logger.info('[SuperAdmin] Admin activated', { adminId, by: superAdminId });

    return updated!;
  }

  /**
   * Deactivate admin account
   */
  async deactivateAdmin(
    adminId: string,
    superAdminId: string,
    ipAddress?: string
  ): Promise<AdminUser> {
    const admin = await queryOne<AdminUser>(`
      SELECT * FROM "User" WHERE id = $1 AND role IN ('ADMIN', 'SUPERADMIN')
    `, [adminId]);

    if (!admin) {
      throw new SuperAdminServiceError('Admin not found', 404);
    }

    // Cannot deactivate yourself
    if (adminId === superAdminId) {
      throw new SuperAdminServiceError('Cannot deactivate your own account', 403);
    }

    // Cannot deactivate protected accounts
    if (admin.isProtected) {
      throw new SuperAdminServiceError('Cannot deactivate protected admin', 403);
    }

    if (!admin.isActive) {
      throw new SuperAdminServiceError('Admin is already inactive', 400);
    }

    const updated = await queryOne<AdminUser>(`
      UPDATE "User" SET "isActive" = false, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, "isActive", "isProtected",
                "lastLoginAt", "lastLoginIp", "loginCount", "createdAt", "updatedAt"
    `, [adminId]);

    // Invalidate all their sessions
    await query(`
      UPDATE "AdminSession" SET "isActive" = false, "logoutAt" = NOW()
      WHERE "adminId" = $1 AND "isActive" = true
    `, [adminId]);

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'ADMIN_DEACTIVATE',
      targetType: 'ADMIN',
      targetId: adminId,
      description: `Deactivated admin ${admin.name} (${admin.email})`,
      previousValue: { isActive: true },
      newValue: { isActive: false },
      ipAddress
    });

    logger.info('[SuperAdmin] Admin deactivated', { adminId, by: superAdminId });

    return updated!;
  }

  /**
   * Delete admin account
   */
  async deleteAdmin(
    adminId: string,
    superAdminId: string,
    ipAddress?: string
  ): Promise<void> {
    const admin = await queryOne<AdminUser>(`
      SELECT * FROM "User" WHERE id = $1 AND role IN ('ADMIN', 'SUPERADMIN')
    `, [adminId]);

    if (!admin) {
      throw new SuperAdminServiceError('Admin not found', 404);
    }

    // Cannot delete yourself
    if (adminId === superAdminId) {
      throw new SuperAdminServiceError('Cannot delete your own account', 403);
    }

    // Cannot delete protected accounts
    if (admin.isProtected) {
      throw new SuperAdminServiceError('Cannot delete protected admin', 403);
    }

    // Cannot delete SuperAdmin (only deactivate)
    if (admin.role === 'SUPERADMIN') {
      throw new SuperAdminServiceError('Cannot delete SuperAdmin accounts, only deactivate them', 403);
    }

    await query(`DELETE FROM "User" WHERE id = $1`, [adminId]);

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'ADMIN_DELETE',
      targetType: 'ADMIN',
      targetId: adminId,
      description: `Deleted admin ${admin.name} (${admin.email})`,
      previousValue: { email: admin.email, name: admin.name, role: admin.role },
      ipAddress
    });

    logger.info('[SuperAdmin] Admin deleted', { adminId, email: admin.email, by: superAdminId });
  }

  /**
   * Get admin sessions
   */
  async getAdminSessions(adminId: string): Promise<AdminSession[]> {
    const sessions = await queryMany<AdminSession>(`
      SELECT id, "adminId", "ipAddress", "userAgent", "loginAt", "logoutAt", "isActive"
      FROM "AdminSession"
      WHERE "adminId" = $1
      ORDER BY "loginAt" DESC
      LIMIT 50
    `, [adminId]);

    return sessions;
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(
    sessionId: string,
    superAdminId: string,
    ipAddress?: string
  ): Promise<void> {
    const session = await queryOne<AdminSession & { adminName: string; adminEmail: string }>(`
      SELECT s.*, u.name as "adminName", u.email as "adminEmail"
      FROM "AdminSession" s
      LEFT JOIN "User" u ON s."adminId" = u.id
      WHERE s.id = $1
    `, [sessionId]);

    if (!session) {
      throw new SuperAdminServiceError('Session not found', 404);
    }

    if (!session.isActive) {
      throw new SuperAdminServiceError('Session is already terminated', 400);
    }

    await query(`
      UPDATE "AdminSession" SET "isActive" = false, "logoutAt" = NOW()
      WHERE id = $1
    `, [sessionId]);

    // Log the action
    await auditService.logAction({
      adminId: superAdminId,
      actionType: 'LOGOUT',
      targetType: 'ADMIN',
      targetId: session.adminId,
      description: `Terminated session for admin ${session.adminName} (${session.adminEmail})`,
      metadata: { sessionId, forced: true },
      ipAddress
    });

    logger.info('[SuperAdmin] Session terminated', { sessionId, adminId: session.adminId, by: superAdminId });
  }

  /**
   * Get SuperAdmin dashboard statistics
   */
  async getStats(): Promise<SuperAdminStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Admin counts
    const adminCounts = await queryOne<{
      total: string;
      active: string;
      inactive: string;
      superadmins: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE role IN ('ADMIN', 'SUPERADMIN')) as total,
        COUNT(*) FILTER (WHERE role IN ('ADMIN', 'SUPERADMIN') AND "isActive" = true) as active,
        COUNT(*) FILTER (WHERE role IN ('ADMIN', 'SUPERADMIN') AND "isActive" = false) as inactive,
        COUNT(*) FILTER (WHERE role = 'SUPERADMIN') as superadmins
      FROM "User"
    `);

    // Action counts
    const todayActions = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "createdAt" >= $1
    `, [todayStart]);

    const weekActions = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "createdAt" >= $1
    `, [weekStart]);

    const monthActions = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM "AdminActivityLog" WHERE "createdAt" >= $1
    `, [monthStart]);

    // Recent logins
    const recentLogins = await queryMany<{
      adminId: string;
      adminName: string;
      adminEmail: string;
      loginAt: Date;
      ipAddress: string | null;
    }>(`
      SELECT al."adminId", u.name as "adminName", u.email as "adminEmail",
             al."createdAt" as "loginAt", al."ipAddress"
      FROM "AdminActivityLog" al
      LEFT JOIN "User" u ON al."adminId" = u.id
      WHERE al."actionType" = 'LOGIN'
      ORDER BY al."createdAt" DESC
      LIMIT 10
    `);

    // Top admins by activity
    const topAdmins = await queryMany<{
      adminId: string;
      adminName: string;
      count: string;
    }>(`
      SELECT al."adminId", u.name as "adminName", COUNT(*) as count
      FROM "AdminActivityLog" al
      LEFT JOIN "User" u ON al."adminId" = u.id
      WHERE al."createdAt" >= $1
      GROUP BY al."adminId", u.name
      ORDER BY count DESC
      LIMIT 5
    `, [monthStart]);

    return {
      totalAdmins: parseInt(adminCounts?.total || '0', 10),
      activeAdmins: parseInt(adminCounts?.active || '0', 10),
      inactiveAdmins: parseInt(adminCounts?.inactive || '0', 10),
      superAdmins: parseInt(adminCounts?.superadmins || '0', 10),
      actionsToday: parseInt(todayActions?.count || '0', 10),
      actionsThisWeek: parseInt(weekActions?.count || '0', 10),
      actionsThisMonth: parseInt(monthActions?.count || '0', 10),
      recentLogins,
      topAdminsByActivity: topAdmins.map(a => ({
        adminId: a.adminId,
        adminName: a.adminName,
        count: parseInt(a.count, 10)
      }))
    };
  }
}

// Singleton instance
export const superAdminService = new SuperAdminService();
export { SuperAdminServiceError };
