import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminLevelReviewsService } from "@/services/admin/level-reviews.service";

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
    const body = await request.json();

    if (!body.adminNotes?.trim()) {
      return NextResponse.json(
        { message: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const review = await AdminLevelReviewsService.rejectReview(id, body.adminNotes);

    return NextResponse.json({
      message: "Level review rejected",
      data: review,
    });
  } catch (error) {
    console.error("Error rejecting level review:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to reject" },
      { status: 500 }
    );
  }
}
