import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supportService } from '../services/support/support.service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Validation schemas
const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(20, 'Message must be at least 20 characters').max(5000),
  category: z.enum(['GENERAL', 'DEPOSIT', 'WITHDRAWAL', 'TRADING', 'ACCOUNT', 'TECHNICAL']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

const replyTicketSchema = z.object({
  reply: z.string().min(1, 'Reply is required').max(5000),
  closeTicket: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'REPLIED', 'RESOLVED', 'CLOSED']),
});

// ============= Admin Routes (MUST be before /:ticketId) =============

// Get all tickets (admin only)
router.get(
  '/admin/all',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      const priority = req.query.priority as string | undefined;

      const filters: Record<string, string> = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (priority) filters.priority = priority;

      const result = await supportService.getAllTickets(filters, page, limit);

      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get ticket statistics (admin only)
router.get(
  '/admin/stats',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await supportService.getTicketStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reply to ticket (admin only)
router.post(
  '/admin/:ticketId/reply',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ticketId } = req.params;
      const parsed = replyTicketSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const ticket = await supportService.replyToTicket({
        ticketId,
        adminId: req.user!.id,
        reply: parsed.data.reply,
        closeTicket: parsed.data.closeTicket,
      });

      res.json({
        success: true,
        message: parsed.data.closeTicket
          ? 'Ticket replied and closed'
          : 'Reply sent successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update ticket status (admin only)
router.patch(
  '/admin/:ticketId/status',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ticketId } = req.params;
      const parsed = updateStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const ticket = await supportService.updateTicketStatus(
        ticketId,
        parsed.data.status,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Ticket status updated',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============= User Routes =============

// Create a new support ticket
router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createTicketSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues,
        });
        return;
      }

      const ticket = await supportService.createTicket({
        userId: req.user!.id,
        ...parsed.data,
      });

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's tickets
router.get(
  '/my-tickets',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tickets = await supportService.getUserTickets(req.user!.id);

      res.json({
        success: true,
        data: tickets,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single ticket (user can only see their own) - MUST be last due to :ticketId param
router.get(
  '/:ticketId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ticketId } = req.params;
      const isAdmin = req.user!.role === 'ADMIN';

      const ticket = await supportService.getTicket(
        ticketId,
        isAdmin ? undefined : req.user!.id
      );

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
        return;
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
