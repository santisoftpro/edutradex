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

    const review = await AdminLevelReviewsService.approveReview(id, body.adminNotes);

    return NextResponse.json({
      message: "Level upgrade approved",
      data: review,
    });
  } catch (error) {
    console.error("Error approving level review:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to approve" },
      { status: 500 }
    );
  }
}
