# Copilot Instructions — Story Diary

## Repository Layout

```
story-diary/
├── src/types/          # Cross-agent TypeScript contracts (framework-agnostic)
├── docz/wireframes/    # Static HTML design source of truth (s001–s031)
├── docs/specs/         # Architectural specs per feature group
├── frontend/           # Next.js 16 app (active development)
└── backend/            # Not yet implemented
```

## Commands

All commands run from `frontend/`:

```bash
cd frontend
pnpm dev        # dev server at http://localhost:3000
pnpm build      # production build
pnpm lint       # ESLint (next/core-web-vitals + typescript)
```

No test runner is configured yet.

## Architecture

### Cross-agent type contracts (`src/types/`)

`src/types/` is the single source of truth shared by frontend, backend, and tests. Every file is deliberately framework-agnostic. When modifying or adding types:

- Each type file documents the wireframe(s) it mirrors in its header comment.
- `user.ts` is the **canonical** declaration of `UserProfile`; `auth.ts` re-exports it as `User` — never duplicate the shape.
- `navigation.ts` owns `RAIL_ITEMS` (order, icons, accents) and `SCREEN_TO_RAIL` (deep-screen → rail key mapping). Do not hard-code rail state in individual screens.
- `error.ts` defines `ApiErrorCode` — append new codes only, never reuse or remove a retired code.

### Wireframes as design source of truth (`docz/wireframes/`)

Screens are numbered `s001`–`s031`. Before implementing any screen, read its corresponding HTML file. The wireframes define:
- Exact CSS class names that the React components should mirror (e.g. `.entry-med`, `.rounded-pill-button`, `.icon-rail-link`).
- Thai copy, aria-labels, and field names that must be preserved exactly.
- Navigation intent via `data-navigate="<filename>.html"` — translate these to Next.js `<Link href={AppRoute}>` in React.

Shared wireframe assets:
- `docz/wireframes/assets/common.css` — design tokens (see below)
- `docz/wireframes/assets/common.js` — delegated click handler for `data-navigate` (no page-specific JS exists in any wireframe)

### Architectural specs (`docs/specs/`)

Each spec file (`s001-auth-and-home-entry.md`, `s005-chapters-and-story.md`, etc.) contains the Redux slice design, derived UI states not visible in the wireframes (e.g. loading skeletons, already-authenticated redirects), and API endpoint contracts. Read the relevant spec before implementing a feature.

### Frontend stack

- **Next.js 16.2.4** — has breaking changes from prior versions. Check `node_modules/next/dist/docs/` for actual API; do not rely on training data.
- **React 19.2.4**, **TypeScript (strict)**, **Tailwind CSS v4**, **pnpm**
- Path alias: `@/*` → `frontend/*`
- Tailwind: `@import "tailwindcss"` syntax (not `@tailwind base/components/utilities`); theme tokens via `@theme inline` in `globals.css`
- Fonts: Geist Sans / Geist Mono in the Next.js app; Baloo 2 / Noto Sans Thai in wireframes

## Key Conventions

### Design tokens (from `common.css`)

| Token | Use |
|---|---|
| `--desk-light / --desk-mid / --desk-soft` | Warm wood desk background |
| `--book-line / --book-fill` | Book spine and page colours |
| `--panel-blue / --panel-blue-deep` | UI accent colours |
| `--field-fill` | Form field backgrounds |
| `--ink` | Primary text colour |

### Layout pattern

Every authenticated screen follows: `.screen` (1920×1080) → `.book-shell` → `.page-left` / `.page-right` (two-page open-book layout).

The persistent icon rail (`.icon-rail`) appears on every authenticated screen, right edge. Accent colours per destination: home `#ff3131`, chapters `#08c65a`, habit `#6a24f2`, minigame `#c771e8`.

### Auth

- Session-cookie based — no token is exposed to JavaScript. Do not store tokens client-side.
- `AuthStatus` lifecycle: `"unknown"` → `"unauthenticated"` | `"authenticating"` → `"authenticated"`.
- `RegisterInput.confirmPassword` is **client-only** — strip it before POSTing (`RegisterRequest = Omit<RegisterInput, "confirmPassword">`).

### API errors

- Frontend MUST key user-facing copy on `error.code` (not `error.message`). `message` is English/log-safe only.
- Use `isApiError(value)` type guard (from `src/types/error.ts`) at every API boundary before accessing `.error.code`.
- Fall back to a generic Thai copy "เกิดข้อผิดพลาด" for unrecognised codes.

### Localisation

The app is Thai-language (`lang="th"`) and desktop-first (1920×1080). Preserve Thai copy verbatim from wireframes. Do not translate or paraphrase UI strings.
