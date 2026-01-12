import "server-only";

import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AdminRole } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

export interface AdminSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as AdminRole,
      },
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function requireSuperAdmin(): Promise<AdminSession> {
  const session = await requireAdmin();

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Super admin access required");
  }

  return session;
}
