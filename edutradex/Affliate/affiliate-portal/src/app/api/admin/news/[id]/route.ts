import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminNewsService } from "@/services/admin/news.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const news = await AdminNewsService.updateNews(id, {
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: body.content,
      category: body.category,
      imageUrl: body.imageUrl || undefined,
      isPublished: body.isPublished,
      isPinned: body.isPinned,
    });

    return NextResponse.json({
      message: "Article updated",
      data: news,
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { message: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await AdminNewsService.deleteNews(id);

    return NextResponse.json({
      message: "Article deleted",
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    return NextResponse.json(
      { message: "Failed to delete article" },
      { status: 500 }
    );
  }
}
