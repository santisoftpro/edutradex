/**
 * Admin Authentication Utilities
 *
 * Note: Admin authentication uses custom JWT tokens (not NextAuth)
 * See /api/admin/login/route.ts for the login handler
 * See /lib/admin-session.ts for session management
 */

import bcrypt from "bcryptjs";
import { z } from "zod";

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// ============================================
// PASSWORD UTILITIES
// ============================================

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash an admin password securely using bcrypt
 */
export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify an admin password against a hash
 */
export async function verifyAdminPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
