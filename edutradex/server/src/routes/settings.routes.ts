import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin/admin.service.js';

const router = Router();

// Public settings that can be accessed without authentication
const PUBLIC_SETTINGS = [
  'USER_CLEAR_HISTORY_ENABLED',
  'MAINTENANCE_MODE',
  'REGISTRATION_ENABLED',
];

// Get a specific public setting
router.get(
  '/:key',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key } = req.params;

      // Only allow access to public settings
      if (!PUBLIC_SETTINGS.includes(key)) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const value = await adminService.getSystemSetting(key);

      res.json({
        success: true,
        data: {
          key,
          value: value ?? 'false', // Default to 'false' if not set
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
