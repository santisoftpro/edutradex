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

    const withdrawal = await AdminWithdrawalsService.approveWithdrawal(id, body.txId);

    return NextResponse.json({
      message: "Withdrawal approved",
      withdrawal: {
        id: withdrawal.id,
        status: withdrawal.status,
      },
    });
  } catch (error) {
    console.error("Error approving withdrawal:", error);
    return NextResponse.json(
      { message: "Failed to approve withdrawal" },
      { status: 500 }
    );
  }
}
