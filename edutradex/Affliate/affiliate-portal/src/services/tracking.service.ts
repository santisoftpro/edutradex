import { db } from "@/lib/db";
import { NotFoundError, BusinessError } from "@/lib/errors";
import { ATTRIBUTION_CONFIG } from "@/lib/constants";
import { PartnerService } from "./partner.service";
import type { LinkType, ProgramType, Prisma } from "@prisma/client";

/**
 * Tracking Service
 * Handles tracking links and attribution logic
 */
export class TrackingService {
  /**
   * Create a new tracking link
   */
  static async createLink(
    partnerId: string,
    data: {
      comment?: string;
      type: LinkType;
      program?: ProgramType;
    }
  ) {
    const code = await this.generateUniqueCode();

    const link = await db.trackingLink.create({
      data: {
        partnerId,
        code,
        comment: data.comment || null,
        type: data.type,
        program: data.program || "REVENUE_SHARE",
        isActive: true,
        clickCount: 0,
      },
    });

    return {
      ...link,
      fullUrl: this.buildTrackingUrl(link.code),
    };
  }

  /**
   * Generate unique tracking code
   */
  private static async generateUniqueCode(): Promise<string> {
    const characters = "abcdefghjkmnpqrstuvwxyz23456789";
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = "";
      for (let i = 0; i < 10; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existing = await db.trackingLink.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    }

    // Fallback
    return `t${Date.now().toString(36)}`;
  }

  /**
   * Build full tracking URL
   */
  static buildTrackingUrl(code: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BROKER_URL || "https://broker.optigo.com";
    return `${baseUrl}?ref=${code}`;
  }

  /**
   * Get partner's tracking links with stats
   */
  static async getPartnerLinks(
    partnerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      isActive?: boolean;
    }
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TrackingLinkWhereInput = {
      partnerId,
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    };

    const [links, total] = await Promise.all([
      db.trackingLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              traders: true,
            },
          },
        },
      }),
      db.trackingLink.count({ where }),
    ]);

    // Get FTD counts for each link
    const linksWithStats = await Promise.all(
      links.map(async (link) => {
        const ftdCount = await db.trader.count({
          where: {
            linkId: link.id,
            hasFTD: true,
          },
        });

        return {
          id: link.id,
          code: link.code,
          comment: link.comment,
          type: link.type,
          program: link.program,
          isActive: link.isActive,
          clickCount: link.clickCount,
          registrations: link._count.traders,
          ftdCount,
          createdAt: link.createdAt,
          fullUrl: this.buildTrackingUrl(link.code),
        };
      })
    );

    return {
      data: linksWithStats,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get link by ID (with partner verification)
   */
  static async getLinkById(linkId: string, partnerId: string) {
    const link = await db.trackingLink.findFirst({
      where: {
        id: linkId,
        partnerId,
      },
    });

    if (!link) {
      throw new NotFoundError("Tracking link");
    }

    return {
      ...link,
      fullUrl: this.buildTrackingUrl(link.code),
    };
  }

  /**
   * Update tracking link
   */
  static async updateLink(
    linkId: string,
    partnerId: string,
    data: {
      comment?: string;
      isActive?: boolean;
    }
  ) {
    // Verify ownership
    await this.getLinkById(linkId, partnerId);

    const link = await db.trackingLink.update({
      where: { id: linkId },
      data: {
        ...(data.comment !== undefined && { comment: data.comment }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return {
      ...link,
      fullUrl: this.buildTrackingUrl(link.code),
    };
  }

  /**
   * Delete tracking link
   */
  static async deleteLink(linkId: string, partnerId: string) {
    // Verify ownership
    await this.getLinkById(linkId, partnerId);

    // Check if link has traders
    const traderCount = await db.trader.count({
      where: { linkId },
    });

    if (traderCount > 0) {
      throw new BusinessError(
        "Cannot delete a link that has referred traders. Deactivate it instead.",
        "LINK_HAS_TRADERS"
      );
    }

    await db.trackingLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * Record a click on a tracking link
   */
  static async recordClick(
    code: string,
    metadata?: {
      ip?: string;
      userAgent?: string;
      referer?: string;
      country?: string;
    }
  ) {
    const link = await db.trackingLink.findUnique({
      where: { code },
      select: { id: true, isActive: true, partnerId: true },
    });

    if (!link || !link.isActive) {
      return null;
    }

    // Increment click count
    await db.trackingLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    // Record click details
    await db.linkClick.create({
      data: {
        linkId: link.id,
        ipAddress: metadata?.ip || null,
        userAgent: metadata?.userAgent || null,
        referer: metadata?.referer || null,
        country: metadata?.country || null,
      },
    });

    return {
      linkId: link.id,
      partnerId: link.partnerId,
      cookieExpiry: ATTRIBUTION_CONFIG.COOKIE_WINDOW_DAYS,
    };
  }

  /**
   * Attribute a trader to a partner via tracking link
   * First-click attribution model
   */
  static async attributeTrader(
    trackingCode: string,
    traderData: {
      tradingUid: string;
      email?: string;
      country?: string;
      deviceFingerprint?: string;
    }
  ) {
    const link = await db.trackingLink.findUnique({
      where: { code: trackingCode },
      include: { partner: { select: { id: true, status: true } } },
    });

    if (!link || !link.isActive) {
      return null;
    }

    if (link.partner.status !== "ACTIVE") {
      return null;
    }

    // Check for existing trader (by trading UID)
    const existingTrader = await db.trader.findUnique({
      where: { tradingUid: traderData.tradingUid },
    });

    // First-click wins - don't re-attribute existing traders
    if (existingTrader) {
      return null;
    }

    // Create trader with attribution
    const trader = await db.trader.create({
      data: {
        partnerId: link.partnerId,
        linkId: link.id,
        tradingUid: traderData.tradingUid,
        email: traderData.email,
        country: traderData.country,
        deviceFingerprint: traderData.deviceFingerprint,
        hasFTD: false,
        balance: 0,
        totalDeposits: 0,
        depositCount: 0,
        totalWithdrawals: 0,
        profit: 0,
        loss: 0,
        netPL: 0,
        turnover: 0,
      },
    });

    // Increment partner's trader count
    await PartnerService.incrementTraderCount(link.partnerId);

    return {
      traderId: trader.id,
      partnerId: link.partnerId,
      linkId: link.id,
    };
  }

  /**
   * Get link statistics
   */
  static async getLinkStats(linkId: string, partnerId: string) {
    // Verify ownership
    await this.getLinkById(linkId, partnerId);

    const [link, traders, ftdTraders, totalDeposits, totalCommission] =
      await Promise.all([
        db.trackingLink.findUnique({
          where: { id: linkId },
        }),
        db.trader.count({
          where: { linkId },
        }),
        db.trader.count({
          where: { linkId, hasFTD: true },
        }),
        db.trader.aggregate({
          where: { linkId },
          _sum: { totalDeposits: true },
        }),
        db.commission.aggregate({
          where: {
            trader: { linkId },
            status: "CREDITED",
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      clicks: link?.clickCount || 0,
      registrations: traders,
      ftdCount: ftdTraders,
      conversionRate: link?.clickCount
        ? ((traders / link.clickCount) * 100).toFixed(2)
        : "0.00",
      ftdRate: traders ? ((ftdTraders / traders) * 100).toFixed(2) : "0.00",
      totalDeposits: totalDeposits._sum?.totalDeposits || 0,
      totalCommission: totalCommission._sum?.amount || 0,
    };
  }

  /**
   * Get recent clicks for a link
   */
  static async getLinkClicks(
    linkId: string,
    partnerId: string,
    options?: {
      page?: number;
      pageSize?: number;
    }
  ) {
    // Verify ownership
    await this.getLinkById(linkId, partnerId);

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [clicks, total] = await Promise.all([
      db.linkClick.findMany({
        where: { linkId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          ipAddress: true,
          country: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      db.linkClick.count({ where: { linkId } }),
    ]);

    return {
      data: clicks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
