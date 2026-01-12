import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ticket ownership
    const ticket = await db.supportTicket.findFirst({
      where: {
        id,
        partnerId: session.user.id,
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { message: "Ticket is already closed" },
        { status: 400 }
      );
    }

    // Close the ticket
    const updatedTicket = await db.supportTicket.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Error closing ticket:", error);
    return NextResponse.json(
      { message: "Failed to close ticket" },
      { status: 500 }
    );
  }
}
