# Spec: Backend Architecture

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Full-stack Next.js architecture; API routes, database layer, auth, and services.

---

## Summary

Story Diary is a full-stack Next.js 16 application. There is no separate Express backend. All API lives under `frontend/app/api/` as Next.js Route Handlers. The database layer is MongoDB Atlas (production) or an in-memory store (test/development). Auth is JWT-based with tokens stored in `localStorage` and sent as `Bearer` headers. Admin endpoints require a `role: "admin"` user.

---

## API Route Groups

| Group | Routes | Notes |
|-------|--------|-------|
| Auth | `frontend/app/api/auth/` | login, register, me, logout |
| Users | `frontend/app/api/users/` | profile read/update (`/users/[id]`; `id=me` resolves to caller) |
| Chapters | `frontend/app/api/chapters/` | list, detail, progress |
| Habits | `frontend/app/api/habits/` | today, weekly, monthly, monthly-summary, activities CRUD, occurrences toggle, checkins (medicine/nutrition/symptoms/mood) |
| E-Books | `frontend/app/api/e-books/` | list |
| Minigame | `frontend/app/api/minigame/` | quiz fetch, attempt submission |
| Video Clips | `frontend/app/api/video-clips/` | list |
| Admin | `frontend/app/api/admin/` | chapters CRUD, chapter scenes CRUD, e-books CRUD, minigame questions CRUD |

### Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Returns `{ user, token }` |
| `POST` | `/api/auth/register` | Creates user; returns `{ user, token }` (201) |
| `GET` | `/api/auth/me` | Returns `{ user }` from Bearer JWT |
| `POST` | `/api/auth/logout` | No-op server-side |

### Admin endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/admin/chapters` | List all chapters / create chapter |
| `GET/PATCH/DELETE` | `/api/admin/chapters/[id]` | Read / update / delete chapter |
| `GET/POST` | `/api/admin/chapters/[id]/scenes` | List scenes for chapter / add scene |
| `PATCH/DELETE` | `/api/admin/chapters/scenes/[sceneId]` | Update / delete scene |
| `GET/POST` | `/api/admin/e-books` | List all e-books / create e-book |
| `PATCH/DELETE` | `/api/admin/e-books/[id]` | Update / delete e-book |
| `GET/POST` | `/api/admin/minigame/questions` | List questions / create question |
| `PATCH/DELETE` | `/api/admin/minigame/questions/[id]` | Update / delete question |

---

## Key Components

- `requireAuth` — `frontend/lib/api-auth.ts` — verifies the `Authorization: Bearer <jwt>` header using `jsonwebtoken`; returns `userId` or throws 401
- `requireAdmin` — `frontend/lib/api-auth.ts` — calls `requireAuth` then checks `user.role === "admin"`; throws 403 if not
- `ok / handleError` — `frontend/lib/api-response.ts` — uniform JSON response helpers; maps domain errors to HTTP status codes
- `validate` — `frontend/lib/validate.ts` — Zod-based request body validation
- `initializeDatabase` — `frontend/lib/db.ts` — singleton that connects to MongoDB Atlas on first call (or initializes the in-memory store in test mode); seeds reference data (chapters, scenes, quiz questions, e-books) on startup
- `authService` — `frontend/lib/services/authService.ts` — `loginUser`, `registerUser`, `getUserById`, `updateUser`, `signToken`
- `chapterService` — `frontend/lib/services/chapterService.ts` — `listChapters`, `getChapter`, `setChapterProgress`, `getEBooks`
- `habitService` — `frontend/lib/services/habitService.ts` — today, weekly, monthly queries; activity and occurrence mutations; all checkin read/write
- `minigameService` — `frontend/lib/services/minigameService.ts` — quiz question list, attempt recording
- `adminService` — `frontend/lib/services/adminService.ts` — admin CRUD for chapters, scenes, e-books, quiz questions

---

## Database Layer

`frontend/lib/db.ts` exposes a dual-mode abstraction:

- **`mongo` mode** (default in production): connects to MongoDB Atlas using `MONGODB_URI` or constructed from `MONGODB_USERNAME` / `MONGODB_PASSWORD` / `MONGODB_CLUSTER_HOST`. Uses MongoDB Node.js driver with `ServerApiVersion.v1`. Indexes are created on startup. Reference data (chapters, scenes, quiz questions, default e-books) is upserted on first connect.
- **`memory` mode** (used when `NODE_ENV=test` or `DB_MODE=memory`): in-process JavaScript arrays seeded with the same reference data. Used for unit and integration tests.

### Collections (MongoDB)

| Collection | Document type |
|-----------|--------------|
| `users` | `UserDoc` |
| `chapters` | `ChapterDoc` |
| `chapter_scenes` | `ChapterSceneDoc` |
| `user_chapter_progress` | `ChapterProgressDoc` |
| `habit_activities` | `HabitActivityDoc` |
| `habit_occurrences` | `HabitOccurrenceDoc` |
| `quiz_questions` | `QuizQuestionDoc` |
| `quiz_attempts` | `QuizAttemptDoc` |
| `medicine_checkins` | `MedicineCheckinDoc` |
| `nutrition_checkins` | `NutritionCheckinDoc` |
| `symptoms_checkins` | `SymptomsCheckinDoc` |
| `mood_checkins` | `MoodCheckinDoc` |
| `e_books` | `EBookDoc` |

---

## Auth Flow

1. Client sends `POST /api/auth/login` with `{ username: tel, password }`.
2. `authService.loginUser` finds the user by `tel`, verifies the bcrypt hash.
3. `signToken` signs a JWT with `{ userId }` using `JWT_SECRET` (defaults to `"story-diary-dev-secret"` in dev).
4. Response returns `{ user, token }`. Client stores `token` in `localStorage["auth_token"]`.
5. Every subsequent request sets `Authorization: Bearer <token>` via RTK Query's `prepareHeaders`.
6. `requireAuth(request)` extracts and verifies the token on each protected route.

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `JWT_SECRET` | JWT signing key | `story-diary-dev-secret` |
| `MONGODB_URI` | Full MongoDB connection string (optional if credentials provided) | — |
| `MONGODB_USERNAME` | Atlas username | — |
| `MONGODB_PASSWORD` | Atlas password | — |
| `MONGODB_CLUSTER_HOST` | Atlas cluster hostname | `cluster0.563g7gd.mongodb.net` |
| `MONGODB_DB_NAME` | Database name | `story-diary` |
| `DB_MODE` | Force `mongo` or `memory` | auto-detected |
