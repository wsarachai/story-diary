---
name: Next.js App Router route handler test patterns
description: Patterns for unit-testing GET/PATCH route handlers with mocked auth and DB
type: feedback
---

## Mocking strategy

```ts
// Hoist mocks before imports (Jest does this automatically)
jest.mock("@/lib/auth");
jest.mock("@/db/users", () => {
  // Keep real class exports (e.g. EmailTakenError) for instanceof checks
  const actual = jest.requireActual<typeof import("@/db/users")>("@/db/users");
  return { ...actual, findUserById: jest.fn(), updateUser: jest.fn() };
});
```

## Request factories

- Native `Request` (available globally in Node 24) cast with `as any` to satisfy `NextRequest` type.
- `new Request(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })`
- `RouteContext` is satisfied by `{ params: Promise.resolve({ id }) } as any`

## Key observations

- `CONTROL_CHAR_RE` in route.ts is `/[\x00-\x1f\x7f]/` — raw bytes in file appear as `[ -]` in some readers. Matches C0 control codes + DEL, NOT space.
- `Response.json()` and `Request` are available globally in Node 24 — no polyfill needed.
- `console.error` calls from the route's 500 paths appear in test output; this is expected and not a failure.
- The PATCH handler has no explicit 404 path — unknown user falls through to 500 INTERNAL_ERROR (updateUser throws). Only GET handles 404 via null return from findUserById.

**How to apply:** Use this pattern for all future Next.js App Router route handler tests in this repo.
