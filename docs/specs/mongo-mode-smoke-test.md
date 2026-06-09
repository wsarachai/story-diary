# Scope: Mongo-mode integration smoke test

**Status:** implemented (`pnpm test:mongo`)
**Owner:** TBD
**Last updated:** 2026-06-09

## Problem

`frontend/lib/db.ts` has two code paths behind a module-level `mode` constant:
`"memory"` and `"mongo"`. Every existing test runs in `memory` mode (it's the
default when `NODE_ENV=test`), so the **entire `mongo` branch ships untested** —
roughly 50 data-access functions, each with a hand-written Mongo query that
mirrors the in-memory logic. Bugs that only live in the `mongo` branch (wrong
filter shape, missing `sort`, bad upsert, index collisions, `serverApi: strict`
command rejections, the `dropStaleIndexes` migration) are invisible to CI and
only surface in dev/prod against Atlas.

This smoke test closes that gap with **one golden end-to-end flow** exercised
through the real route handlers against a **real mongod** (via
`mongodb-memory-server`), not the in-memory store.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Mongo target | `mongodb-memory-server` | Hermetic, no Atlas creds in CI, runs a real `mongod` so driver + query + index semantics are exercised. |
| Breadth | One golden flow | Smoke test = "is the wiring alive", not exhaustive CRUD coverage. Per-collection coverage is a future follow-up. |

## What it covers (the golden flow)

Each step calls a real `app/api/**/route.ts` handler with a constructed
`Request`, asserts the JSON response, and thereby drives the `mongo` branch of
the underlying `db.ts` function. Collections touched are noted.

1. **Register** → `POST /api/auth/register` → `insertUser` *(users)*
2. **Login** → `POST /api/auth/login` → `findUserByTel`, `signToken` *(users)* — capture JWT for subsequent Bearer headers
3. **List chapters** → `GET /api/chapters` → `listChaptersDocs` (seeded reference data + `sort`)
4. **Save chapter progress** → `POST /api/chapters/[id]/progress` → `upsertChapterProgress`, `unlockNextChapterBySortOrder` *(user_chapter_progress, chapters)* — verifies upsert + the unlock side-effect
5. **Create habit activity** → `POST /api/habits/activities` → `findHabitActivityConflictByName`, `insertHabitActivity` *(habit_activities)*
6. **Today checklist** → `GET /api/habits/today` → `listHabitActivitiesByUser`, occurrence materialization *(habit_activities, habit_occurrences)*
7. **Check in (medicine)** → `POST /api/habits/checkin/medicine` → `upsertPendingOccurrence`, `updateOccurrence`, `replaceMedicineCheckin` *(habit_occurrences, medicine_checkins)* — exercises the `$setOnInsert` upsert + replace path
8. **Quiz questions** → `GET /api/minigame/quiz` → `listQuizQuestionsDocs` (seeded, sorted)
9. **Submit quiz attempt** → `POST /api/minigame/quiz/attempts` → `insertQuizAttempt` *(quiz_attempts)*

This single flow transitively proves: seeding (`seedMongoReferenceData`), index
creation + `dropStaleIndexes` (`ensureMongoIndexes` runs on first
`initializeDatabase`), insert, find-by-field, sorted list, upsert with
`$setOnInsert`, `findOneAndUpdate` with `returnDocument: "after"`, and
`replaceOne` upsert.

## Harness mechanics (the part that needs care)

- **`mode` is decided at module import.** `db.ts:6` reads `process.env.DB_MODE`
  / `NODE_ENV` once at load. Env **must** be set before `db.ts` (or anything
  importing it) is first imported. Use a vitest `globalSetup` that boots the
  memory server and sets env, and/or `dynamic import()` inside the test after
  env is set.
- **Bypass `mongodb+srv`.** Set `MONGODB_URI` directly to the memory-server URI
  (`mongodb://127.0.0.1:<port>/...`). This short-circuits `buildMongoUri`, so
  the `srv` lookup and `dns.setServers` path are never taken. No Atlas vars
  needed.
- **Separate vitest config** (`vitest.mongo.config.ts`):
  - `environment: "node"` (not jsdom — no DOM/localStorage needed)
  - **Do not** load `tests/setup.ts` (it starts MSW; this test hits handlers
    directly, no fetch interception wanted)
  - `globalSetup` → start `MongoMemoryServer`, export URI, set
    `process.env.DB_MODE = "mongo"`, `MONGODB_URI`, `JWT_SECRET`,
    `ROOT_ADMIN_TEL` (so the registered user isn't accidentally rootAdmin, pick
    a different tel)
  - teardown → `closeDatabase()` then `mongod.stop()`
- **`serverApi: { strict: true }`** (db.ts:455) — all commands used (find,
  insertOne, updateOne, bulkWrite, createIndex, dropIndex, findOneAndUpdate,
  replaceOne, deleteOne) are in Stable API v1, so they pass under a modern
  `mongod` (5.0+, the memory-server default). Flag here in case the
  memory-server binary version is pinned older.
- **First run downloads a `mongod` binary** (~cached afterwards). CI needs
  network on first run or a pre-warmed cache.
- **New scripts:** `pnpm test:mongo` → `vitest run -c vitest.mongo.config.ts`.
  Keep it out of the default `pnpm test` if binary download in CI is a concern,
  or wire it into a dedicated CI job.

## Non-goals

- Not testing Atlas-specific behavior (`srv`, real network, Atlas tier limits).
  `mongodb-memory-server` is community `mongod`.
- Not exhaustive per-collection CRUD, not admin CRUD routes, not the 4
  check-in types beyond medicine, not video-clip / e-book / chapter-scene
  admin paths. (Candidates for a later "per-collection" pass.)
- Not asserting frontend/Redux behavior — that's the existing jsdom + MSW
  integration suite.
- Not load/perf testing.

## Risks & caveats

- **Parity gap:** green here ≠ green on Atlas (serverApi strict quirks, srv,
  auth). Mitigated by also running `DB_MODE=mongo` manually against a real
  Atlas test DB before a release if desired.
- **Module singleton state** (`initialized`, `mongoClient`, `mongoDb`) — the
  test must own the full lifecycle and call `closeDatabase()` to avoid a hung
  vitest process from the open Mongo connection.
- **Binary download flakiness** in CI — pin a `MONGOMS_VERSION` and cache.

## Effort

~0.5–1 day.

- `pnpm add -D mongodb-memory-server`
- `vitest.mongo.config.ts` + `tests/mongo/globalSetup.ts`
- `tests/mongo/smoke.test.ts` (the 9-step flow above)
- `package.json` script `test:mongo`
- (optional) CI job wiring
