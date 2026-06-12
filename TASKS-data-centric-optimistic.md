# Tasks: Granular RTK Query cache + Optimistic Updates

> **Resume instructions:** work happens on branch `feature/data-centric-optimistic-cache`.
> Tick `[x]` as each task lands. If a session ends mid-phase, the unticked boxes plus
> the "Decisions" section below are everything a new session needs. Verify with
> `cd frontend && pnpm lint && pnpm test && pnpm build`.

## Decisions (settled in grilling session, 2026-06-12)

1. **Approach:** keep the existing central RTK Query layer (`frontend/store/apiSlice.ts` + injected feature APIs). No entity-slice restructure.
2. **Scope:** ALL API slices — habits, chapters, ebook, quiz, videoClips, admin, user/auth.
3. **Tag taxonomy:** resource-level tag types; IDs only where a mutation targets one entity (per-occurrence check-ins, per-chapter detail). Aggregates (today/weekly/monthly grids) keep plain tags — a check-in legitimately changes them.
4. **Optimistic rule:** optimistic when the client can compute the post-state (check-ins, deletes, field updates, reorder); pessimistic when the server invents data (creates, name-conflict validation). Medicine check-in status mirrors server slot logic client-side, reconciled by aggregate invalidation afterwards.
5. **Failure UX:** shared toast (Thai message, auto-dismiss) shown when an optimistic update rolls back — implemented via a small toast slice + store middleware on rejected mutations.

### Tag map (target state)

| Cache | provides |
|---|---|
| getTodayHabits | `HabitToday` |
| getWeeklyHabits | `HabitWeekly` |
| getMonthlyHabits | `HabitMonthly` |
| getMonthlySummary | `HabitMonthlySummary` |
| get{Medicine,Nutrition,Symptoms,Mood}Checkin | `{type:"HabitCheckin", id: occurrenceId}` |
| getChapterSummaries | `{type:"Chapters", id:"LIST"}` |
| getChapter | `{type:"Chapters", id}` (already) |
| getEBooks | `EBooks` (new — currently wrongly tagged `Chapters`) |
| getQuiz / getVideoClips | `Quiz` / `VideoClips` (unchanged) |
| admin queries | `AdminChapters`, `AdminScenes` (id=chapterId), `AdminEBooks`, `AdminQuestions`, `AdminUsers`, `AdminVideoClips` |

Habit mutations invalidate the four aggregate tags + their own `HabitCheckin` id; they no longer blast every check-in cache.
Admin mutations invalidate their own `Admin*` collection **plus the matching user-facing tag** (`Chapters LIST`, `EBooks`, `Quiz`, `VideoClips`) — fixes existing staleness where admin edits never refresh user views.

## Phase 0 — Setup
- [x] Create branch `feature/data-centric-optimistic-cache` from `main`

## Phase 1 — Tag types (`frontend/store/apiSlice.ts`)
- [x] Replace `tagTypes` with: `Auth`, `Chapters`, `EBooks`, `Quiz`, `VideoClips`, `HabitToday`, `HabitWeekly`, `HabitMonthly`, `HabitMonthlySummary`, `HabitCheckin`, `AdminChapters`, `AdminScenes`, `AdminEBooks`, `AdminQuestions`, `AdminUsers`, `AdminVideoClips`

## Phase 2 — habitsApi granular tags (`frontend/store/habitsApi.ts`)
- [x] Queries: re-tag per the tag map above
- [x] `toggleOccurrence`: invalidate 4 aggregate tags (keep existing optimistic today-patch)
- [x] `save*Checkin` ×4: invalidate 4 aggregates + own `{HabitCheckin, id}`
- [x] `createActivity` / `deleteActivity`: invalidate 4 aggregates

## Phase 3 — habits optimistic updates (`frontend/store/habitsApi.ts`)
- [x] `saveMedicineCheckin`: optimistic patch of today-status (mirrors meal-slot done/partial/pending logic) + patch `getMedicineCheckin` cache; rollback on failure
- [x] `saveNutritionCheckin`: optimistic today-status patch (3 meals → done, 1–2 → partial, 0 → pending) + checkin cache patch
- [x] `saveSymptomsCheckin`: optimistic done + cache patch
- [x] `saveMoodCheckin`: optimistic done + cache patch
- [x] `deleteActivity`: optimistic removal from all cached `getTodayHabits` views (`selectCachedArgsForQuery`)
- [x] `createActivity`: stays pessimistic (decision #4)
- [x] Save mutations now require `activityId`; all 6 check-in pages updated to pass it from `actId` query param (incl. legacy `checkin/emotion`, `checkin/symptom` pages)

## Phase 4 — user-facing slices tag hygiene
- [x] `chaptersApi`: `getChapterSummaries` → `{Chapters, id:"LIST"}`; `updateChapterProgress` invalidates `LIST` + own id + next chapter id (unlock) — optimistic patches kept
- [x] `ebookApi`: own `EBooks` tag instead of `Chapters`
- [x] `quizApi` / `videoClipsApi`: tags unchanged, no edits needed

## Phase 5 — adminApi tag split + cross-invalidation (`frontend/store/adminApi.ts`)
- [x] Chapters CRUD + reorder → `AdminChapters` + `{Chapters, id:"LIST"}` (and `{Chapters, id}` on update/delete)
- [x] Scenes CRUD + reorder → `{AdminScenes, id: chapterId}` + `{Chapters, id: chapterId}` — `updateScene`/`deleteScene` args now require `chapterId`; call sites in `admin/chapters/[id]/page.tsx` updated
- [x] EBooks CRUD + reorder → `AdminEBooks` + `EBooks`
- [x] Questions CRUD + reorder → `AdminQuestions` + `Quiz`
- [x] Video clips CRUD + reorder → `AdminVideoClips` + `VideoClips`
- [x] Users: `getAdminUsers`/`changeUserRole` → `AdminUsers`

## Phase 6 — admin optimistic updates/deletes
- [x] `updateChapter` / `deleteChapter` (merge fields / filter from list, + detail patch on update)
- [x] `updateScene` / `deleteScene`
- [x] `updateEBook` / `deleteEBook`
- [x] `updateQuestion` / `deleteQuestion`
- [x] `updateVideoClip` / `deleteVideoClip`
- [x] `changeUserRole`
- [x] Creates stay pessimistic; reorder optimistic sorts kept, with user-facing invalidation added

## Phase 7 — profile
- [x] `userApi.updateProfile`: optimistic merge into `getMe` with rollback; server response still upserted on success

## Phase 8 — rollback toast
- [x] `frontend/store/toastSlice.ts`
- [x] `frontend/store/toastMiddleware.ts`: toast "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" on rejected mutations; login/register/logout silenced; queries never toast
- [x] `frontend/components/Toast.tsx` mounted once in `components/Providers.tsx` (covers authed + admin trees)
- [x] Slice + middleware registered in `frontend/store/index.ts`

## Phase 9 — tests (`frontend/tests/integration/optimisticUpdates.test.ts`)
- [x] `toggleOccurrence` optimistic apply + rollback
- [x] `saveMedicineCheckin` status mirror: done / partial / pending
- [x] `deleteActivity` optimistic removal + rollback
- [x] Cross-invalidation: admin `updateChapter` refetches `getChapterSummaries`
- [x] Toast middleware: failed mutation toasts; auth endpoints and failed queries stay silent
- [x] Existing `tests/integration/habitsApi.test.ts` updated for the new required `activityId` on save mutations

## Phase 10 — verification
- [x] `pnpm lint` — 15 pre-existing problems, byte-identical to clean tree; zero new findings
- [x] `pnpm test` — 18 files / 326 tests green (incl. 10 new)
- [x] `pnpm build` — succeeds
- [ ] Manual smoke: check-in from checklist updates instantly; weekly/monthly reconcile; failure (dev-tools offline) rolls back with toast
- [x] Committed on `feature/data-centric-optimistic-cache`

## Status: implementation complete (manual smoke pending)
