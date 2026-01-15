import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/logout
 * Admin logout endpoint - clears the session cookie
 */
export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear the admin session cookie
    cookieStore.set("admin-session-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
