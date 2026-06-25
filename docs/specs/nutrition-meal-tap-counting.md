# Spec: Nutrition Per-Meal Tap Counter

Mirrors the medicine dose-tracking flow for all nutrition habits.
All 4 nutrition presets get a per-meal tap counter on the checklist
(hardcoded slots: breakfast → lunch → dinner).

## Decisions

| # | Decision |
|---|----------|
| 1 | All 4 nutrition presets get the per-meal tap counter |
| 2 | Hardcoded slots: `["breakfast", "lunch", "dinner"]` (total = 3) |
| 3 | `nutrition_5_groups`: last tap → navigate to `/habit/checkin/nutrition` form; already-done tap → reopen form |
| 4 | Other 3 presets: last tap → complete silently; already-done tap → toggle back to `"pending"` |
| 5 | `doseProgress` field is shared between medicine and nutrition (not medicine-only) |
| 6 | `saveNutritionCheckin` gains `mealSlots: MealSlot[]`; status derives from slot count |
| 7 | Undo: call `saveNutritionCheckin` with `mealSlots: []` only when `doseProgress.taken > 0`; else use `toggle` |
| 8 | Background fill tints: `#cdebd6` (taken) / `#eef9f1` (remaining) |

---

## 1. `frontend/types/habit.ts`

### 1a. `HabitOccurrence.doseProgress`

Remove the "Medicine-only" qualifier from the JSDoc comment. Both medicine
and nutrition populate this field.

```ts
/**
 * Per-meal dose progress for medicine and nutrition activities. Drives the
 * X/Y tap counter and background fill on the checklist. Absent for
 * activities with no meal-slot tracking.
 */
doseProgress?: { taken: number; total: number };
```

### 1b. `NutritionCheckin` — add `mealSlots`

```ts
export interface NutritionCheckin {
    occurrenceId: string;
    activityName: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    mealSlots: MealSlot[];   // ← new; [] when no meals yet tapped
}
```

---

## 2. `frontend/lib/db.ts`

### `NutritionCheckinDoc` — add `meal_slots_json`

```ts
export interface NutritionCheckinDoc {
  id: string;
  occurrence_id: string;
  activity_name: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  meal_slots_json: string;  // ← new; JSON-serialised MealSlot[]
  created_at: string;
}
```

No changes to `replaceNutritionCheckin` — it does a full document replace,
so passing the updated `NutritionCheckinDoc` shape is sufficient.

---

## 3. `frontend/lib/schemas.ts`

### `NutritionCheckinSchema` — add `mealSlots`

`MealSlotEnum` is already defined in this file (`z.enum(["breakfast","lunch","dinner","before-bed"])`).

```ts
export const NutritionCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  activityName: z.string().min(1),
  breakfast: z.string().default(""),
  lunch: z.string().default(""),
  dinner: z.string().default(""),
  mealSlots: z.array(MealSlotEnum).default([]),  // ← new
});
```

The `default([])` keeps the schema backwards-compatible with legacy
clients that don't send the field.

---

## 4. `frontend/store/habitsApi.ts`

### 4a. Replace `nutritionStatus()` helper

Status now derives from slot count, not text-field content.

```ts
// Remove the old nutritionStatus() function.
// Add this instead:
function nutritionMealStatus(mealSlots: MealSlot[]): HabitOccurrenceStatus {
  return mealSlots.length === 3 ? "done" : mealSlots.length > 0 ? "partial" : "pending";
}
```

### 4b. `saveNutritionCheckin` — optimistic update

Update both `status` and `doseProgress` on the patched occurrence:

```ts
async onQueryStarted({ date, activityId, ...checkin }, { dispatch, queryFulfilled }) {
  const todayPatch = dispatch(
    habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
      const occ = draft.todayByActivity[activityId];
      if (occ) {
        occ.status = nutritionMealStatus(checkin.mealSlots);
        occ.doseProgress = { taken: checkin.mealSlots.length, total: 3 };
      }
    })
  );
  const detailPatch = dispatch(
    habitsApi.util.updateQueryData("getNutritionCheckin", checkin.occurrenceId, () => checkin)
  );
  try {
    await queryFulfilled;
  } catch {
    todayPatch.undo();
    detailPatch.undo();
  }
},
```

---

## 5. `frontend/app/(authed)/habit/checklist/page.tsx`

### 5a. New imports

Add `useSaveNutritionCheckinMutation` to the habitsApi import.

### 5b. New constants

```ts
const NUTRITION_MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];
const NUTRITION_FILL = "#cdebd6";
const NUTRITION_BASE = "#eef9f1";
```

### 5c. `hasDetailedCheckin` — remove nutrition

Nutrition is no longer card-tappable (the check-circle handles it):

```ts
function hasDetailedCheckin(activity: HabitActivity): boolean {
  return (
    activity.physicalCategory === "symptoms" ||
    usesExploreEmotionCheckin(activity)
  );
}
```

### 5d. `handleEntryTap` — remove nutrition branch

```ts
function handleEntryTap(activity: HabitActivity, occurrenceId: string) {
  const base = `/habit/checkin`;
  const qs = `occ=${occurrenceId}&actId=${activity.id}`;
  if (activity.physicalCategory === "symptoms") {
    router.push(`${base}/physical/symptoms?${qs}`);
  } else if (usesExploreEmotionCheckin(activity)) {
    router.push(`${base}/physical/emotion/explore?${qs}`);
  }
}
```

### 5e. New `handleNutritionMeal` function

```ts
async function handleNutritionMeal(
  activity: HabitActivity,
  occurrence: HabitOccurrence,
) {
  const total = 3;
  const taken =
    occurrence.doseProgress?.taken ??
    (occurrence.status === "done" ? total : 0);

  if (taken >= total) {
    if (activity.nutritionPreset === "nutrition_5_groups") {
      router.push(
        `/habit/checkin/nutrition?occ=${occurrence.id}&actId=${activity.id}`
      );
    } else {
      await toggle({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        status: "pending",
        date: todayStr,
      });
    }
    return;
  }

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
}
```

### 5f. `handleUndoToday` — add nutrition branch

Add after the medicine block and before the generic toggle:

```ts
if (activity.category === "nutrition" && (occurrence.doseProgress?.taken ?? 0) > 0) {
  await saveNutrition({
    occurrenceId: occurrence.id,
    activityId: activity.id,
    activityName: activity.name,
    breakfast: "",
    lunch: "",
    dinner: "",
    mealSlots: [],
    date: todayStr,
  });
  return;
}
```

### 5g. Card render — nutrition mirrors medicine

In the card render loop, alongside the existing `isMedicine` logic, add `isNutrition`:

```ts
const isMedicine = activity.category === "medicine";
const isNutrition = activity.category === "nutrition";
const cardTappable = hasDetailedCheckin(activity) && !isMedicine && !isNutrition;
const doseTotal = occurrence.doseProgress?.total ?? 0;
const doseTaken =
  occurrence.doseProgress?.taken ??
  ((isMedicine || isNutrition) && occurrence.status === "done" ? doseTotal : 0);
const showDoseFill = (isMedicine || isNutrition) && doseTotal > 0;
const fillColor   = isNutrition ? NUTRITION_FILL : DOSE_FILL;
const baseColor   = isNutrition ? NUTRITION_BASE : DOSE_BASE;
const fillPct = showDoseFill ? Math.round((doseTaken / doseTotal) * 100) : 0;
```

Background style:
```ts
style={
  showDoseFill
    ? { background: `linear-gradient(90deg, ${fillColor} 0 ${fillPct}%, ${baseColor} ${fillPct}% 100%)` }
    : undefined
}
```

Check-circle button — add a nutrition branch alongside the medicine branch:

```tsx
{(isMedicine || isNutrition) ? (
  <button
    className={`${styles.habitCheck}${
      occurrence.status === "done"
        ? ` ${styles.done}`
        : occurrence.status === "skipped"
          ? ` ${styles.skip}`
          : ""
    }`}
    aria-label={
      occurrence.status === "done"
        ? isMedicine ? "กินยาครบแล้ว – แตะเพื่อล้าง" : "บันทึกครบแล้ว – แตะเพื่อล้าง"
        : occurrence.status === "skipped"
          ? "ข้ามไปแล้ว"
          : doseTotal > 0
            ? `บันทึกแล้ว ${doseTaken} จาก ${doseTotal} มื้อ – แตะเพื่อบันทึกมื้อถัดไป`
            : isMedicine ? "แตะเพื่อบันทึกการกินยา" : "แตะเพื่อบันทึก"
    }
    onClick={(e) => {
      e.stopPropagation();
      if (isMedicine) handleMedicineDose(activity, occurrence);
      else handleNutritionMeal(activity, occurrence);
    }}
  >
    {occurrence.status === "done" ? (
      <Check color="#fff" strokeWidth={3} />
    ) : occurrence.status === "skipped" ? (
      <Minus color="#fff" strokeWidth={3} />
    ) : doseTotal > 0 ? (
      <span className={styles.habitCheckCount}>
        {doseTaken}/{doseTotal}
      </span>
    ) : null}
  </button>
) : (
  // existing non-medicine check button unchanged
  ...
)}
```

Also remove the `ChevronRight` arrow render for nutrition (it was previously shown
because `cardTappable` was true for nutrition — now it won't be).

---

## 6. `frontend/app/(authed)/habit/checkin/nutrition/page.tsx`

### `handleSave` — always pass `mealSlots: ["breakfast","lunch","dinner"]`

The form is only opened after the last tap, so all 3 slots are always done:

```ts
await saveNutrition({
  occurrenceId: occId,
  activityId,
  activityName: activity?.name ?? "โภชนาการ",
  breakfast: state.breakfast,
  lunch: state.lunch,
  dinner: state.dinner,
  mealSlots: ["breakfast", "lunch", "dinner"],
  date: today,
}).unwrap();
```

No UI changes needed.

---

## 7. `frontend/app/api/habits/checkin/nutrition/route.ts`

**No changes needed.** The route already does:

```ts
const data = validate(NutritionCheckinSchema, body);
await saveNutritionCheckin(userId, data);
```

Adding `mealSlots` to `NutritionCheckinSchema` (section 3) is sufficient —
`data` will now include `mealSlots` automatically.

---

## 8. `frontend/lib/services/habitService.ts`

### 8a. `saveNutritionCheckin` — slot-based status + persist `meal_slots_json`

```ts
export async function saveNutritionCheckin(userId: string, data: NutritionCheckin): Promise<void> {
  await getOwnedOccurrenceDoc(userId, data.occurrenceId);
  const now = new Date().toISOString();

  await replaceNutritionCheckin({
    id: uuidv4(),
    occurrence_id: data.occurrenceId,
    activity_name: data.activityName,
    breakfast: data.breakfast,
    lunch: data.lunch,
    dinner: data.dinner,
    meal_slots_json: JSON.stringify(data.mealSlots),  // ← new
    created_at: now,
  });

  // Status derives from slot count (not text-field content).
  const status: HabitOccurrenceStatus =
    data.mealSlots.length === 3 ? "done" : data.mealSlots.length > 0 ? "partial" : "pending";
  await updateOccurrence(data.occurrenceId, {
    status,
    completed_at: status === "done" ? now : null,
  });
}
```

### 8b. `getTodayEntries` — add nutrition `doseProgress`

After the existing medicine block, add:

```ts
if (activity.category === "nutrition") {
  const checkin = await findNutritionCheckinByOccurrence(occurrence.id);
  const slots: MealSlot[] = checkin?.meal_slots_json
    ? JSON.parse(checkin.meal_slots_json)
    : [];
  occurrence.doseProgress = { taken: slots.length, total: 3 };
}
```

### 8c. `getNutritionCheckin` — include `mealSlots` in return

```ts
return {
  occurrenceId: doc.occurrence_id,
  activityName: doc.activity_name,
  breakfast: doc.breakfast,
  lunch: doc.lunch,
  dinner: doc.dinner,
  mealSlots: doc.meal_slots_json ? JSON.parse(doc.meal_slots_json) : [],  // ← new
};
```

---

## 9. Files touched (summary)

| File | Change |
|------|--------|
| `frontend/types/habit.ts` | `doseProgress` comment; `NutritionCheckin.mealSlots` |
| `frontend/lib/db.ts` | `NutritionCheckinDoc.meal_slots_json` |
| `frontend/lib/schemas.ts` | `NutritionCheckinSchema.mealSlots` |
| `frontend/store/habitsApi.ts` | `nutritionMealStatus()`; optimistic `doseProgress` patch |
| `frontend/app/(authed)/habit/checklist/page.tsx` | `handleNutritionMeal`, undo, card render |
| `frontend/app/(authed)/habit/checkin/nutrition/page.tsx` | Pass `mealSlots` on save |
| `frontend/lib/services/habitService.ts` | `saveNutritionCheckin`, `getTodayEntries`, `getNutritionCheckin` |

---

## 10. Test scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | First tap on any nutrition card | `mealSlots: ["breakfast"]`, `doseProgress: {taken:1,total:3}`, status `partial` |
| 2 | Second tap | `mealSlots: ["breakfast","lunch"]`, `doseProgress: {taken:2,total:3}`, status `partial` |
| 3 | Third tap on `nutrition_5_groups` | `mealSlots: ["breakfast","lunch","dinner"]`, status `done`, navigates to `/habit/checkin/nutrition` |
| 4 | Third tap on non-5-groups preset | Status `done`, no navigation |
| 5 | Tap on already-done `nutrition_5_groups` | Navigates to `/habit/checkin/nutrition` form (edit) |
| 6 | Tap on already-done non-5-groups | Toggles status back to `"pending"` |
| 7 | `nutrition_5_groups` form save | Saves `mealSlots: ["breakfast","lunch","dinner"]` + text fields; status `done` |
| 8 | Undo with meal progress | Calls `saveNutritionCheckin` with `mealSlots: []`; status `pending`, `doseProgress: {taken:0,total:3}` |
| 9 | Undo with no meal progress (status pending) | Calls `toggle` to `pending` (saveNutrition NOT called) |
| 10 | Page reload after partial (2 taps) | `doseProgress.taken = 2` restored from `meal_slots_json` on server |
| 11 | Background fill at 1/3 | ~33% green fill visible on checklist card |
| 12 | `NutritionCheckinSchema` with no `mealSlots` sent | Defaults to `[]`; status `pending` |
