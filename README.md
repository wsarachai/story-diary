# Story Diary

A Thai-language health & wellness journal app built as an open book UI. Users track daily habits, read chapter stories, play knowledge quizzes, and watch video clips — all wrapped in a warm wood-and-book design aesthetic.

---

## Repository Layout

```
story-diary/
├── docz/layouts/   # Static HTML wireframe prototypes (design source of truth)
├── frontend/       # Next.js 16 / React 19 application
├── backend/        # Express 5 REST API + MongoDB Atlas
└── docs/specs/     # Feature and architecture specifications
```

---

## Frontend

**Stack:** Next.js 16.2.4, React 19.2.4, TypeScript (strict), Tailwind CSS v4, Redux Toolkit, pnpm

```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm lint
pnpm test       # Vitest unit + MSW integration tests
```

### Key directories

| Path | Purpose |
|------|---------|
| `app/(authed)/home` | Authenticated home dashboard |
| `app/(authed)/chapters` | Chapter browser and story reader |
| `app/(authed)/habit` | Habit tracker — daily check-ins, weekly/monthly views |
| `app/(authed)/minigame` | Multiple-choice quiz game |
| `app/(authed)/e-books` | E-book library |
| `app/(authed)/video-clips` | Video clip player |
| `components/` | Shared UI components |
| `store/` | Redux slices (auth, chapters, habits, minigame) |
| `tests/` | Vitest + Testing Library + MSW |

### Environment variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Backend

**Stack:** Express 5.2.1, TypeScript, MongoDB Atlas, express-session, Zod, bcrypt

```bash
cd backend
npm install
npm run dev     # tsx watch — http://localhost:3001
npm run build   # tsc → dist/
npm test        # Jest + Supertest
```

### API overview

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /register` `POST /login` `POST /logout` `GET /me` |
| Users | `GET /api/users/:id` `PATCH /api/users/:id` |
| Chapters | `GET /api/chapters` `GET /api/chapters/:id` + progress + video-clips |
| Habits | Full CRUD — activities, occurrences, check-ins |
| Minigame | `GET /api/minigame/quiz` `POST /api/minigame/quiz/attempt` |

### Environment variables

Create `backend/.env`:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/story-diary
SESSION_SECRET=<random-secret>
PORT=3001
```

Set `NODE_ENV=test` to use the in-memory store instead of MongoDB.

---

## Design Prototypes

`docz/layouts/` contains standalone HTML wireframes that are the **design source of truth**.

| Screen | File |
|--------|------|
| s001 Landing | `s001-Landing-Screen.html` |
| s002 Login | `s002-login.html` |
| s003 Register | `s003-register.html` |
| s004 Home | `s004-home.html` |
| s005 Chapters | `s005-chapters.html` |
| s006 Habit Tracker | `s006-habit-tracker.html` |
| s007 Minigame | `s007-minigame.html` |

Open any file directly in a browser. Navigation between screens uses `data-navigate` attributes handled by `docz/layouts/assets/common.js`.

**Design tokens** (defined in `common.css`):

| Token | Usage |
|-------|-------|
| `--desk-light / --desk-mid / --desk-soft` | Warm wood desk background |
| `--book-line / --book-fill` | Book spine and page colours |
| `--panel-blue / --panel-blue-deep` | UI accent colours |
| `--ink` | Primary text colour |

**Fonts:** Baloo 2 (headings/numbers), Noto Sans Thai (body)

**Layout pattern:** `.screen` → `.book-shell` → `.page-left` / `.page-right` — a two-page open-book layout at 1920×1080.

---

## Feature Specs

Detailed specs live in `docs/specs/`:

- `backend-architecture.md` — Express routes, DB layer, auth, test strategy
- `s001-auth-and-home-entry.md` — Landing → Login/Register → Home flow
- `s005-chapters-and-story.md` — Chapter browser and scene reader
- `s006-habit-tracker-views.md` — Habit tracker UI and check-in flows
- `s007-minigame-quiz.md` — Quiz game flow
- `s016-habit-activity-authoring.md` — Habit authoring screens
