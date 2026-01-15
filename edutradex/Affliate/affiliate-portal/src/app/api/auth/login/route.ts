import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  createLoginIdentifier,
} from "@/lib/rate-limiter";

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
 * POST /api/auth/login
 * Partner login validation endpoint - returns detailed error messages
 * Use this BEFORE calling NextAuth signIn to get proper error messages
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const validated = loginSchema.safeParse(body);

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
    const rateLimitCheck = rateLimiter.check(rateLimitId, RATE_LIMIT_CONFIGS.PARTNER_LOGIN);

    if (!rateLimitCheck.allowed) {
      const minutes = Math.ceil((rateLimitCheck.retryAfterMs || 0) / 60000);

      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
          code: "RATE_LIMITED",
          retryAfter: rateLimitCheck.retryAfterMs,
          lockedUntil: rateLimitCheck.lockedUntil
            ? new Date(rateLimitCheck.lockedUntil).toISOString()
            : null,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitCheck.retryAfterMs || 0) / 1000)),
          },
        }
      );
    }

    // Find partner by email
    const partner = await db.partner.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    // Generic error for security (prevent user enumeration)
    if (!partner) {
      rateLimiter.recordFailure(rateLimitId, RATE_LIMIT_CONFIGS.PARTNER_LOGIN);

      return NextResponse.json(
        { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, partner.passwordHash);

    if (!passwordMatch) {
      const failResult = rateLimiter.recordFailure(rateLimitId, RATE_LIMIT_CONFIGS.PARTNER_LOGIN);

      const response: Record<string, unknown> = {
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      };

      if (failResult.remaining > 0 && failResult.remaining <= 2) {
        response.attemptsRemaining = failResult.remaining;
        response.warning = `${failResult.remaining} attempt${failResult.remaining !== 1 ? 's' : ''} remaining before lockout`;
      }

      if (failResult.lockedUntil) {
        const minutes = Math.ceil((failResult.retryAfterMs || 0) / 60000);
        response.error = `Account temporarily locked. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        response.code = "ACCOUNT_LOCKED";
        response.lockedUntil = new Date(failResult.lockedUntil).toISOString();
      }

      return NextResponse.json(response, { status: 401 });
    }

    // Clear rate limit on successful password verification
    rateLimiter.recordSuccess(rateLimitId);

    // Check partner status
    if (partner.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Your account is pending verification. Please check your email.",
          code: "ACCOUNT_PENDING",
        },
        { status: 403 }
      );
    }

    if (partner.status === "BLOCKED") {
      return NextResponse.json(
        {
          error: "Your account has been blocked. Please contact support for assistance.",
          code: "ACCOUNT_BLOCKED",
        },
        { status: 403 }
      );
    }

    if (partner.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "Your account has been suspended. Please contact support for assistance.",
          code: "ACCOUNT_SUSPENDED",
        },
        { status: 403 }
      );
    }

    // Validation successful - frontend should now call NextAuth signIn
    return NextResponse.json({
      success: true,
      message: "Credentials validated",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Login validation error:", error);
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
