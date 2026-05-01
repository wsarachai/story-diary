---
name: Frontend not yet scaffolded
description: As of 2026-05-01 the frontend/ directory exists but is empty
type: project
---

`frontend/` exists as an empty directory as of 2026-05-01. CLAUDE.md describes the intended stack (Next.js 16.2.4, React 19.2.4, TypeScript strict, Tailwind v4 with `@theme inline`, pnpm) but no code, package.json, or tsconfig has been committed yet.

**Why:** Specs are being authored ahead of implementation. The architect produces type files and design docs that the implementer will scaffold against.

**How to apply:** When writing specs, reference Next.js 16 App Router paths (`app/`, route groups like `(authed)/`, `RouteContext<>` types, awaited `ctx.params`) anticipatorily. Do not assume any code exists in `frontend/` yet — the implementer creates it. When verifying a memory that names a file in `frontend/`, first check that it actually exists; many will not.
