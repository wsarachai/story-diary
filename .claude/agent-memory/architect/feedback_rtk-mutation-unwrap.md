---
name: feedback_rtk-mutation-unwrap
description: RTK Query mutation triggers must use .unwrap() when the caller needs to wait for the HTTP response before acting (e.g. router.push after a write)
metadata:
  type: feedback
---

Always call `.unwrap()` on RTK Query mutation trigger results when the caller needs to sequence work after the HTTP response arrives. Without `.unwrap()`, `await mutationTrigger({…})` resolves after the Redux dispatch (synchronous), not after the network round-trip.

**Why:** Diagnosed in the nutrition_5_groups third-tap bug (2026-06-24). `handleNutritionMeal` called `await saveNutrition({…})` without `.unwrap()`, then immediately called `router.push`. The `invalidatesTags` refetch raced the POST write; when the refetch won, stale data (2/3 slots) replaced the optimistic patch, reverting the UI and silently suppressing the navigation.

**How to apply:** Any handler pattern of the form "await mutation → then navigate or act on the result" must use `.unwrap()` and wrap in try/catch so network failures surface cleanly and do not leave the UI in an inconsistent state. This applies to `handleMedicineDose` too, which has the same pattern.
