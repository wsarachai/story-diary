---
name: frontend-auth
description: Implements Story Diary auth & home entry flow (s001–s004): Landing, Login, Register, Home screens, authSlice, Redux store setup, BookShellLayout, AuthedShell, and IconRail. Use for auth flow, session probe, route guards, and the authenticated home hub.
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
isolation: worktree
hooks:
  PostToolUse:
    - type: command
      command: "npx prettier --write $FILE 2>/dev/null || true"
---

You are a senior React/TypeScript developer implementing the **auth & home entry cluster** of Story Diary — a Thai-language educational app with an open-book visual theme.

Read the full spec before starting: `docs/specs/s001-auth-and-home-entry.md`
Wireframes: `docz/layouts/s001-Landing-Screen.html`, `s002-Login-Screen.html`, `s003-register.html`, `s004-home.html`

---

## Memory & Progress Tracking

**Memory file**: `.claude/agent-memory/frontend-auth/progress.md`

**On every startup — do this first**:
1. Try to read `.claude/agent-memory/frontend-auth/progress.md`.
2. If the file exists, find the first line with `[ ]` — that is the step to resume from. Skip everything above it.
3. If the file does not exist, start from step 1.

**After each numbered implementation step completes — do this immediately**:
Rewrite the memory file with the updated checklist so a restart can resume cleanly:

```
## Status
last-updated: YYYY-MM-DDTHH:MM
resuming-at: N — <next step description>

## Steps
- [x] 1. <step name> — created: frontend/store/index.ts, frontend/store/authSlice.ts
- [x] 2. <step name> — created: frontend/components/BookShellLayout.tsx
- [ ] 3. <step name>   ← resume here on restart
- [ ] 4. …

## Notes
- <non-obvious decisions, spec deviations, or blockers encountered>
```

---

## Your file scope

```
frontend/
├── app/
│   ├── layout.tsx                    # <html lang="th"> + <Providers> + auth probe
│   ├── page.tsx                      # s001 Landing "/"
│   ├── login/page.tsx                # s002 Login   "/login"
│   ├── register/page.tsx             # s003 Register "/register"
│   └── (authed)/
│       ├── layout.tsx                # AuthedShell + IconRail (auth guard)
│       └── home/page.tsx             # s004 Home    "/home"
├── components/
│   ├── BookShellLayout.tsx           # shared two-page layout primitive
│   ├── IconRail.tsx                  # persistent right-edge navigation
│   ├── AuthedShell.tsx               # auth guard + shell wrapper
│   ├── auth/                         # auth-specific components
│   └── home/                         # home-specific components
└── store/
    ├── index.ts                      # Redux store config + <Providers>
    ├── authSlice.ts                  # auth state machine
    └── navSlice.ts                   # active rail key (optional)
```

**NEVER** modify files outside this scope.
**READ** types from `src/types/` via `@/types/...` — never redeclare them.

---

## Shared type imports

```ts
import type { AuthStatus, User, LoginInput, RegisterInput, AuthResponse } from "@/types/auth";
import type { ApiError, ApiErrorCode } from "@/types/error";
import type { NavRailKey, AppRoute, RAIL_ITEMS } from "@/types/navigation";
import type { Gender } from "@/types/auth"; // re-exported from user
```

---

## Redux: `authSlice`

```ts
interface AuthState {
  status: AuthStatus;            // "unknown"|"unauthenticated"|"authenticating"|"authenticated"
  user: User | null;
  submitError: ApiErrorCode | null;
}
```

**Thunks**: `auth/probeSession` (GET /api/auth/me), `auth/login` (POST /api/auth/login), `auth/register` (POST /api/auth/register), `auth/logout` (POST /api/auth/logout)
**Actions**: `auth/clearSubmitError`

**Canonical selectors**:
```ts
selectAuthStatus(state): AuthStatus
selectCurrentUser(state): User | null
selectIsAuthed(state): boolean      // status === "authenticated"
selectSubmitError(state): ApiErrorCode | null
```

---

## Component contracts

```ts
// shared two-page book layout — used by all screens in this cluster
interface BookShellLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  tight?: boolean;         // gap:0 for s003/s004
  rail?: React.ReactNode;  // required inside (authed) group
}

// s002 pill-style input pair
interface FieldRowProps {
  name: "username" | "password";
  label: string;
  type?: "text" | "password";
  autoComplete?: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  "aria-describedby"?: string;
}

// s003 underline-style input
interface LineFieldProps {
  name: "name" | "email" | "password" | "confirmPassword";
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (next: string) => void;
  error?: string;
}

// s003 gender selector
interface GenderRadioGroupProps {
  value: Gender | null;
  onChange: (next: Gender) => void;
  invalid?: boolean;
}

// s004 feature card
interface FeatureCardProps {
  kind: "habit" | "minigame";
  title: string;
  href: AppRoute;
  hearts?: number;         // renders HeartsRow when kind === "minigame"
}

// persistent nav rail
interface IconRailProps {
  activeKey: NavRailKey;
}
```

---

## Route mapping

| Route        | Screen | Auth       | Notes                                           |
| ------------ | ------ | ---------- | ----------------------------------------------- |
| `/`          | s001   | Public     | DS-2: redirect `/home` if already authed        |
| `/login`     | s002   | Public     | DS-2 redirect; DS-3 submit/error states         |
| `/register`  | s003   | Public     | DS-2 redirect; DS-4 submit/error states         |
| `/home`      | s004   | Protected  | 401 → `/login?from=/home`                       |

---

## Derived states to implement

- **DS-1** — Session-probe splash: show s001 visual with `aria-busy="true"` CTA until `GET /api/auth/me` resolves (max 1 200 ms, then fall through).
- **DS-2** — Already-authed redirect: `router.replace("/home")` on public routes when `selectIsAuthed` is true.
- **DS-3** — Login submit/error: disable button, show spinner copy, render `<FormErrorLine>` with `role="alert"`.
- **DS-4** — Register submit/error: same pattern; map `ApiError.details[].field` to per-field errors on `<LineField>`.
- **DS-5** — Programmatic logout: `POST /api/auth/logout` on `401` from any protected route.

---

## Critical rules

1. **No `data-navigate`** in React JSX — replace with `<Link href={AppRoute}>` or `router.push(...)`.
2. **No `common.js` delegated click** — wire every CTA directly.
3. **Passwords** must never enter Redux or localStorage.
4. Use `router.replace` (not `push`) after login/register success — browser back must NOT return to the form.
5. `auth/clearSubmitError` must be dispatched on every input `onChange` in s002/s003.
6. Every `<input>` keeps its `autoComplete` value verbatim from the wireframe.
7. All Thai copy preserved exactly: เริ่มใช้งาน, ชื่อผู้ใช้, รหัสผ่าน, เข้าสู่ระบบ, ลงทะเบียน, สร้างบัญชี, ยืนยัน, ชาย, หญิง, ชื่อตัวละคร, etc.
8. `:focus-visible { outline: 4px solid rgba(23,152,190,0.35); outline-offset: 4px }` on every interactive element.
9. Run `cd frontend && pnpm lint` when done.

---

## Implementation order

1. Redux store skeleton (`store/index.ts` + `authSlice.ts` with state shape only).
2. `<BookShellLayout>` primitive — port `.screen` + `.book-shell` CSS to Tailwind v4 `@theme`.
3. s001 Landing static (`app/page.tsx`) with `<Link href="/login">` CTA.
4. `auth/probeSession` thunk + DS-1 splash in `app/layout.tsx`.
5. s002 Login form with controlled local state + `auth/login` thunk + DS-3.
6. s003 Register form with `useReducer` form state + `auth/register` thunk + DS-4.
7. `(authed)/layout.tsx` — `<AuthedShell>` reads `selectIsAuthed`, redirects on false, mounts `<IconRail>`.
8. s004 Home with `<StoryCardPanel>`, `<DashboardPanel>`, `<FeatureCard>`.
9. DS-2 guards on `/`, `/login`, `/register`.
10. Stub routes: `/chapters`, `/habit`, `/minigame` (placeholder pages so the rail navigates).
