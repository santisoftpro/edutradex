import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import type { AdminRole } from "@prisma/client";

// ============================================
// TYPE DECLARATIONS
// ============================================

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  }
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// ============================================
// AUTH CONFIGURATION
// ============================================

const adminAuthConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours for admin sessions
    updateAge: 60 * 60, // 1 hour
  },
  cookies: {
    sessionToken: {
      name: "admin-session-token",
    },
    csrfToken: {
      name: "admin-csrf-token",
    },
    callbackUrl: {
      name: "admin-callback-url",
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [
    Credentials({
      id: "admin-credentials",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = adminLoginSchema.safeParse(credentials);

        if (!validated.success) {
          throw new Error("Invalid credentials format");
        }

        const { email, password } = validated.data;

        const admin = await db.admin.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            name: true,
            role: true,
            isActive: true,
          },
        });

        if (!admin) {
          throw new Error("Invalid email or password");
        }

        if (!admin.isActive) {
          throw new Error("Your admin account has been deactivated");
        }

        const passwordMatch = await bcrypt.compare(password, admin.passwordHash);

        if (!passwordMatch) {
          throw new Error("Invalid email or password");
        }

        // Update last login timestamp
        await db.admin.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/admin/dashboard`;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`Admin signed in: ${user.email}`);
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.email) {
        console.log(`Admin signed out: ${token.email}`);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};

export const {
  handlers: adminHandlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth(adminAuthConfig);

// Export config for getServerSession compatibility
export const adminAuthOptions = adminAuthConfig;

// ============================================
// PASSWORD UTILITIES
// ============================================

const BCRYPT_SALT_ROUNDS = 12;

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

// ============================================
// AUTH HELPERS
// ============================================
// Server-only session helpers are in @/lib/admin-session.ts
// Import getAdminSession, requireAdmin, requireSuperAdmin from there for server components
