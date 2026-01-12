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

    if (!body.txId) {
      return NextResponse.json(
        { message: "Transaction ID is required" },
        { status: 400 }
      );
    }

    const withdrawal = await AdminWithdrawalsService.completeWithdrawal(id, body.txId);

    return NextResponse.json({
      message: "Withdrawal completed",
      withdrawal: {
        id: withdrawal.id,
        status: withdrawal.status,
      },
    });
  } catch (error) {
    console.error("Error completing withdrawal:", error);
    return NextResponse.json(
      { message: "Failed to complete withdrawal" },
      { status: 500 }
    );
  }
}
