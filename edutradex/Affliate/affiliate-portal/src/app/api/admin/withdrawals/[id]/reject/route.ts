import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminWithdrawalsService } from "@/services/admin/withdrawals.service";

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

    if (!body.reason) {
      return NextResponse.json(
        { message: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const withdrawal = await AdminWithdrawalsService.rejectWithdrawal(id, body.reason);

    return NextResponse.json({
      message: "Withdrawal rejected",
      withdrawal: {
        id: withdrawal.id,
        status: withdrawal.status,
      },
    });
  } catch (error) {
    console.error("Error rejecting withdrawal:", error);
    return NextResponse.json(
      { message: "Failed to reject withdrawal" },
      { status: 500 }
    );
  }
}
