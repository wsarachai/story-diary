# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
story-diary/
├── docz/layouts/   # Static HTML wireframe prototypes (design reference only)
├── frontend/       # Next.js 16 / React 19 application (active development)
└── backend/        # Empty — not yet implemented
```

## Frontend

All active development lives in `frontend/`. Run commands from that directory.

```bash
cd frontend
pnpm dev        # start dev server at http://localhost:3000
pnpm build      # production build
pnpm lint       # ESLint (next/core-web-vitals + typescript)
```

**Stack**: Next.js 16.2.4, React 19.2.4, TypeScript (strict), Tailwind CSS v4, pnpm.

**Important**: Next.js 16 has breaking changes from prior versions. Before writing Next.js-specific code, check `node_modules/next/dist/docs/` for the actual API. Do not rely on training-data knowledge of Next.js conventions.

**Path alias**: `@/*` resolves to `frontend/*` (e.g. `@/app/globals.css`).

**Tailwind**: Uses v4 with `@import "tailwindcss"` (not `@tailwind base/components/utilities`). Theme tokens are declared via `@theme inline` in `globals.css`.

**Fonts**: Geist Sans (`--font-geist-sans`) and Geist Mono (`--font-geist-mono`) loaded via `next/font/google` in `app/layout.tsx`.

## Design Prototypes (`docz/layouts/`)

The `docz/layouts/` directory contains standalone HTML prototypes that are the **design source of truth** for the UI. When implementing screens, use these as the reference.

- Screens are numbered `s001`–`s011`: Landing, Login, Register, Home, Chapters, Habit Tracker, Minigame, Chapters Menu, Chapters Explain, Chapters Explain Details, Video Clips.
- All screens are Thai-language (`lang="th"`), desktop-first at 1920×1080.
- Shared styles live in `docz/layouts/assets/common.css`; navigation uses `data-navigate="<filename>"` attributes handled by `common.js`.

**Design tokens** (defined in `common.css`):
- `--desk-light / --desk-mid / --desk-soft` — warm wood desk background
- `--book-line / --book-fill` — book spine and page colours
- `--panel-blue / --panel-blue-deep` — UI accent colours
- `--field-fill` — form field backgrounds
- `--ink` — primary text colour

**Fonts**: Baloo 2 (headings/numbers), Noto Sans Thai (body).

**Layout pattern**: `.screen` (1920×1080 container) → `.book-shell` (inset grid) → `.page-left` / `.page-right` — a two-page open-book layout.
