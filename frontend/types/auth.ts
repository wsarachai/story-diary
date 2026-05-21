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
 *   - <input id="username" name="username" type="tel">           → phone number
 *   - <input id="password" name="password" type="password">      → password
 *
 * The login identifier is the registered Thai phone number (`tel`). The field
 * key `username` is kept for API stability; the server looks up the user by
 * `tel` column. Trimmed client-side before dispatch.
 */
export interface LoginInput {
    /** Registered Thai phone number (e.g. "0812345678"). Trimmed client-side. */
    username: string;
    /** Plain text in transit (TLS); never logged, never persisted client-side. */
    password: string;
}

/**
 * Register form payload. Mirrors all six fields across the two pages of
 * s003-register.html:
 *   left page  — name, tel, password, confirmPassword
 *   right page — characterName, gender
 *
 * `confirmPassword` is a CLIENT-SIDE-ONLY field for parity-validation. It MUST
 * NOT be sent to the API. The submitted body is `Omit<RegisterInput,
 * "confirmPassword">`.
 */
export interface RegisterInput {
    name: string;
    /** Thai phone number, 10 digits starting with 0 (e.g. "0812345678"). */
    tel: string;
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
 * Now includes a JWT token for client-side storage.
 */
export interface AuthResponse {
    user: import("./user").UserProfile;
    token: string;
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
