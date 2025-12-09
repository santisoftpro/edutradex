import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { kycService } from '../services/kyc/kyc.service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/kyc');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Validation schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  dateOfBirth: z.string(),
  nationality: z.string().min(2).max(50),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(50),
  country: z.string().min(2).max(50),
  postalCode: z.string().max(20).optional(),
  phoneNumber: z.string().min(8).max(20),
});

const documentInfoSchema = z.object({
  documentType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE']),
  documentNumber: z.string().min(3).max(50),
});

// ==========================================
// USER ROUTES
// ==========================================

// Get KYC status
router.get('/status', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const status = await kycService.getKYCStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// Submit personal information
router.post('/personal-info', authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const data = personalInfoSchema.parse(req.body);
    const kyc = await kycService.submitPersonalInfo(userId, data);
    res.json({ success: true, data: kyc, message: 'Personal information saved successfully' });
  } catch (error) {
    next(error);
  }
});

// Submit documents
router.post(
  '/documents',
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
      { name: 'documentFront', maxCount: 1 },
      { name: 'documentBack', maxCount: 1 },
      { name: 'selfieWithId', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        logger.error('Multer error', { error: err.message });
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || !files.documentFront || !files.selfieWithId) {
        res.status(400).json({
          success: false,
          error: 'Document front and selfie with ID are required',
        });
        return;
      }

      const bodyData = documentInfoSchema.parse(req.body);

      // Normalize paths to use forward slashes for consistency
      const documentData = {
        ...bodyData,
        documentFront: files.documentFront[0].path.replace(/\\/g, '/'),
        documentBack: files.documentBack?.[0]?.path?.replace(/\\/g, '/'),
        selfieWithId: files.selfieWithId[0].path.replace(/\\/g, '/'),
      };

      logger.info('Submitting KYC documents', { userId, documentData });

      const kyc = await kycService.submitDocuments(userId, documentData);
      res.json({ success: true, data: kyc, message: 'Documents submitted for review' });
    } catch (error) {
      logger.error('KYC document submission error', { error: (error as Error).message, stack: (error as Error).stack });
      next(error);
    }
  }
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all KYC submissions
router.get('/admin/list', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await kycService.getAllKYCSubmissions({
      status: status as any,
      page,
      limit,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Get KYC stats
router.get('/admin/stats', authMiddleware, adminMiddleware, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await kycService.getKYCStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Get pending count
router.get('/admin/pending-count', authMiddleware, adminMiddleware, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await kycService.getPendingKYCCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// Get single KYC submission
router.get('/admin/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const kyc = await kycService.getKYCById(req.params.id);
    res.json({ success: true, data: kyc });
  } catch (error) {
    next(error);
  }
});

// Approve KYC
router.post('/admin/:id/approve', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = (req as any).user.id;
    const { adminNote } = req.body;
    const kyc = await kycService.approveKYC(req.params.id, adminId, adminNote);
    res.json({ success: true, data: kyc, message: 'KYC approved successfully' });
  } catch (error) {
    next(error);
  }
});

// Reject KYC
router.post('/admin/:id/reject', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminId = (req as any).user.id;
    const { reason, adminNote } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, error: 'Rejection reason is required' });
      return;
    }

    const kyc = await kycService.rejectKYC(req.params.id, adminId, reason, adminNote);
    res.json({ success: true, data: kyc, message: 'KYC rejected' });
  } catch (error) {
    next(error);
  }
});

// Serve KYC document files (authenticated endpoint)
router.get('/documents/:filename', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ success: false, error: 'Invalid filename' });
      return;
    }

    const filePath = path.join(process.cwd(), 'uploads', 'kyc', filename);

    // Check if file exists
    const fs = await import('fs/promises');
    try {
      await fs.access(filePath);
    } catch (error) {
      logger.error('KYC document not found', { filename, filePath, error: (error as Error).message });
      res.status(404).json({
        success: false,
        error: 'Document not found',
        message: 'The requested document does not exist. This may happen if files were lost during deployment. Please contact support.'
      });
      return;
    }

    // Set proper headers for file type
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    }

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('Error sending KYC document', { filename, error: err.message });
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Failed to send document' });
        }
      }
    });
  } catch (error) {
    logger.error('KYC document serve error', { error: (error as Error).message });
    next(error);
  }
});

export default router;
