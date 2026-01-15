import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

// Admin JWT secret - uses dedicated secret for admin authentication
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET
);

/**
 * Verify admin JWT token
 * Returns payload if valid, null otherwise
 */
async function verifyAdminToken(token: string) {
  try {
    // Skip verification if secret not configured (development fallback)
    if (!process.env.ADMIN_JWT_SECRET) {
      return null;
    }

    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Validate required claims
    if (!payload.id || !payload.email || !payload.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Partner routes that require authentication
const partnerProtectedRoutes = [
  "/dashboard",
  "/statistics",
  "/links",
  "/affiliate-level",
  "/support",
  "/payments",
  "/settings",
  "/help",
];

// Partner routes that should redirect to dashboard if already authenticated
const partnerAuthRoutes = ["/login", "/register"];

// Admin routes that require admin authentication
const adminProtectedRoutes = [
  "/admin/dashboard",
  "/admin/partners",
  "/admin/withdrawals",
  "/admin/tickets",
  "/admin/level-reviews",
  "/admin/news",
  "/admin/fraud",
  "/admin/settings",
];

// Admin auth routes
const adminAuthRoutes = ["/admin/login"];

/**
 * Middleware for route protection and security headers
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    // Handle admin authentication with custom JWT
    const adminSessionCookie = request.cookies.get("admin-session-token")?.value;
    const adminToken = adminSessionCookie ? await verifyAdminToken(adminSessionCookie) : null;

    const isAdminAuthenticated = !!adminToken;
    const isAdminProtectedRoute = adminProtectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    const isAdminAuthRoute = adminAuthRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    // Redirect to admin login if accessing protected admin route without authentication
    if (isAdminProtectedRoute && !isAdminAuthenticated) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("callbackUrl", encodeURIComponent(pathname));
      return NextResponse.redirect(url);
    }

    // Redirect to admin dashboard if accessing admin auth routes while authenticated
    if (isAdminAuthRoute && isAdminAuthenticated) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  } else {
    // Handle partner authentication
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    const isAuthenticated = !!token;
    const isProtectedRoute = partnerProtectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    const isAuthRoute = partnerAuthRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    // Check if partner is blocked or suspended
    if (isAuthenticated && token.status !== "ACTIVE") {
      if (pathname !== "/support" && !pathname.startsWith("/support/")) {
        const url = new URL("/account-restricted", request.url);
        url.searchParams.set("reason", token.status as string);
        return NextResponse.redirect(url);
      }
    }

    // Redirect to login if accessing protected route without authentication
    if (isProtectedRoute && !isAuthenticated) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", encodeURIComponent(pathname));
      return NextResponse.redirect(url);
    }

    // Redirect to dashboard if accessing auth routes while authenticated
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // XSS protection (legacy, but still useful for older browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Permissions policy - disable unnecessary features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Content Security Policy
  // Note: Next.js requires 'unsafe-inline' for styles and scripts
  // In production, consider using nonce-based CSP
  const isProduction = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    // Scripts: self + inline for Next.js hydration
    // Remove unsafe-eval in production for better security
    isProduction
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Styles: self + inline for styled-components/Tailwind
    "style-src 'self' 'unsafe-inline'",
    // Images: self + data URIs + HTTPS sources
    "img-src 'self' data: https: blob:",
    // Fonts: self + data URIs
    "font-src 'self' data:",
    // Connections: self + HTTPS (for API calls)
    "connect-src 'self' https:",
    // Frames: completely blocked
    "frame-ancestors 'none'",
    // Form actions: self only
    "form-action 'self'",
    // Base URI: self only
    "base-uri 'self'",
    // Object/embed: none
    "object-src 'none'",
    // Upgrade insecure requests in production
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (only in production)
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)",
  ],
};
