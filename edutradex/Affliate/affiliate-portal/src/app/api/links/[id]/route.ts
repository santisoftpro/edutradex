import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { TrackingService } from "@/services/tracking.service";

const updateLinkSchema = z.object({
  comment: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validated = updateLinkSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const link = await TrackingService.updateLink(
      id,
      session.user.id,
      validated.data
    );

    return NextResponse.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error("Update link error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update tracking link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await TrackingService.deleteLink(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (error) {
    console.error("Delete link error:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }
      if (error.message.includes("has referred traders")) {
        return NextResponse.json(
          { error: "Cannot delete a link that has referred traders. Deactivate it instead." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to delete tracking link" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const link = await TrackingService.getLinkById(id, session.user.id);

    return NextResponse.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error("Get link error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch tracking link" },
      { status: 500 }
    );
  }
}
