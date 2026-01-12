import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import type { PartnerLevel, PartnerStatus } from "@prisma/client";

// ============================================
// TYPE DECLARATIONS
// ============================================

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      level: PartnerLevel;
      status: PartnerStatus;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    level: PartnerLevel;
    status: PartnerStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    level: PartnerLevel;
    status: PartnerStatus;
  }
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters")
      .regex(/^[a-zA-Z\s-]+$/, "First name can only contain letters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters")
      .regex(/^[a-zA-Z\s-]+$/, "Last name can only contain letters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z.literal(true, "You must agree to the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// AUTH CONFIGURATION
// ============================================

const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours - refresh session every day
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate input
        const validated = loginSchema.safeParse(credentials);

        if (!validated.success) {
          throw new Error("Invalid credentials format");
        }

        const { email, password } = validated.data;

        // Find partner by email (case-insensitive)
        const partner = await db.partner.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            level: true,
            status: true,
          },
        });

        if (!partner) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, partner.passwordHash);

        if (!passwordMatch) {
          // TODO: Implement rate limiting and account lockout
          throw new Error("Invalid email or password");
        }

        // Check partner status
        if (partner.status === "PENDING") {
          throw new Error("Your account is pending verification");
        }

        if (partner.status === "BLOCKED") {
          throw new Error("Your account has been blocked. Please contact support.");
        }

        if (partner.status === "SUSPENDED") {
          throw new Error("Your account has been suspended. Please contact support.");
        }

        // Update last login timestamp
        await db.partner.update({
          where: { id: partner.id },
          data: { lastLoginAt: new Date() },
        });

        // Return user object for session
        return {
          id: partner.id,
          email: partner.email,
          name: `${partner.firstName} ${partner.lastName}`,
          level: partner.level,
          status: partner.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.level = user.level;
        token.status = user.status;
      }

      // Handle session updates (e.g., level change)
      if (trigger === "update" && session) {
        token.level = session.level ?? token.level;
        token.status = session.status ?? token.status;
      }

      // Optionally refresh user data from database on session refresh
      // This ensures level/status changes are reflected without re-login
      if (trigger === "update" || (token.id && !user)) {
        try {
          const partner = await db.partner.findUnique({
            where: { id: token.id },
            select: { level: true, status: true },
          });
          if (partner) {
            token.level = partner.level;
            token.status = partner.status;
          }
        } catch {
          // Ignore errors, use existing token data
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.level = token.level;
        session.user.status = token.status;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {
      // Log successful sign in (can be extended for audit logging)
      console.log(`Partner signed in: ${user.email}`);
    },
    async signOut(message) {
      // Log sign out - message can have token or session depending on strategy
      const token = "token" in message ? message.token : null;
      if (token?.email) {
        console.log(`Partner signed out: ${token.email}`);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Export NextAuth handlers and utilities
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ============================================
// PASSWORD UTILITIES
// ============================================

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash a password securely using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================
// AUTH HELPERS
// ============================================

/**
 * Get the current session on the server side
 * Use this in Server Components and API routes
 */
export async function getServerSession() {
  return auth();
}

/**
 * Require authentication - throws if not authenticated
 * Use in API routes and Server Actions
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Get the current partner ID from the session
 * Throws if not authenticated
 */
export async function getCurrentPartnerId(): Promise<string> {
  const session = await requireAuth();
  return session.user.id;
}
