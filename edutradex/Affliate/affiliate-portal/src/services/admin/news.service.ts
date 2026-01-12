import { db } from "@/lib/db";
import type { NewsCategory, Prisma } from "@prisma/client";

export class AdminNewsService {
  /**
   * Get all news articles with pagination
   */
  static async getNews(options?: {
    page?: number;
    pageSize?: number;
    category?: NewsCategory;
    published?: boolean;
    sortBy?: "createdAt" | "publishedAt" | "title";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.NewsWhereInput = {
      ...(options?.category && { category: options.category }),
      ...(options?.published !== undefined && { isPublished: options.published }),
    };

    const orderBy: Prisma.NewsOrderByWithRelationInput = {
      [options?.sortBy || "createdAt"]: options?.sortOrder || "desc",
    };

    const [news, total] = await Promise.all([
      db.news.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      db.news.count({ where }),
    ]);

    return {
      data: news.map((n) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        excerpt: n.excerpt,
        content: n.content,
        category: n.category,
        imageUrl: n.imageUrl,
        isPublished: n.isPublished,
        isPinned: n.isPinned,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        publishedAt: n.publishedAt?.toISOString() || null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get news article by ID
   */
  static async getNewsById(id: string) {
    const news = await db.news.findUnique({
      where: { id },
    });

    if (!news) return null;

    return {
      id: news.id,
      title: news.title,
      slug: news.slug,
      excerpt: news.excerpt,
      content: news.content,
      category: news.category,
      imageUrl: news.imageUrl,
      isPublished: news.isPublished,
      isPinned: news.isPinned,
      createdAt: news.createdAt.toISOString(),
      updatedAt: news.updatedAt.toISOString(),
      publishedAt: news.publishedAt?.toISOString() || null,
    };
  }

  /**
   * Create news article
   */
  static async createNews(data: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: NewsCategory;
    imageUrl?: string;
    isPublished?: boolean;
    isPinned?: boolean;
  }) {
    const news = await db.news.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        imageUrl: data.imageUrl,
        isPublished: data.isPublished || false,
        isPinned: data.isPinned || false,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "news",
        entityId: news.id,
        action: "created",
        performedBy: "admin",
        performerType: "admin",
        newValue: { title: news.title },
      },
    });

    return {
      id: news.id,
      title: news.title,
      slug: news.slug,
    };
  }

  /**
   * Update news article
   */
  static async updateNews(
    id: string,
    data: {
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: string;
      category?: NewsCategory;
      imageUrl?: string;
      isPublished?: boolean;
      isPinned?: boolean;
    }
  ) {
    const existingNews = await db.news.findUnique({ where: { id } });

    const news = await db.news.update({
      where: { id },
      data: {
        ...data,
        // Set publishedAt if publishing for the first time
        ...(data.isPublished && !existingNews?.publishedAt && { publishedAt: new Date() }),
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "news",
        entityId: id,
        action: "updated",
        performedBy: "admin",
        performerType: "admin",
        newValue: data,
      },
    });

    return {
      id: news.id,
      title: news.title,
      slug: news.slug,
    };
  }

  /**
   * Delete news article
   */
  static async deleteNews(id: string) {
    const news = await db.news.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        entityType: "news",
        entityId: id,
        action: "deleted",
        performedBy: "admin",
        performerType: "admin",
        newValue: { title: news.title },
      },
    });

    return { id };
  }

  /**
   * Toggle publish status
   */
  static async togglePublish(id: string) {
    const existingNews = await db.news.findUnique({ where: { id } });
    if (!existingNews) throw new Error("News not found");

    const news = await db.news.update({
      where: { id },
      data: {
        isPublished: !existingNews.isPublished,
        publishedAt: !existingNews.isPublished ? new Date() : existingNews.publishedAt,
      },
    });

    await db.auditLog.create({
      data: {
        entityType: "news",
        entityId: id,
        action: news.isPublished ? "published" : "unpublished",
        performedBy: "admin",
        performerType: "admin",
      },
    });

    return {
      id: news.id,
      isPublished: news.isPublished,
    };
  }
}
