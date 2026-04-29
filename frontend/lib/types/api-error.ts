/**
 * API error envelope used by all route handlers in this project.
 *
 * This is the project-default error shape — every error response must conform
 * to this structure so that clients have a single, predictable contract.
 *
 * @example
 * ```json
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Validation failed.",
 *     "details": [
 *       { "field": "email", "code": "INVALID_FORMAT", "message": "..." }
 *     ]
 *   }
 * }
 * ```
 */
export type ApiErrorDetail = {
  /**
   * Dot-path to the offending field (e.g. `"email"`, `"address.city"`).
   * Matches the request body key or path param name.
   */
  field: string;
  /**
   * Machine-readable detail code (e.g. `"TOO_LONG"`, `"INVALID_FORMAT"`).
   * Stable — clients may branch on this.
   */
  code: string;
  /** Human-readable description. Safe to log; do not display raw to end-users. */
  message: string;
};

export type ApiErrorBody = {
  error: {
    /**
     * Stable, machine-readable top-level code.
     *
     * | Value               | HTTP |
     * |---------------------|------|
     * | VALIDATION_ERROR    | 400  |
     * | UNAUTHENTICATED     | 401  |
     * | FORBIDDEN           | 403  |
     * | USER_NOT_FOUND      | 404  |
     * | EMAIL_TAKEN         | 409  |
     * | UNSUPPORTED_MEDIA   | 415  |
     * | INTERNAL_ERROR      | 500  |
     */
    code: string;
    /** Human-readable summary. Safe to log; do not display raw to end-users. */
    message: string;
    /** Populated for `VALIDATION_ERROR`; absent otherwise. */
    details?: ApiErrorDetail[];
  };
};
