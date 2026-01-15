import { z } from "zod";

/**
 * Environment variable validation schema
 * Validates all required environment variables at runtime
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),

  // NextAuth (Partner Authentication)
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // Admin Authentication (separate secret for admin JWT tokens)
  ADMIN_JWT_SECRET: z
    .string()
    .min(32, "ADMIN_JWT_SECRET must be at least 32 characters for security"),

  // Rate Limiting
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().min(1).max(20).optional().default(5),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().min(60000).optional().default(900000), // 15 min default
  LOGIN_LOCKOUT_DURATION_MS: z.coerce.number().min(60000).optional().default(1800000), // 30 min default

  // Broker Integration (optional in development)
  BROKER_API_URL: z.string().url().optional(),
  BROKER_API_KEY: z.string().min(1).optional(),
  BROKER_WEBHOOK_SECRET: z.string().min(32).optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("OptigoBroker Partners"),
  NEXT_PUBLIC_BROKER_URL: z.string().url().optional(),

  // Configuration
  COOKIE_WINDOW_DAYS: z.coerce.number().min(1).max(365).optional().default(30),
  MIN_WITHDRAWAL_AMOUNT: z.coerce.number().min(1).optional().default(20),

  // Node environment
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

/**
 * Server-side environment variables
 * Only use these on the server
 */
const serverEnvSchema = envSchema.extend({
  // Additional server-only variables can be added here
});

/**
 * Client-side environment variables
 * Only NEXT_PUBLIC_ prefixed variables are available on the client
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("OptigoBroker Partners"),
  NEXT_PUBLIC_BROKER_URL: z.string().url().optional(),
});

// Validate and export environment variables
function validateEnv() {
  // On the client, we only validate client-side env vars
  if (typeof window !== "undefined") {
    const parsed = clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_BROKER_URL: process.env.NEXT_PUBLIC_BROKER_URL,
    });

    if (!parsed.success) {
      console.error(
        "Invalid client environment variables:",
        parsed.error.flatten().fieldErrors
      );
      throw new Error("Invalid client environment variables");
    }

    return parsed.data;
  }

  // On the server, validate all env vars
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid server environment variables:",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
    );
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe environment variable access
export type Env = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Helper to check if we're in production
 */
export const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Helper to check if we're in development
 */
export const isDevelopment = () => process.env.NODE_ENV === "development";

/**
 * Get the base URL for the application
 */
export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
};
