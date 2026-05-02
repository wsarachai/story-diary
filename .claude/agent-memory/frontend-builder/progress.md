## Status
last-updated: 2026-05-02T14:38 — API WIRING COMPLETE

## Feature completion
- [x] frontend-auth         — complete
- [x] frontend-chapters     — complete
- [x] frontend-habit-views  — complete
- [x] frontend-minigame     — complete
- [x] frontend-habit-authoring — complete

## Final build (post-API wiring)
- pnpm lint: PASS (0 errors, 1 pre-existing warning)
- pnpm build: PASS — 32 routes generated, 0 errors

## Cross-feature decisions
- Types from src/types/ copied to frontend/types/ — Turbopack cannot resolve paths outside project root. Keep in sync with src/types/ when types change.
- tsconfig paths: @/types/* → ./types/*, @/* → ./*
- (authed)/layout.tsx is a thin AuthedShell wrapper; each page injects IconRail via BookShellLayout rail prop.
- Authoring pages use direct layout (not BookShellLayout) with .authoring-page spanning both grid columns
- Backend exists at backend/ with SQLite, Express on port 3001. next.config.ts already proxies /api/* to http://localhost:3001.
- Frontend .env.local created: NEXT_PUBLIC_API_URL=http://localhost:3001

## API wiring changes (2026-05-02)
### chaptersSlice.ts
- Replaced MOCK_SUMMARIES + setTimeout with real GET /api/chapters
- Replaced MOCK_CHAPTERS + setTimeout with real GET /api/chapters/:id
- Added persistChapterProgress thunk → POST /api/chapters/:id/progress
- markCompleted still does optimistic local update; persistChapterProgress sends to server

### videoClipsSlice.ts
- Replaced MOCK_COLLECTION + setTimeout with real GET /api/video-clips

### quizSlice.ts
- Replaced MOCK_QUIZ/MOCK_QUESTIONS + setTimeout with real GET /api/minigame/quiz

### habitsSlice.ts
- fetchToday → GET /api/habits/today?date=YYYY-MM-DD, adapts { entries[] } → { activities{}, todayByActivity{} }
- fetchWeekly → GET /api/habits/weekly, adapts WeeklyRowApi[] → Record<activityId, status[]>
- fetchMonthly → GET /api/habits/monthly?month=YYYY-MM, same adaptation
- fetchMonthlySummary → GET /api/habits/monthly-summary?month=YYYY-MM
- toggleOccurrence → PATCH /api/habits/occurrences/:id with { status } (optimistic flip preserved)
- createActivity → POST /api/habits/activities
- saveMedicineCheckin → POST /api/habits/checkin/medicine
- saveNutritionCheckin → POST /api/habits/checkin/nutrition
- saveSymptomsCheckin → PUT /api/habits/checkins/symptoms/:occurrenceId
- saveMoodCheckin → PUT /api/habits/checkins/mood/:occurrenceId

### chapter scene page
- Added import + dispatch of persistChapterProgress on chapter completion
- Fixed pre-existing lint error: setState-in-effect for typewriter reset replaced with
  typingDoneForScene: number|null state (self-resets when sceneIndex changes)

## Blockers
- (none)
