import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminNewsService } from "@/services/admin/news.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }
    if (!body.slug?.trim()) {
      return NextResponse.json({ message: "Slug is required" }, { status: 400 });
    }
    if (!body.excerpt?.trim()) {
      return NextResponse.json({ message: "Excerpt is required" }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ message: "Content is required" }, { status: 400 });
    }

    const news = await AdminNewsService.createNews({
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: body.content,
      category: body.category || "NEWS",
      imageUrl: body.imageUrl || undefined,
      isPublished: body.isPublished || false,
      isPinned: body.isPinned || false,
    });

    return NextResponse.json({
      message: "Article created",
      data: news,
    });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { message: "Failed to create article" },
      { status: 500 }
    );
  }
}
