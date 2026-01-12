import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

// Verify admin JWT token
async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
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

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\..*|api/).*)",
  ],
};
