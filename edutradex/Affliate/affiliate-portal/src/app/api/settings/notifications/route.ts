import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const notificationPreferenceSchema = z.object({
  preferences: z.array(
    z.object({
      id: z.string(),
      email: z.boolean(),
      push: z.boolean(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = notificationPreferenceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: "Invalid preferences format" },
        { status: 400 }
      );
    }

    // In a production environment, you would:
    // 1. Store these preferences in a NotificationPreference table
    // 2. Use them when sending notifications

    // For now, we'll just acknowledge the save
    // TODO: Implement actual preference storage

    console.log(
      `Notification preferences saved for user ${session.user.id}:`,
      validated.data.preferences
    );

    return NextResponse.json({
      message: "Notification preferences saved",
      preferences: validated.data.preferences,
    });
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    return NextResponse.json(
      { message: "Failed to save notification preferences" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // In production, fetch from database
    // For now, return default preferences
    const defaultPreferences = [
      { id: "payouts", email: true, push: true },
      { id: "referrals", email: true, push: true },
      { id: "ftd", email: true, push: true },
      { id: "level", email: true, push: true },
      { id: "fraud", email: true, push: true },
      { id: "news", email: false, push: true },
    ];

    return NextResponse.json({ preferences: defaultPreferences });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { message: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}
