/**
 * Auth domain contracts for Story Diary.
 *
 * Source of truth for the authentication / onboarding flow described by:
 *   - docz/wireframes/s001-Landing-Screen.html  (entry, no user)
 *   - docz/wireframes/s002-Login-Screen.html    (เข้าสู่ระบบ)
 *   - docz/wireframes/s003-register.html        (ลงทะเบียน)
 *   - docz/wireframes/s004-home.html            (entry, after registered)
 *
 * Cross-agent contract: shared by frontend (Redux + UI), backend API, and
 * the user-profile spec at docs/specs/user-profile.md. Keep framework-agnostic.
 */

/**
 * In-app character gender. Mirrors the two radio options in s003-register.html
 * (`<input type="radio" name="gender" value="male"/female">`). Extending this
 * union is a contract change — update the API enum, DB CHECK constraint, and
 * UI radio group together.
 */
export type Gender = "male" | "female";

/**
 * The canonical authenticated user identity returned by login / register and
 * carried in Redux as the active session principal. This is the SAME shape as
 * `UserProfile` in `./user.ts` — that file is the canonical declaration; this
 * re-export exists so auth-flow code never needs to import from `user.ts`
 * directly.
 */
export type { UserProfile as User } from "./user";

/**
 * Login form payload. Mirrors the two fields on s002-Login-Screen.html:
 *   - <input id="username" name="username" type="text">          → identifier
 *   - <input id="password" name="password" type="password">      → password
 *
 * The wireframe labels the field "ชื่อผู้ใช้" (username). v1 backend accepts
 * either the registered email or the display `name` here — UI does not need
 * to disambiguate. Server normalises (trim + lowercase email) before lookup.
 */
export interface LoginInput {
    /** Either email or display name as typed by the user. Trimmed client-side. */
    username: string;
    /** Plain text in transit (TLS); never logged, never persisted client-side. */
    password: string;
}

/**
 * Register form payload. Mirrors all six fields across the two pages of
 * s003-register.html:
 *   left page  — name, email, password, confirmPassword
 *   right page — characterName, gender
 *
 * `confirmPassword` is a CLIENT-SIDE-ONLY field for parity-validation. It MUST
 * NOT be sent to the API. The submitted body is `Omit<RegisterInput,
 * "confirmPassword">`.
 */
export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    /** Local-only; stripped before POST. */
    confirmPassword: string;
    characterName: string;
    gender: Gender;
}

/** What the API actually receives on POST /api/auth/register. */
export type RegisterRequest = Omit<RegisterInput, "confirmPassword">;

/**
 * Common response envelope for both login and register success.
 *
 * Auth is session-cookie based (see docs/specs/user-profile.md §Auth). The
 * cookie is set by the server via `Set-Cookie`; the response body intentionally
 * does NOT carry a token because there is no token to expose to JS. The body
 * carries the user record so the client can hydrate Redux without a second
 * round-trip.
 */
export interface AuthResponse {
    user: import("./user").UserProfile;
}

/**
 * Lifecycle state for the auth slice. Used by route guards and by the
 * landing/login/register screens to gate redirects and spinner UI.
 *
 *   "unknown"        — first paint, before the session-restore probe completes
 *   "unauthenticated"— probe finished, no valid session
 *   "authenticating" — login or register request in flight
 *   "authenticated"  — session is valid; `user` is populated
 */
export type AuthStatus =
    | "unknown"
    | "unauthenticated"
    | "authenticating"
    | "authenticated";
