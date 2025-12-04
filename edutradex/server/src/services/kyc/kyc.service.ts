import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { emailService } from '../email/email.service.js';

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

class KYCServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'KYCServiceError';
  }
}

export class KYCService {
  async getKYCStatus(userId: string) {
    const kyc = await prisma.kYC.findUnique({ where: { userId } });
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
    const existing = await prisma.kYC.findUnique({ where: { userId } });
    if (existing && existing.status === 'APPROVED') {
      throw new KYCServiceError('KYC already approved', 400);
    }
    if (existing && existing.status === 'PENDING') {
      throw new KYCServiceError('KYC verification is pending review', 400);
    }

    const kyc = await prisma.kYC.upsert({
      where: { userId },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        nationality: data.nationality,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        phoneNumber: data.phoneNumber,
        status: 'NOT_SUBMITTED',
      },
      create: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        nationality: data.nationality,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        phoneNumber: data.phoneNumber,
        status: 'NOT_SUBMITTED',
      },
    });
    logger.info('KYC personal info submitted', { userId, kycId: kyc.id });
    return kyc;
  }

  async submitDocuments(userId: string, data: DocumentInfo) {
    const existing = await prisma.kYC.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!existing) {
      throw new KYCServiceError('Please submit personal information first', 400);
    }
    if (existing.status === 'APPROVED') {
      throw new KYCServiceError('KYC already approved', 400);
    }
    if (existing.status === 'PENDING') {
      throw new KYCServiceError('KYC verification is pending review', 400);
    }

    const kyc = await prisma.kYC.update({
      where: { userId },
      data: {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        documentFront: data.documentFront,
        documentBack: data.documentBack,
        selfieWithId: data.selfieWithId,
        status: 'PENDING',
        submittedAt: new Date(),
        rejectionReason: null,
      },
      include: { user: { select: { email: true, name: true } } },
    });

    // Send email notification
    await emailService.sendKYCSubmitted(kyc.user.email, kyc.user.name);

    logger.info('KYC documents submitted', { userId, kycId: kyc.id });
    return kyc;
  }

  async getAllKYCSubmissions(filters: { status?: KYCStatus; page?: number; limit?: number } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;

    const [submissions, total] = await Promise.all([
      prisma.kYC.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.kYC.count({ where }),
    ]);
    return { data: submissions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getKYCById(kycId: string) {
    const kyc = await prisma.kYC.findUnique({
      where: { id: kycId },
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
    });
    if (!kyc) throw new KYCServiceError('KYC submission not found', 404);
    return kyc;
  }

  async approveKYC(kycId: string, adminId: string, adminNote?: string) {
    const kyc = await prisma.kYC.findUnique({
      where: { id: kycId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!kyc) throw new KYCServiceError('KYC submission not found', 404);
    if (kyc.status === 'APPROVED') throw new KYCServiceError('KYC already approved', 400);

    const updated = await prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNote,
        rejectionReason: null,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // Send email notification
    await emailService.sendKYCApproved(updated.user.email, updated.user.name);

    logger.info('KYC approved', { kycId, userId: kyc.userId, approvedBy: adminId });
    return updated;
  }

  async rejectKYC(kycId: string, adminId: string, reason: string, adminNote?: string) {
    const kyc = await prisma.kYC.findUnique({
      where: { id: kycId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!kyc) throw new KYCServiceError('KYC submission not found', 404);
    if (kyc.status === 'APPROVED') throw new KYCServiceError('Cannot reject approved KYC', 400);

    const updated = await prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        adminNote,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // Send email notification
    await emailService.sendKYCRejected(updated.user.email, updated.user.name, reason);

    logger.info('KYC rejected', { kycId, userId: kyc.userId, rejectedBy: adminId, reason });
    return updated;
  }

  async getPendingKYCCount() {
    return prisma.kYC.count({ where: { status: 'PENDING' } });
  }

  async getKYCStats() {
    const [notSubmitted, pending, approved, rejected] = await Promise.all([
      prisma.kYC.count({ where: { status: 'NOT_SUBMITTED' } }),
      prisma.kYC.count({ where: { status: 'PENDING' } }),
      prisma.kYC.count({ where: { status: 'APPROVED' } }),
      prisma.kYC.count({ where: { status: 'REJECTED' } }),
    ]);
    return { notSubmitted, pending, approved, rejected };
  }
}

export const kycService = new KYCService();
export { KYCServiceError };
