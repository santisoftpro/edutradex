import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WithdrawalService } from "@/services/withdrawal.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await WithdrawalService.cancelRequest(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Withdrawal cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel withdrawal error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Withdrawal not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("Only pending")) {
        return NextResponse.json(
          { error: "Only pending withdrawals can be cancelled" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to cancel withdrawal" },
      { status: 500 }
    );
  }
}
