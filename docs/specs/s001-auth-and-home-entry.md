# Spec: Auth & Home Entry Flow (s001 → s004)

**Status:** Draft
**Owner:** Architect (handoff to frontend implementer + tester)
**Last updated:** 2026-05-01
**Scope:** UI architecture for the unauthenticated entry path
(`s001-Landing-Screen.html`) through login / register and the first-screen
landing on `s004-home.html` for an authenticated user.

---

## Summary

Story Diary's first user contact is a single "tap-to-start" landing card
(s001). From there the user picks an existing account (s002 login) or a new
one (s003 register). Either path lands the same authenticated home screen
(s004), which acts as the navigation hub for the four primary surfaces
(home, chapters, habit tracker, minigame) via a persistent right-edge icon
rail.

This spec converts the four wireframes into a React-Redux architecture: a
single `auth` Redux slice that is the source of truth for "who is the
session principal", route-level guards built around that slice, three
container screens (Landing / Login / Register / Home), and a persistent
authenticated shell that hosts the icon-rail navigation. Two derived UI
states not present in the wireframes — a "session probe / unknown" splash
on first paint and a redirect-on-already-authenticated guard for s001/s002/s003
— are explicitly designed below.

The spec assumes the existing REST contract from `docs/specs/user-profile.md`
for `UserProfile` and adds two new endpoints (`POST /api/auth/login`,
`POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me`) to
keep the UI specifiable. These are the minimum implementation-safe
assumptions; concrete backend design lives in a separate spec.

**v2 change:** Registration uses a **Thai phone number (`tel`)** as the
primary account identifier instead of email. Login accepts the phone number
as the credential key. The field `email` no longer exists in `UserProfile`,
`RegisterInput`, or the backend DB; it is replaced throughout by `tel`.

---

## Source Wireframes

Primary, in flow order:

| Screen ID                      | File                                    | Role                                                |
| ------------------------------ | --------------------------------------- | --------------------------------------------------- |
| `s001-landing`                 | `docz/wireframes/s001-Landing-Screen.html` | Public entry. Single CTA → `s002`.               |
| `s002-login`                   | `docz/wireframes/s002-Login-Screen.html`   | Login form (เบอร์โทร + รหัสผ่าน) → `s004`.      |
| `s003-register`                | `docz/wireframes/s003-register.html`       | Register form (6 fields, 2 pages) → `s004`.      |
| `s004-home`                    | `docz/wireframes/s004-home.html`           | Authenticated home hub.                          |

Neighbouring screens that affect navigation from `s004`:

| Screen ID            | File                                       | Reached via                              |
| -------------------- | ------------------------------------------ | ---------------------------------------- |
| `s005-chapters`      | `docz/wireframes/s005-chapters.html`       | Icon-rail "book" (always visible).       |
| `s006-habit-tracker` | `docz/wireframes/s006-habit-tracker.html`  | Top feature card on s004 + rail "edit".  |
| `s007-minigame`      | `docz/wireframes/s007-minigame.html`       | Bottom feature card on s004 + rail "game". |

Shared behaviour:

- `docz/wireframes/assets/common.js` — single global delegated `click`
  handler that reads `data-navigate="<filename>"` and assigns
  `window.location.href`. **Every CTA in s001/s002/s003/s004 routes through
  this helper, not page-local JS.** No page-specific JS exists in any of the
  four primary wireframes.
- `docz/wireframes/assets/common.css` — design tokens (`--desk-light`,
  `--book-line`, `--panel-blue`, `--field-fill`, `--ink`, …),
  `.book-shell` 2-page layout, `.rounded-pill-button`, `.icon-rail-link`,
  `.story-link`, `.sr-only` utility.

### Gaps not covered by predefined wireframes

1. **Session-probe / "unknown" state.** None of the wireframes show what is
   on screen between page load and the first auth-status decision. We need a
   silent splash that holds at the s001 visual until `GET /api/auth/me`
   resolves, otherwise an authenticated user would briefly see s001 before
   being bounced to s004. This is captured below as **DS-1**.
2. **Already-authenticated guard for s001/s002/s003.** Wireframes assume a
   fresh, signed-out user. If a logged-in user opens `/login` directly, the
   spec defines a redirect to `/home`. **DS-2.**
3. **Submit-in-flight and submit-error states for s002 / s003.** Wireframes
   show only the static form; they have no spinner, disabled-button, or
   inline-error treatment. We design these inside the existing form layout
   without introducing new components. **DS-3, DS-4.**
4. **Logout entry point.** s004 has no visible logout control in the
   wireframe. The icon rail has 4 fixed slots and no overflow. We do NOT
   invent a new control on s004 — instead logout is exposed only via a
   future profile screen (out of scope here) and a programmatic
   `POST /api/auth/logout` is wired so route guards can call it on
   `401 UNAUTHENTICATED`. **DS-5.**

---

## Derived Screens and States

| ID    | Name                                      | Type                | Inherits from                            |
| ----- | ----------------------------------------- | ------------------- | ---------------------------------------- |
| DS-1  | Session-probe splash                      | Transient state     | s001 visual (no overlay, no spinner UI)  |
| DS-2  | Already-authed redirect                   | Route guard         | n/a — instant `router.replace("/home")`  |
| DS-3  | Login form — submitting / error           | Inline UI state     | s002 layout (button disabled + helper)   |
| DS-4  | Register form — submitting / error        | Inline UI state     | s003 layout (button disabled + helper)   |
| DS-5  | Programmatic logout (no UI)               | Action only         | n/a                                      |

**DS-1 visual rules (extends s001):** keep the cover-art `.book-panel` and
`<h1>STORY/DIARY</h1>` exactly as on s001; replace the "-กดเพื่อเริ่ม-"
button with a static, focus-trapped `aria-busy="true"` placeholder that is
visually identical to the disabled CTA. Maximum hold time before showing
s001's interactive CTA is **1 200 ms**; after that, fall through to s001 and
let the user retry — never block the UI longer than that on a network
probe.

**DS-3 / DS-4 visual rules:** reuse `.rounded-pill-button` styling. While
submitting, set `disabled`, dim opacity to `.6`, and append the body copy
"กำลังเข้าสู่ระบบ…" / "กำลังสร้างบัญชี…". On error, render a single line
of `.register-text`-styled red copy directly below the submit button. Do
not introduce a toast system in this spec.

---

## User Flow

```
                        ┌────────────────────┐
   first paint ───────► │  DS-1 probe splash │
                        │  GET /auth/me      │
                        └─────────┬──────────┘
                                  │
              200 (authed)        │        401 (no session)
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
      ┌──────────────┐                     ┌────────────────────┐
      │  /home       │                     │  s001 Landing      │
      │  (s004)      │                     │  (interactive)     │
      └──────┬───────┘                     └─────────┬──────────┘
             │                                       │
             │ rail icon                  -กดเพื่อเริ่ม-
             ▼                                       ▼
   /chapters /habit /minigame             ┌────────────────────┐
                                          │  /login (s002)     │
                                          └─────────┬──────────┘
                                                    │
                                          ┌─────────┴──────────┐
                                          ▼                    ▼
                                 submit success        "สร้างบัญชี"
                                          │                    │
                                          │                    ▼
                                          │           ┌────────────────────┐
                                          │           │ /register (s003)   │
                                          │           └─────────┬──────────┘
                                          │                     │ submit success
                                          ▼                     ▼
                                  POST /auth/login    POST /auth/register
                                          │                     │
                                          └─────────┬───────────┘
                                                    ▼
                                            /home (s004)
```

Side-paths:

- DS-2: any of `/`, `/login`, `/register` while authed → `replace("/home")`.
- Any 401 from a protected route at runtime → dispatch logout, redirect
  to `/login` with a `from=` query param so post-login can deep-link back.

---

## Component Tree

Top-level layout is a single Next.js App Router segment per screen. Two
shared layout components host the wireframe's two visual languages.

```
app/
├── layout.tsx                    ← <html lang="th"> + <Providers> (Redux + auth probe)
├── page.tsx                      ← s001 Landing (route "/")
│   └── <LandingScreen>
│       ├── <PaperMail />         (decorative, .paper-mail)
│       ├── <BookPanel>           (.book-panel + cover art)
│       │   ├── <BrandTitle />    ("Story Diary" h1)
│       │   └── <StartButton />   ← dispatches navigate("/login")
│       └── <ScreenNote />
│
├── login/page.tsx                ← s002 (route "/login")
│   └── <BookShellLayout>         (page-left = compass art, page-right = form)
│       ├── <CompassArt />        (decorative left-page asset)
│       └── <LoginForm>
│           ├── <FieldRow name="username" />
│           ├── <FieldRow name="password" type="password" />
│           ├── <SubmitButton />  ← shows DS-3 states
│           ├── <FormErrorLine /> (DS-3 error)
│           └── <RegisterCta />   ("ยังไม่เคยลงทะเบียน? สร้างบัญชี")
│
├── register/page.tsx             ← s003 (route "/register")
│   └── <BookShellLayout tight>
│       ├── <RegisterAccountForm> (left page — name / tel / password / confirm)
│       │   └── <LineField />  × 4
│       └── <RegisterCharacterForm> (right page)
│           ├── <CharacterNameField />
│           ├── <GenderRadioGroup>
│           │   ├── <GenderOption value="male" />
│           │   └── <GenderOption value="female" />
│           └── <SubmitButton />  ← shows DS-4 states
│
└── (authed)/                     ← Next.js route group; layout enforces auth
    ├── layout.tsx                ← <AuthedShell> + <IconRail>
    └── home/page.tsx             ← s004 (route "/home")
        └── <HomeScreen>
            ├── <StoryCardPanel /> (left page; card "เนื้อเรื่อง")
            └── <DashboardPanel>
                ├── <FeatureCard kind="habit" />     ← /habit
                └── <FeatureCard kind="minigame">    ← /minigame
                    └── <HeartsRow count={3} />
```

### Reusable component contracts

```ts
// <BookShellLayout> — common.css `.book-shell` two-page container.
interface BookShellLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    /** When true, applies `.book-shell-tight` (gap: 0). Used by s003/s004. */
    tight?: boolean;
    /** Optional persistent right-edge nav. Required inside (authed) group. */
    rail?: React.ReactNode;
}

// <FieldRow> — s002 pill-style label+input pair.
interface FieldRowProps {
    name: "username" | "password";
    label: string;             // Thai copy from wireframe
    type?: "text" | "password";
    autoComplete?: string;
    value: string;
    onChange: (next: string) => void;
    invalid?: boolean;
    "aria-describedby"?: string;
}

// <LineField> — s003 line-underline label+input pair (left page).
interface LineFieldProps {
    name: "name" | "tel" | "password" | "confirmPassword";
    label: string;
    type?: "text" | "tel" | "password";
    autoComplete?: string;
    value: string;
    onChange: (next: string) => void;
    error?: string;            // localized copy; renders below the line
}

// <GenderRadioGroup> — s003 right-page figure pair.
interface GenderRadioGroupProps {
    value: Gender | null;
    onChange: (next: Gender) => void;
    /** When true, the group reports a validation error (renders an outline). */
    invalid?: boolean;
}

// <FeatureCard> — s004 large rounded card on the right page.
interface FeatureCardProps {
    kind: "habit" | "minigame";
    title: string;             // localized
    href: AppRoute;            // /habit or /minigame
    /** Hearts row only renders when kind === "minigame". */
    hearts?: number;
}

// <IconRail> — persistent navigation column inside (authed)/layout.tsx.
interface IconRailProps {
    activeKey: NavRailKey;     // see src/types/navigation.ts
}
```

---

## Redux State Design

Two slices participate in this spec. Anything else (form state, hover
state, error inline copy) is **local component state** — `useState`/
`useReducer` — and never enters the Redux store.

### `authSlice`

```ts
import type { AuthStatus, User } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";

interface AuthState {
    status: AuthStatus;            // "unknown" | "unauthenticated" | "authenticating" | "authenticated"
    user: User | null;             // populated iff status === "authenticated"
    /** Last submission error code, surfaced on s002/s003 (DS-3/DS-4). */
    submitError: ApiErrorCode | null;
}

const initialState: AuthState = {
    status: "unknown",
    user: null,
    submitError: null,
};
```

**Reducers / actions** (RTK action names shown):

| Action                                  | Payload                                | Effect                                                                       |
| --------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `auth/probeSession/pending`             | —                                      | Sets `status` to `"unknown"` (idempotent).                                   |
| `auth/probeSession/fulfilled`           | `User \| null`                         | Sets `user` and flips `status` to `"authenticated"`/`"unauthenticated"`.     |
| `auth/login/pending`                    | —                                      | `status = "authenticating"`, clears `submitError`.                           |
| `auth/login/fulfilled`                  | `User`                                 | `status = "authenticated"`, stores `user`.                                   |
| `auth/login/rejected`                   | `ApiErrorCode`                         | `status = "unauthenticated"`, sets `submitError`.                            |
| `auth/register/pending` / `/fulfilled` / `/rejected` | mirrors login                | Same shape.                                                                  |
| `auth/logout/fulfilled`                 | —                                      | Resets to `initialState` with `status = "unauthenticated"`.                  |
| `auth/clearSubmitError`                 | —                                      | Sets `submitError = null` (called on input change in s002/s003).             |

### `navSlice` (small, optional)

```ts
import type { NavRailKey } from "@/types/navigation";

interface NavState {
    /** The rail key of the currently active screen. Mirrors Next.js usePathname. */
    activeRailKey: NavRailKey | null;
}
```

This slice is a convenience surface for unit tests and storybook. Production
code may instead derive the active key from `usePathname()` inside
`<IconRail>`. Pick one approach in implementation; do not maintain two.

### Selectors (canonical)

```ts
selectAuthStatus(state)        : AuthStatus
selectCurrentUser(state)       : User | null
selectIsAuthed(state)          : boolean             // status === "authenticated"
selectSubmitError(state)       : ApiErrorCode | null
selectActiveRailKey(state)     : NavRailKey | null   // optional slice
```

### Local-only state (do NOT lift to Redux)

- Login/register form input values, blur state, dirty flags.
- Show/hide password toggle (if added later).
- Hover and focus visuals on `<FeatureCard>` / `<IconRail>`.
- Disabled state on `<SubmitButton>` (derive from `status === "authenticating"`).

---

## Interaction Mapping

Every interaction in the four wireframes maps to one of: a Redux thunk, a
local state setter, or a `router.push` / `router.replace`. The shared
`common.js` `data-navigate` handler is replaced by typed Next.js
`<Link href>` or `router.push(...)` calls — the wireframe's
`data-navigate="<filename>"` attributes map onto `AppRoute` values from
`@/types/navigation`.

### s001 Landing

| Wireframe element                                          | Wireframe behaviour                                  | React/Redux mapping                                                |
| ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `.start-button[data-navigate="s002-Login-Screen.html"]`    | common.js → `location.href = "s002-Login-Screen.html"` | `<Link href="/login">` or `router.push("/login")` on click.        |
| (gap) DS-1 first-paint                                     | n/a                                                  | `app/layout.tsx` mounts `<AuthGate>` which dispatches `probeSession`. |

### s002 Login

| Wireframe element                                       | Wireframe behaviour                            | React/Redux mapping                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `<input id="username" type="tel">`                      | uncontrolled                                   | Controlled, local `useState`. Trim on blur. Clear `submitError` on change. Accepts phone number.     |
| `<input id="password">`                                 | uncontrolled                                   | Controlled, local. NEVER serialise to localStorage / Redux.                                          |
| `.login-button[data-navigate="s004-home.html"]`         | common.js → home                               | `onClick` dispatches `auth/login` thunk; on `fulfilled`, `router.replace("/home")`. DS-3 in flight.  |
| `<a href="s003-register.html">สร้างบัญชี</a>`           | hard navigate                                  | `<Link href="/register">`.                                                                           |
| (gap DS-3) submit error                                 | n/a                                            | Render `<FormErrorLine code={submitError} />` below the button when `submitError !== null`.          |

### s003 Register

| Wireframe element                                                              | Wireframe behaviour      | React/Redux mapping                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 4× `.line-field input` on left page (`name`, `tel`, `password`, `confirmPassword`) | uncontrolled           | Controlled, single `useReducer` form state. Per-field validators run on blur and on submit.                    |
| `.character-name input`                                                        | uncontrolled             | Controlled, joins same form state.                                                                             |
| `.gender-grid` radios `[name="gender"]`                                        | native radio behaviour   | `<GenderRadioGroup>` controlled by form state. `value: Gender \| null`. Required at submit.                    |
| `.confirm-button[data-navigate="s004-home.html"]`                              | common.js → home         | `onClick` validates locally → dispatches `auth/register` (sends `Omit<RegisterInput,"confirmPassword">`) → on `fulfilled`, `router.replace("/home")`. DS-4 in flight. |
| (gap DS-4) per-field error                                                     | n/a                      | Map `ApiError.details[].field` onto `<LineField error>` props; show generic top-level error otherwise.         |

### s004 Home

| Wireframe element                                                                     | Wireframe behaviour                              | React/Redux mapping                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Left-page `.story-card` (decorative, no link in s004)                                 | static                                           | Render-only. Passes `image` + `title` props.                                       |
| `.feature-card[data-navigate="s006-habit-tracker.html"]`                              | common.js (also `tabindex="0"` + `role="link"`)  | `<FeatureCard kind="habit" href="/habit">` — wraps the card in a real `<Link>`.    |
| `.feature-card.minigame-card[data-navigate="s007-minigame.html"]`                     | common.js                                        | `<FeatureCard kind="minigame" href="/minigame" hearts={3}>`.                       |
| `.icon-rail` 4 anchors                                                                | native `<a href>`                                | `<IconRail activeKey="home">`. Component reads `RAIL_ITEMS` from `@/types/navigation`. |
| `.icon-rail-link.is-active` (red `#ff3131` accent on s004)                            | per-screen accent colour                         | Component reads `activeAccent` from the matching `RAIL_ITEMS[i]`; passes as a CSS variable on the active anchor. |

### Cross-screen behaviours

- **`data-navigate` ≠ React.** `data-navigate` is a wireframe-only contract;
  it MUST NOT appear in production JSX. Implementers replace it with
  `<Link href={AppRoute}>` or `useRouter().push(...)` typed against
  `@/types/navigation#AppRoute`.
- **Common.js delegated click.** Not ported. The `common.js` global
  click-listener pattern is incompatible with Next.js client-side routing
  and is replaced by per-component handlers.

---

## Route Mapping

| Wireframe filename                | Next.js route       | Group / layout                                | Auth requirement             |
| --------------------------------- | ------------------- | --------------------------------------------- | ---------------------------- |
| `s001-Landing-Screen.html`        | `/`                 | `app/page.tsx` (root layout)                  | Public; redirects to `/home` if authed (DS-2). |
| `s002-Login-Screen.html`          | `/login`            | `app/login/page.tsx`                          | Public; DS-2 redirect.       |
| `s003-register.html`              | `/register`         | `app/register/page.tsx`                       | Public; DS-2 redirect.       |
| `s004-home.html`                  | `/home`             | `app/(authed)/home/page.tsx` + `(authed)/layout.tsx` | **Protected.** 401 → `/login?from=/home`. |
| `s005-chapters.html`              | `/chapters`         | `(authed)`                                    | Protected.                   |
| `s006-habit-tracker.html`         | `/habit`            | `(authed)`                                    | Protected.                   |
| `s007-minigame.html`              | `/minigame`         | `(authed)`                                    | Protected.                   |

**Route group `(authed)`**: Next.js 16 route group used to share a layout
without affecting the URL. The group's `layout.tsx` mounts
`<AuthedShell>` which (a) reads `selectIsAuthed`, (b) if `false`,
`router.replace("/login?from=" + encodeURIComponent(pathname))`, and
(c) renders `<IconRail>` + the page content.

**Query params:**

- `?from=<path>` on `/login` — set by the auth guard so that a successful
  login `router.replace`s back to the original target instead of `/home`.
  When absent, default to `/home`.

---

## TypeScript Contracts

All UI-facing types are declared above in **Component Tree** (props) and
**Redux State Design** (state). The shared, cross-agent types live in
`src/types/` and are listed in the **Shared Type Files** section. UI code
imports from `@/types/...` (path alias resolves to project-root
`src/types/`).

API request/response shapes assumed by this spec:

```ts
// POST /api/auth/login
type LoginRequest = LoginInput;                    // src/types/auth.ts
type LoginResponse = AuthResponse;                 // src/types/auth.ts
// 200 → AuthResponse; 401 → ApiError{code:"INVALID_CREDENTIALS"}; 400 → VALIDATION_ERROR

// POST /api/auth/register
type RegisterApiRequest = RegisterRequest;         // omits confirmPassword
type RegisterApiResponse = AuthResponse;
// 200 → AuthResponse; 409 → ApiError{code:"PHONE_TAKEN"}; 400 → VALIDATION_ERROR

// POST /api/auth/logout    → 204 No Content
// GET  /api/auth/me        → 200 UserProfile | 401 ApiError{code:"UNAUTHENTICATED"}
```

These four endpoints are listed here to specify the UI; their full request
validation, rate-limiting, and error-code matrix are out of scope for this
spec and belong in a follow-up auth-API spec (alongside
`docs/specs/user-profile.md`).

---

## Styling Notes

**Design tokens (already declared in `common.css`):** preserve the variable
names verbatim when porting to Tailwind v4 `@theme inline`:

| Token              | Value      | Usage in this spec                                         |
| ------------------ | ---------- | ---------------------------------------------------------- |
| `--desk-light`     | `#f6d59f`  | Body background (radial gradient base).                    |
| `--desk-mid`       | `#efc985`  | Body background.                                           |
| `--desk-soft`      | `#fbddb1`  | Body background.                                           |
| `--book-line`      | `#54d7df`  | `.book-shell` background.                                  |
| `--book-fill`      | `#fbf3e6`  | `.page` background.                                        |
| `--panel-blue`     | `#58d8de`  | `.rounded-pill-button`, `.field-row` (s002), pill chips.   |
| `--panel-blue-deep`| `#0e98af`  | Book spine, focus rings.                                   |
| `--field-fill`     | `#edf4eb`  | Input fill (s002 pill, s003 character-name).               |
| `--ink`            | `#0d1217`  | Primary text.                                              |
| `--shadow`         | `rgba(13,24,35,.18)` | `.screen` drop shadow.                           |

**Layout primitives:**

- Use the `.screen` (1920×1080) → `.book-shell` → `.page-left` / `.page-right`
  pattern as a single `<BookShellLayout>` component. Variants: default
  (s001/s002), `tight` (s003/s004), and `with-rail` (s004).
- `.page-seam-right::after` decorative seam belongs on the LEFT page only
  when the right page is full-bleed (s002, s004). s003 uses
  `book-shell-tight` and omits the seam.

**Per-route accent colours** for the active rail item (declared in
`RAIL_ITEMS`): apply via a CSS variable `--rail-accent` set on the active
`.icon-rail-link`. Do NOT hard-code the hex per page.

**Typography:** Baloo 2 700 for the s001 brand title and the s003
"ลงทะเบียน" headline; Noto Sans Thai 400/600 for body and form labels.
Both are loaded by the wireframe via Google Fonts; the Next.js port should
substitute `next/font/google`.

**Motion already in the wireframe:**

- `.rounded-pill-button:hover { transform: translateY(-2px); }` over 180 ms.
- `.gender-option:hover .figure { transform: translateY(-2px); }` and a
  drop-shadow filter.
- `.start-button:hover` on s001: lift + box-shadow change.

Preserve these transitions; do not replace them with Tailwind defaults.

**Responsive considerations:**

- The wireframe is desktop-first at 1920×1080. The shared CSS class
  `.screen-mobile-portrait` / `.screen-book-mobile` hint at a planned
  vertical-stack breakpoint. For this spec: render the same DOM at all
  widths, and on `< 900 px` collapse `.book-shell` from
  `grid-template-columns: 1fr 1fr [auto]` → `grid-template-columns: 1fr`
  with the right page (form / dashboard) on top and the left page
  (illustration) below. The icon rail moves to a horizontal bottom bar.
- The exact mobile breakpoint and rail-position rules will be finalised
  in a follow-up "responsive shell" spec; for this spec the desktop layout
  is the acceptance target.

---

## Accessibility Notes

- **Language.** Root `<html lang="th">` (already in `app/layout.tsx`).
- **Landing CTA.** `aria-label="เริ่มใช้งาน Story Diary"` on the start
  button (matches s001).
- **Forms.**
  - Every input has a programmatic `<label htmlFor>` (already true on
    s002/s003). Preserve this.
  - `autoComplete` values from the wireframe are correct: `username`,
    `current-password`, `new-password`, `email`, `name`. Do NOT change.
  - Submit error line: `role="alert"` and `aria-live="polite"` so screen
    readers announce the error after it appears.
  - Inline per-field errors: link via `aria-describedby` from the input to
    the error span.
- **Gender radio group.** Reuse the wireframe's
  `role="radiogroup" aria-label="เลือกเพศ"`. Each `<label class="gender-option">`
  must contain a real `<input type="radio">` (not a div) — keep keyboard
  arrow-key navigation native.
- **Icon rail.** Every link has an `aria-label` (Thai copy from the
  wireframe — see `RAIL_ITEMS.ariaLabel`). The active link carries
  `aria-current="page"`. Decorative `<img>` icons inside have empty
  `alt=""`.
- **Keyboard.**
  - Tab order on s002: username → password → submit → "สร้างบัญชี" link.
  - Tab order on s003: name → email → password → confirm → characterName
    → male radio → female radio → submit. (Roving-tabindex inside the
    radio group is native.)
  - Tab order on s004: each `<FeatureCard>` is a real `<a>` (not a
    `tabindex="0" role="link"` shim — replace the wireframe's div+role
    pattern with a native anchor).
- **Focus visibility.** Reuse the existing
  `:focus-visible { outline: 4px solid rgba(23, 152, 190, 0.35); outline-offset: 4px }`
  rule from common.css for every interactive element.
- **DS-1 splash.** `aria-busy="true"` on the placeholder button; remove
  once the auth probe resolves.

---

## Edge Cases

1. **Probe takes longer than 1 200 ms.** Fall through DS-1 and render s001
   fully. If the probe later resolves to `authenticated`, push to `/home`.
2. **User taps "เริ่มใช้งาน" before probe completes.** The button is
   wired to `<Link href="/login">`; the route guard on `/login` re-evaluates
   `selectIsAuthed` once the probe resolves and DS-2 redirects to `/home`
   if needed. No race-condition handling required in s001.
3. **Login: invalid credentials (`INVALID_CREDENTIALS`).** Show DS-3 with
   localized copy "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" below the submit
   button. Do NOT clear the username field; do clear the password field.
4. **Login: server unreachable / 5xx.** Treat as `INTERNAL_ERROR`; render
   the same DS-3 line with copy "ระบบขัดข้อง โปรดลองอีกครั้ง". Re-enable
   submit. Never auto-retry.
5. **Register: phone number already taken (`PHONE_TAKEN`).** Map onto
   `<LineField name="tel">` as a per-field error "เบอร์โทรนี้ถูกใช้งานแล้ว".
6. **Register: passwords do not match (client validation).** Block submit;
   render `error="รหัสผ่านไม่ตรงกัน"` on the `confirmPassword` field with
   `code: "PASSWORDS_DO_NOT_MATCH"` (see `ValidationFieldCode`). No API
   call.
7. **Register: gender not selected.** Block submit; outline the radio
   group via `invalid` prop, show top-of-form line "เลือกเพศ".
8. **Already-authed user opens `/`, `/login`, or `/register`.** DS-2:
   `router.replace("/home")`. Do not flash the form.
9. **401 on a deep-linked authed route (e.g. `/habit`).**
   `(authed)/layout.tsx` dispatches `auth/logout/fulfilled` (purely client
   state) and `router.replace("/login?from=/habit")`.
10. **Browser back after login.** History stack should NOT contain
    `/login` or `/register`. Use `router.replace`, not `router.push`, on
    submit success.
11. **Two tabs, one logs out.** Out of scope for v1; flagged in
    user-profile.md "Open Questions".
12. **Caps-lock during password entry.** Out of scope for this spec.
13. **Localization toggle.** Out of scope; copy is hard-coded Thai per the
    wireframes.

---

## Implementation Plan

Build in this order; each step is independently testable.

1. **Shared types.** Land `src/types/auth.ts`, `user.ts`, `error.ts`,
   `navigation.ts`. (This commit.) No code consumes them yet.
2. **Redux store skeleton.** Configure `@reduxjs/toolkit` store with an
   empty `authSlice` (state shape only, no thunks). Add `<Providers>` to
   `app/layout.tsx`.
3. **`<BookShellLayout>` primitive.** Port `.screen` + `.book-shell` from
   common.css to a Tailwind v4 `@theme` block + a single component.
   Storybook-verify against the s002 markup.
4. **s001 Landing static.** Build `<LandingScreen>` with the cover-art
   panel and CTA as a `<Link href="/login">`. No auth wiring yet.
5. **`auth/probeSession` thunk + `<AuthGate>`.** Wire DS-1; verify the
   1 200 ms fallthrough. At this point /login is still a placeholder.
6. **s002 Login form.** Build `<LoginForm>` with controlled local state.
   Add `auth/login` thunk against `POST /api/auth/login`. Wire DS-3.
7. **s003 Register form.** Build `<RegisterAccountForm>` +
   `<RegisterCharacterForm>` + `<GenderRadioGroup>`. Add `auth/register`
   thunk. Wire DS-4. Implement client-side `PASSWORDS_DO_NOT_MATCH`.
8. **`(authed)` route group + `<AuthedShell>` + `<IconRail>`.** Mount
   the rail, derive `activeKey` from `usePathname()`, set
   `--rail-accent` from `RAIL_ITEMS`.
9. **s004 Home.** Build `<StoryCardPanel>`, `<DashboardPanel>`,
   `<FeatureCard>`. Confirm the rail's "home" item is active and red.
10. **Stub neighbouring authed routes.** `/chapters`, `/habit`,
    `/minigame` placeholder pages so the rail navigates without 404. Real
    screens are separate specs.
11. **DS-2 already-authed guards** on `/`, `/login`, `/register`.

Dependencies between steps: 2 unblocks everything; 5 must precede 6/7;
8 must precede 9.

---

## Acceptance Criteria

The spec is implemented when **all** of the following are observable:

1. Loading `http://localhost:3000/` with no session cookie shows the s001
   visual within 1 200 ms and the start button is interactive.
2. Loading `/` with a valid session cookie redirects to `/home` without
   ever flashing s001's button.
3. Clicking "-กดเพื่อเริ่ม-" on s001 navigates to `/login` (client-side
   navigation, no full page reload).
4. Submitting valid credentials on `/login` populates `state.auth.user`,
   sets `state.auth.status = "authenticated"`, and `router.replace`s to
   `/home`. Browser back does NOT return to `/login`.
5. Submitting wrong credentials renders DS-3 with the copy
   "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" within the s002 layout. The
   submit button re-enables. The password field clears; the username
   does not.
6. Clicking "สร้างบัญชี" navigates to `/register`.
7. Submitting `/register` with mismatched passwords blocks the API call
   and renders an inline error on the `confirmPassword` field.
8. Submitting `/register` with a duplicate phone number surfaces an inline
   `PHONE_TAKEN` error on the `tel` field.
9. Successful registration ends in `/home` with the rail's "home" item
   active and accented `#ff3131`.
10. The 4 rail items on `/home` link to `/home`, `/chapters`, `/habit`,
    `/minigame`. Clicking the habit feature-card and clicking the rail's
    edit icon both navigate to `/habit`.
11. Hitting `/habit` directly with no session redirects to
    `/login?from=%2Fhabit` and a successful login returns the user to
    `/habit`.
12. All Thai copy in the wireframes is preserved verbatim
    (`เนื้อเรื่อง`, `ลงทะเบียน`, `เข้าสู่ระบบ`, `สร้างบัญชี`, `ยืนยัน`,
    `Habit tracker`, `Minigame`, `เลือกเพศ`, `ชาย`, `หญิง`,
    `ชื่อตัวละคร`, etc.).
13. Every interactive element is reachable by keyboard, has a visible
    `:focus-visible` ring, and exposes the wireframe's Thai
    `aria-label` to AT.

---

## Shared Type Files

The following files in `src/types/` are the cross-agent source of truth.
Frontend (Redux + screens), backend (route handlers), and tests MUST
import from here — do NOT redeclare these shapes in app code.

| File                          | Exports                                                                                                  | Notes                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/types/auth.ts`           | `Gender`, `User` (re-export), `LoginInput`, `RegisterInput`, `RegisterRequest`, `AuthResponse`, `AuthStatus` | New for this spec. `User` is a re-export of `UserProfile` from `./user.ts` so auth-flow code never imports `user.ts` directly. |
| `src/types/user.ts`           | `UserProfile`, `UpdateUserRequest`, `GetUserResponse`, `UpdateUserResponse`                              | New file; promotes the inline types in `docs/specs/user-profile.md` to a real module. The API spec must import from here going forward. |
| `src/types/error.ts`          | `ApiError`, `ApiErrorDetail`, `ApiErrorCode`, `ValidationFieldCode`, `isApiError`                        | New file; canonicalises the error envelope from `user-profile.md`. Adds `INVALID_CREDENTIALS`, `RATE_LIMITED`, and `PHONE_TAKEN` codes for auth flow. |
| `src/types/navigation.ts`     | `ScreenId`, `NavRailKey`, `AppRoute`, `NavRailItem`, `RAIL_ITEMS`                                        | New file; encodes the wireframe's icon-rail (order, icons, accents, Thai aria-labels) as a constant.                 |

Future contracts that will live alongside these (out of scope here, listed
for orientation):

- `src/types/chapters.ts`  — story / chapter / video-clip view models (s005, s008–s011).
- `src/types/habit.ts`     — daily/weekly/monthly habit entries (s006, s012–s016).
- `src/types/minigame.ts`  — quiz item, attempt, score (s007, s017–s019, s031).
