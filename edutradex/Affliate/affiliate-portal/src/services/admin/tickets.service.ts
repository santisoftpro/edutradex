import { db } from "@/lib/db";
import type { TicketStatus, TicketPriority, Prisma } from "@prisma/client";

export class AdminTicketsService {
  /**
   * Get all tickets with pagination and filtering
   */
  static async getTickets(options?: {
    page?: number;
    pageSize?: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    sortBy?: "createdAt" | "updatedAt" | "priority";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupportTicketWhereInput = {
      ...(options?.status && { status: options.status }),
      ...(options?.priority && { priority: options.priority }),
    };

    const orderBy: Prisma.SupportTicketOrderByWithRelationInput = {
      [options?.sortBy || "createdAt"]: options?.sortOrder || "desc",
    };

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              level: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      db.supportTicket.count({ where }),
    ]);

    return {
      data: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        closedAt: t.closedAt?.toISOString() || null,
        partner: {
          id: t.partner.id,
          name: `${t.partner.firstName} ${t.partner.lastName}`,
          email: t.partner.email,
          level: t.partner.level,
        },
        messageCount: t._count.messages,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get ticket by ID with all messages
   */
  static async getTicketById(id: string) {
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            level: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            isAdminReply: true,
            createdAt: true,
            attachments: true,
          },
        },
      },
    });

    if (!ticket) return null;

    return {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      closedAt: ticket.closedAt?.toISOString() || null,
      partner: {
        id: ticket.partner.id,
        name: `${ticket.partner.firstName} ${ticket.partner.lastName}`,
        email: ticket.partner.email,
        level: ticket.partner.level,
      },
      messages: ticket.messages.map((m) => ({
        id: m.id,
        content: m.content,
        isAdminReply: m.isAdminReply,
        createdAt: m.createdAt.toISOString(),
        attachments: m.attachments,
      })),
    };
  }

  /**
   * Reply to a ticket
   */
  static async replyToTicket(id: string, content: string, adminName: string) {
    const message = await db.ticketMessage.create({
      data: {
        ticketId: id,
        content,
        isAdminReply: true,
        adminName,
      },
    });

    // Update ticket status to IN_PROGRESS if it was OPEN
    await db.supportTicket.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        updatedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "ticket",
        entityId: id,
        action: "admin_reply",
        performedBy: adminName,
        performerType: "admin",
      },
    });

    return {
      id: message.id,
      content: message.content,
      isAdminReply: message.isAdminReply,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Update ticket status
   */
  static async updateTicketStatus(id: string, status: TicketStatus) {
    const ticket = await db.supportTicket.update({
      where: { id },
      data: {
        status,
        ...(status === "CLOSED" && { closedAt: new Date() }),
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "ticket",
        entityId: id,
        action: "status_change",
        performedBy: "admin",
        performerType: "admin",
        newValue: { status },
      },
    });

    return {
      id: ticket.id,
      status: ticket.status,
    };
  }

  /**
   * Update ticket priority
   */
  static async updateTicketPriority(id: string, priority: TicketPriority) {
    const ticket = await db.supportTicket.update({
      where: { id },
      data: { priority },
    });

    await db.auditLog.create({
      data: {
        entityType: "ticket",
        entityId: id,
        action: "priority_change",
        performedBy: "admin",
        performerType: "admin",
        newValue: { priority },
      },
    });

    return {
      id: ticket.id,
      priority: ticket.priority,
    };
  }
}
