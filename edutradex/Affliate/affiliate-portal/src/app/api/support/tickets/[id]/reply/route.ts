import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const replySchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ticket ownership and status
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
        { message: "Cannot reply to a closed ticket" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = replySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    // Create reply and update ticket status
    const [reply] = await db.$transaction([
      db.ticketReply.create({
        data: {
          ticketId: id,
          partnerId: session.user.id,
          message: validated.data.message,
          isFromAdmin: false,
        },
      }),
      db.supportTicket.update({
        where: { id },
        data: {
          status: "PENDING",
          updatedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Error creating reply:", error);
    return NextResponse.json(
      { message: "Failed to send reply" },
      { status: 500 }
    );
  }
}
