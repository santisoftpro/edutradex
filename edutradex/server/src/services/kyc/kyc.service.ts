import { query, queryOne, queryMany } from '../../config/db.js';
import { logger } from '../../utils/logger.js';
import { emailService } from '../email/email.service.js';
import { randomUUID } from 'crypto';

export type KYCStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type DocumentType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  phoneNumber: string;
}

interface DocumentInfo {
  documentType: DocumentType;
  documentNumber: string;
  documentFront: string;
  documentBack?: string;
  selfieWithId: string;
}

interface KYCRow {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  phoneNumber: string | null;
  documentType: string | null;
  documentNumber: string | null;
  documentFront: string | null;
  documentBack: string | null;
  selfieWithId: string | null;
  status: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

class KYCServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'KYCServiceError';
  }
}

export class KYCService {
  async getKYCStatus(userId: string) {
    const kyc = await queryOne<KYCRow>(
      `SELECT * FROM "KYC" WHERE "userId" = $1`,
      [userId]
    );

    if (!kyc) {
      return { status: 'NOT_SUBMITTED', message: 'KYC verification not started' };
    }

    return {
      id: kyc.id,
      status: kyc.status,
      firstName: kyc.firstName,
      lastName: kyc.lastName,
      documentType: kyc.documentType,
      submittedAt: kyc.submittedAt,
      reviewedAt: kyc.reviewedAt,
      rejectionReason: kyc.rejectionReason,
    };
  }

  async submitPersonalInfo(userId: string, data: PersonalInfo) {
    const existing = await queryOne<KYCRow>(
      `SELECT * FROM "KYC" WHERE "userId" = $1`,
      [userId]
    );

    if (existing && existing.status === 'APPROVED') {
      throw new KYCServiceError('KYC already approved', 400);
    }
    if (existing && existing.status === 'PENDING') {
      throw new KYCServiceError('KYC verification is pending review', 400);
    }

    const now = new Date();
    const dateOfBirth = new Date(data.dateOfBirth);

    // Validate date of birth
    if (isNaN(dateOfBirth.getTime())) {
      throw new KYCServiceError('Invalid date of birth', 400);
    }

    if (dateOfBirth > now) {
      throw new KYCServiceError('Date of birth cannot be in the future', 400);
    }

    // Check minimum age (18 years)
    const minAge = 18;
    const minDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
    if (dateOfBirth > minDate) {
      throw new KYCServiceError(`You must be at least ${minAge} years old`, 400);
    }

    // Check maximum age (120 years - reasonable limit)
    const maxAge = 120;
    const maxDate = new Date(now.getFullYear() - maxAge, now.getMonth(), now.getDate());
    if (dateOfBirth < maxDate) {
      throw new KYCServiceError('Invalid date of birth - please check the date', 400);
    }

    let kyc: KYCRow;

    if (existing) {
      const updateResult = await queryOne<KYCRow>(
        `UPDATE "KYC" SET
          "firstName" = $1, "lastName" = $2, "dateOfBirth" = $3, "nationality" = $4,
          "address" = $5, "city" = $6, "country" = $7, "postalCode" = $8, "phoneNumber" = $9,
          "status" = 'NOT_SUBMITTED', "updatedAt" = $10
         WHERE "userId" = $11 RETURNING *`,
        [data.firstName, data.lastName, dateOfBirth, data.nationality, data.address,
         data.city, data.country, data.postalCode, data.phoneNumber, now, userId]
      );

      if (!updateResult) {
        throw new KYCServiceError('Failed to update KYC record', 500);
      }

      kyc = updateResult;
    } else {
      const id = randomUUID();
      const insertResult = await queryOne<KYCRow>(
        `INSERT INTO "KYC" (
          "id", "userId", "firstName", "lastName", "dateOfBirth", "nationality",
          "address", "city", "country", "postalCode", "phoneNumber", "status", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [id, userId, data.firstName, data.lastName, dateOfBirth, data.nationality,
         data.address, data.city, data.country, data.postalCode, data.phoneNumber, 'NOT_SUBMITTED', now, now]
      );

      if (!insertResult) {
        throw new KYCServiceError('Failed to create KYC record', 500);
      }

      kyc = insertResult;
    }

    logger.info('KYC personal info submitted', { userId, kycId: kyc.id });
    return kyc;
  }

  async submitDocuments(userId: string, data: DocumentInfo) {
    const existing = await queryOne<KYCRow & { userEmail: string; userName: string }>(
      `SELECT k.*, u.email as "userEmail", u.name as "userName"
       FROM "KYC" k
       JOIN "User" u ON u.id = k."userId"
       WHERE k."userId" = $1`,
      [userId]
    );

    if (!existing) {
      throw new KYCServiceError('Please submit personal information first', 400);
    }
    if (existing.status === 'APPROVED') {
      throw new KYCServiceError('KYC already approved', 400);
    }
    if (existing.status === 'PENDING') {
      throw new KYCServiceError('KYC verification is pending review', 400);
    }

    const now = new Date();

    const kyc = await queryOne<KYCRow>(
      `UPDATE "KYC" SET
        "documentType" = $1, "documentNumber" = $2, "documentFront" = $3,
        "documentBack" = $4, "selfieWithId" = $5, "status" = 'PENDING',
        "submittedAt" = $6, "rejectionReason" = NULL, "updatedAt" = $6
       WHERE "userId" = $7 RETURNING *`,
      [data.documentType, data.documentNumber, data.documentFront,
       data.documentBack, data.selfieWithId, now, userId]
    );

    if (!kyc) {
      throw new KYCServiceError('Failed to update KYC documents', 500);
    }

    // Send email notification
    await emailService.sendKYCSubmitted(existing.userEmail, existing.userName);

    logger.info('KYC documents submitted', { userId, kycId: kyc.id });

    return {
      ...kyc,
      user: { email: existing.userEmail, name: existing.userName },
    };
  }

  async getAllKYCSubmissions(filters: { status?: KYCStatus; page?: number; limit?: number } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClause += ` AND k."status" = $${paramIndex++}`;
      params.push(filters.status);
    }

    const countParams: (string | number)[] = [...params];
    params.push(limit, offset);

    const [submissions, countResult] = await Promise.all([
      queryMany<KYCRow & { userName: string; userEmail: string; userCreatedAt: Date }>(
        `SELECT k.*, u.name as "userName", u.email as "userEmail", u."createdAt" as "userCreatedAt"
         FROM "KYC" k
         JOIN "User" u ON u.id = k."userId"
         WHERE ${whereClause}
         ORDER BY k."submittedAt" DESC NULLS LAST
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM "KYC" k WHERE ${whereClause}`,
        countParams
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: submissions.map(s => ({
        ...s,
        user: { id: s.userId, email: s.userEmail, name: s.userName, createdAt: s.userCreatedAt },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getKYCById(kycId: string) {
    const kyc = await queryOne<KYCRow & { userName: string; userEmail: string; userCreatedAt: Date }>(
      `SELECT k.*, u.name as "userName", u.email as "userEmail", u."createdAt" as "userCreatedAt"
       FROM "KYC" k
       JOIN "User" u ON u.id = k."userId"
       WHERE k.id = $1`,
      [kycId]
    );

    if (!kyc) throw new KYCServiceError('KYC submission not found', 404);

    return {
      ...kyc,
      user: { id: kyc.userId, email: kyc.userEmail, name: kyc.userName, createdAt: kyc.userCreatedAt },
    };
  }

  async approveKYC(kycId: string, adminId: string, adminNote?: string) {
    const kyc = await queryOne<KYCRow & { userName: string; userEmail: string }>(
      `SELECT k.*, u.name as "userName", u.email as "userEmail"
       FROM "KYC" k
       JOIN "User" u ON u.id = k."userId"
       WHERE k.id = $1`,
      [kycId]
    );

    if (!kyc) throw new KYCServiceError('KYC submission not found', 404);
    if (kyc.status === 'APPROVED') throw new KYCServiceError('KYC already approved', 400);

    const now = new Date();

    const updated = await queryOne<KYCRow>(
      `UPDATE "KYC" SET
        status = 'APPROVED', "reviewedBy" = $1, "reviewedAt" = $2, "adminNote" = $3,
        "rejectionReason" = NULL, "updatedAt" = $2
       WHERE id = $4 RETURNING *`,
      [adminId, now, adminNote, kycId]
    );

    // Send email notification
    await emailService.sendKYCApproved(kyc.userEmail, kyc.userName);

    logger.info('KYC approved', { kycId, userId: kyc.userId, approvedBy: adminId });

    return {
      ...updated,
      user: { id: kyc.userId, email: kyc.userEmail, name: kyc.userName },
    };
  }

  async rejectKYC(kycId: string, adminId: string, reason: string, adminNote?: string) {
    const kyc = await queryOne<KYCRow & { userName: string; userEmail: string }>(
      `SELECT k.*, u.name as "userName", u.email as "userEmail"
       FROM "KYC" k
       JOIN "User" u ON u.id = k."userId"
       WHERE k.id = $1`,
      [kycId]
    );

    if (!kyc) throw new KYCServiceError('KYC submission not found', 404);
    if (kyc.status === 'APPROVED') throw new KYCServiceError('Cannot reject approved KYC', 400);

    const now = new Date();

    const updated = await queryOne<KYCRow>(
      `UPDATE "KYC" SET
        status = 'REJECTED', "reviewedBy" = $1, "reviewedAt" = $2,
        "rejectionReason" = $3, "adminNote" = $4, "updatedAt" = $2
       WHERE id = $5 RETURNING *`,
      [adminId, now, reason, adminNote, kycId]
    );

    // Send email notification
    await emailService.sendKYCRejected(kyc.userEmail, kyc.userName, reason);

    logger.info('KYC rejected', { kycId, userId: kyc.userId, rejectedBy: adminId, reason });

    return {
      ...updated,
      user: { id: kyc.userId, email: kyc.userEmail, name: kyc.userName },
    };
  }

  async getPendingKYCCount() {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM "KYC" WHERE status = 'PENDING'`
    );
    return parseInt(result?.count || '0', 10);
  }

  async getKYCStats() {
    // Single query with FILTER for all counts
    const result = await queryOne<{
      not_submitted: string;
      pending: string;
      approved: string;
      rejected: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'NOT_SUBMITTED') as not_submitted,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM "KYC"
    `);

    return {
      notSubmitted: parseInt(result?.not_submitted || '0', 10),
      pending: parseInt(result?.pending || '0', 10),
      approved: parseInt(result?.approved || '0', 10),
      rejected: parseInt(result?.rejected || '0', 10),
    };
  }
}

export const kycService = new KYCService();
export { KYCServiceError };
