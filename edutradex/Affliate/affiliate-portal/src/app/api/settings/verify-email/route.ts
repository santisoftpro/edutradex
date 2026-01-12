import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const partner = await db.partner.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });

    if (!partner) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (partner.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 400 }
      );
    }

    // In a production environment, you would:
    // 1. Generate a verification token
    // 2. Store it in the database with expiration
    // 3. Send an email with the verification link

    // For now, we'll simulate sending the email
    // TODO: Implement actual email sending

    console.log(`Verification email would be sent to: ${partner.email}`);

    return NextResponse.json({
      message: "Verification email sent",
      // In production, don't expose this
      debug: process.env.NODE_ENV === "development" ? partner.email : undefined,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { message: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
