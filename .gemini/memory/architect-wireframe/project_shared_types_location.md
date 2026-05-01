---
name: Shared types location
description: Where cross-agent TypeScript contracts live in the Story Diary repo
type: project
---

Cross-agent shared TypeScript contracts live at project-root `src/types/`, not under `frontend/src/types/`. Files in this directory are intended to be imported by both frontend (Next.js app under `frontend/`) and backend (currently empty `backend/`) code.

**Why:** The architect prompt explicitly says "Shared cross-agent contracts belong in `src/types/`". Putting them at project root keeps them framework-agnostic and shareable across `frontend/` and `backend/`. CLAUDE.md only sets the `@/* → frontend/*` alias for frontend-specific imports; cross-agent types use a separate import path that frontend's tsconfig should add as a paths entry (e.g. `@/types/* → ../src/types/*`).

**How to apply:** When creating new shared contracts, write to `/home/keng/workspaces/story-diary/src/types/<domain>.ts`. Existing files as of 2026-05-01: `auth.ts`, `user.ts`, `error.ts`, `navigation.ts`. Reuse and extend these before creating new ones.
