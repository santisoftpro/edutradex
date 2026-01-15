import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  createIpIdentifier,
} from "@/lib/rate-limiter";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

/**
 * Extract client IP from request headers
 */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/settings/password
 * Change partner password with session invalidation
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for password changes
    const rateLimitId = createIpIdentifier("password-change", clientIp);
    const rateLimitCheck = rateLimiter.check(rateLimitId, RATE_LIMIT_CONFIGS.PASSWORD_RESET);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { message: "Too many password change attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = passwordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validated.data;

    // Get current password hash and token version
    const partner = await db.partner.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, tokenVersion: true },
    });

    if (!partner) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, partner.passwordHash);

    if (!isValidPassword) {
      // Record failed attempt
      rateLimiter.recordFailure(rateLimitId, RATE_LIMIT_CONFIGS.PASSWORD_RESET);

      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, partner.passwordHash);

    if (isSamePassword) {
      return NextResponse.json(
        { message: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash new password with secure salt rounds
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and increment token version to invalidate all sessions
    await db.partner.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 }, // Invalidates all existing sessions
      },
    });

    // Clear rate limit on success
    rateLimiter.recordSuccess(rateLimitId);

    return NextResponse.json({
      message: "Password changed successfully. Please log in again with your new password.",
      sessionInvalidated: true,
    });
  } catch (error) {
    // Only log errors in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error changing password:", error);
    }

    return NextResponse.json(
      { message: "Failed to change password" },
      { status: 500 }
    );
  }
}
