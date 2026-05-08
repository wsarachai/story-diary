# Spec: Backend Architecture

**Status:** Active  
**Owner:** Backend  
**Last updated:** 2026-05-04  
**Scope:** Express 5 REST API, MongoDB Atlas data layer, session auth, test strategy,
and environment configuration. All frontend feature specs defer their "full backend
spec out of scope" items here.

---

## Summary

The Story Diary backend is an **Express 5.2.1** server written in TypeScript. It
exposes a JSON REST API on port 3001, uses **MongoDB Atlas** as the production
database, and falls back to an in-process in-memory store when `NODE_ENV=test`.
Authentication is session-cookie based (no JWT, no token in JS land). All routes
are validated with **Zod 4.4.1** before touching the database.

---

## Stack

| Concern            | Library / version                          |
| ------------------ | ------------------------------------------ |
| HTTP framework     | Express 5.2.1                              |
| Database (prod)    | MongoDB Atlas via `mongodb` ^7.2.0         |
| Database (test)    | In-memory store (auto-selected when `NODE_ENV=test`) |
| Auth               | `express-session` ^1.19.0 (cookie, no JWT) |
| Validation         | Zod ^4.4.1                                 |
| Password hashing   | `bcrypt` ^6.0.0                            |
| IDs                | `uuid` ^14.0.0                             |
| Dev runtime        | `tsx` ^4 (`tsx watch src/index.ts`)        |
| Build              | `tsc` → `dist/`                            |
| Tests              | Jest ^30 + Supertest                       |

---

## Project Layout

```
backend/
├── src/
│   ├── index.ts          # Express app bootstrap + session middleware
│   ├── db.ts             # MongoDB client, collections, all DB helpers
│   ├── routes/
│   │   ├── auth.ts       # POST /register, POST /login, POST /logout, GET /me
│   │   ├── users.ts      # GET/PATCH /api/users/:id (profile)
│   │   ├── chapters.ts   # GET /api/chapters, GET /api/chapters/:id, progress, video-clips
│   │   ├── habits.ts     # Full CRUD for activities + occurrences + check-ins
│   │   └── minigame.ts   # GET /api/minigame/quiz, POST /api/minigame/quiz/attempt
│   ├── services/
│   │   ├── authService.ts
│   │   ├── chapterService.ts
│   │   ├── habitService.ts
│   │   └── minigameService.ts
│   ├── middleware/
│   │   ├── auth.ts       # requireAuth — reads req.session.userId
│   │   └── errorHandler.ts
│   └── lib/
│       ├── session.ts    # TypeScript augmentation for req.session
│       ├── schemas.ts    # Zod schemas for every request body
│       └── validate.ts   # validate(schema, body) — throws ApiError on failure
├── tests/
│   ├── setup.ts              # sets NODE_ENV=test → in-memory mode
│   ├── helpers/              # supertest app factory + testDb helpers
│   ├── api/                  # in-memory contract tests (pnpm test)
│   └── integration/          # MongoDB integration tests (pnpm test:integration)
│       └── setup.ts          # sets DB_MODE=mongo, clears user data between tests
├── .env.example          # Required env var template
└── package.json
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your Atlas credentials.

| Variable               | Required       | Default / Notes                                           |
| ---------------------- | -------------- | --------------------------------------------------------- |
| `MONGODB_URI`          | One of URI _or_ username+password | Full SRV URI; overrides component vars if set. |
| `MONGODB_USERNAME`     | Yes (if no URI)| Atlas database user                                       |
| `MONGODB_PASSWORD`     | Yes (if no URI)| Atlas database password                                   |
| `MONGODB_CLUSTER_HOST` | No             | Defaults to `cluster0.563g7gd.mongodb.net`                |
| `MONGODB_DB_NAME`      | No             | Defaults to `story-diary`                                 |
| `MONGODB_QUERY`        | No             | Defaults to `retryWrites=true&w=majority&appName=Cluster0` |
| `PORT`                 | No             | Defaults to `3001`                                        |
| `CORS_ORIGIN`          | No             | Defaults to `http://localhost:3000`                       |
| `SESSION_SECRET`       | Yes (prod)     | Long random string; dev fallback is insecure              |
| `DB_MODE`              | No             | Set to `mongo` to force MongoDB mode even when `NODE_ENV=test` (used by integration tests) |
| `MONGODB_TEST_DB_NAME` | No             | Database name for integration tests; defaults to `story-diary-test` |

`NODE_ENV=test` selects in-memory mode by default. Set `DB_MODE=mongo` to override
this and connect to a real Atlas instance (the integration test setup does this automatically).

---

## Database Layer (`src/db.ts`)

### Mode selection

```ts
type DatabaseMode = "memory" | "mongo";
const mode: DatabaseMode =
  process.env.DB_MODE === "mongo"
    ? "mongo"
    : process.env.NODE_ENV === "test"
      ? "memory"
      : "mongo";
```

`DB_MODE=mongo` takes highest priority, allowing integration tests to connect to a
real MongoDB instance while Jest still sets `NODE_ENV=test`.

Every exported DB helper checks `mode` and routes to either the MongoDB collection
or the in-memory store. This means tests run with zero network dependencies.

### MongoDB collections

| Collection             | Document type            | Unique indexes                                      |
| ---------------------- | ------------------------ | --------------------------------------------------- |
| `users`                | `UserDoc`                | `id`, `tel`                                         |
| `chapters`             | `ChapterDoc`             | `id`                                                |
| `chapter_scenes`       | `ChapterSceneDoc`        | `id`, `(chapter_id, idx)`                           |
| `user_chapter_progress`| `ChapterProgressDoc`     | `(user_id, chapter_id)`                             |
| `habit_activities`     | `HabitActivityDoc`       | `id`; sparse on `(user_id, name_normalized, archived)` |
| `habit_occurrences`    | `HabitOccurrenceDoc`     | `id`, `(activity_id, date)`                         |
| `quiz_questions`       | `QuizQuestionDoc`        | `id`, `number`                                      |
| `quiz_attempts`        | `QuizAttemptDoc`         | `id`                                                |
| `medicine_checkins`    | `MedicineCheckinDoc`     | `occurrence_id`                                     |
| `nutrition_checkins`   | `NutritionCheckinDoc`    | `occurrence_id`                                     |
| `symptoms_checkins`    | `SymptomsCheckinDoc`     | `occurrence_id`                                     |
| `mood_checkins`        | `MoodCheckinDoc`         | `occurrence_id`                                     |

### Document ID strategy

All documents use a string `id` field (UUID v4) as the application-level primary
key — **not** MongoDB's `_id`. Queries always filter on `{ id: <string> }`.
Indexes enforce uniqueness on `id` in every collection.

### Reference data seeding

On every startup, `initializeDatabase()` calls `seedMongoReferenceData()` which
upserts the static reference rows (5 chapters, 25 chapter scenes, 13 quiz
questions) via `bulkWrite` with `replaceOne + upsert:true`. Idempotent — safe to
call repeatedly.

---

## Authentication

- **Mechanism:** `express-session` with a signed cookie (`connect.sid`).
- **Session payload:** `{ userId: string }` stored server-side.
- **No JWT, no token exposed to client JS.**
- **`requireAuth` middleware** reads `req.session.userId`; throws
  `UNAUTHENTICATED` (401) when absent.
- Passwords are hashed with `bcrypt` (cost factor 12).
- `POST /api/auth/login` calls `req.session.regenerate()` before saving the
  new `userId` to prevent session fixation.

### Session cookie settings

| Setting          | Value                                        |
| ---------------- | -------------------------------------------- |
| `httpOnly`       | `true`                                       |
| `secure`         | `true` in production, `false` in dev         |
| `maxAge`         | 7 days (604 800 000 ms)                      |
| `saveUninitialized` | `false`                                   |
| `resave`         | `false`                                      |

---

## API Routes

All routes are prefixed with `/api`.

### Auth (`/api/auth`)

| Method | Path         | Auth | Body schema     | Success | Error codes                              |
| ------ | ------------ | ---- | --------------- | ------- | ---------------------------------------- |
| POST   | `/register`  | None | `RegisterSchema`| 201 `{ user }` | `VALIDATION_ERROR`, `PHONE_TAKEN`   |
| POST   | `/login`     | None | `LoginSchema`   | 200 `{ user }` | `VALIDATION_ERROR`, `INVALID_CREDENTIALS` |
| POST   | `/logout`    | None | —               | 200 `{ ok }` | —                                      |
| GET    | `/me`        | ✅   | —               | 200 `{ user }` | `UNAUTHENTICATED`                    |

### Users (`/api/users`)

| Method | Path   | Auth | Notes                              |
| ------ | ------ | ---- | ---------------------------------- |
| GET    | `/:id` | ✅   | Returns the authenticated user's profile. |
| PATCH  | `/:id` | ✅   | Partial update (name, character_name, gender). |

### Chapters (`/api/chapters`)

| Method | Path                            | Auth | Notes                                   |
| ------ | ------------------------------- | ---- | --------------------------------------- |
| GET    | `/`                             | ✅   | List all chapters with progress for the current user. |
| GET    | `/:id`                          | ✅   | Chapter detail + scenes.                |
| POST   | `/:id/progress`                 | ✅   | Upsert progress for current user.       |

### Video Clips (`/api/video-clips`)

| Method | Path | Auth | Notes                         |
| ------ | ---- | ---- | ----------------------------- |
| GET    | `/`  | ✅   | Returns the video clip collection. |

### Habits (`/api/habits`)

| Method | Path                                          | Auth | Notes                                                |
| ------ | --------------------------------------------- | ---- | ---------------------------------------------------- |
| GET    | `/activities`                                 | ✅   | List all activities for the current user.            |
| POST   | `/activities`                                 | ✅   | Create a new habit activity.                         |
| PATCH  | `/activities/:id`                             | ✅   | Update activity.                                     |
| DELETE | `/activities/:id`                             | ✅   | Archive activity (soft delete).                      |
| GET    | `/occurrences`                                | ✅   | List occurrences for a date range.                   |
| POST   | `/occurrences/:id/check`                      | ✅   | Mark occurrence done/skipped.                        |
| POST   | `/occurrences/:id/checkin/medicine`           | ✅   | Save medicine check-in detail.                       |
| POST   | `/occurrences/:id/checkin/nutrition`          | ✅   | Save nutrition check-in detail.                      |
| POST   | `/occurrences/:id/checkin/symptoms`           | ✅   | Save symptoms check-in detail.                       |
| POST   | `/occurrences/:id/checkin/mood`               | ✅   | Save mood check-in detail.                           |

### Minigame (`/api/minigame`)

| Method | Path            | Auth | Notes                                    |
| ------ | --------------- | ---- | ---------------------------------------- |
| GET    | `/quiz`         | ✅   | Returns all quiz questions.              |
| POST   | `/quiz/attempt` | ✅   | Submit a completed quiz attempt.         |

---

## Error Response Shape

All errors use a consistent envelope matching `src/types/error.ts`:

```ts
// HTTP 4xx / 5xx
{
  error: {
    code: ApiErrorCode;   // machine-readable key (see src/types/error.ts)
    message: string;      // English, log-safe only — do NOT show to users
    details?: unknown;    // optional field-level validation info
  }
}
```

Frontend code must key user-facing Thai copy on `error.code`, never on
`error.message`.

---

## Validation

`src/lib/validate.ts` wraps Zod. Every route handler calls:

```ts
const body = validate(SomeZodSchema, req.body);
```

On parse failure, it throws an `ApiError` with `code: "VALIDATION_ERROR"` and
the Zod error issues in `details`. The global `errorHandler` middleware converts
this to a 400 response.

---

## Test Strategy

Story Diary uses a **two-tier test approach**: fast in-memory tests (default) and
optional MongoDB integration tests (requires Atlas credentials).

### Tier 1 — In-memory tests (default, CI-safe)

```bash
cd backend
pnpm test
```

Tests live in `backend/tests/api/` and run with Jest + Supertest against the
Express app directly (no running server, no MongoDB connection).

`db.ts` selects in-memory mode when `NODE_ENV=test` (set automatically by Jest).
`tests/setup.ts` sets `NODE_ENV=test` and `clearTestData()` is called before each
test, resetting the in-memory store to seeded state (chapters, scenes, quiz
questions — no users or user data).

### Tier 2 — MongoDB integration tests (requires Atlas)

```bash
cd backend
# ensure .env has MONGODB_USERNAME + MONGODB_PASSWORD
pnpm test:integration
```

Tests live in `backend/tests/integration/` and run with `jest.integration.config.js`.
They target the `story-diary-test` database (configured via `MONGODB_TEST_DB_NAME`
in `.env`) to isolate test data from production.

How it works:
- `tests/integration/setup.ts` sets `DB_MODE=mongo` and overrides `MONGODB_DB_NAME`
  before any module is loaded, forcing MongoDB mode.
- `beforeAll`: `initializeDatabase()` — connects to Atlas and seeds reference data.
- `beforeEach`: `clearUserDataForTesting()` — deletes all user-generated documents
  (users, chapter progress, habit data, quiz attempts) while keeping reference data
  (chapters, scenes, quiz questions).
- `afterAll`: `closeDatabase()` — disconnects from Atlas.
- All tests are wrapped with `mongoIt` — if no `MONGODB_URI` / `MONGODB_USERNAME` is
  found in the environment, tests are automatically skipped with a warning rather than
  failing.

MongoDB-specific test coverage (beyond contract tests):
- `auth.test.ts`: unique `tel` index enforced at DB level, multi-user isolation
- `chapters.test.ts`: `sort_order` sort from MongoDB, upsert idempotency for progress,
  cross-user progress isolation
- `habits.test.ts`: `name_normalized` index (case-insensitive duplicate detection),
  soft-delete re-enables name reuse, occurrence toggle persistence
- `minigame.test.ts`: 13 questions from Atlas seed, `number` sort order, attempt
  persistence, multiple attempts per user, cross-user score isolation

Key conventions:
- Every test registers a fresh user via `POST /api/auth/register`.
- `pnpm test` (in-memory) and `pnpm test:integration` (MongoDB) are independent and
  can run in parallel CI pipelines.
- Integration tests use real UUIDs (via `tests/helpers/uuid-mongo.js`) to avoid
  collision with MongoDB's `id` unique index.

---

## Running Locally

```bash
cd backend
cp .env.example .env          # fill in MONGODB_USERNAME + MONGODB_PASSWORD + SESSION_SECRET
pnpm install
pnpm dev                      # tsx watch — hot reload on http://localhost:3001
```

Health check: `GET /api/health` → `{ ok: true, ts: "<ISO timestamp>" }`.
