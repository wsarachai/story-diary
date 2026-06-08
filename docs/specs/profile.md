# Spec: User Profile

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** User profile view and edit, avatar upload, and logout.

---

## Summary

The profile page lets users view and update their display name, character name, and gender. Phone number and join date are read-only. Avatar upload is handled client-side: the selected image is resized to 256×256 JPEG via canvas and uploaded as a base64 data URL via `PATCH /api/users/me`. Logout clears the local JWT and redirects to `/login`.

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/profile` | `frontend/app/(authed)/profile/page.tsx` | Left page: avatar display + camera FAB; right page: editable fields (name, character name, gender), read-only fields (phone, join date), save/cancel buttons, logout |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/auth/me` | `frontend/app/api/auth/me/route.ts` | Load current user (shared with auth flow) |
| `PATCH` | `/api/users/me` | `frontend/app/api/users/[id]/route.ts` | Update name, characterName, gender, or avatarUrl; `id=me` resolves to caller's userId |

---

## Key Components

- `ProfilePage` — `frontend/app/(authed)/profile/page.tsx` — two-panel layout using `BookShellLayout`
- `AvatarPanel` — `frontend/app/(authed)/profile/page.tsx` (inline) — shows avatar photo if set, otherwise the default character image; floating camera FAB triggers file picker; resizes to 256×256 JPEG and calls `updateProfile({ avatarUrl })`
- `EditPanel` — `frontend/app/(authed)/profile/page.tsx` (inline) — controlled form for name, character name, gender; phone number and join date are read-only; Save/Cancel appear when form is dirty; shows success/error feedback after save
- `IconRail` — `frontend/components/IconRail.tsx` — persistent side navigation

---

## State

RTK Query: `frontend/store/userApi.ts` — `updateProfile` mutation (`PATCH /api/users/me`); on success, `upsertQueryData("getMe")` updates the auth cache so the home page avatar and profile page both reflect the change without a refetch.

Auth cache: `frontend/store/authApi.ts` — `useGetMeQuery` provides the current user; `useLogoutMutation` clears the token and cache.
