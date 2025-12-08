import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { emailService } from '../services/email/email.service.js';
import { queryOne, queryMany } from '../config/db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

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

interface AdminMessageRow {
  id: string;
  senderId: string;
  recipientId: string | null;
  subject: string;
  content: string;
  type: string;
  sentViaEmail: boolean;
  createdAt: Date;
}

router.post(
  '/admin/send-message',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = sendMessageSchema.parse(req.body);
      const adminId = (req as any).user.id;

      if (body.sendToAll) {
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

      const user = await queryOne<{ id: string; email: string; name: string }>(
        `SELECT id, email, name FROM "User" WHERE id = $1`,
        [body.userId]
      );

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

router.get(
  '/admin/messages',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const [messages, countResult] = await Promise.all([
        queryMany<AdminMessageRow>(
          `SELECT * FROM "AdminMessage" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM "AdminMessage"`
        ),
      ]);

      const total = parseInt(countResult?.count || '0', 10);

      const userIds = messages.map(m => m.recipientId).filter(Boolean) as string[];
      let users: { id: string; name: string; email: string }[] = [];
      if (userIds.length > 0) {
        users = await queryMany<{ id: string; name: string; email: string }>(
          `SELECT id, name, email FROM "User" WHERE id = ANY($1)`,
          [userIds]
        );
      }

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
