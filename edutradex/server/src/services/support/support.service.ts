import { query, queryOne, queryMany } from '../../config/db.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';
import { randomUUID } from 'crypto';

export type TicketCategory = 'GENERAL' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRADING' | 'ACCOUNT' | 'TECHNICAL';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'REPLIED' | 'RESOLVED' | 'CLOSED';

interface CreateTicketInput {
  userId: string;
  subject: string;
  message: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}

interface ReplyTicketInput {
  ticketId: string;
  adminId: string;
  reply: string;
  closeTicket?: boolean;
}

interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  userId?: string;
}

interface TicketRow {
  id: string;
  userId: string;
  ticketNumber: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  adminReply: string | null;
  repliedBy: string | null;
  repliedAt: Date | null;
  closedBy: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class SupportService {
  // Generate unique ticket number
  private generateTicketNumber(): string {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Create a new support ticket
  async createTicket(input: CreateTicketInput) {
    const { userId, subject, message, category = 'GENERAL', priority = 'MEDIUM' } = input;

    const user = await queryOne<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM "User" WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    const id = randomUUID();
    const ticketNumber = this.generateTicketNumber();
    const now = new Date();

    const ticket = await queryOne<TicketRow>(
      `INSERT INTO "SupportTicket" (
        id, "userId", "ticketNumber", subject, message, category, priority, status, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [id, userId, ticketNumber, subject, message, category, priority, 'OPEN', now, now]
    );

    // Send email notification to admin
    await this.notifyAdminNewTicket({
      ticketNumber: ticket!.ticketNumber,
      subject: ticket!.subject,
      message: ticket!.message,
      category: ticket!.category,
      priority: ticket!.priority,
      user: { name: user.name, email: user.email },
    });

    logger.info('Support ticket created', {
      ticketId: ticket!.id,
      ticketNumber: ticket!.ticketNumber,
      userId,
      category,
      priority,
    });

    return {
      ...ticket,
      user: { name: user.name, email: user.email },
    };
  }

  // Get all tickets (admin)
  async getAllTickets(filters: TicketFilters = {}, page = 1, limit = 20) {
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClause += ` AND t.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.category) {
      whereClause += ` AND t.category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters.priority) {
      whereClause += ` AND t.priority = $${paramIndex++}`;
      params.push(filters.priority);
    }
    if (filters.userId) {
      whereClause += ` AND t."userId" = $${paramIndex++}`;
      params.push(filters.userId);
    }

    const countParams = [...params];
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const [tickets, countResult] = await Promise.all([
      queryMany<TicketRow & { userName: string; userEmail: string }>(
        `SELECT t.*, u.name as "userName", u.email as "userEmail"
         FROM "SupportTicket" t
         JOIN "User" u ON u.id = t."userId"
         WHERE ${whereClause}
         ORDER BY
           CASE t.status
             WHEN 'OPEN' THEN 1
             WHEN 'IN_PROGRESS' THEN 2
             WHEN 'REPLIED' THEN 3
             WHEN 'RESOLVED' THEN 4
             WHEN 'CLOSED' THEN 5
           END,
           CASE t.priority
             WHEN 'URGENT' THEN 1
             WHEN 'HIGH' THEN 2
             WHEN 'MEDIUM' THEN 3
             WHEN 'LOW' THEN 4
           END,
           t."createdAt" DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "SupportTicket" t WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      tickets: tickets.map(t => ({
        ...t,
        user: { id: t.userId, name: t.userName, email: t.userEmail },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get user's tickets
  async getUserTickets(userId: string) {
    return queryMany<TicketRow>(
      `SELECT * FROM "SupportTicket" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId]
    );
  }

  // Get single ticket
  async getTicket(ticketId: string, userId?: string) {
    let sql = `SELECT t.*, u.name as "userName", u.email as "userEmail"
               FROM "SupportTicket" t
               JOIN "User" u ON u.id = t."userId"
               WHERE t.id = $1`;
    const params: any[] = [ticketId];

    if (userId) {
      sql += ` AND t."userId" = $2`;
      params.push(userId);
    }

    const ticket = await queryOne<TicketRow & { userName: string; userEmail: string }>(sql, params);

    if (!ticket) return null;

    return {
      ...ticket,
      user: { id: ticket.userId, name: ticket.userName, email: ticket.userEmail },
    };
  }

  // Admin reply to ticket
  async replyToTicket(input: ReplyTicketInput) {
    const { ticketId, adminId, reply, closeTicket = false } = input;

    const ticket = await queryOne<TicketRow & { userName: string; userEmail: string }>(
      `SELECT t.*, u.name as "userName", u.email as "userEmail"
       FROM "SupportTicket" t
       JOIN "User" u ON u.id = t."userId"
       WHERE t.id = $1`,
      [ticketId]
    );

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = new Date();

    const updatedTicket = await queryOne<TicketRow>(
      `UPDATE "SupportTicket" SET
        "adminReply" = $1, "repliedBy" = $2, "repliedAt" = $3,
        status = $4, "closedBy" = $5, "closedAt" = $6, "updatedAt" = $3
       WHERE id = $7 RETURNING *`,
      [
        reply,
        adminId,
        now,
        closeTicket ? 'CLOSED' : 'REPLIED',
        closeTicket ? adminId : null,
        closeTicket ? now : null,
        ticketId,
      ]
    );

    // Send email notification to user
    await this.notifyUserTicketReply({
      ticketNumber: updatedTicket!.ticketNumber,
      subject: updatedTicket!.subject,
      adminReply: updatedTicket!.adminReply,
      status: updatedTicket!.status,
      user: { name: ticket.userName, email: ticket.userEmail },
    });

    // Send WebSocket notification for real-time update
    wsManager.notifyTicketReply(ticket.userId, {
      ticketId,
      ticketNumber: updatedTicket!.ticketNumber,
      subject: updatedTicket!.subject,
      isClosed: closeTicket,
    });

    logger.info('Ticket replied', {
      ticketId,
      adminId,
      closed: closeTicket,
    });

    return {
      ...updatedTicket,
      user: { name: ticket.userName, email: ticket.userEmail },
    };
  }

  // Update ticket status
  async updateTicketStatus(ticketId: string, status: TicketStatus, adminId?: string) {
    const now = new Date();

    let sql = `UPDATE "SupportTicket" SET status = $1, "updatedAt" = $2`;
    const params: any[] = [status, now];
    let paramIndex = 3;

    if (status === 'CLOSED' && adminId) {
      sql += `, "closedBy" = $${paramIndex++}, "closedAt" = $${paramIndex++}`;
      params.push(adminId, now);
    }

    sql += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(ticketId);

    const ticket = await queryOne<TicketRow>(sql, params);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const user = await queryOne<{ name: string; email: string }>(
      `SELECT name, email FROM "User" WHERE id = $1`,
      [ticket.userId]
    );

    return {
      ...ticket,
      user: user ? { id: ticket.userId, name: user.name, email: user.email } : undefined,
    };
  }

  // Get ticket statistics
  async getTicketStats() {
    // Single query with FILTER for all counts - much faster than 7 separate queries
    const result = await queryOne<{
      total: string;
      open: string;
      in_progress: string;
      replied: string;
      resolved: string;
      closed: string;
      urgent: string;
    }>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
        COUNT(*) FILTER (WHERE status = 'REPLIED') as replied,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed,
        COUNT(*) FILTER (WHERE priority = 'URGENT' AND status IN ('OPEN', 'IN_PROGRESS')) as urgent
      FROM "SupportTicket"
    `);

    return {
      open: parseInt(result?.open || '0', 10),
      inProgress: parseInt(result?.in_progress || '0', 10),
      replied: parseInt(result?.replied || '0', 10),
      resolved: parseInt(result?.resolved || '0', 10),
      closed: parseInt(result?.closed || '0', 10),
      total: parseInt(result?.total || '0', 10),
      urgent: parseInt(result?.urgent || '0', 10),
    };
  }

  // Send email to admin about new ticket
  private async notifyAdminNewTicket(ticket: {
    ticketNumber: string;
    subject: string;
    message: string;
    category: string;
    priority: string;
    user: { name: string; email: string };
  }) {
    try {
      // Get admin emails from system config or use default
      const adminEmailSetting = await queryOne<{ value: string }>(
        `SELECT value FROM "SystemConfig" WHERE key = 'ADMIN_NOTIFICATION_EMAIL'`
      );

      const adminEmail = adminEmailSetting?.value || process.env.ADMIN_EMAIL;

      if (!adminEmail) {
        logger.warn('No admin email configured for ticket notifications');
        return;
      }

      await emailService.sendNewTicketNotification(
        adminEmail,
        ticket.ticketNumber,
        ticket.subject,
        ticket.message,
        ticket.user.name,
        ticket.user.email,
        ticket.category,
        ticket.priority
      );
    } catch (error) {
      logger.error('Failed to send admin notification for new ticket', { error });
    }
  }

  // Send email to user about ticket reply
  private async notifyUserTicketReply(ticket: {
    ticketNumber: string;
    subject: string;
    adminReply: string | null;
    status: string;
    user: { name: string; email: string };
  }) {
    try {
      if (!ticket.adminReply) return;

      await emailService.sendTicketReplyNotification(
        ticket.user.email,
        ticket.user.name,
        ticket.ticketNumber,
        ticket.subject,
        ticket.adminReply,
        ticket.status === 'CLOSED'
      );
    } catch (error) {
      logger.error('Failed to send user notification for ticket reply', { error });
    }
  }
}

export const supportService = new SupportService();
