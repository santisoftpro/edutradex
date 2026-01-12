/**
 * Application Error Classes
 * Structured error handling for consistent API responses
 */

// Base application error
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication errors
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// Authorization errors
export class AuthorizationError extends AppError {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

// Resource not found
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

// Validation errors
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]> | string) {
    const message = typeof errors === "string" ? errors : "Validation failed";
    super(message, 400, "VALIDATION_ERROR");
    this.errors = typeof errors === "string" ? { _error: [errors] } : errors;
  }
}

// Conflict errors (duplicate resource, etc.)
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

// Rate limit errors
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMIT");
    this.retryAfter = retryAfter;
  }
}

// Business logic errors
export class BusinessError extends AppError {
  constructor(message: string, code: string = "BUSINESS_ERROR") {
    super(message, 422, code);
  }
}

// External service errors
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string = "External service unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
    this.service = service;
  }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Error response type for API
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    errors?: Record<string, string[]>;
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): ErrorResponse {
  if (isAppError(error)) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    };

    if (error instanceof ValidationError) {
      response.error.errors = error.errors;
    }

    return response;
  }

  // Unknown error - don't expose internal details
  console.error("Unexpected error:", error);
  return {
    success: false,
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
  };
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
