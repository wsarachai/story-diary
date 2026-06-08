# Spec: Auth and Home Entry

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Landing page, login, registration, and authenticated home hub.

---

## Summary

The auth flow uses JWT stored in `localStorage` under `auth_token`. The token is sent as a `Bearer` header on every API request via RTK Query's `prepareHeaders`. Login and register mutations manually populate the `getMe` cache on success (via `upsertQueryData`) to avoid a race condition between token write and the refetch. Unauthenticated users on protected pages are redirected to `/login`; already-authenticated visitors on public pages are redirected to `/home` (or the original `?from=` target).

Registration requires a Thai phone number (10-digit, starting with 0), a real name, a character name, gender selection, and a timezone (auto-detected). Email is not used.

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/` | `frontend/app/page.tsx` | Landing page; CTA disabled while auth probe is in flight; redirects authenticated users to `/home` |
| `/login` | `frontend/app/login/page.tsx` | Login form (phone + password); redirects to `/home` or `?from=` target on success |
| `/register` | `frontend/app/register/page.tsx` | Two-page registration form; redirects to `/home` on success |
| `/home` | `frontend/app/(authed)/home/page.tsx` | Authenticated hub with story card and dashboard cards |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `POST` | `/api/auth/login` | `frontend/app/api/auth/login/route.ts` | Validates phone + password, returns JWT + user |
| `POST` | `/api/auth/register` | `frontend/app/api/auth/register/route.ts` | Creates user account, returns JWT + user (201) |
| `GET` | `/api/auth/me` | `frontend/app/api/auth/me/route.ts` | Returns current user from Bearer JWT; 401 if missing/invalid |
| `POST` | `/api/auth/logout` | `frontend/app/api/auth/logout/route.ts` | Server no-op; client clears `auth_token` from `localStorage` |

---

## Key Components

- `LandingPage` — `frontend/app/page.tsx` — single CTA; `aria-busy` while auth probe is pending
- `LoginForm` — `frontend/app/login/page.tsx` — controlled form with `tel` input for phone, submits via `useLoginMutation`; reads `?from=` for post-login redirect
- `RegisterPage` — `frontend/app/register/page.tsx` — two-page book layout; left page has account fields (name, tel, password, confirm), right page has character name + gender selector; uses `useReducer` for form state
- `HomePage` — `frontend/app/(authed)/home/page.tsx` — left page links to `/chapters`, right page shows current date, profile link (with avatar), habit tracker card, and minigame card
- `BookShellLayout` — `frontend/components/BookShellLayout.tsx` — shared two-page open-book layout wrapper
- `AuthedShell` — `frontend/components/AuthedShell.tsx` — wraps `(authed)` layout group; redirects unauthenticated users to `/login`
- `IconRail` — `frontend/components/IconRail.tsx` — persistent side navigation rail

---

## State

Redux slice: `frontend/store/authApi.ts` — manages `getMe` query (cached user object), `login`, `register`, and `logout` mutations. JWT is stored in `localStorage`, not Redux. On login/register success, `upsertQueryData("getMe")` populates the cache directly before any refetch fires. On logout, the token is removed and the cache is set to `null`.

---

## Responsive notes

Login and register pages are responsive (mobile-first). The home page uses `BookShellLayout` which collapses to a single column on small screens.
