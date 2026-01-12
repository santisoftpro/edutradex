import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminNewsService } from "@/services/admin/news.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const news = await AdminNewsService.togglePublish(id);

    return NextResponse.json({
      message: news.isPublished ? "Article published" : "Article unpublished",
      data: news,
    });
  } catch (error) {
    console.error("Error toggling publish:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 }
    );
  }
}
