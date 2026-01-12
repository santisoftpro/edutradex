import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const channel = await db.socialChannel.findFirst({
      where: {
        id,
        partnerId: session.user.id,
      },
    });

    if (!channel) {
      return NextResponse.json({ message: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Error fetching social channel:", error);
    return NextResponse.json(
      { message: "Failed to fetch channel" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the channel and verify ownership
    const channel = await db.socialChannel.findFirst({
      where: {
        id,
        partnerId: session.user.id,
      },
    });

    if (!channel) {
      return NextResponse.json({ message: "Channel not found" }, { status: 404 });
    }

    // Don't allow deletion of verified channels
    if (channel.status === "VERIFIED") {
      return NextResponse.json(
        { message: "Cannot delete verified channels" },
        { status: 400 }
      );
    }

    await db.socialChannel.delete({
      where: { id },
    });

    // Check if partner has any remaining channels
    const remainingChannels = await db.socialChannel.count({
      where: { partnerId: session.user.id },
    });

    // If no channels left, update social status to NOT_SUBMITTED
    if (remainingChannels === 0) {
      await db.partner.update({
        where: { id: session.user.id },
        data: { socialStatus: "NOT_SUBMITTED" },
      });
    }

    return NextResponse.json({ message: "Channel deleted successfully" });
  } catch (error) {
    console.error("Error deleting social channel:", error);
    return NextResponse.json(
      { message: "Failed to delete channel" },
      { status: 500 }
    );
  }
}
