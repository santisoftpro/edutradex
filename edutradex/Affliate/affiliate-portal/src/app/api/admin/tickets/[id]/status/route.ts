import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

import { AdminTicketsService } from "@/services/admin/tickets.service";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export async function PATCH(
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

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }

    const ticket = await AdminTicketsService.updateTicketStatus(id, body.status);

    return NextResponse.json({
      message: "Status updated",
      data: ticket,
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return NextResponse.json(
      { message: "Failed to update status" },
      { status: 500 }
    );
  }
}
