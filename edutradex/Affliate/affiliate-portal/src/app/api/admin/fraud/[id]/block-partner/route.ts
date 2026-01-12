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
    const adminName = session.user.name || "Admin";
    const result = await AdminFraudService.blockPartnerFromFraud(id, adminName);

    return NextResponse.json({
      message: "Partner blocked",
      data: result,
    });
  } catch (error) {
    console.error("Error blocking partner:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to block partner" },
      { status: 500 }
    );
  }
}
