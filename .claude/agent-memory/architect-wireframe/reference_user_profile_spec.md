---
name: User-profile API spec is canonical
description: docs/specs/user-profile.md is the existing API design that new specs must align with
type: reference
---

`docs/specs/user-profile.md` (dated 2026-04-29) is the first API spec in the project. It defines:

- The canonical `UserProfile` shape (id, name, email, characterName, gender, createdAt, updatedAt) — now extracted to `src/types/user.ts`.
- The error envelope `{ error: { code, message, details? } }` with stable `code` strings — now extracted to `src/types/error.ts` as `ApiError` / `ApiErrorCode`.
- The `Gender` enum: `"male" | "female"` — now in `src/types/auth.ts`.
- Auth model: session-cookie based, with a `getSessionUser(req)` primitive that does not exist yet.
- The `:id = "me"` alias convention for user-scoped endpoints.
- Error semantics: never leak existence — return 403 for forbidden, 404 only for the caller's own missing row.

**How to apply:** Any new API or UI spec that touches users, errors, or auth must (a) import shapes from `src/types/` rather than redeclaring them, (b) use the same `code` vocabulary, and (c) preserve the no-existence-leak rule. Add new `ApiErrorCode` values to `src/types/error.ts` when needed; do not invent ad-hoc codes in route handlers.
