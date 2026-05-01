/**
 * Canonical API error class. Used to signal non-2xx responses with
 * the ApiError envelope: { error: { code, message, details? } }
 */
import type { ApiErrorCode, ApiErrorDetail } from "../../../src/types/error";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode | string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: ApiErrorCode | string,
    message: string,
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Convenience factories */
export const Errors = {
  unauthenticated: () =>
    new AppError(401, "UNAUTHENTICATED", "Authentication required"),

  forbidden: () =>
    new AppError(403, "FORBIDDEN", "Access denied"),

  notFound: (code: ApiErrorCode | string = "USER_NOT_FOUND", msg = "Resource not found") =>
    new AppError(404, code, msg),

  validation: (message: string, details?: ApiErrorDetail[]) =>
    new AppError(400, "VALIDATION_ERROR", message, details),

  conflict: (code: ApiErrorCode | string, message: string) =>
    new AppError(409, code, message),

  internal: (message = "Internal server error") =>
    new AppError(500, "INTERNAL_ERROR", message),

  invalidCredentials: () =>
    new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password"),
};
