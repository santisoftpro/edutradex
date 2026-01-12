import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  getErrorStatusCode,
} from "./errors";
import { auth } from "./auth";

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Error response helper
 */
export function errorResponse(error: unknown) {
  const statusCode = getErrorStatusCode(error);
  const body = formatErrorResponse(error);
  return NextResponse.json(body, { status: statusCode });
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors: Record<string, string[]> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join(".") || "_error";
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(issue.message);
      });
      throw new ValidationError(formattedErrors);
    }
    throw new ValidationError("Invalid request body");
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors: Record<string, string[]> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join(".") || "_error";
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(issue.message);
      });
      throw new ValidationError(formattedErrors);
    }
    throw new ValidationError("Invalid query parameters");
  }
}

/**
 * Get authenticated partner ID from session
 * Throws AuthenticationError if not authenticated
 */
export async function getAuthenticatedPartnerId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  return session.user.id;
}

/**
 * Get authenticated session
 * Throws AuthenticationError if not authenticated
 */
export async function getAuthenticatedSession() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthenticationError();
  }

  return session;
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  return handler()
    .then((result) => {
      if (result instanceof NextResponse) {
        return result;
      }
      return successResponse(result);
    })
    .catch((error) => {
      // Log non-operational errors
      if (error instanceof AppError && !error.isOperational) {
        console.error("Non-operational error:", error);
      }
      return errorResponse(error);
    });
}

/**
 * Type-safe API handler creator
 */
type ApiHandler<T> = (context: {
  partnerId: string;
  request: Request;
  params: Record<string, string>;
}) => Promise<T>;

export function createProtectedHandler<T>(handler: ApiHandler<T>) {
  return async (
    request: Request,
    { params }: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    return withErrorHandling(async () => {
      const partnerId = await getAuthenticatedPartnerId();
      const resolvedParams = await params;
      return handler({ partnerId, request, params: resolvedParams });
    });
  };
}

/**
 * Pagination helpers
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize: number = 20,
  maxPageSize: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  let pageSize = parseInt(
    searchParams.get("pageSize") || String(defaultPageSize),
    10
  );
  pageSize = Math.min(Math.max(1, pageSize), maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) {
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

/**
 * Date range helpers for filtering
 */
export interface DateRange {
  from: Date;
  to: Date;
}

export function getDateRangeFromParams(
  searchParams: URLSearchParams
): DateRange {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const preset = searchParams.get("preset");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Handle presets
  if (preset) {
    switch (preset) {
      case "today":
        return { from: today, to: now };
      case "7d":
        return {
          from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          to: now,
        };
      case "30d":
        return {
          from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          to: now,
        };
      case "this_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: now,
        };
      case "all_time":
        return {
          from: new Date(2020, 0, 1), // Start from 2020
          to: now,
        };
    }
  }

  // Handle custom dates
  const from = fromParam ? new Date(fromParam) : today;
  const to = toParam ? new Date(toParam) : now;

  return { from, to };
}
