/**
 * User repository — the single gateway between the API layer and the `users`
 * table in the database.
 *
 * The database client is not yet configured. Both exported functions are stubs
 * that throw immediately. Replace the bodies with real queries once the DB
 * client is chosen and the `users` table migration has run.
 *
 * Schema reference (docs/specs/user-profile.md):
 *
 * ```sql
 * CREATE TABLE users (
 *   id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email          citext      NOT NULL UNIQUE,
 *   password_hash  text        NOT NULL,
 *   name           text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
 *   character_name text        NOT NULL CHECK (char_length(character_name) BETWEEN 1 AND 40),
 *   gender         text        NOT NULL CHECK (gender IN ('male','female')),
 *   created_at     timestamptz NOT NULL DEFAULT now(),
 *   updated_at     timestamptz NOT NULL DEFAULT now()
 * );
 * -- BEFORE UPDATE trigger bumps updated_at = now() automatically.
 * ```
 */

import type { UserProfile, UpdateUserRequest } from "@/lib/types/user";

// Re-export types so callers can import from a single location.
export type { UserProfile, UpdateUserRequest };

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown by {@link updateUser} when the requested email address is already
 * registered to a *different* user account (unique-constraint violation on
 * `users.email`).
 *
 * Route handlers must catch this and map it to `409 EMAIL_TAKEN`.
 */
export class EmailTakenError extends Error {
  constructor() {
    super("The email address is already in use by another account.");
    this.name = "EmailTakenError";
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Retrieve a single user by their UUID.
 *
 * Returns `null` when no matching row exists (e.g. after a hard-delete or
 * when a stale session references a deleted user).
 *
 * TODO: Replace stub body with a real query, e.g.:
 * ```sql
 * SELECT id, name, email, character_name AS "characterName",
 *        gender, created_at AS "createdAt", updated_at AS "updatedAt"
 * FROM   users
 * WHERE  id = $1
 * ```
 *
 * @param id - UUID v4 of the user to fetch.
 * @returns The user profile, or `null` if not found.
 */
export async function findUserById(
  id: string
): Promise<UserProfile | null> {
  // TODO: Replace with real DB query.
  throw new Error(
    `findUserById("${id}") is not yet implemented — database client pending.`
  );
}

/**
 * Apply a partial update to a user row and return the refreshed profile.
 *
 * Only the fields present in `patch` are written; absent fields are left
 * untouched. The `updated_at` column is bumped by the database trigger and
 * reflected in the returned profile.
 *
 * @throws {EmailTakenError} When `patch.email` collides with another user's
 *   email address. Callers must catch this and return `409 EMAIL_TAKEN`.
 *
 * TODO: Replace stub body with a real query. Outline:
 * 1. Build a parameterised SET clause from the non-`undefined` fields in
 *    `patch` (trim strings / lowercase email before binding).
 * 2. Execute the UPDATE and return the refreshed row.
 * 3. Catch the unique-constraint violation (`users_email_key` / `23505`) and
 *    re-throw as {@link EmailTakenError}.
 * ```sql
 * UPDATE users
 * SET    <dynamic columns>, updated_at = now()
 * WHERE  id = $n
 * RETURNING id, name, email, character_name AS "characterName",
 *           gender, created_at AS "createdAt", updated_at AS "updatedAt"
 * ```
 *
 * @param id    - UUID v4 of the user to update.
 * @param patch - Partial profile fields to apply.
 * @returns The post-update user profile.
 */
export async function updateUser(
  id: string,
  patch: UpdateUserRequest
): Promise<UserProfile> {
  // TODO: Replace with real DB query.
  throw new Error(
    `updateUser("${id}", ${JSON.stringify(patch)}) is not yet implemented — database client pending.`
  );
}
