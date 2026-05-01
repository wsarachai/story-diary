# Spec: Habit Tracker — Read Views (s006, s012–s015)

**Status:** Draft
**Owner:** Architect (handoff to frontend implementer + tester)
**Last updated:** 2026-05-01
**Scope:** UI architecture for the four read-only habit-tracker surfaces:
the s006 hub, the daily list (s012), the weekly grid (s013), the monthly
grid (s014), and the monthly summary (s015). The activity-authoring and
check-in flows live in a sibling spec (`s016-habit-activity-authoring.md`).

---

## Summary

The Habit Tracker lets the user see what they have to do today, mark
it done/skipped, and review weekly/monthly progress. The hub (s006) is
a 2-page dashboard: a daily checklist preview + edit-pencil shortcut on
the left, and weekly + monthly preview tiles on the right. From the hub,
each tile zooms into a dedicated read screen — s012 (today list), s013
(weekly grid), s014 (monthly grid). s015 sits alongside the trackers as
a richer "results" / "goals" snapshot.

This spec maps the wireframes onto a `habitsSlice` Redux slice, a
weekly/monthly grid component family, a single shared period-tab
component, and four routes under `/habit/...`. It introduces three
derived states not present in the wireframes — empty list, optimistic
toggle, and end-of-month celebratory state — all grounded in the existing
visual language.

---

## Source Wireframes

| Screen ID                          | File                                              | Role                                                       |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `s006-habit-tracker`               | `docz/wireframes/s006-habit-tracker.html`         | Hub dashboard: daily checklist + weekly + monthly preview. |
| `s012-habit-daily-today`           | `docz/wireframes/s012-habit-daily-today.html`     | Today's habit entries (4 sample rows, +ribbon button).     |
| `s013-habit-weekly-tracker`        | `docz/wireframes/s013-habit-weekly-tracker.html`  | Mon–Sun grid + summary cards.                              |
| `s014-habit-monthly-tracker`       | `docz/wireframes/s014-habit-monthly-tracker.html` | 1–31 day grid + summary + "today" outline marker.          |
| `s015-habit-monthly-summary`       | `docz/wireframes/s015-habit-monthly-summary.html` | Goals (rings) + Results stat grid.                         |

Neighbouring screens that affect navigation:

- `s004-home.html` — feature card "Habit tracker" routes here.
- `s016-habit-add-activity.html` — opens from the `+` button on s012.
- `s022-medecine-checkin.html`, `s023-nutrition-checkin.html` — opened
  from individual today-list rows on s012.

### Page-specific JS vs shared `common.js`

- **s014** ships a small page-script that pads each `.monthly-row` to
  31 cells if any are missing (in case the wireframe author shipped a
  partial row). Equivalent in React: render exactly 31 cells from data
  using `Array.from({length: 31}, …)`. No DOM-mutation shim needed.
- **s006/s013/s015** ship no page-specific JS.
- **s012** uses `data-navigate` on its `.habit-entry` rows — this is the
  only file in this cluster that depends on the shared `common.js`
  delegated handler. React port replaces it with onClick → router.push.
- The icon-rail anchors throughout the cluster are native `<a href>`
  elements not relying on `data-navigate`.

### Gaps not covered by predefined wireframes

1. **Empty today list.** s012 hard-codes 4 entries; the wireframe is
   silent on what happens before the user has added any activities.
   **DS-1.**
2. **Optimistic check toggle.** s012 shows two static states (`done`
   green vs default ring). What happens between user-tap and server-ack
   is undefined. **DS-2.**
3. **No habits yet → weekly/monthly grids.** s013/s014 always render
   rows; if the user has no activities, both surfaces would render an
   empty grid. **DS-3.**
4. **Period navigation.** s013/s014 show the current week/month only;
   no prev/next controls in the wireframe. v1 freezes on "this period";
   prev/next is out of scope and noted as a future need.
5. **"Today" decoration on s013.** s014 has a `m-dot.today` outline; s013
   has no equivalent. Spec adds parity by applying the same outline to
   the weekly column whose day matches the user's local "today" — purely
   client-derived.

---

## Derived Screens and States

| ID    | Name                                       | Type            | Inherits from                                              |
| ----- | ------------------------------------------ | --------------- | ---------------------------------------------------------- |
| DS-1  | Empty today list                           | Empty state     | s012 layout (header + centered empty card "ยังไม่มีกิจกรรม") |
| DS-2  | Optimistic toggle (pending check)          | Inline UI state | s012 `.habit-check` (60 % opacity + spinner)               |
| DS-3  | Empty weekly / monthly grid                | Empty state     | s013/s014 layout (header + centered "ยังไม่มีกิจกรรม") |
| DS-4  | "Today" column outline on weekly grid      | Inline modifier | s013 (parity with `m-dot.today` from s014)                 |

**DS-1 visual rules:** keep the s012 header with the `+` button
(important — empty state must still allow adding); replace the entries
list with a single rounded `#edf9fa` card containing centered copy
"ยังไม่มีกิจกรรม กดปุ่ม + เพื่อเริ่มเพิ่มกิจกรรม" in 44 px Noto Sans Thai.

**DS-2 visual rules:** when the user taps a `.habit-check`, optimistic
update flips to `done` immediately. While the API request is in flight,
overlay a 60 % opacity dim + 1.6 rem inline spinner inside the dot.
Revert to previous state on rejection (and surface a small inline
"บันทึกไม่สำเร็จ" toast above the rail). Max in-flight time before showing
the spinner: 200 ms — instantaneous successes never flash.

**DS-3 visual rules:** keep the period header + tab row; empty grid
state is a centered card identical to DS-1 inside the `.weekly-grid` /
`.monthly-grid-wrap` slot.

**DS-4 visual rules:** add a 3 px `border-color: #6a24f2` outline to
every dot in the column whose day matches the local "today" on s013,
matching the `m-dot.today` rule from s014.

---

## User Flow

```
                ┌────────────────┐
                │ /home (s004)   │
                └───────┬────────┘
                        │ feature card "Habit tracker"
                        │   (or rail "edit")
                        ▼
                ┌────────────────────────────────┐
                │ /habit (s006 hub)              │
                │  ┌──────────┐  ┌────────────┐  │
                │  │ daily    │  │ weekly /   │  │
                │  │ preview  │  │ monthly    │  │
                │  └────┬─────┘  └─────┬──────┘  │
                └────────┼─────────────┼─────────┘
                         │             │
            edit-pencil  │             │ tile tap
                         ▼             ▼
                 ┌──────────┐    ┌──────────────────────┐
                 │ /habit   │    │ /habit/weekly (s013) │
                 │ /today   │    │      ⇅ tab           │
                 │ (s012)   │    │ /habit/monthly(s014) │
                 │          │    │      ⇅ tab           │
                 │          │    │ /habit/today  (s012) │  ← tab from s013/s014
                 │          │    └──────────────────────┘
                 │   row tap │
                 ▼          │
        ┌────────────────┐  │
        │ /habit/checkin/│  │
        │   medicine /   │  │
        │   nutrition    │  │
        │   (s022/s023)  │  │
        └────────────────┘  │
                            │  +button
                            ▼
                  ┌─────────────────────────┐
                  │ /habit/add (s016)       │
                  │  → category sub-flows   │
                  └─────────────────────────┘
```

The s015 monthly-summary screen has no direct entry point in the
wireframe rail. Spec exposes it as `/habit/summary`, reachable from a
new "summary" link on s006's monthly tile (DS-5 — see Edge Cases).
This is the only NEW navigation slot the spec proposes; without it
s015 is unreachable.

---

## Component Tree

```
app/(authed)/habit/
├── page.tsx                    ← s006 hub  (route "/habit")
│   └── <HabitHubScreen>
│       ├── <DailyPreviewCard>
│       │   ├── <PreviewHeader title="daily habits" editHref="/habit/today" />
│       │   └── <DailyPreviewList items={previewItems} />     (5 strikethrough placeholder rows)
│       └── <DashboardRight>
│           ├── <WeeklyTile  href="/habit/weekly"  data={previewWeek}/>
│           └── <MonthlyTile href="/habit/monthly" data={previewMonth}/>
│
├── today/page.tsx              ← s012  ("/habit/today")
│   └── <HabitTodayScreen>
│       ├── <TodayHeader  title="กิจกรรมวันนี้"  addHref="/habit/add" />
│       ├── <TodayEntryList entries={todayEntries}>
│       │   └── <TodayEntryRow>
│       │       ├── <CategoryIcon category={entry.activity.category} />
│       │       ├── <EntryBody name={...} sub={...} />
│       │       └── <CheckToggle status={entry.occurrence.status} onToggle=… />
│       └── <EmptyTodayCard />          (DS-1; render iff entries.length === 0)
│
├── weekly/page.tsx             ← s013  ("/habit/weekly")
│   └── <PeriodTrackerLayout active="weekly">
│       ├── <PeriodTabs />          (daily | weekly | monthly)
│       ├── <WeeklyGrid  rows={…} todayWeekday={…} />     (DS-4)
│       └── <SummaryColumn>
│           ├── <SummaryStatCard label="ทำได้แล้ว" value={done}/>
│           ├── <SummaryStatCard label="เป้าหมายสัปดาห์" value={target}/>
│           └── <PeriodLegend />
│
├── monthly/page.tsx            ← s014  ("/habit/monthly")
│   └── <PeriodTrackerLayout active="monthly">
│       ├── <PeriodTabs />
│       ├── <MonthlyGrid rows={…} todayDay={…} />
│       └── <SummaryColumn>
│
└── summary/page.tsx            ← s015  ("/habit/summary")
    └── <MonthlySummaryScreen>
        ├── <GoalsList>
        │   └── <GoalCard name={goal.name} sub={goal.subline} percent={goal.progressPercent}/>
        └── <ResultsGrid>
            ├── <ResultStat highlight label="ทำได้ทั้งหมด" value="127" unit="ครั้ง" barPercent={72}/>
            ├── <ResultStat label="เป้าหมาย"       value="155" unit="ครั้ง"/>
            ├── <ResultStat label="ข้ามไป"         value="8"   unit="ครั้ง"/>
            ├── <ResultStat label="วันที่ทำครบ"     value="11"  unit="วัน"/>
            └── <ResultStat label="Streak สูงสุด"   value="9"   unit="วัน"/>
```

### Reusable component contracts

```ts
import type {
    HabitOccurrenceStatus,
    HabitCategory,
    TodayHabitEntry,
    PeriodSummary,
    MonthlyGoal,
    MonthlyResults,
} from "@/types/habit";

interface CheckToggleProps {
    status: HabitOccurrenceStatus;
    /** Disabled while DS-2 in flight; component renders its own spinner. */
    pending?: boolean;
    onToggle: () => void;
}

interface PeriodTabsProps {
    active: "daily" | "weekly" | "monthly";
}

interface WeeklyGridProps {
    rows: { activityName: string; cells: HabitOccurrenceStatus[] }[]; // length 7 each
    todayWeekday?: 0 | 1 | 2 | 3 | 4 | 5 | 6;                          // for DS-4
}

interface MonthlyGridProps {
    rows: { activityName: string; cells: HabitOccurrenceStatus[] }[]; // length 31 each
    todayDay?: number;                                                 // 1..31
}

interface GoalCardProps {
    name: string;
    subline: string;
    percent: number; // 0..100
}
```

---

## Redux State Design

### `habitsSlice`

```ts
import type {
    HabitActivity,
    HabitOccurrence,
    HabitOccurrenceStatus,
    PeriodSummary,
    MonthlyGoal,
    MonthlyResults,
} from "@/types/habit";

interface HabitsState {
    /** All activity definitions for the current user. */
    activities: Record<string, HabitActivity>;
    /** Today's occurrences keyed by activityId. */
    todayByActivity: Record<string, HabitOccurrence | undefined>;
    /** Toggle requests in flight for DS-2. */
    pendingToggles: Record<string /* occurrenceId */, true>;
    /** Errors for the most recent toggle, keyed by occurrenceId. */
    toggleErrors: Record<string, string | undefined>;
    /** Loaded weekly view (current ISO week). */
    weekly: {
        weekStartDate: string; // ISO YYYY-MM-DD (Mon)
        rowsByActivity: Record<string, HabitOccurrenceStatus[]>; // length 7
        summary: PeriodSummary;
    } | null;
    /** Loaded monthly view (current month). */
    monthly: {
        month: string; // ISO YYYY-MM
        rowsByActivity: Record<string, HabitOccurrenceStatus[]>; // length 31
        summary: PeriodSummary;
    } | null;
    /** Aggregations for s015. */
    monthlySummary: { goals: MonthlyGoal[]; results: MonthlyResults } | null;

    fetchStatus: {
        today:    "idle" | "loading" | "ready" | "error";
        weekly:   "idle" | "loading" | "ready" | "error";
        monthly:  "idle" | "loading" | "ready" | "error";
        summary:  "idle" | "loading" | "ready" | "error";
    };
}
```

### Actions / thunks

| Action                                  | Effect                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `habits/fetchToday`                     | Loads `activities` + `todayByActivity`.                                     |
| `habits/fetchWeekly`                    | Loads `weekly` for current ISO week.                                        |
| `habits/fetchMonthly`                   | Loads `monthly` for current calendar month.                                 |
| `habits/fetchMonthlySummary`            | Loads s015 data.                                                            |
| `habits/toggleOccurrence`               | Optimistic update + POST. Adds to `pendingToggles`.                         |
| `habits/toggleOccurrence/rejected`      | Reverts status; sets `toggleErrors[occId]`; clears after 3 000 ms.          |

### Selectors

```ts
selectTodayEntries(state): TodayHabitEntry[]
selectTodayHasEntries(state): boolean
selectWeeklyRows(state): WeeklyGridProps["rows"]
selectMonthlyRows(state): MonthlyGridProps["rows"]
selectMonthlySummary(state): { goals: MonthlyGoal[]; results: MonthlyResults } | null
selectIsToggling(state, occId): boolean
```

### Local-only state

- Hover/focus states on tiles, tabs, dots.
- `<EmptyTodayCard>` does not need any state.

---

## Interaction Mapping

### s006 Hub

| Element                                        | Wireframe behaviour | React/Redux mapping                                                |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| Daily preview card (left page) edit-pencil     | static decoration   | Wrap card in `<Link href="/habit/today">` (DS-5).                  |
| `.weekly-section[data-navigate=s013]`          | common.js navigate  | `<Link href="/habit/weekly">`.                                     |
| `.monthly-section[data-navigate=s014]`         | common.js navigate  | `<Link href="/habit/monthly">`.                                    |

### s012 Today

| Element                                                       | Wireframe behaviour          | React/Redux mapping                                              |
| ------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `.add-btn[href=s016]`                                         | Native nav                   | `<Link href="/habit/add">`.                                      |
| `.habit-entry.entry-med[data-navigate=s022]`                  | common.js                    | `<Link href="/habit/checkin/medicine?occ={id}">`.                |
| `.habit-entry.entry-food[data-navigate=s023]`                 | common.js                    | `<Link href="/habit/checkin/nutrition?occ={id}">`.               |
| `.habit-entry.entry-body` / `.entry-mood`                     | static (no data-navigate)    | Render row but disable navigation; tap on `<CheckToggle>` toggles only. |
| `.habit-check` (default → done flip)                          | static visual                | Controlled by `<CheckToggle>`; dispatches `toggleOccurrence`.    |
| Empty list                                                    | n/a (gap)                    | Render `<EmptyTodayCard>` (DS-1).                                |

### s013 Weekly / s014 Monthly

| Element                                          | Wireframe behaviour | React/Redux mapping                                              |
| ------------------------------------------------ | ------------------- | ---------------------------------------------------------------- |
| `.tracker-tab[href=s012/s013/s014]`              | Native nav          | `<Link>` for each tab; active tab marked with
`aria-current="page"` and the `is-active` class.                  |
| Grid cells (`.weekly-dot`, `.m-dot`)             | static visual       | Read-only; tapping does nothing in v1.                           |
| Summary cards / legend                           | static              | Bind from `state.habits.weekly.summary` / `monthly.summary`.     |
| s014 padding script                              | DOM mutation        | NOT ported. Render exactly 31 cells from data.                   |

### s015 Monthly Summary

| Element                       | Wireframe behaviour | React/Redux mapping                                              |
| ----------------------------- | ------------------- | ---------------------------------------------------------------- |
| `.goal-card` × 3              | static              | `<GoalCard>` per `MonthlyGoal`. Ring percent drives stroke-dashoffset. |
| `.result-stat.highlight`      | static              | Bound to `MonthlyResults.totalDone` + `completionPercent` for the bar. |

---

## Route Mapping

| Wireframe filename                       | Next.js route             | Auth      | Notes                                                       |
| ---------------------------------------- | ------------------------- | --------- | ----------------------------------------------------------- |
| `s006-habit-tracker.html`                | `/habit`                  | Protected | Rail `habit` (`#6a24f2`).                                   |
| `s012-habit-daily-today.html`            | `/habit/today`            | Protected | Tab "daily habits".                                         |
| `s013-habit-weekly-tracker.html`         | `/habit/weekly`           | Protected | Tab "weekly habits".                                        |
| `s014-habit-monthly-tracker.html`        | `/habit/monthly`          | Protected | Tab "monthly habits".                                       |
| `s015-habit-monthly-summary.html`        | `/habit/summary`          | Protected | New entry point (DS-5); referenced from s006 monthly tile.  |

The three period screens share a layout (`<PeriodTrackerLayout>`) that
hosts the tab row and exposes a slot for the grid + summary column.

---

## TypeScript Contracts

UI props are listed in **Component Tree**. Domain shapes
(`HabitActivity`, `HabitOccurrence`, `HabitFrequency`, `HabitCategory`,
`HabitOccurrenceStatus`, `MealSlot`, `WeekdayIndex`, `TodayHabitEntry`,
`PeriodSummary`, `MonthlyGoal`, `MonthlyResults`) live in
`src/types/habit.ts`. UI must not duplicate these.

Assumed API endpoints (full backend spec out of scope):

```ts
// GET /api/habits/today                              → { entries: TodayHabitEntry[] }
// GET /api/habits/weekly?week=YYYY-MM-DD             → weekly state shape
// GET /api/habits/monthly?month=YYYY-MM              → monthly state shape
// GET /api/habits/monthly-summary?month=YYYY-MM      → { goals, results }
// POST /api/habits/occurrences/:id/toggle           → { occurrence: HabitOccurrence }
//   Body: { status: "done" | "skipped" | "pending" }
//   409 if a server-side lock contends; UI reverts.
```

When the backend spec lands, add `OCCURRENCE_NOT_FOUND` and
`OCCURRENCE_LOCKED` to `src/types/error.ts#ApiErrorCode`.

---

## Styling Notes

Reuse common.css design tokens; cluster-specific notes follow.

- **Tracker section title** (`tracker-section-title`):
  `font-size:72px; font-weight:700; color:var(--panel-blue-deep);`
  shared by s013/s014/s015. Keep verbatim.
- **Tab pills** (`.tracker-tab`): selected = `#6a24f2 #fff`; unselected
  = `rgba(89,214,220,0.35) var(--ink)`. Wrap in `<PeriodTabs>`.
- **Habit entry left-accent (s012)**: 12 px border-left coloured per
  category. Map: `medicine→#9b5de5`, `nutrition→#f4a261`, `body→#2a9d8f`,
  `mood→#e76f51`. The `mood` accent is inferred from `entry-mood`; when
  the API exposes physical sub-categories, reuse this mapping.
- **Check toggle** (`.habit-check`): `border:4px solid #59d6dc; bg:#fff`;
  done = `bg:#08c65a`. DS-2 spinner rendered inline.
- **Weekly / monthly dots** share the modifier vocabulary
  (`done`/`skip`/`today`). Encode the colours as constants, NOT inline
  styles, in the React port:
  ```ts
  export const DOT_COLORS = {
      pending: { bg: "#fff", border: "#59d6dc" },
      done:    { bg: "#08c65a", border: "#08c65a" },
      skipped: { bg: "#f4a261", border: "#f4a261" },
      today:   { borderOverride: "#6a24f2", widthOverride: 3 },
  } as const;
  ```
- **Goal-progress ring (s015)**: SVG `circle r=25 stroke-width=8
  stroke-dasharray=157`. The 3 hard-coded percent variants in CSS
  (`p90/p70/p50`) become a single `strokeDashoffset = 157 * (1 -
  pct/100)` expression in React.
- **Highlight stat (s015)**: `bg:#6a24f2; color:#fff;` with a 1.4 rem
  white progress bar inside.
- **Active rail accent**: `#6a24f2` purple — read from
  `RAIL_ITEMS[2].activeAccent`.

**Responsive note:** s006/s012 keep the book-shell layout. s013/s014
and s015 collapse from `1fr 1fr` columns to single-column on `< 900 px`
with the grid taking 100 % width and the summary column stacking below.
The 31-day grid on s014 must scroll horizontally on narrow viewports —
do NOT shrink the cells below 24 px.

---

## Accessibility Notes

- `<html lang="th">`.
- s012 today rows: each row is a `<button>` (or `<Link>` when navigable
  to a check-in surface) with `aria-label="เปิดเช็กอิน{type}"` mirroring
  the wireframe. Nested `<CheckToggle>` is its own `<button>` —
  `event.stopPropagation()` so tapping the check does NOT trigger the
  row navigation.
- Empty state copy (DS-1) lives in a `role="status"` region so AT
  announces it on first paint.
- `<CheckToggle>` exposes `aria-pressed={done}` and `aria-label="ทำเสร็จ
  แล้ว"` / `"ยังไม่ทำ"` based on status.
- Period tabs: `aria-current="page"` on the active tab; tab list is a
  plain row of `<a>` (matches wireframe — no `role="tablist"` because
  each tab is a real route).
- Weekly/monthly grids: each row is `role="row"`; cells are
  `role="cell"` with an `aria-label="{day} — {status text}"` so a screen
  reader can read e.g. "Mon — ทำเสร็จ".
- Goal-progress ring: ring SVG carries `aria-label="{percent}%"`;
  internal `<text>` already shows the same value visually.

---

## Edge Cases

1. **No activities yet** → DS-1 on /today, DS-3 on /weekly+/monthly,
   `/summary` shows zeroed stats.
2. **Toggle while offline** → optimistic flip succeeds, request queues
   & retries until next online tick. After 30 s of failures, revert and
   show toast "บันทึกไม่สำเร็จ".
3. **Server `409 OCCURRENCE_LOCKED`** (concurrent edit from another
   tab) → revert and refetch `today`.
4. **User crosses midnight while on /today** → no auto-refresh; v1
   accepts stale list. (Future: dispatch `fetchToday` on visibility
   change at local midnight boundary.)
5. **Daylight-saving transition** affects 7-cell weekly row → keep the
   grid 7-wide; the API decides which date each cell represents.
6. **Activity with frequency = "todo"** → appears in /today only on the
   day the user created it, plus until done. /weekly + /monthly grids
   show its dot for the day it was completed.
7. **Activity archived mid-month** → still visible in /weekly + /monthly
   grids for the historical part of the period; greyed-out on /today.
   (v1 simplification: just exclude from /today.)
8. **>5 entries on /today** → list scrolls (`overflow-y:auto` on
   `.habit-entries`).
9. **Goals/results when no goal exists yet** → render an empty state
   in `<GoalsList>` mirroring DS-1.
10. **Rendering `today` outline on s013** — derive from
    `new Date().getDay()` mapped to `WeekdayIndex`. Do NOT trust server
    time for the highlight; trust the user's local clock to match the
    "today" UX.

---

## Implementation Plan

1. Land `src/types/habit.ts` (already in this commit) and refresh
   `src/types/navigation.ts`.
2. `habitsSlice` skeleton + `fetchToday` thunk.
3. `<CheckToggle>` + DS-2 optimistic logic against fixture data.
4. `/habit/today` (s012) including DS-1.
5. `/habit` hub (s006) with the 3 preview tiles.
6. `<PeriodTabs>` + `<PeriodTrackerLayout>` shared shell.
7. `<WeeklyGrid>` + `/habit/weekly` (s013) with DS-3 + DS-4.
8. `<MonthlyGrid>` + `/habit/monthly` (s014). Render exactly 31 cells
   from data; do NOT port the wireframe DOM-padding script.
9. `<GoalsList>` + `<ResultsGrid>` + `/habit/summary` (s015).
10. Hook the s006 monthly tile to also link to `/habit/summary`
    (DS-5 entry point).

Dependencies: 1 unblocks 2; 3 must precede 4; 6 must precede 7+8.

---

## Acceptance Criteria

1. `/habit` renders the s006 hub with daily preview, weekly and monthly
   tiles. Rail `habit` is active and accented `#6a24f2`.
2. Tapping the weekly tile navigates to `/habit/weekly`; tapping the
   monthly tile navigates to `/habit/monthly`. Each shows the 3-tab row
   with the matching tab active.
3. Tapping the daily preview (or the rail item with no other deep
   route) navigates to `/habit/today`.
4. On `/habit/today`, tapping a `<CheckToggle>` flips it to done
   immediately, persists via `toggleOccurrence`, and reverts on failure
   with an inline error.
5. Tapping the medicine row on `/habit/today` navigates to
   `/habit/checkin/medicine`; tapping the nutrition row navigates to
   `/habit/checkin/nutrition`. Tapping the row's check (only) does
   NOT navigate.
6. Tapping the `+` button on `/habit/today` navigates to `/habit/add`.
7. With zero activities, `/habit/today` renders DS-1 (empty card with
   the `+` still functional). `/habit/weekly` and `/habit/monthly`
   render DS-3.
8. `/habit/weekly` shows 7 columns Mon–Sun with done/skipped/pending
   dots. The column matching local "today" carries the DS-4 outline.
9. `/habit/monthly` shows 31 columns with the same dot vocabulary plus
   the `today` outline marker.
10. `/habit/summary` renders 3 goal cards (rings) and 5 result-stat
    cards exactly as in s015.
11. All Thai copy is preserved verbatim.
12. The icon rail accent is `#6a24f2` across s006/s012/s013/s014/s015.

---

## Shared Type Files

| File                          | Exports                                                                                                                                                                                                                                            | Notes                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/types/habit.ts`          | `HabitCategory`, `PhysicalCategory`, `HabitFrequency`, `HabitImportance`, `HabitOccurrenceStatus`, `WeekdayIndex`, `MealSlot`, `MealRelation`, `HabitSchedule`, `HabitActivity`, `HabitOccurrence`, `TodayHabitEntry`, `PeriodSummary`, `MonthlyGoal`, `MonthlyResults` | New file — created in this commit. Also re-used by the authoring spec. |
| `src/types/navigation.ts`     | `ScreenId`, `AppRoute` (`/habit/...`), `SCREEN_TO_RAIL`, `RAIL_ITEMS`                                                                                                                                                                              | Extended in this commit.                           |
| `src/types/error.ts`          | (future) `OCCURRENCE_NOT_FOUND`, `OCCURRENCE_LOCKED`                                                                                                                                                                                                 | Add when backend spec lands.                       |
