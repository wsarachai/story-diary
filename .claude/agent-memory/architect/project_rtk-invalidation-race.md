---
name: project_rtk-invalidation-race
description: invalidatesTags on habit check-in mutations triggers a HabitToday refetch that can race router.push navigations; fix is .unwrap() serialization
metadata:
  type: project
---

`saveNutritionCheckin` and `saveMedicineCheckin` both include `HabitToday` in their `invalidatesTags`. This fires a background refetch of the today list immediately after each tap. When the refetch completes before the HTTP write commits (possible if the write is not awaited with `.unwrap()`), stale server data overwrites the optimistic patch and can revert the checklist state mid-navigation.

**Why:** Discovered during the nutrition_5_groups third-meal-tap bug diagnosis (2026-06-24). The bug caused the detail form never to open for that preset because the stale refetch reverted `doseProgress.taken` from 3 back to 2, making the condition `nextTaken >= total` appear false from the user's perspective even though `router.push` was called.

**How to apply:** When reviewing any habit mutation handler that (a) awaits a mutation without `.unwrap()` and (b) immediately navigates, flag the pattern. The conservative fix is `.unwrap()` serialization. The aggressive fix is also removing `HabitToday` from `invalidatesTags` on intermediate writes (taps 1 and 2) and relying on the optimistic patch for the session, deferring reconciliation to next mount.
