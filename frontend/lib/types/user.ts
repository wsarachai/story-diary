/**
 * User-domain types shared across the API layer and the database repository.
 *
 * These types mirror the `users` table defined in the database spec and the
 * public-facing contract described in docs/specs/user-profile.md.
 */

/** The two gender values supported by the character-creation form (s003-register). */
export type Gender = "male" | "female";

/**
 * Public-facing user profile returned by GET and PATCH /api/users/:id.
 *
 * This shape must never include `passwordHash`, internal flags, or any column
 * not listed here.
 */
export type UserProfile = {
  /** UUID v4 — primary key from the `users` table. */
  id: string;
  /** Display name; 1–80 chars, trimmed. */
  name: string;
  /** Canonical (lowercase) email address. */
  email: string;
  /** In-app character name; 1–40 chars, trimmed. */
  characterName: string;
  /** Character gender selected at registration. */
  gender: Gender;
  /** ISO-8601 UTC timestamp set on row creation. */
  createdAt: string;
  /** ISO-8601 UTC timestamp bumped by the DB trigger on every update. */
  updatedAt: string;
};

/**
 * Fields accepted by PATCH /api/users/:id.
 *
 * All fields are optional — at least one must be present in a valid request.
 * Absent fields are left untouched in the database.
 */
export type UpdateUserRequest = {
  /** Display name. Trimmed server-side; 1–80 chars after trim. */
  name?: string;
  /** Email address. Lowercased server-side; must be unique. */
  email?: string;
  /** Character name. Trimmed server-side; 1–40 chars after trim. */
  characterName?: string;
  /** Character gender. Strict enum — only "male" or "female" accepted. */
  gender?: Gender;
};
