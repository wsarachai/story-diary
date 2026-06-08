/**
 * User domain contracts for Story Diary.
 *
 * Canonical declaration of the user-profile shape used across the project.
 * Aligns with `docs/specs/user-profile.md` (REST API spec) and the registration
 * fields on `docz/wireframes/s003-register.html`.
 *
 * Cross-agent contract: shared by frontend (Redux + screens), backend API
 * handlers, and tests. Keep framework-agnostic.
 */

import type { Gender } from "./auth";

/**
 * Public, safe-to-render user profile.
 *
 * Returned by:
 *   - GET    /api/users/:id          (also accepts the alias "me")
 *   - PATCH  /api/users/:id          (returns post-update state)
 *   - POST   /api/auth/login         (nested inside AuthResponse.user)
 *   - POST   /api/auth/register      (nested inside AuthResponse.user)
 *
 * Hard rule: this type MUST NEVER include `passwordHash`, internal flags, or
 * any column not declared here. See user-profile.md §"Response shape" #32.
 */
export interface UserProfile {
    /** UUID v4. */
    id: string;
    /** Display name from s003-register.html "ชื่อ" field. 1..80 chars, trimmed. */
    name: string;
    /** Thai phone number, 10 digits starting with 0 (e.g. "0812345678"). Unique. */
    tel: string;
    /** In-app character name from s003-register.html "ชื่อตัวละคร". 1..40 chars. */
    characterName: string;
    /** "male" | "female" — see ./auth.ts. */
    gender: Gender;
    /** Base64 JPEG data URL uploaded by the user, or null if not set. */
    avatarUrl?: string | null;
    /** User role — "admin" grants access to the admin panel; "rootAdmin" extends admin with user management. */
    role?: "user" | "admin" | "rootAdmin";
    /** IANA timezone string, e.g. "Asia/Bangkok". Stored at registration. */
    timezone: string;
    /** ISO-8601 UTC. */
    createdAt: string;
    /** ISO-8601 UTC. Server-bumped on every PATCH. */
    updatedAt: string;
}

/**
 * Partial-update payload for PATCH /api/users/:id.
 *
 * All fields optional; server rejects an empty body and any unknown keys (see
 * user-profile.md §"Validation — body"). `null` is NOT accepted as a "clear"
 * value in v1 — every column is non-nullable.
 *
 * Frontend forms should construct this by diffing the edited form state
 * against the loaded `UserProfile`, and only include changed fields.
 */
export interface UpdateUserRequest {
    name?: string;
    /** Thai phone number, 10 digits starting with 0. */
    tel?: string;
    characterName?: string;
    gender?: Gender;
    /** Base64 JPEG data URL. Null clears the avatar. */
    avatarUrl?: string | null;
}

/** Convenience alias used by the GET handler. Same shape as UserProfile. */
export type GetUserResponse = UserProfile;

/** Convenience alias used by the PATCH handler. Same shape as UserProfile. */
export type UpdateUserResponse = UserProfile;
