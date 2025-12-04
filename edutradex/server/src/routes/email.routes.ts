import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { emailService } from '../services/email/email.service.js';
import { prisma } from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  userId: z.string().uuid().optional(),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  sendToAll: z.boolean().optional(),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

// Admin: Send message to specific user
router.post(
  '/admin/send-message',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = sendMessageSchema.parse(req.body);
      const adminId = (req as any).user.id;

      if (body.sendToAll) {
        // Send to all users
        const result = await emailService.sendBulkAdminMessage(
          body.subject,
          body.content,
          adminId
        );

        res.json({
          success: true,
          data: {
            message: 'Bulk message sent successfully',
            sent: result.sent,
            failed: result.failed,
          },
        });
      }

      if (!body.userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required when not sending to all',
        });
      }

      // Send to specific user
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const sent = await emailService.sendAdminMessage(
        user.email,
        user.name,
        body.subject,
        body.content,
        adminId
      );

      res.json({
        success: true,
        data: {
          message: sent ? 'Message sent successfully' : 'Failed to send message',
          sent,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Get sent messages history
router.get(
  '/admin/messages',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.adminMessage.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.adminMessage.count(),
      ]);

      // Get recipient info for messages
      const userIds = messages.map(m => m.recipientId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });

      const usersMap = new Map(users.map(u => [u.id, u]));

      const messagesWithRecipients = messages.map(m => ({
        ...m,
        recipient: m.recipientId ? usersMap.get(m.recipientId) || null : null,
        isGlobal: !m.recipientId,
      }));

      res.json({
        success: true,
        data: {
          messages: messagesWithRecipients,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Public: Verify email code (for signup verification)
router.post(
  '/verify-code',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = verifyCodeSchema.parse(req.body);

      const verified = await emailService.verifyCode(body.email, body.code);

      if (!verified) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired verification code',
        });
      }

      res.json({
        success: true,
        data: { verified: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Public: Request verification code (for signup)
router.post(
  '/send-verification',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, name } = req.body;

      if (!email || !name) {
        res.status(400).json({
          success: false,
          error: 'Email and name are required',
        });
      }

      const code = await emailService.sendVerificationCode(email, name);

      if (!code) {
        res.status(500).json({
          success: false,
          error: 'Failed to send verification code',
        });
      }

      res.json({
        success: true,
        data: { message: 'Verification code sent to your email' },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
