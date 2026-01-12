import { db } from "@/lib/db";
import type { FraudLogSeverity, FraudLogType, Prisma } from "@prisma/client";

export class AdminFraudService {
  /**
   * Get all fraud logs with pagination and filtering
   */
  static async getFraudLogs(options?: {
    page?: number;
    pageSize?: number;
    type?: FraudLogType;
    severity?: FraudLogSeverity;
    resolved?: boolean;
    sortBy?: "detectedAt" | "severity";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FraudLogWhereInput = {
      ...(options?.type && { type: options.type }),
      ...(options?.severity && { severity: options.severity }),
      ...(options?.resolved !== undefined && { isResolved: options.resolved }),
    };

    const orderBy: Prisma.FraudLogOrderByWithRelationInput = {
      [options?.sortBy || "detectedAt"]: options?.sortOrder || "desc",
    };

    const [logs, total] = await Promise.all([
      db.fraudLog.findMany({
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
              status: true,
            },
          },
        },
      }),
      db.fraudLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        type: log.type,
        severity: log.severity,
        description: log.description,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        isResolved: log.isResolved,
        resolvedAt: log.resolvedAt?.toISOString() || null,
        resolvedBy: log.resolvedBy,
        resolution: log.resolution,
        detectedAt: log.detectedAt.toISOString(),
        partner: log.partner
          ? {
              id: log.partner.id,
              name: `${log.partner.firstName} ${log.partner.lastName}`,
              email: log.partner.email,
              level: log.partner.level,
              status: log.partner.status,
            }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get fraud statistics
   */
  static async getFraudStats() {
    const [
      totalLogs,
      unresolvedLogs,
      criticalLogs,
      highLogs,
      recentLogs,
    ] = await Promise.all([
      db.fraudLog.count(),
      db.fraudLog.count({ where: { isResolved: false } }),
      db.fraudLog.count({ where: { severity: "CRITICAL", isResolved: false } }),
      db.fraudLog.count({ where: { severity: "HIGH", isResolved: false } }),
      db.fraudLog.count({
        where: {
          detectedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalLogs,
      unresolvedLogs,
      criticalLogs,
      highLogs,
      recentLogs,
    };
  }

  /**
   * Resolve fraud log
   */
  static async resolveFraudLog(id: string, resolution: string, adminName: string) {
    const log = await db.fraudLog.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminName,
        resolution,
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "fraud_log",
        entityId: id,
        action: "resolved",
        performedBy: adminName,
        performerType: "admin",
        newValue: { resolution },
      },
    });

    return {
      id: log.id,
      isResolved: log.isResolved,
    };
  }

  /**
   * Block partner from fraud log
   */
  static async blockPartnerFromFraud(fraudLogId: string, adminName: string) {
    const fraudLog = await db.fraudLog.findUnique({
      where: { id: fraudLogId },
      include: { partner: true },
    });

    if (!fraudLog?.partner) {
      throw new Error("Partner not found for this fraud log");
    }

    // Block the partner
    await db.partner.update({
      where: { id: fraudLog.partnerId! },
      data: { status: "BLOCKED" },
    });

    // Resolve the fraud log
    await db.fraudLog.update({
      where: { id: fraudLogId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminName,
        resolution: `Partner blocked: ${fraudLog.partner.email}`,
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "partner",
        entityId: fraudLog.partnerId!,
        action: "blocked_from_fraud",
        performedBy: adminName,
        performerType: "admin",
        newValue: { fraudLogId, type: fraudLog.type },
      },
    });

    return {
      partnerId: fraudLog.partnerId,
      fraudLogId,
    };
  }
}
