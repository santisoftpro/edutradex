import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await db.partner.findUnique({
      where: { id: session.user.id },
      select: {
        availableBalance: true,
        pendingBalance: true,
        totalEarned: true,
        totalWithdrawn: true,
        level: true,
      },
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        availableBalance: Number(partner.availableBalance),
        pendingBalance: Number(partner.pendingBalance),
        totalEarned: Number(partner.totalEarned),
        totalWithdrawn: Number(partner.totalWithdrawn),
        level: partner.level,
      },
    });
  } catch (error) {
    console.error("Get balance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
