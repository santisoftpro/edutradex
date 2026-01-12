import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createChannelSchema = z.object({
  platform: z.enum([
    "YOUTUBE",
    "INSTAGRAM",
    "TIKTOK",
    "TWITTER",
    "FACEBOOK",
    "TELEGRAM",
    "OTHER",
  ]),
  profileUrl: z.string().url("Please enter a valid URL"),
  username: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const channels = await db.socialChannel.findMany({
      where: { partnerId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error("Error fetching social channels:", error);
    return NextResponse.json(
      { message: "Failed to fetch channels" },
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
    const validated = createChannelSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { platform, profileUrl, username } = validated.data;

    // Check if channel with same URL already exists
    const existingChannel = await db.socialChannel.findFirst({
      where: {
        partnerId: session.user.id,
        profileUrl,
      },
    });

    if (existingChannel) {
      return NextResponse.json(
        { message: "This channel URL is already added" },
        { status: 400 }
      );
    }

    const channel = await db.socialChannel.create({
      data: {
        partnerId: session.user.id,
        platform,
        profileUrl,
        username: username || null,
        status: "SUBMITTED",
      },
    });

    // Update partner's social status to SUBMITTED if not already verified
    await db.partner.update({
      where: { id: session.user.id },
      data: {
        socialStatus: "SUBMITTED",
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("Error creating social channel:", error);
    return NextResponse.json(
      { message: "Failed to add channel" },
      { status: 500 }
    );
  }
}
