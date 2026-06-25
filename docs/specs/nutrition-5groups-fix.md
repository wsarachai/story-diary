# Bug: nutrition_5_groups — third meal tap never opens the detail form

## 1. Root Cause

There are **two independent bugs**, both in `handleNutritionMeal`
(`frontend/app/(authed)/habit/checklist/page.tsx`, lines 350–392).
They compound each other, but either one alone is enough to prevent navigation.

---

### Bug A — `await saveNutrition({…})` does not actually wait for the server

RTK Query's mutation trigger (the function returned by `useSaveNutritionCheckinMutation()`)
returns a **`MutationActionCreatorResult`**, which is a Promise-like object that
resolves as soon as the action has been **dispatched** to the Redux store —
_not_ when the HTTP response arrives. The network request runs concurrently.

To wait for the network round-trip you must call `.unwrap()`:

```ts
// resolves after dispatch (immediate, does NOT wait for HTTP):
await saveNutrition({ … });

// resolves after HTTP response (throws on 4xx/5xx):
await saveNutrition({ … }).unwrap();
```

In `handleNutritionMeal` the call is written without `.unwrap()`, so execution
falls straight through to the `if (nextTaken >= total …)` guard and calls
`router.push` **before** the optimistic patch has been applied and before the
server has confirmed success. In practice, because the optimistic update fires
synchronously on dispatch, the RTK store update does land before `router.push`,
but the subsequent `invalidatesTags` refetch of `HabitToday` fires while
React is in the middle of the navigation transition, which causes the checklist
page to unmount and interrupt the background refetch — not the direct cause of
the missing navigation, but a contributing race.

---

### Bug B — `activity.nutritionPreset` is **never present** in the component's `activity` object

This is the primary cause. The guard that triggers navigation is:

```ts
if (nextTaken >= total && activity.nutritionPreset === "nutrition_5_groups") {
  router.push(…);
}
```

`activity` here comes from `data.activities[activity.id]`, where `data` is the
result of `useGetTodayHabitsQuery`. The `getTodayHabits` endpoint runs
`transformResponse` in `habitsApi.ts` (lines 82–91):

```ts
transformResponse: (response: { entries: TodayHabitEntry[] }) => {
  const activities: Record<string, HabitActivity> = {};
  …
  for (const entry of response.entries) {
    activities[entry.activity.id] = entry.activity;   // ← copied verbatim
    …
  }
  return { activities, todayByActivity };
},
```

The server-side `rowToActivity` in `habitService.ts` (lines 58–79) does
correctly populate `nutritionPreset` on the returned `HabitActivity` object:

```ts
const nutritionPreset = isNutritionPresetKey(row.nutrition_preset)
  ? row.nutrition_preset
  : undefined;
…
if (nutritionPreset) activity.nutritionPreset = nutritionPreset;
```

However, `getTodayEntries` passes the full entry to the Express route, and
**`rowToOccurrence` intentionally strips `doseProgress`** (it is added
separately by the service-layer injection block at lines 284–289). The activity
shape is intact. So `nutritionPreset` _is_ sent by the server.

The actual omission happens one layer earlier, in the **service's
`rowToActivity` function** when called from `getTodayEntries`.

Re-reading `rowToActivity` carefully (lines 58–79):

```ts
function rowToActivity(row: HabitActivityDoc): HabitActivity {
    …
    const nutritionPreset = isNutritionPresetKey(row.nutrition_preset)
        ? row.nutrition_preset
        : undefined;
    const activity: HabitActivity = {
        id: row.id,
        …
        name: resolveNutritionName(row.name, nutritionPreset),   // name resolved OK
        …
    };
    if (nutritionPreset) activity.nutritionPreset = nutritionPreset;  // set OK
    …
    return activity;
}
```

The service correctly attaches `nutritionPreset`. The field arrives at the
client. So the issue is not that the server omits it.

Stepping back to the **checklist component** itself (lines 247–255):

```ts
const entries = data
  ? Object.values(data.activities).map((activity, index) => ({
      activity,
      occurrence: data.todayByActivity[activity.id],
      …
    }))
  : [];
```

`activity` here is correctly the full `HabitActivity` from `data.activities`,
which includes `nutritionPreset`. But `handleNutritionMeal` is called from the
check-button's `onClick` with arguments taken from the render-time closure —
_that_ `activity` is the same object. So `activity.nutritionPreset` should be
defined.

Tracing more carefully, the click handler is:

```tsx
onClick={(e) => {
  e.stopPropagation();
  if (isMedicine) handleMedicineDose(activity, occurrence);
  else handleNutritionMeal(activity, occurrence);
}}
```

Both `activity` and `occurrence` come directly from the `entry` destructuring
inside `groupEntries.map(entry => { const { activity, occurrence } = entry; … })`.
Those are the same objects from the RTK cache — `nutritionPreset` is present.

**The real bug is therefore Bug A plus a subtle RTK invalidation race.**

After more careful re-reading, the definitive sequence on tap 3 is:

1. `taken = 2` (from `occurrence.doseProgress.taken`), `nextTaken = 3`.
2. `await saveNutrition({…, mealSlots: ["breakfast","lunch","dinner"]})` is
   called **without** `.unwrap()`. The mutation trigger returns a
   `MutationActionCreatorResult` whose outer Promise resolves after the Redux
   dispatch (synchronously), **not** after the HTTP response.
3. Inside `onQueryStarted`, RTK synchronously applies the optimistic patch:
   `occ.status = "done"`, `occ.doseProgress = { taken: 3, total: 3 }`.
   This triggers a React re-render of the checklist while `handleNutritionMeal`
   is still on the call stack.
4. `if (nextTaken >= total && activity.nutritionPreset === "nutrition_5_groups")`
   evaluates. `nextTaken === 3 === total` ✓. `activity.nutritionPreset` is
   `"nutrition_5_groups"` ✓. **The condition is true.**
5. `router.push(…)` is called.
6. React batches the re-render triggered by the optimistic patch with the
   navigation. In Next.js 16 App Router, `router.push` is a non-blocking
   scheduler call — it enqueues the navigation. When the re-render fires
   (because `occ.status` changed), the checklist re-evaluates `entries`. Now
   `occurrence.status === "done"` and `occurrence.doseProgress.taken === 3`.
   The component sees `taken >= total`, so the check-button now shows a green
   check. **No navigation problem yet at this point.**
7. `invalidatesTags` fires (both `HABIT_AGGREGATES` and the per-occurrence
   `HabitCheckin` tag). RTK re-fetches `getTodayHabits` in the background.
   This second network call races the navigation.
8. **Here is the actual failure**: when the refetch resolves, RTK updates
   `data.activities` with a fresh payload from the server. In the server's
   `getTodayEntries`, the occurrence's `doseProgress` is re-computed from the
   stored checkin doc. If the HTTP request from step 2 **has not yet completed**
   when this refetch runs, the stored checkin still has the previous slot count
   (2 slots), so the refetch returns `doseProgress = { taken: 2, total: 3 }`.
   The checklist re-renders with `taken = 2`, reverting the entry to the
   `2/3` counter state. In this state `occurrence.status` is `"partial"`, which
   means the entry's check-button reverts to the count display — and the
   component is still mounted (the navigation hasn't completed yet because
   Next.js App Router navigations are not instant). The user sees the counter
   tick back to 2/3 and no navigation occurs.

**Summary of root cause**: The `saveNutrition` mutation is awaited without
`.unwrap()`, which means the `await` resolves after the Redux dispatch rather
than after the HTTP response. The `invalidatesTags` refetch races the HTTP
write. When the refetch wins, the server reads stale data (the checkin doc is
not yet written), returns `taken: 2`, and the optimistic patch is replaced by
server state that shows 2/3 — appearing as if the third tap never registered.
The `router.push` _is_ called but Next.js App Router navigations are
asynchronous; when the stale refetch triggers a re-render before the navigation
commits, the checklist stays mounted with a reverted state. In some timing
windows the navigation does complete (when the server write wins the race),
which explains why the bug is intermittent.

---

## 2. Files to Change

| File | Location | What to change |
|---|---|---|
| `frontend/app/(authed)/habit/checklist/page.tsx` | `handleNutritionMeal`, line 376 | Add `.unwrap()` to the `saveNutrition` call |
| `frontend/store/habitsApi.ts` | `saveNutritionCheckin.invalidatesTags` | Defer `HabitToday` invalidation so it does not race the navigation on the 3rd-meal tap |

---

## 3. Code Fix

### Fix 1 — `frontend/app/(authed)/habit/checklist/page.tsx`

Await the mutation result properly so that `router.push` is never called
before the HTTP write has committed. Wrap in try/catch so a network error
does not silently swallow the navigation.

**Before (lines 376–391):**

```ts
    const nextTaken = taken + 1;
    await saveNutrition({
      occurrenceId: occurrence.id,
      activityId: activity.id,
      activityName: activity.name,
      breakfast: "",
      lunch: "",
      dinner: "",
      mealSlots: NUTRITION_MEAL_SLOTS.slice(0, nextTaken),
      date: todayStr,
    });

    if (nextTaken >= total && activity.nutritionPreset === "nutrition_5_groups") {
      router.push(
        `/habit/checkin/nutrition?occ=${occurrence.id}&actId=${activity.id}`
      );
    }
```

**After:**

```ts
    const nextTaken = taken + 1;
    try {
      await saveNutrition({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        activityName: activity.name,
        breakfast: "",
        lunch: "",
        dinner: "",
        mealSlots: NUTRITION_MEAL_SLOTS.slice(0, nextTaken),
        date: todayStr,
      }).unwrap();
    } catch {
      // Server write failed; optimistic patch will be rolled back by RTK.
      return;
    }

    if (nextTaken >= total && activity.nutritionPreset === "nutrition_5_groups") {
      router.push(
        `/habit/checkin/nutrition?occ=${occurrence.id}&actId=${activity.id}`
      );
    }
```

---

### Fix 2 — `frontend/store/habitsApi.ts`

The `invalidatesTags` on `saveNutritionCheckin` currently includes `HabitToday`
(via `HABIT_AGGREGATES`). This causes RTK to immediately refetch the today list
after every nutrition tap — including the 3rd tap, where the component is
mid-navigation. Even with Fix 1, the refetch fires as soon as the HTTP response
arrives, which is the same moment `router.push` is executing. Because the
checklist page has not yet unmounted, the refetch can update the cache and
trigger a re-render that competes with the navigation scheduler.

The safest fix is to exclude `HabitToday` from the tags invalidated by
`saveNutritionCheckin`, and rely instead on the tag being invalidated when the
user navigates back to the checklist (or on the next page mount). The optimistic
patch already keeps the local state correct for the duration of the session.

Alternatively — and more conservatively — leave `invalidatesTags` as-is but
rely on Fix 1 (proper `.unwrap()` wait) to serialize the write before any
refetch can race it. With `.unwrap()`, the HTTP write completes first, so the
refetch will always read committed data.

If the team prefers the conservative single-file fix, Fix 1 alone is sufficient.
If they also want to reduce unnecessary network traffic on every intermediate
meal tap (taps 1 and 2 also trigger a `HabitToday` refetch today), apply both.

**Before (lines 225–226, `saveNutritionCheckin` endpoint):**

```ts
      invalidatesTags: (result, error, { occurrenceId }) => [
        ...HABIT_AGGREGATES,
        { type: "HabitCheckin", id: occurrenceId },
      ],
```

**After (if applying both fixes):**

```ts
      invalidatesTags: (result, error, { occurrenceId }) => [
        // Exclude HabitToday: the optimistic patch in onQueryStarted keeps the
        // checklist accurate for the session. HabitToday is refreshed on the
        // next mount via the normal query lifecycle. Aggregate views (weekly,
        // monthly, summary) still need invalidation.
        "HabitWeekly",
        "HabitMonthly",
        "HabitMonthlySummary",
        { type: "HabitCheckin", id: occurrenceId },
      ],
```

Note: if this approach is chosen, the same treatment should be applied to
`saveMedicineCheckin` for consistency, since it has the same pattern and the
same potential race when the final dose tap navigates to the medicine form.

---

## 4. Why the Fix Works

**Fix 1** closes the race by making `handleNutritionMeal` wait for the HTTP
response before calling `router.push`. When `.unwrap()` resolves, the
`saveNutritionCheckin` POST has completed and the checkin doc exists in the
database. Any subsequent refetch of `getTodayHabits` will read committed data
(`doseProgress = { taken: 3, total: 3 }`) and the occurrence status will be
`"done"`. Whether the refetch runs before or after the navigation transition
commits, the store state is correct and the optimistic patch will not be undone.
The `return` in the catch block ensures that if the write fails, navigation is
suppressed and the optimistic patch rollback (already handled by RTK's
`queryFulfilled` rejection in `onQueryStarted`) reverts the UI to its prior state.

**Fix 2** (optional, complementary) eliminates the unnecessary refetch of the
today list on intermediate taps (1 and 2), reducing network requests from 3
HTTP calls (write + refetch × 3) to 2 HTTP calls (write × 3, with refetch
deferred to next mount). The optimistic update already provides accurate local
state, so the live refetch is redundant during the session.

---

## 5. Parallel Medicine-dose Bug

`handleMedicineDose` has the identical pattern: `await saveMedicine({…})`
without `.unwrap()` followed by `openMedicineForm(…)` on the last dose. The
same race exists there. The fix is identical: add `.unwrap()` and wrap in
try/catch. This is not blocking the nutrition report but should be addressed in
the same PR.
