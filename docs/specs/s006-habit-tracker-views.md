# Spec: Habit Tracker Views

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Habit hub, daily/weekly/monthly tracker views, and monthly summary.

---

## Summary

The habit tracker lets users track daily, weekly, monthly, and to-do activities across three categories: medicine, nutrition, and physical. The hub page shows a decorative calendar and entry points to the three tracker views. The daily view lists today's occurrences with toggle checkboxes; tappable entries (medicine, nutrition, symptoms, emotion) navigate to dedicated check-in forms. Activities can be deleted from the today view with a confirmation dialog. Weekly and monthly views show dot-grid status matrices with period summaries. The summary page shows per-activity progress rings and aggregate monthly results.

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/habit` | `frontend/app/(authed)/habit/page.tsx` | Habit hub; decorative daily card links to today, weekly bar links to weekly, calendar links to monthly |
| `/habit/today` | `frontend/app/(authed)/habit/today/page.tsx` | Daily checklist of today's activity occurrences; toggle done/pending; delete activities |
| `/habit/weekly` | `frontend/app/(authed)/habit/weekly/page.tsx` | 7-column dot grid for current week; done/skip/pending legend; week summary |
| `/habit/monthly` | `frontend/app/(authed)/habit/monthly/page.tsx` | 31-column dot grid for current month; highlights today; month summary |
| `/habit/summary` | `frontend/app/(authed)/habit/summary/page.tsx` | Per-activity progress rings (left) and aggregate monthly results (right) |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/habits/today?date=YYYY-MM-DD` | `frontend/app/api/habits/today/route.ts` | Today's activities and occurrence statuses |
| `GET` | `/api/habits/weekly` | `frontend/app/api/habits/weekly/route.ts` | Current week's occurrences grouped by activity |
| `GET` | `/api/habits/monthly?month=YYYY-MM` | `frontend/app/api/habits/monthly/route.ts` | Current month's occurrences grouped by activity |
| `GET` | `/api/habits/monthly-summary?month=YYYY-MM` | `frontend/app/api/habits/monthly-summary/route.ts` | Per-activity goals and aggregate monthly results |
| `PATCH` | `/api/habits/occurrences/[id]` | `frontend/app/api/habits/occurrences/[id]/route.ts` | Update occurrence status (toggle done/pending) |
| `POST` | `/api/habits/activities` | `frontend/app/api/habits/activities/route.ts` | Create a new habit activity |
| `DELETE` | `/api/habits/activities/[id]` | `frontend/app/api/habits/activities/[id]/route.ts` | Archive/delete an activity and its occurrences |

---

## Key Components

- `HabitPage` — `frontend/app/(authed)/habit/page.tsx` — hub with client-built calendar grid; links to today, weekly, and monthly sub-views
- `HabitTodayPage` — `frontend/app/(authed)/habit/today/page.tsx` — lists activity entries with category-color icons, meal-relation sublines, toggle checkboxes, and delete buttons; tappable entries (medicine, nutrition, symptoms, emotion) navigate to check-in routes; includes `DeleteConfirmDialog`
- `HabitWeeklyPage` — `frontend/app/(authed)/habit/weekly/page.tsx` — 7-day dot grid with done/skip/pending status; weekly done/target summary cards
- `HabitMonthlyPage` — `frontend/app/(authed)/habit/monthly/page.tsx` — 31-day dot grid; today's column highlighted; monthly done/target summary cards
- `HabitSummaryPage` — `frontend/app/(authed)/habit/summary/page.tsx` — SVG progress rings per activity (left page); aggregate stats (totalDone, target, skipped, fullDays, longestStreak) on right page
- `IconRail` — `frontend/components/IconRail.tsx` — persistent side navigation
- `DateBadge` — `frontend/components/DateBadge.tsx` — renders localized date strings (full, week range, month/year)

---

## State

Redux slice: `frontend/store/habitsApi.ts` — manages `getTodayHabits`, `getWeeklyHabits`, `getMonthlyHabits`, `getMonthlySummary` queries; `toggleOccurrence` mutation (with optimistic update on the today cache), `createActivity`, and `deleteActivity` mutations. The `date` parameter for `getTodayHabits` is derived from `user.timezone` via `localDateStr` to avoid UTC/local date mismatches.
