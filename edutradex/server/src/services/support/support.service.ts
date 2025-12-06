import { prisma } from '../../config/database.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../../utils/logger.js';
import { wsManager } from '../websocket/websocket.manager.js';

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        ticketNumber: this.generateTicketNumber(),
        subject,
        message,
        category,
        priority,
        status: 'OPEN',
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Send email notification to admin
    await this.notifyAdminNewTicket(ticket);

    logger.info('Support ticket created', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId,
      category,
      priority,
    });

    return ticket;
  }

  // Get all tickets (admin)
  async getAllTickets(filters: TicketFilters = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.userId) where.userId = filters.userId;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
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
    return prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get single ticket
  async getTicket(ticketId: string, userId?: string) {
    const where: Record<string, string> = { id: ticketId };
    if (userId) where.userId = userId;

    return prisma.supportTicket.findFirst({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Admin reply to ticket
  async replyToTicket(input: ReplyTicketInput) {
    const { ticketId, adminId, reply, closeTicket = false } = input;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        adminReply: reply,
        repliedBy: adminId,
        repliedAt: new Date(),
        status: closeTicket ? 'CLOSED' : 'REPLIED',
        closedBy: closeTicket ? adminId : undefined,
        closedAt: closeTicket ? new Date() : undefined,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Send email notification to user
    await this.notifyUserTicketReply(updatedTicket);

    // Send WebSocket notification for real-time update
    wsManager.notifyTicketReply(ticket.userId, {
      ticketId,
      ticketNumber: updatedTicket.ticketNumber,
      subject: updatedTicket.subject,
      isClosed: closeTicket,
    });

    logger.info('Ticket replied', {
      ticketId,
      adminId,
      closed: closeTicket,
    });

    return updatedTicket;
  }

  // Update ticket status
  async updateTicketStatus(ticketId: string, status: TicketStatus, adminId?: string) {
    const updateData: Record<string, unknown> = { status };

    if (status === 'CLOSED' && adminId) {
      updateData.closedBy = adminId;
      updateData.closedAt = new Date();
    }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Get ticket statistics
  async getTicketStats() {
    const [open, inProgress, replied, resolved, closed, total] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'REPLIED' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
      prisma.supportTicket.count(),
    ]);

    const urgent = await prisma.supportTicket.count({
      where: {
        priority: 'URGENT',
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    return {
      open,
      inProgress,
      replied,
      resolved,
      closed,
      total,
      urgent,
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
      const adminEmailSetting = await prisma.systemConfig.findUnique({
        where: { key: 'ADMIN_NOTIFICATION_EMAIL' },
      });

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
