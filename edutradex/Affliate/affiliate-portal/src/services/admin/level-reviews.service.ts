import { db } from "@/lib/db";
import type { LevelReviewStatus, Prisma } from "@prisma/client";

export class AdminLevelReviewsService {
  /**
   * Get all level review requests with pagination and filtering
   */
  static async getLevelReviews(options?: {
    page?: number;
    pageSize?: number;
    status?: LevelReviewStatus;
    sortBy?: "requestedAt" | "requestedLevel";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.LevelReviewWhereInput = {
      ...(options?.status && { status: options.status }),
    };

    const orderBy: Prisma.LevelReviewOrderByWithRelationInput = {
      [options?.sortBy || "requestedAt"]: options?.sortOrder || "desc",
    };

    const [reviews, total] = await Promise.all([
      db.levelReview.findMany({
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
              totalFTD: true,
              totalTraders: true,
              totalEarned: true,
            },
          },
        },
      }),
      db.levelReview.count({ where }),
    ]);

    return {
      data: reviews.map((r) => ({
        id: r.id,
        currentLevel: r.currentLevel,
        requestedLevel: r.requestedLevel,
        status: r.status,
        notes: r.notes,
        adminNotes: r.adminNotes,
        requestedAt: r.requestedAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() || null,
        partner: {
          id: r.partner.id,
          name: `${r.partner.firstName} ${r.partner.lastName}`,
          email: r.partner.email,
          currentLevel: r.partner.level,
          totalFTD: r.partner.totalFTD,
          totalTraders: r.partner.totalTraders,
          totalEarned: Number(r.partner.totalEarned),
        },
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Approve level review request
   */
  static async approveReview(id: string, adminNotes?: string) {
    const review = await db.levelReview.findUnique({
      where: { id },
      include: { partner: true },
    });

    if (!review) {
      throw new Error("Review not found");
    }

    // Update review status
    const updatedReview = await db.levelReview.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNotes,
        reviewedAt: new Date(),
      },
    });

    // Update partner level
    await db.partner.update({
      where: { id: review.partnerId },
      data: { level: review.requestedLevel },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        entityType: "level_review",
        entityId: id,
        action: "approved",
        performedBy: "admin",
        performerType: "admin",
        newValue: {
          previousLevel: review.currentLevel,
          newLevel: review.requestedLevel,
          adminNotes,
        },
      },
    });

    return {
      id: updatedReview.id,
      status: updatedReview.status,
    };
  }

  /**
   * Reject level review request
   */
  static async rejectReview(id: string, adminNotes: string) {
    const review = await db.levelReview.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNotes,
        reviewedAt: new Date(),
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        entityType: "level_review",
        entityId: id,
        action: "rejected",
        performedBy: "admin",
        performerType: "admin",
        newValue: { adminNotes },
      },
    });

    return {
      id: review.id,
      status: review.status,
    };
  }
}
