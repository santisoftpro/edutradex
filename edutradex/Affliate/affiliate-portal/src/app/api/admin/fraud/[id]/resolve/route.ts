import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminFraudService } from "@/services/admin/fraud.service";

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

    if (!body.resolution?.trim()) {
      return NextResponse.json(
        { message: "Resolution notes are required" },
        { status: 400 }
      );
    }

    const adminName = session.user.name || "Admin";
    const result = await AdminFraudService.resolveFraudLog(id, body.resolution, adminName);

    return NextResponse.json({
      message: "Fraud alert resolved",
      data: result,
    });
  } catch (error) {
    console.error("Error resolving fraud log:", error);
    return NextResponse.json(
      { message: "Failed to resolve fraud alert" },
      { status: 500 }
    );
  }
}
