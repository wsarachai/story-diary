/**
 * Error contracts for Story Diary.
 *
 * Canonical error envelope used by every API route in the project. Aligns with
 * `docs/specs/user-profile.md` §"Error envelope". Frontend MUST surface
 * `error.code` (not `error.message`) for any user-facing copy — `message` is
 * English/log-safe only.
 *
 * Cross-agent contract: shared by frontend, backend, and tests.
 */

/**
 * Per-field detail attached to a VALIDATION_ERROR response. `field` is a
 * dot-path that maps 1:1 onto a form input name (e.g. "email",
 * "characterName"). `code` is one of `ValidationFieldCode`.
 */
export interface ApiErrorDetail {
    /** Dot-path of the offending field (matches React form `name` attributes). */
    field: string;
    /** Stable machine code; see ValidationFieldCode. */
    code: ValidationFieldCode | string;
    /** Human, English, log-safe. NOT for direct user display. */
    message: string;
}

/**
 * Top-level error envelope. Every non-2xx API response uses this shape.
 *
 *   { error: { code, message, details? } }
 *
 * Frontend mapping rule: pick localized copy by `code`. Fall back to a generic
 * "เกิดข้อผิดพลาด" if `code` is unrecognised.
 */
export interface ApiError {
    error: {
        code: ApiErrorCode | string;
        message: string;
        details?: ApiErrorDetail[];
    };
}

/**
 * Stable, machine-readable top-level error codes.
 *
 * NEW codes MUST be appended (never reuse a retired code). When a frontend
 * screen needs to react to a code that is not in this list, add it here first
 * so all agents see it.
 */
export type ApiErrorCode =
    /** Body fails schema, empty patch, unknown field, malformed path param. */
    | "VALIDATION_ERROR"
    /** Login credentials did not match. Used by POST /api/auth/login. */
    | "INVALID_CREDENTIALS"
    /** No session / expired session. */
    | "UNAUTHENTICATED"
    /** Authenticated but caller is not allowed to access this resource. */
    | "FORBIDDEN"
    /** A unique key collision — used for phone-number-already-registered on register/PATCH. */
    | "PHONE_TAKEN"
    /** :id is a valid UUID but no row exists. */
    | "USER_NOT_FOUND"
    /** PATCH/POST without `Content-Type: application/json`. */
    | "UNSUPPORTED_MEDIA"
    /** Request exceeded a server-side soft limit (rate-limit, throttle). */
    | "RATE_LIMITED"
    /** Unhandled. Generic message; details only in server logs. */
    | "INTERNAL_ERROR"
    /** POST /api/habits/activities — a non-archived activity with the same name already exists for this user. */
    | "ACTIVITY_NAME_TAKEN";

/**
 * Per-field validation codes. Used inside `ApiErrorDetail.code` and also by
 * client-side form validation so the same vocabulary works in both layers.
 */
export type ValidationFieldCode =
    | "REQUIRED"
    | "TOO_SHORT"
    | "TOO_LONG"
    | "INVALID_FORMAT"
    | "INVALID_ENUM"
    | "INVALID_CHAR"
    | "PASSWORDS_DO_NOT_MATCH";

/**
 * Type guard: narrows an `unknown` (e.g. `await fetch().json()`) to an
 * `ApiError`. Use at the API boundary; do NOT reach into `.error.code`
 * without it.
 */
export function isApiError(value: unknown): value is ApiError {
    if (typeof value !== "object" || value === null) return false;
    const v = value as { error?: unknown };
    if (typeof v.error !== "object" || v.error === null) return false;
    const e = v.error as { code?: unknown; message?: unknown };
    return typeof e.code === "string" && typeof e.message === "string";
}
