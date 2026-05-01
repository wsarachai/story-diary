"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApiError = isApiError;
/**
 * Type guard: narrows an `unknown` (e.g. `await fetch().json()`) to an
 * `ApiError`. Use at the API boundary; do NOT reach into `.error.code`
 * without it.
 */
function isApiError(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const v = value;
    if (typeof v.error !== "object" || v.error === null)
        return false;
    const e = v.error;
    return typeof e.code === "string" && typeof e.message === "string";
}
//# sourceMappingURL=error.js.map