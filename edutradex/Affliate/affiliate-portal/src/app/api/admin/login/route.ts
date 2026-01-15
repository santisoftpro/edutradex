import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { adminLoginSchema } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  createLoginIdentifier,
} from "@/lib/rate-limiter";

// Admin JWT secret - must be set in production
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET
);

// Validate that admin secret is configured (fail fast in production)
if (!process.env.ADMIN_JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("ADMIN_JWT_SECRET environment variable is required in production");
}

/**
 * Extract client IP from request headers
 */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return null;
}

/**
 * POST /api/admin/login
 * Admin login endpoint with rate limiting and security measures
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const validated = adminLoginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid credentials format" },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting check
    const rateLimitId = createLoginIdentifier(normalizedEmail, clientIp);
    const rateLimitCheck = rateLimiter.check(rateLimitId, RATE_LIMIT_CONFIGS.ADMIN_LOGIN);

    if (!rateLimitCheck.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitCheck.retryAfterMs || 0) / 1000);

      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: retryAfterSeconds,
          lockedUntil: rateLimitCheck.lockedUntil
            ? new Date(rateLimitCheck.lockedUntil).toISOString()
            : null,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimitCheck.resetAt / 1000)),
          },
        }
      );
    }

    // Find admin by email
    const admin = await db.admin.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Generic error for security (prevent user enumeration)
    if (!admin) {
      // Record failed attempt even for non-existent users
      rateLimiter.recordFailure(rateLimitId, RATE_LIMIT_CONFIGS.ADMIN_LOGIN);

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!admin.isActive) {
      // Record failed attempt
      rateLimiter.recordFailure(rateLimitId, RATE_LIMIT_CONFIGS.ADMIN_LOGIN);

      return NextResponse.json(
        { error: "Your admin account has been deactivated" },
        { status: 403 }
      );
    }

    // Verify password with constant-time comparison
    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordMatch) {
      // Record failed attempt
      const failResult = rateLimiter.recordFailure(rateLimitId, RATE_LIMIT_CONFIGS.ADMIN_LOGIN);

      // Include remaining attempts in response for UX
      const response: Record<string, unknown> = {
        error: "Invalid email or password",
      };

      if (failResult.remaining > 0) {
        response.attemptsRemaining = failResult.remaining;
      }

      if (failResult.lockedUntil) {
        response.lockedUntil = new Date(failResult.lockedUntil).toISOString();
        response.error = "Account temporarily locked due to too many failed attempts";
      }

      return NextResponse.json(response, { status: 401 });
    }

    // Clear rate limit on successful login
    rateLimiter.recordSuccess(rateLimitId);

    // Update last login timestamp
    await db.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Create JWT token with security claims
    const tokenIssuedAt = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      iat: tokenIssuedAt,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(tokenIssuedAt)
      .setExpirationTime("8h")
      .setNotBefore(tokenIssuedAt)
      .setJti(crypto.randomUUID()) // Unique token ID for revocation tracking
      .sign(ADMIN_JWT_SECRET);

    // Set secure session cookie
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set("admin-session-token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    // Log error securely (never log passwords or full stack in production)
    if (process.env.NODE_ENV === "development") {
      console.error("Admin login error:", error);
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
