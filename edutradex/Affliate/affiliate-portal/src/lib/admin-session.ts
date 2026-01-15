import "server-only";

import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AdminRole } from "@prisma/client";

// Admin JWT secret - uses dedicated secret, no fallback in production
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET
);

// Fail fast if secret not configured in production
if (!process.env.ADMIN_JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("ADMIN_JWT_SECRET environment variable is required in production");
}

export interface AdminSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
  tokenId?: string; // JWT ID for token tracking/revocation
  issuedAt?: number;
  expiresAt?: number;
}

/**
 * Get the current admin session from the cookie
 * Returns null if not authenticated or token is invalid
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Validate required claims
    if (!payload.id || !payload.email || !payload.role) {
      return null;
    }

    return {
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as AdminRole,
      },
      tokenId: payload.jti as string | undefined,
      issuedAt: payload.iat as number | undefined,
      expiresAt: payload.exp as number | undefined,
    };
  } catch {
    // Token invalid, expired, or tampered with
    return null;
  }
}

/**
 * Require admin authentication
 * Throws error if not authenticated - use in protected routes
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Require super admin authentication
 * Throws error if not SUPER_ADMIN role - use in highly sensitive routes
 */
export async function requireSuperAdmin(): Promise<AdminSession> {
  const session = await requireAdmin();

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Super admin access required");
  }

  return session;
}

/**
 * Check if the current session has a specific role
 * Returns false if not authenticated
 */
export async function hasRole(role: AdminRole): Promise<boolean> {
  const session = await getAdminSession();
  return session?.user.role === role;
}

/**
 * Check if the current session has any of the specified roles
 * Returns false if not authenticated
 */
export async function hasAnyRole(roles: AdminRole[]): Promise<boolean> {
  const session = await getAdminSession();
  return session ? roles.includes(session.user.role) : false;
}
