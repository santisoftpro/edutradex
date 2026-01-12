import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createTicketSchema = z.object({
  category: z.enum([
    "PAYMENTS_WITHDRAWALS",
    "AFFILIATE_LEVEL",
    "LINKS_TRACKING",
    "ACCOUNT_LOGIN",
    "FRAUD_REPORT",
    "OTHER",
  ]),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${timestamp}${random}`;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tickets = await db.supportTicket.findMany({
      where: { partnerId: session.user.id },
      select: {
        id: true,
        ticketNumber: true,
        category: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { message: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTicketSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { category, subject, message } = validated.data;

    // Determine priority based on category
    let priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" = "NORMAL";
    if (category === "FRAUD_REPORT") {
      priority = "HIGH";
    } else if (category === "PAYMENTS_WITHDRAWALS") {
      priority = "NORMAL";
    }

    const ticket = await db.supportTicket.create({
      data: {
        partnerId: session.user.id,
        ticketNumber: generateTicketNumber(),
        category,
        subject,
        message,
        priority,
        status: "OPEN",
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { message: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
