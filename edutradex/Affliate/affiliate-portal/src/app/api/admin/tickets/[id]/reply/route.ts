import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminTicketsService } from "@/services/admin/tickets.service";

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

    if (!body.content?.trim()) {
      return NextResponse.json(
        { message: "Message content is required" },
        { status: 400 }
      );
    }

    const adminName = session.user.name || "Admin";
    const message = await AdminTicketsService.replyToTicket(id, body.content, adminName);

    return NextResponse.json({
      message: "Reply sent",
      data: message,
    });
  } catch (error) {
    console.error("Error replying to ticket:", error);
    return NextResponse.json(
      { message: "Failed to send reply" },
      { status: 500 }
    );
  }
}
