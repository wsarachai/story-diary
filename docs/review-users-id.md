# Code Review — `/api/users/[id]` (Task #4)

**Reviewer:** reviewer agent
**Date:** 2026-04-29
**Branch:** ui-draft
**Artifacts reviewed:**
- `docs/specs/user-profile.md` (spec — actual location; team-lead path `docs/api-spec-users-id.md` does not exist)
- `frontend/app/api/users/[id]/route.ts` (route handler; team-lead path `frontend/src/app/api/users/[id]/route.ts` does not exist — repo has no `src/` folder)
- `frontend/db/users.ts` (repository — stub)
- `frontend/lib/auth.ts` (session — stub; reviewed even though not on the task list because the route depends on it)
- `frontend/lib/types/user.ts`, `frontend/lib/types/api-error.ts` (shared types)
- **MISSING:** `frontend/src/__tests__/api/users-id.test.ts` (does not exist; no test files exist anywhere in the repo and `frontend/package.json` declares no test runner)

---

## Spec Completeness — **PASS**

The spec at `docs/specs/user-profile.md` is thorough and self-contained. It defines:

- Both endpoints (`GET`, `PATCH`) with auth/authz semantics, the `"me"` alias, idempotency, and out-of-scope items.
- Request schemas (path param, headers, body) and a strict-parsing rule for unknown fields.
- A canonical `UserProfile` response shape and a project-wide `ApiError` envelope with a status/code table.
- Detailed validation rules per field, including normalisations (trim, lowercase email, control-char rejection).
- A greenfield DB migration for the `users` table with constraints, indexes, and an `updated_at` trigger.
- Dependencies (`getSessionUser`, `db/users` repository contract, `EmailTakenError`).
- A Next.js 16 handler skeleton noting that `ctx.params` is a Promise.
- 33 numbered test scenarios across happy paths, auth/authz, path validation, body validation, conflicts, edge cases, and response-shape assertions.
- Open questions for future work.

Minor nits (not blockers):
- The validation-rules table mentions “Reject control chars” but renders the regex character class with what looks like literal control characters in the rendered table. The intent (C0 + DEL) is unambiguous and is implemented correctly.
- “Empty id” is dismissed as “handled by routing” without an explicit assertion of the resulting status (Next.js will not match the route at all → 404 from the framework). Worth a one-line clarification.
- The spec defines `409 EMAIL_TAKEN` semantics but does not specify whether case-only differences against the *caller’s own* current email count as a no-op write or a normalised update; scenario #27 covers it implicitly (“not a conflict”) but the language could be tightened.

---

## Spec / Implementation Alignment — **PASS (with WARNs)**

Strong overall alignment. The route handler implements every documented status code and the validation rules to the letter. Findings:

### GET — correct
- `route.ts:371` resolves the session before any other work → 401 path covered.
- `route.ts:377` awaits `ctx.params` per Next.js 16 contract.
- `route.ts:378–384` enforces UUID-v4-or-`"me"` validation → 400 path covered.
- `route.ts:387` resolves `"me"` to `session.id`.
- `route.ts:390–392` returns 403 for cross-user access (no existence leak — matches spec note on lines 142–144).
- `route.ts:396–401` wraps the repository call in try/catch and maps unknown errors to 500 with a generic message.
- `route.ts:404–406` returns 404 only when the session user’s row is missing.
- Response is the raw `UserProfile` from the repository (`route.ts:408`) — matches `GetUserResponse` in the spec.

### PATCH — correct
- `route.ts:425–446` mirrors the GET prelude (session → path → me-alias → authz).
- `route.ts:449–450` delegates body parsing to `parsePatchBody` which enforces every body-side rule.
- `route.ts:454–466` maps `EmailTakenError` → 409 and unknown errors → 500.

### `parsePatchBody` — correct, strict, and ordered well
- 415 first when `Content-Type` is missing/wrong (`route.ts:175–185`).
- Invalid JSON → 400 (`route.ts:187–200`).
- Non-object/array body → 400 (`route.ts:203–216`).
- Unknown field rejection (`route.ts:222–233`) — guards against privilege-escalation attempts (e.g. `"role": "admin"`).
- Empty patch (zero recognised fields) → 400 (`route.ts:236–248`).
- `null` values for any field → 400 with `NULL_NOT_ALLOWED` details (`route.ts:251–266`).
- Per-field validation:
  - `name` / `characterName` use `validateTrimmedString` with the spec’s 80 / 40 length caps and CONTROL_CHAR rejection.
  - `email` is lowercased, length-checked (≤254), regex-checked, and control-char-checked, in that order — matches spec lines 154 and 158.
  - `gender` is a strict `"male" | "female"` enum check.

### WARN-level findings

1. **`route.ts:43` `CONTROL_CHAR_RE` is a single character class.** It correctly catches C0 + DEL when the literal control bytes are present in the source. However, *encoding the source file with literal control chars is brittle* — a code formatter, a copy/paste through chat, or an editor that strips invalid characters could silently weaken it. **Recommendation:** rewrite as `/[\x00-\x1F\x7F]/` (escaped form) so the regex is robust against editor mangling. This is the same intent, but unambiguous in source.

2. **Email normalisation order vs. control-char check (`route.ts:303`).** A control character in `email` is detected only after the format regex; in practice the regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` will reject most control chars via `\s`, but DEL (0x7F) and a few non-`\s` control codes can slip through and reach the dedicated check. That works, but the check ordering is subtle — consider running CONTROL_CHAR first for parity with `validateTrimmedString`.

3. **`updateUser` is invoked even when the patch only contains fields whose values would round-trip.** No-op detection is *not* required by the spec (idempotency is satisfied by replaying), so this is informational only.

4. **`apiError` accepts `code: string` (`route.ts:66–77`).** The spec defines a fixed enum of top-level codes. Tightening this to a union (`"VALIDATION_ERROR" | "UNAUTHENTICATED" | …`) would prevent future typos from compiling.

5. **`getSessionUser` is a stub that always returns `null` (`lib/auth.ts:48–55`).** The spec explicitly permits this (auth is a separate spec). However, while the stub is in place, **every** request to these routes will deterministically return `401`. This is *safe* but means the route is currently un-shippable behind a real cookie. The route file does not assert this caveat in its top-of-file comment; consider a one-line note for downstream consumers.

6. **Response shape trust.** The handler trusts `findUserById` / `updateUser` to return objects matching `UserProfile`. The repository is currently a stub — once the real query lands, an automated contract assertion (Zod parse, type-only `satisfies UserProfile`, or a snapshot) would close the loop with spec test #32 (“response never contains `passwordHash`”).

7. **The implementation file imports `@/db/users`**, which resolves to `frontend/db/users.ts`. The team-lead instruction referenced `frontend/src/lib/db/users.ts` — that path does not exist. The current path is consistent with `tsconfig.json`’s `@/*` mapping and the project layout, but worth confirming the architect intended `frontend/db/` over `frontend/lib/db/` for repository modules going forward.

---

## Security — **PASS**

| Concern | Status | Notes |
|---|---|---|
| Injection (SQL / template) | PASS (in-handler) | No string concatenation; all DB access is funnelled through `findUserById` / `updateUser`, which document parameterised queries. The stub bodies will need to honour this. |
| Input validation | PASS | UUID regex on path; strict allow-list on body keys; per-field type/length/enum/format checks; `null` rejection; control-character rejection. |
| Authentication | PASS | 401 returned before any other work; gates both handlers. |
| Authorisation | PASS | 403 returned for cross-user access; correctly preferred over 404 to avoid existence leak (spec lines 142–144). |
| Privilege escalation | PASS | Unknown-field rejection prevents `{"role":"admin"}` and similar. |
| Field exposure | PASS (handler-side) | Handler returns the repository’s `UserProfile`. Real risk is in the repository SELECT list; the JSDoc-documented column projection excludes `password_hash`. Add a runtime assertion when wiring real queries. |
| Error leakage | PASS | 500 paths log via `console.error` and respond with a generic message; validation errors do not embed user PII. |
| `Content-Type` enforcement | PASS | 415 returned when missing or wrong. |
| Mass-assignment | PASS | Allow-list `ALLOWED_PATCH_FIELDS` is the *only* path into the patch object; the patch returned to the repository is built field-by-field. |
| Logging hygiene | INFO | `console.error("[GET /api/users/[id]] Unexpected error:", err)` may include stack with PII if `err.message` echoes the DB row. Consider redacting. |
| Email enumeration via 409 | INFO | A 409 on PATCH email-change confirms an email is taken by *some* other user. Inherent to the contract; flag only for future review when a registration endpoint lands. |

---

## TypeScript Quality — **PASS**

- No `any` usage anywhere in the route handler, repository, types, or auth stub.
- `unknown` is used correctly for raw JSON bodies and field values; narrowing happens through `typeof`/in-place checks.
- Discriminated union `ParsedPatch = { ok: true; patch } | { ok: false; response }` cleanly forces the caller to handle both branches.
- Imports use `import type` where appropriate (`NextRequest`, `UpdateUserRequest`, `ApiErrorDetail`, `ApiErrorBody`).
- The Next.js 16 globals are honoured: `RouteContext<"/api/users/[id]">` is *not* imported (per spec lines 248–249), and `ctx.params` is awaited.
- Return types on the handlers are explicit (`Promise<Response>`).
- `Gender` and the `UserProfile` / `UpdateUserRequest` types are well-named and JSDoc’d.
- The repository stub functions have explicit parameter and return types.

Minor:
- `let user;` and `let updated;` (`route.ts:395`, `route.ts:453`) infer from the awaited promise. Acceptable, but explicit `let user: UserProfile | null;` / `let updated: UserProfile;` would be more self-documenting.
- `apiError`’s `code: string` could be a string-literal union (see Spec/Impl Alignment WARN #4).
- `ApiErrorBody.error.details` is mutated post-construction in `apiError`; consider building the object in a single literal so the body is immutable from the caller’s perspective.

---

## Test Coverage — **FAIL**

The test artifact does not exist. Specifically:

- The team-lead-specified path `frontend/src/__tests__/api/users-id.test.ts` does not exist.
- There is **no `__tests__` directory anywhere** in the repository (verified with `find`).
- **No test runner is configured** in `frontend/package.json` (no `vitest`, `jest`, `node:test`, or `test` script).
- `.claude/agent-memory/tester/` is empty — the tester agent left no notes.

Without a test file, none of the spec’s 33 numbered scenarios can be assessed for:
- Coverage of happy paths (#1–#6).
- Coverage of auth/authz (#7–#11) — particularly the 403-not-404 leak prevention.
- Coverage of path validation (#12–#13).
- Coverage of body validation (#14–#25).
- Coverage of conflict handling (#26–#27).
- Coverage of edge cases (#28–#31).
- Response-shape assertions (#32–#33), including the critical “never returns `passwordHash`” contract test.
- Mock realism (whether `getSessionUser`, `findUserById`, `updateUser`, `EmailTakenError` are stubbed faithfully against the real types).

This single FAIL drives the overall verdict.

---

## Code Quality — **PASS**

- **Readability:** Excellent. Section banners (`Constants`, `Response helpers`, `Validation helpers`, `Body parsing`, `Route handlers`) make the file navigable.
- **Naming:** Consistent and intention-revealing (`isValidPathId`, `validateTrimmedString`, `parsePatchBody`, `ALLOWED_PATCH_FIELDS`).
- **Documentation:** Top-of-file flow summary and JSDoc on every exported and non-trivial internal function. The repository stubs include a TODO with the eventual SQL — a nice handoff to the implementer who wires up the DB.
- **Complexity:** `parsePatchBody` is the only long function; it is linear, top-to-bottom, and each step is annotated. No nested branching beyond two levels.
- **Duplication:** Minimal. The two handlers share the session/path/me/authz prelude verbatim — a small `resolveAuthorisedUserId(req, ctx)` helper would DRY this if a third method (DELETE, etc.) is added later, but at two call-sites the explicit code is fine.
- **Error handling:** Try/catch around every external boundary (`req.json`, `findUserById`, `updateUser`); typed `EmailTakenError` is mapped explicitly; everything else is normalised to a generic 500.
- **Performance:** No concerns. Validation is O(n) over body keys; no synchronous heavy work.
- **Consistency with the project:** Uses `Response.json()` (the Web standard) rather than `NextResponse.json()` — fine on Next.js 16, but worth picking one convention project-wide before more routes land.

Minor:
- `Object.keys(body).filter((k) => ALLOWED_PATCH_FIELDS.has(k))` (`route.ts:236–238`) is computed *after* the unknown-field loop has already guaranteed every key is allowed. The filter is therefore redundant — `Object.keys(body)` would suffice. Tiny cleanup.
- The `void request;` in `lib/auth.ts:53` is a clear-but-quirky way to silence “unused parameter”; prefixing the parameter with `_` (i.e. `_request`) is the project-conventional alternative.

---

## Summary

**Overall verdict: REQUEST CHANGES** — driven entirely by the missing test artifact. The implementation itself is high-quality and tracks the spec faithfully; if tests existed and passed, this would be a clean APPROVE.

### Top 3 action items

1. **Deliver the test file.** `frontend/src/__tests__/api/users-id.test.ts` (or wherever the project decides to host tests; `frontend/__tests__/` is more conventional for the no-`src/` layout actually in use) must exist and cover all 33 numbered scenarios from the spec, including the 403-not-404 leak-prevention case and the “response never contains `passwordHash`” contract test. A test runner (`vitest` is the natural fit for Next.js 16) must be added to `frontend/package.json` with a `test` script.
2. **Harden `CONTROL_CHAR_RE`.** Rewrite it as `/[\x00-\x1F\x7F]/` so the regex is robust against editor/format-on-save mangling, since the current literal-control-char form is fragile.
3. **Tighten error-code typing and document the auth stub.** Replace `apiError(status: number, code: string, …)` with a string-literal union mirroring the spec table, and add a top-of-file note in `route.ts` (or a banner log on first call) that all requests currently 401 because `getSessionUser` is a stub — so downstream agents are not surprised.
