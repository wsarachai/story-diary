---
name: Test framework setup — Jest 30 + ts-jest 29 on Next.js 16 / Node 24
description: Config choices made when adding Jest to the frontend for the first time
type: feedback
---

Jest 30 + ts-jest 29 (supports Jest ^30) chosen; no Vitest.

Key configuration decisions:
- `jest.config.ts` uses `testEnvironment: "node"` (server-side route handlers)
- Separate `tsconfig.jest.json` overrides `module: commonjs` and `moduleResolution: node` so ts-jest can transform ESM-style source
- `moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" }` resolves the `@/` alias (maps to `frontend/`)
- `.next/types/**/*.ts` and `.next/dev/types/**/*.ts` included in tsconfig.jest.json so the globally-declared `RouteContext` type is available
- `pnpm test` / `pnpm test:coverage` added to scripts

**Why:** tsconfig.json uses `module: esnext` + `moduleResolution: bundler` (Next.js defaults); ts-jest needs commonjs to transform.

**How to apply:** Re-use these exact settings for any future route handler tests in this project.
