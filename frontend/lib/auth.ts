/**
 * Authentication / session primitives.
 *
 * The auth design is tracked in a separate spec. This module provides a typed
 * interface and a stub implementation so that route handlers can be developed
 * against the contract before the real auth layer is built.
 *
 * TODO: Replace the stub with a real session-resolution strategy (JWT
 * verification, opaque-token DB lookup, etc.) once the auth spec is delivered.
 */

/**
 * The authenticated principal extracted from a valid session.
 *
 * Intentionally minimal — only the `id` is needed for authorisation checks in
 * v1. Additional claims (roles, expiry) can be added alongside the auth spec.
 */
export type SessionUser = {
  /** UUID v4 matching `users.id` in the database. */
  id: string;
};

/**
 * Resolves the authenticated user from an incoming HTTP request.
 *
 * Reads the session credential (cookie / bearer token), verifies it, and
 * returns the associated user identity.
 *
 * Returns `null` when:
 * - No session cookie / token is present in the request.
 * - The token is malformed, has been tampered with, or has expired.
 *
 * Callers must treat a `null` return as an unauthenticated request and respond
 * with `401 UNAUTHENTICATED`.
 *
 * TODO: Implement:
 * ```ts
 * const raw   = request.headers.get("cookie");
 * const token = parseSessionCookie(raw);
 * if (!token) return null;
 * const session = await verifyToken(token);   // JWT / opaque-token lookup
 * return session ? { id: session.userId } : null;
 * ```
 *
 * @param request - The incoming Next.js / Web API request.
 * @returns The session user, or `null` if the request is unauthenticated.
 */
export async function getSessionUser(
  request: Request
): Promise<SessionUser | null> {
  // TODO: Replace with real session resolution (inspect request.headers for
  // the session cookie / bearer token, verify it, return { id } or null).
  void request;
  return null;
}
