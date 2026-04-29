# API Spec: GET / PATCH `/api/users/:id`

**Status:** Draft v1
**Owner:** Architect — handoff to backend + frontend implementers
**Last updated:** 2026-04-29
**Stack:** Next.js 16.2.4 App Router (Route Handlers), React 19, TypeScript (strict)
**File location:** `frontend/app/api/users/[id]/route.ts` (stub already exists; this spec is the contract it will fulfil)

> **Note on scope and prior art.** A previous spec at
> `docs/specs/user-profile.md` defined the same endpoints with a different
> field set (`name`, `email`, `characterName`, `gender`) derived from
> `docz/layouts/s003-register.html`. That spec describes the **registration
> identity**. The spec below describes the **user profile** (`displayName`,
> `avatarUrl`, `languagePreference`) that the rest of the app needs once the
> user is in. The two field sets must eventually be reconciled — see "Open
> Questions" at the end. Cross-cutting decisions (error envelope, auth
> primitive, route handler shape) are reused unchanged from the earlier spec.

---

## 1. Endpoints

### 1.1 GET `/api/users/:id`

Fetch a single user's profile.

| Property        | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Method          | `GET`                                                                 |
| Path            | `/api/users/:id`                                                      |
| Auth            | Required (session cookie). Caller may only read their own profile.    |
| Idempotent      | Yes                                                                   |
| Cache           | Do **not** set a public `Cache-Control` header — responses are user-scoped. |
| `:id` aliases   | The literal string `"me"` resolves to the authenticated user's id.    |

### 1.2 PATCH `/api/users/:id`

Partially update the authenticated user's profile.

| Property        | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Method          | `PATCH`                                                               |
| Path            | `/api/users/:id`                                                      |
| Auth            | Required (session cookie). Caller may only update their own profile.  |
| Idempotent      | Yes — re-submitting the same patch yields the same logical state.     |
| Body media type | `application/json` only.                                              |
| Out of scope    | Password changes, email verification, account deletion. Separate endpoints. |

---

## 2. Request Schema

### 2.1 Headers

| Header           | GET | PATCH | Notes                                          |
| ---------------- | --- | ----- | ---------------------------------------------- |
| `Cookie`         | ✔   | ✔     | Session cookie set at login.                   |
| `Content-Type`   | —   | ✔     | Must be `application/json`. Else `415`.        |
| `Accept`         | —   | —     | `application/json` assumed.                    |

### 2.2 Path parameter

| Param | Type                          | Validation                                                           |
| ----- | ----------------------------- | -------------------------------------------------------------------- |
| `id`  | `string` (UUID v4) \| `"me"`  | Must match UUID v4 regex OR equal the literal `"me"`. Else `400`.    |

### 2.3 GET body

None.

### 2.4 PATCH body

```ts
/**
 * Partial update payload for PATCH /api/users/:id.
 * - All fields optional.
 * - At least one recognised field MUST be present (empty patch → 400).
 * - Unknown fields MUST be rejected (strict parsing → 400).
 * - `null` is NOT a valid value for any field in v1.
 */
type UpdateUserRequest = {
  /** Display name. Trimmed server-side; 1–80 chars after trim. */
  displayName?: string;

  /** HTTPS URL of the avatar image. ≤ 2048 chars. Pass empty string is NOT allowed. */
  avatarUrl?: string;

  /** UI language. Strict enum mirroring the supported `<html lang="…">` values. */
  languagePreference?: "th" | "en";
};
```

Note: `id`, `createdAt`, `updatedAt` are **read-only** and must never appear in
a request body. If present, the request is rejected with `400 VALIDATION_ERROR`
(strict parsing).

---

## 3. Data Model

### 3.1 `UserProfile` (response shape)

```ts
type UserProfile = {
  /** UUID v4 — primary key from the `users` table. Read-only. */
  id: string;

  /** Display name. 1–80 chars, trimmed. */
  displayName: string;

  /**
   * HTTPS URL of the avatar image, or `null` when the user has no avatar set.
   * Server-set to `null` if a row pre-dates avatar support.
   */
  avatarUrl: string | null;

  /** UI language preference. */
  languagePreference: "th" | "en";

  /** ISO-8601 UTC timestamp set on row creation. Read-only. */
  createdAt: string;

  /** ISO-8601 UTC timestamp bumped by the DB trigger on every update. Read-only. */
  updatedAt: string;
};
```

### 3.2 Field rules

| Field                | Type            | Required (create) | Mutable via PATCH | Default            | Constraints |
| -------------------- | --------------- | ----------------- | ----------------- | ------------------ | ----------- |
| `id`                 | UUID v4         | yes (server)      | **no**            | `gen_random_uuid()` | PK |
| `displayName`        | string          | yes               | yes               | —                  | After `trim()`: length 1..80; reject control chars (`[\x00-\x1F\x7F]`); allow Thai + Latin + spaces. |
| `avatarUrl`          | string \| null  | no                | yes               | `null`             | Must parse as URL with scheme `https`; length 1..2048; host non-empty; no fragment-only URLs. `null` allowed in DB but **not accepted in PATCH** (use a dedicated "remove avatar" endpoint, future). |
| `languagePreference` | enum            | yes               | yes               | `"th"`             | Strict: `"th"` or `"en"`. (Thai-first app per `docz/layouts/*.html` `lang="th"`.) |
| `createdAt`          | timestamptz     | yes (server)      | **no**            | `now()`            | Set once. |
| `updatedAt`          | timestamptz     | yes (server)      | **no** (auto)     | `now()`            | DB `BEFORE UPDATE` trigger maintains it. |

### 3.3 Server normalisations

Always applied before persistence and before re-serialisation in the response:

- `displayName` — `String.prototype.trim()`.
- `avatarUrl` — `String.prototype.trim()`; reject if it does not parse via `new URL()`; reject if `protocol !== "https:"`.
- `languagePreference` — no mutation; strict enum match.

---

## 4. Response Schema

### 4.1 Success — `200 OK`

Both endpoints return a `UserProfile`:

```ts
type GetUserResponse    = UserProfile;
type UpdateUserResponse = UserProfile; // post-update state
```

`PATCH` returns the **post-update** state so the client never needs a follow-up
`GET`. `updatedAt` will be strictly greater than the pre-call value.

The response **must never** include: `passwordHash`, internal flags, soft-delete
markers, role/permission columns, or any column not listed in §3.1.

### 4.2 Error envelope

The project standard, defined in `frontend/lib/types/api-error.ts` and reused
unchanged from `docs/specs/user-profile.md`:

```ts
type ApiErrorDetail = {
  field: string;   // dot-path, e.g. "displayName"
  code: string;    // e.g. "TOO_LONG", "INVALID_FORMAT"
  message: string; // human-readable
};

type ApiErrorBody = {
  error: {
    code: string;             // stable machine code (table below)
    message: string;          // human, English, safe to log; not for raw display
    details?: ApiErrorDetail[]; // populated for VALIDATION_ERROR
  };
};
```

### 4.3 Error catalogue

| HTTP | `error.code`        | When                                                                                                   |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR`  | Malformed `:id`, non-JSON body, body not an object, unknown field, empty patch, field-level violation, `null` field, attempt to write a read-only field. |
| 401  | `UNAUTHENTICATED`   | No session cookie, or cookie malformed / expired.                                                      |
| 403  | `FORBIDDEN`         | Authenticated, but `:id` resolves to a user other than the session user. (Used **instead of** `404` to avoid existence-leak.) |
| 404  | `USER_NOT_FOUND`    | Only reachable when `:id` resolves to the session user but the row no longer exists (stale session).   |
| 409  | `AVATAR_URL_INVALID`* | Reserved for future content-validation against an allowlist. Not used in v1; remove if unused at impl time. |
| 415  | `UNSUPPORTED_MEDIA` | PATCH without `Content-Type: application/json`.                                                        |
| 500  | `INTERNAL_ERROR`    | Unhandled exception. Generic message; full detail only in server logs.                                 |

> **Existence-leak rule.** For an authenticated caller requesting another
> user's `:id`, return `403 FORBIDDEN` *regardless* of whether that user
> exists. `404` is reserved for the session-user-row-vanished case.

### 4.4 Per-field detail codes (for `VALIDATION_ERROR.details[].code`)

| Code               | Meaning                                                       |
| ------------------ | ------------------------------------------------------------- |
| `INVALID_TYPE`     | Field present but not the expected JSON type.                 |
| `TOO_SHORT`        | String shorter than the minimum after trimming.               |
| `TOO_LONG`         | String exceeds the maximum length.                            |
| `INVALID_FORMAT`   | Value does not match the required format (e.g. URL, UUID).    |
| `INVALID_ENUM`     | Value not in the accepted enum set.                           |
| `INVALID_CHAR`     | Value contains disallowed characters (e.g. control chars).    |
| `NULL_NOT_ALLOWED` | Field present but `null`; v1 has no nullable PATCH inputs.    |
| `READ_ONLY`        | Caller attempted to set a server-managed field.               |

---

## 5. Auth Strategy

### 5.1 Stub (current state)

`frontend/lib/auth.ts` exposes:

```ts
export type SessionUser = { id: string };
export async function getSessionUser(request: Request): Promise<SessionUser | null>;
```

The stub currently always returns `null`, which means every call to these
endpoints will respond `401 UNAUTHENTICATED`. This is intentional — it lets
the contract be exercised end-to-end before the auth layer is built.

### 5.2 Production behaviour (target)

`getSessionUser` must:

1. Read the session credential from the request (HTTP-only cookie; bearer
   token also acceptable for API clients).
2. Verify it (signature for JWT; row lookup for opaque tokens) and check
   expiry.
3. Return `{ id }` for the authenticated user, or `null` for missing /
   malformed / expired / revoked sessions.
4. Never throw on auth failure — `null` is the contract for "not
   authenticated". Throwing maps to `500 INTERNAL_ERROR` and would mask
   real auth bugs.

The handler treats `null` from `getSessionUser` as `401 UNAUTHENTICATED` in
all cases.

### 5.3 Authorisation

There is **no admin role** in v1. The only authorisation rule is:

> A user may only read or write their own profile.

Resolution order in the handler:

1. Validate `:id` shape (`"me"` or UUID v4). Else `400`.
2. If `:id === "me"`, substitute `session.id`.
3. If the (resolved) `:id !== session.id`, return `403 FORBIDDEN`. Do **not**
   touch the database — this prevents existence enumeration.

---

## 6. Database Changes

The canonical `users` table from `docs/specs/user-profile.md` is the starting
point. This spec **adds** three columns. Migration is additive and safe to
run before any rows exist.

### 6.1 New columns on `users`

| Column                  | Type           | Constraints                                                                                              |
| ----------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| `display_name`          | `text`         | `NOT NULL`, `CHECK (char_length(display_name) BETWEEN 1 AND 80)`                                         |
| `avatar_url`            | `text`         | `NULL`-able, `CHECK (avatar_url IS NULL OR (char_length(avatar_url) BETWEEN 1 AND 2048 AND avatar_url LIKE 'https://%'))` |
| `language_preference`   | `text`         | `NOT NULL`, default `'th'`, `CHECK (language_preference IN ('th','en'))`                                 |

### 6.2 Reconciliation with the prior spec

The earlier spec defines `name` (1..80) which is column-equivalent to
`display_name`. Implementer MUST decide one of:

- **(A) Rename `name` → `display_name`** (preferred — single source of truth).
  Migration: `ALTER TABLE users RENAME COLUMN name TO display_name;`
- **(B) Keep both** and have the API expose `displayName` while internally
  mirroring to/from `name`. Only do this if a separate "legal name" concept
  exists (it does not in the prototypes).

Default recommendation: **(A)**. Capture the choice in the migration PR.

### 6.3 Indexes

No new indexes required. `id` PK is sufficient for the access pattern
(`SELECT … WHERE id = $1`).

### 6.4 Trigger

The existing `BEFORE UPDATE` trigger that bumps `updated_at = now()` already
covers the new columns — no change needed.

### 6.5 Backfill

If `users` rows already exist when this migration ships:

```sql
UPDATE users
SET    display_name        = COALESCE(display_name, name, 'ผู้ใช้'),  -- last fallback only if rename not done
       language_preference = COALESCE(language_preference, 'th'),
       avatar_url          = NULL
WHERE  display_name IS NULL OR language_preference IS NULL;
```

---

## 7. Repository Interface

The route handler MUST NOT talk to the DB driver directly. It uses
`frontend/db/users.ts`, which exposes:

```ts
import type { UserProfile, UpdateUserRequest } from "@/lib/types/user";

/**
 * Retrieve a single user by their UUID.
 * Returns null when no matching row exists (stale session, hard-delete).
 *
 * Maps DB columns → camelCase fields:
 *   id, display_name → displayName, avatar_url → avatarUrl,
 *   language_preference → languagePreference,
 *   created_at → createdAt, updated_at → updatedAt
 */
export function findUserById(id: string): Promise<UserProfile | null>;

/**
 * Apply a partial update and return the refreshed profile.
 * Only fields present (and non-undefined) in `patch` are written.
 * The DB trigger bumps updated_at automatically.
 *
 * v1 does not throw any typed errors (no unique constraints among the
 * mutable fields). If a future field gains a UNIQUE constraint, add a
 * matching typed error and document its 4xx mapping here.
 */
export function updateUser(
  id: string,
  patch: UpdateUserRequest
): Promise<UserProfile>;
```

> **Diff vs. prior spec.** The earlier spec defined an `EmailTakenError`
> because `email` is unique. This spec touches no unique columns, so no
> typed errors are required. `EmailTakenError` stays exported from
> `db/users.ts` for the email-update path defined in the prior spec.

The repository owns:
- SQL parameterisation.
- Column ↔ field name mapping (snake_case ↔ camelCase).
- Translation of DB driver errors into typed application errors.

The route handler owns:
- HTTP concerns (status codes, headers, JSON envelope).
- Authentication / authorisation.
- Input validation and normalisation (trim, lowercase, URL parse).
- Mapping typed errors → HTTP responses.

---

## 8. Handler Skeleton (Next.js 16)

For implementer reference. Per Next.js 16, dynamic route params on Route
Handlers are a **Promise** and `RouteContext<…>` is globally available.

```ts
// frontend/app/api/users/[id]/route.ts
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { findUserById, updateUser } from "@/db/users";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
): Promise<Response> {
  // 1. session
  // 2. await ctx.params; validate `id` shape (uuid v4 | "me")
  // 3. resolve "me" -> session.id
  // 4. authz: if id !== session.id → 403
  // 5. findUserById(id) → 404 if null
  // 6. respond 200 with UserProfile
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
): Promise<Response> {
  // 1. session
  // 2. await ctx.params; validate `id` shape
  // 3. resolve "me"
  // 4. authz check
  // 5. content-type → 415 if not application/json
  // 6. parse JSON → 400 on parse error / non-object / null / array
  // 7. strict-key check → 400 on unknown field, read-only field, or null value
  // 8. per-field validate + normalise (trim, lowercase, URL parse)
  // 9. updateUser(id, patch)
  // 10. respond 200 with the post-update UserProfile
}
```

`RouteContext` is generated by `next dev` / `next build` / `next typegen`
into `.next/types/`. **Do not import it.**

---

## 9. Validation Rules (canonical)

### 9.1 Path

- `id` matches `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive) **OR** equals the literal `me`. Else `400 VALIDATION_ERROR`.

### 9.2 Body envelope (PATCH)

- Must be parseable JSON. Else `400`.
- Must be a plain object (not array, not null, not primitive). Else `400`.
- Must have ≥ 1 key. Else `400`.
- Every key must be in `{"displayName", "avatarUrl", "languagePreference"}`. Else `400` with the offending key in the message.
- Read-only keys (`id`, `createdAt`, `updatedAt`) → `400 VALIDATION_ERROR` with `details[].code = "READ_ONLY"`.
- No value may be `null`. Else `400` with `details[].code = "NULL_NOT_ALLOWED"`.

### 9.3 Per-field

- **`displayName`**
  - Type `string`. Else `INVALID_TYPE`.
  - After `trim()`: length ∈ [1, 80]. Else `TOO_SHORT` / `TOO_LONG`.
  - No control chars `[\x00-\x1F\x7F]`. Else `INVALID_CHAR`.
- **`avatarUrl`**
  - Type `string`. Else `INVALID_TYPE`.
  - After `trim()`: length ∈ [1, 2048]. Else `TOO_SHORT` / `TOO_LONG`.
  - Must parse via `new URL(value)`. Else `INVALID_FORMAT`.
  - `protocol === "https:"`. Else `INVALID_FORMAT`.
  - No control chars in the input string. Else `INVALID_CHAR`.
- **`languagePreference`**
  - Type `string`. Else `INVALID_TYPE`.
  - Value ∈ `{"th", "en"}`. Else `INVALID_ENUM`.

All field violations are collected before responding — return one `400`
with a populated `details[]` rather than failing on the first field. Both
the prior spec and the existing handler implement this pattern.

---

## 10. Security Considerations

### 10.1 Read-only fields (server-managed)

- `id` — assigned at row creation; never accepted in any request body.
- `createdAt` — assigned at row creation; immutable.
- `updatedAt` — maintained by the DB trigger; never accepted in any request.

The strict-key check (§9.2) is the enforcement mechanism. If any read-only
key is present in a request body, return `400 VALIDATION_ERROR` and **do
not** silently strip it — silent stripping hides client bugs.

### 10.2 Enumeration resistance

- Cross-user reads return `403`, not `404`, regardless of whether the row
  exists (§5.3 / §4.3).
- Error messages never echo other users' field values.
- The validation error for `:id` shape uses the caller-supplied value only
  for the message; do not log it at `info` level (it can be spammy).

### 10.3 Input sanitisation

- All strings are `trim()`-ed before length checks and persistence.
- `avatarUrl` is parsed via `new URL()` — this rejects javascript:, data:,
  http: (non-https), mailto:, file:, and other schemes. Output to the
  client is the canonicalised form (`url.toString()`).
- Control characters (`U+0000`–`U+001F`, `U+007F`) are rejected on every
  string input. This avoids log injection and Thai input-method artefacts
  that occasionally include `\x00`.
- The handler does NOT HTML-escape — that is the renderer's job. Storing
  raw user input is the right behaviour.

### 10.4 What is NOT validated server-side (intentional)

- The avatar URL is not fetched or content-sniffed by this endpoint. A
  separate avatar-upload pipeline owns that concern. v1 trusts the caller's
  URL but constrains it to `https`.
- Display name is not uniqueness-checked.
- `languagePreference` is not validated against the user's `Accept-Language`
  header — users may set a UI language different from their browser.

### 10.5 Logging

- Errors caught by the handler are logged with `console.error` and the route
  prefix (e.g. `[GET /api/users/[id]]`). Do not log full request bodies —
  they may contain the user's display name (PII).
- Do not log the `id` path param at `info`-level on success.

### 10.6 Rate limiting

Out of scope for this spec. Apply at the platform / middleware layer.
Suggested limits when added: 60 GET/min and 10 PATCH/min per session.

---

## 11. Test Scenarios

### 11.1 Happy paths

1. **GET self by UUID** — authenticated session, `:id` matches session user → `200` + full `UserProfile`.
2. **GET self via `me`** — `GET /api/users/me` → `200` + full `UserProfile` with `id === session.id`.
3. **PATCH `displayName` only** — `{"displayName":"ใหม่"}` → `200`, only `displayName` and `updatedAt` change.
4. **PATCH `avatarUrl` only** — `{"avatarUrl":"https://cdn.example.com/a.png"}` → `200`.
5. **PATCH `languagePreference` only** — `{"languagePreference":"en"}` → `200`.
6. **PATCH multiple fields** — `{"displayName":"X","languagePreference":"en"}` → `200`, both applied atomically.
7. **PATCH idempotency** — applying the same patch twice yields the same logical state and a strictly later `updatedAt` on each call.

### 11.2 Auth & authorisation

8. **No session cookie** → `401 UNAUTHENTICATED` on both GET and PATCH.
9. **Expired / malformed session** → `401 UNAUTHENTICATED`.
10. **GET another user's id (valid UUID, exists)** → `403 FORBIDDEN`. No DB read for the foreign row.
11. **PATCH another user's id** → `403 FORBIDDEN`. No DB write.
12. **`me` alias with no session** → `401`.
13. **Authn check happens before path-param validation** — `GET /api/users/notauuid` with no session → `401`, not `400`. (Choosing 401-first prevents probing.) *Implementer note: prior spec did `id`-shape check first; if both have to agree, pick one and apply repo-wide. Recommendation: `401` first.*

### 11.3 Path validation

14. **Malformed UUID** (`/api/users/abc`) → `400 VALIDATION_ERROR`.
15. **Uppercase UUID** → `400` if regex is case-sensitive, `200` if case-insensitive. **Spec choice: case-insensitive** (regex uses `/i`).
16. **Trailing whitespace in path** — handled by routing; never reaches the handler.

### 11.4 Body envelope (PATCH)

17. **Empty body `{}`** → `400 VALIDATION_ERROR` (empty patch).
18. **Unknown field** `{"role":"admin"}` → `400 VALIDATION_ERROR`. Critical: blocks privilege-escalation attempts.
19. **Read-only field** `{"id":"…"}` or `{"createdAt":"…"}` → `400` with `details[].code = "READ_ONLY"`.
20. **Non-JSON body** (`"not json"`, `<xml/>`) → `400 VALIDATION_ERROR`.
21. **Body is JSON array** `[]` → `400 VALIDATION_ERROR`.
22. **Body is JSON null** → `400 VALIDATION_ERROR`.
23. **Body is JSON primitive** (`42`, `"x"`) → `400 VALIDATION_ERROR`.
24. **Missing `Content-Type`** → `415 UNSUPPORTED_MEDIA`.
25. **Wrong `Content-Type`** (`text/plain`) → `415 UNSUPPORTED_MEDIA`.
26. **`null` for a known field** `{"avatarUrl":null}` → `400` with `details[].code = "NULL_NOT_ALLOWED"`.

### 11.5 Field-level validation

27. **`displayName` whitespace-only** (`"   "`) → `400 TOO_SHORT`.
28. **`displayName` length 81** → `400 TOO_LONG`.
29. **`displayName` containing `\x00`** → `400 INVALID_CHAR`.
30. **`displayName` Thai characters** (`"สมชาย"`) → `200`.
31. **`avatarUrl` `http://` (not https)** → `400 INVALID_FORMAT`.
32. **`avatarUrl` `javascript:alert(1)`** → `400 INVALID_FORMAT`.
33. **`avatarUrl` `"not a url"`** → `400 INVALID_FORMAT`.
34. **`avatarUrl` length 2049** → `400 TOO_LONG`.
35. **`avatarUrl` empty string `""`** → `400 TOO_SHORT`. (To clear the avatar, use a future dedicated endpoint.)
36. **`languagePreference: "fr"`** → `400 INVALID_ENUM`.
37. **`languagePreference: "TH"`** (case-different) → `400 INVALID_ENUM`. (Strict; client must send `"th"`.)
38. **Multiple invalid fields** `{"displayName":"","languagePreference":"fr"}` → single `400` with **two** entries in `details[]`.

### 11.6 Edge & data integrity

39. **Session points to a deleted user** — `GET /api/users/me` → `404 USER_NOT_FOUND`. Middleware should subsequently invalidate the session (separate spec).
40. **Concurrent PATCHes from two tabs** — last write wins; both calls return `200` with monotonically increasing `updatedAt`. No optimistic concurrency in v1.
41. **Very large body (> 1 MB)** — rejected by the platform with `413` before reaching the handler.
42. **`updatedAt` strictly greater than the pre-call value** after every successful PATCH.
43. **`createdAt` never changes** across any number of PATCHes.

### 11.7 Response shape

44. **Response never contains `passwordHash`** — assert via contract / snapshot test.
45. **Response never contains snake_case keys** (`display_name`, `avatar_url`, …) — repository owns the mapping.
46. **`avatarUrl` of `null` round-trips** — `GET` returns `"avatarUrl": null` literally (not omitted).
47. **PATCH response is a fresh read** — equal to the next `GET` byte-for-byte (modulo whitespace).

---

## 12. Dependencies

| Dependency                       | Status                  | Notes                                                                 |
| -------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `frontend/lib/auth.ts` (`getSessionUser`) | Stub — returns `null` | Real impl comes from a separate auth spec. Contract is stable.        |
| `frontend/db/users.ts` (`findUserById`, `updateUser`) | Stub — throws         | Needs a DB client choice; contract above is the integration target.   |
| `frontend/lib/types/user.ts`     | Exists                 | `UserProfile` and `UpdateUserRequest` types must be **updated** to match §3.1 / §2.4 (current file uses the prior spec's fields). |
| `frontend/lib/types/api-error.ts` | Exists, reused as-is | `ApiErrorBody` / `ApiErrorDetail` are the project standard.           |
| Database (`users` table)         | Migration pending      | See §6 for additive migration.                                        |
| External services                | None                   | No avatar upload, no email send, no third-party identity in v1.       |

No other endpoints are involved. Future cross-cutting work (session
invalidation on missing user, avatar upload, account deletion) lives in
their own specs.

---

## 13. Open Questions / Future Work

1. **Field-set reconciliation.** This spec's `UserProfile`
   (`displayName`, `avatarUrl`, `languagePreference`) overlaps but does
   not match `docs/specs/user-profile.md` (`name`, `email`,
   `characterName`, `gender`). Per the design source-of-truth rule, the
   prototypes in `docz/layouts/` are canonical. **Action before
   implementation:** Decide whether `displayName` replaces `name`,
   coexists with it, or is computed from `name + characterName`. Capture
   the decision in a follow-up spec.
2. **Avatar deletion path.** v1 does not allow setting `avatarUrl` back to
   `null` via PATCH. A `DELETE /api/users/:id/avatar` (or `null`-tolerant
   PATCH gated by an explicit flag) should land before users can change
   their avatar.
3. **Avatar upload pipeline.** The endpoint accepts any HTTPS URL. A
   storage service (S3, Cloudflare R2, …) plus a signed-URL upload
   endpoint is needed before this is user-facing.
4. **`languagePreference` extension.** Adding a third locale (e.g. `lo`,
   `ja`) requires: extend the `Gender`-style enum in TS, extend the DB
   `CHECK` constraint, extend strict validation in the handler. Migration
   ordering: TS first, then DB, then handler — code can serve old + new
   reads during the rollout.
5. **Optimistic concurrency.** Add an `If-Match` header keyed on
   `updatedAt` and return `412 PRECONDITION_FAILED` on mismatch when
   multi-device editing becomes a real concern.
6. **Soft delete.** Out of scope. If introduced, GET must filter on
   `deleted_at IS NULL` and a soft-deleted session-user-row should map to
   the same `404 USER_NOT_FOUND` as a hard-deleted one.
7. **Audit log.** No history table in v1.
8. **Rate limiting.** Apply at middleware once one is added to the
   project; see §10.6 for suggested limits.
