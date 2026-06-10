# Spec: Habit Tracker Views

**Status:** Implemented
**Last updated:** 2026-06-10
**Scope:** Habit hub, daily checklist/summary, weekly/monthly tracker grids, occurrence status model.

---

## Summary

The habit tracker lets users track daily, weekly, monthly, and to-do activities across three categories: medicine, nutrition, and physical. The hub page shows a decorative calendar and entry points to the tracker views. The daily checklist lists today's occurrences with toggle checkboxes; tappable entries (medicine, nutrition, symptoms, emotion) navigate to dedicated check-in forms. Activities can be deleted from the checklist with a confirmation dialog. Weekly and monthly views show dot-grid status matrices over **all scheduled activities** with period summaries based on each activity's real schedule.

---

## Occurrence status model

Stored statuses (`HabitOccurrenceStatus` in `frontend/types/habit.ts`, persisted in `habit_occurrences.status`):

| Status | Thai label | Meaning |
|--------|-----------|---------|
| `pending` | ยังไม่ทำ / ยังไม่ถึง / ไม่ได้ทำ | No check-in yet. Display label depends on the date (see derived states). |
| `partial` | กำลังทำ | Multi-part check-in started but not complete. Currently produced **only** by a nutrition check-in saved with 1–2 of its 3 meals filled (whitespace-only does not count). Counts as **not done** in every summary. |
| `done` | ทำเสร็จ | Completed. `completedAt` is set only in this state. |
| `skipped` | ข้ามไป | Explicitly skipped from the checklist. |

Rules:

- The toggle API (`PATCH /api/habits/occurrences/[id]`) accepts only `pending | done | skipped` — `partial` can never be set manually; it is derived server-side from real check-in data (`saveNutritionCheckin`).
- Nutrition check-in: all 3 meals filled → `done`; 1–2 → `partial`; 0 → stays `pending`. Re-saving with all meals upgrades `partial` to `done`.
- Medicine, symptoms, and mood check-ins are single-shot: saving marks the occurrence `done`.
- The checklist quick-check tap: `done → pending` (undo); any other status → `done`. Toggling never deletes saved check-in records.
- A `partial` left at end of day stays `partial` in history (renders as a half-filled dot); it does not decay to missed.

Derived render states (client-side only, `frontend/lib/utils/habitStatus.ts`):

- `off` — activity not scheduled on that weekday (daily activities with a weekday selection): muted dashed cell, contributes nothing to targets.
- `missed` (ไม่ได้ทำ) — `pending` with a date before today: dimmed grey dot.
- `pending` (ยังไม่ถึง) — `pending` today or in the future: open white/cyan dot.
- Today's column gets a purple ring modifier in both grids, orthogonal to status.

---

## Grid composition & targets

`getWeeklyView` / `getMonthlyView` (`frontend/lib/services/habitService.ts`) include **all non-archived activities except `todo` frequency**, regardless of cadence. Per-activity period targets:

| Frequency | Weekly grid target | Monthly grid target |
|-----------|--------------------|---------------------|
| `daily` | count of selected weekdays in the week (7 if none selected) | count of scheduled days in the month |
| `weekly` (`daysPerWeek: N`) | N (any N days satisfy it) | prorated: `round(N × daysInMonth / 7)` |
| `monthly` (`daysPerMonth: N`) | 0 (row shown for visibility only) | N |
| `todo` | excluded from grids | excluded from grids |

The summary card shows `done` (count of `done` occurrences) vs the summed target. The week always starts on **Monday** in the user's timezone (`localWeekStartStr`), matching the จ–อา column headers.

`getMonthlySummary` uses the same targets and exclusions; progress percentages are capped at 100. Full-day and streak counts consider **daily-frequency activities only** (weekly/monthly cadences have no per-day expectation).

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/habit` | `frontend/app/(authed)/habit/page.tsx` | Habit hub; links to today, weekly, and monthly sub-views |
| `/habit/checklist` | `frontend/app/(authed)/habit/checklist/page.tsx` | Daily checklist (รายการ); toggle/skip/delete; tappable entries open check-in forms. Check button states: green = done, orange = skipped, half-filled green = partial |
| `/habit/today` | `frontend/app/(authed)/habit/today/page.tsx` | Daily summary (สรุป); 4 count cards — ทำเสร็จ / กำลังทำ / ข้ามไป / ยังไม่ทำ — plus progress bar (done/total) and check-in CTA |
| `/habit/weekly` | `frontend/app/(authed)/habit/weekly/page.tsx` | Mon–Sun dot grid over all scheduled activities; 5-entry legend (ทำเสร็จ/กำลังทำ/ข้ามไป/ไม่ได้ทำ/ยังไม่ถึง); today ring; week summary |
| `/habit/monthly` | `frontend/app/(authed)/habit/monthly/page.tsx` | 31-column dot grid; same legend and today ring; month summary |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/habits/today?date=YYYY-MM-DD` | `frontend/app/api/habits/today/route.ts` | Today's activities and occurrence statuses |
| `GET` | `/api/habits/weekly?weekStart=YYYY-MM-DD` | `frontend/app/api/habits/weekly/route.ts` | Week grid rows (`HabitGridRow[]`: per-date cells with status + scheduled flag, per-row done/target). Defaults to the Monday of the current week in the user's timezone |
| `GET` | `/api/habits/monthly?month=YYYY-MM` | `frontend/app/api/habits/monthly/route.ts` | Month grid rows, same row shape |
| `GET` | `/api/habits/monthly-summary?month=YYYY-MM` | `frontend/app/api/habits/monthly-summary/route.ts` | Per-activity goals and aggregate monthly results |
| `PATCH` | `/api/habits/occurrences/[id]` | `frontend/app/api/habits/occurrences/[id]/route.ts` | Update occurrence status (`pending`/`done`/`skipped` only) |
| `POST` | `/api/habits/activities` | `frontend/app/api/habits/activities/route.ts` | Create a new habit activity |
| `DELETE` | `/api/habits/activities/[id]` | `frontend/app/api/habits/activities/[id]/route.ts` | Archive/delete an activity and its occurrences |
| `POST` | `/api/habits/checkin/medicine` | `frontend/app/api/habits/checkin/medicine/route.ts` | Medicine check-in (single-shot → done) |
| `POST` | `/api/habits/checkin/nutrition` | `frontend/app/api/habits/checkin/nutrition/route.ts` | Nutrition check-in (3-meal; sets done/partial/pending by filled count) |
| `PUT` | `/api/habits/checkins/symptoms/[occurrenceId]` | `frontend/app/api/habits/checkins/symptoms/[occurrenceId]/route.ts` | Symptoms check-in (single-shot → done) |
| `PUT` | `/api/habits/checkins/mood/[occurrenceId]` | `frontend/app/api/habits/checkins/mood/[occurrenceId]/route.ts` | Mood check-in (single-shot → done) |

---

## Key Components

- `HabitPage` — `frontend/app/(authed)/habit/page.tsx` — hub with client-built calendar grid
- `HabitChecklistPage` — `frontend/app/(authed)/habit/checklist/page.tsx` — entry list with category-color icons, sublines, skip/delete buttons, status-aware check button; includes `DeleteConfirmDialog`
- `HabitTodayPage` — `frontend/app/(authed)/habit/today/page.tsx` — 4 status count cards + progress bar
- `HabitWeeklyPage` / `HabitMonthlyPage` — dot grids rendering `HabitGridCell`s via `gridDotState`
- `gridDotState` — `frontend/lib/utils/habitStatus.ts` — derives off/missed/pending/partial/done/skipped render state from a cell + today's date
- `TrackerError` / `TrackerEmpty` — `frontend/app/(authed)/habit/TrackerStates.tsx` — shared states used by all four habit views: a query failure renders an error block with a retry button (never a silent empty grid), and zero rows/entries renders a "ยังไม่มีกิจกรรม" prompt linking to `/habit/add`
- `IconRail` — `frontend/components/IconRail.tsx` — persistent side navigation
- `DateBadge` — `frontend/components/DateBadge.tsx` — localized date strings (full, week range, month/year)

---

## State

Redux slice: `frontend/store/habitsApi.ts` — `getTodayHabits`, `getWeeklyHabits`, `getMonthlyHabits`, `getMonthlySummary` queries; `toggleOccurrence` mutation (optimistic update on the today cache), `createActivity`, `deleteActivity`, and the four check-in mutations. Grid responses are keyed by activity id (`GridRowView`: activityName, cells, done, target). The `date` for `getTodayHabits` and the today-ring comparison both derive from `user.timezone` via `localDateStr` to avoid UTC/local mismatches.
