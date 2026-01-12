import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { WithdrawalService } from "@/services/withdrawal.service";
import { WITHDRAWAL_CONFIG } from "@/lib/constants";

const withdrawSchema = z.object({
  amount: z.number().min(WITHDRAWAL_CONFIG.MIN_AMOUNT),
  method: z.enum(["CRYPTO", "INTERNAL_TRANSFER"]),
  coin: z.string().optional(),
  network: z.string().optional(),
  address: z.string().optional(),
  tradingUid: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validated = withdrawSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, method, coin, network, address, tradingUid } = validated.data;

    const withdrawal = await WithdrawalService.createRequest(session.user.id, {
      amount,
      method,
      coin,
      network,
      address,
      tradingUid,
    });

    return NextResponse.json(
      {
        success: true,
        data: withdrawal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Withdrawal request error:", error);

    if (error instanceof Error) {
      // Handle business logic errors
      if (
        error.message.includes("Insufficient") ||
        error.message.includes("not active") ||
        error.message.includes("pending withdrawal") ||
        error.message.includes("not allowed today")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Failed to create withdrawal request" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status") as
      | "PENDING"
      | "PROCESSING"
      | "COMPLETED"
      | "REJECTED"
      | "CANCELLED"
      | null;

    const withdrawals = await WithdrawalService.getPartnerWithdrawals(
      session.user.id,
      {
        page,
        pageSize,
        status: status || undefined,
      }
    );

    return NextResponse.json({
      success: true,
      ...withdrawals,
    });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}
