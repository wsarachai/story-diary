/**
 * habitsSlice unit tests — Story Diary
 *
 * Tests cover the Redux state for habit-tracker read views (s006, s012–s015)
 * and authoring (s016, s020–s030), sourced from:
 *
 *   - docs/specs/s006-habit-tracker-views.md    (DS-1 empty state, DS-2 optimistic toggle)
 *   - docs/specs/s016-habit-activity-authoring.md (createActivity, DS-3 name conflict)
 *   - src/types/habit.ts                         (HabitActivity, HabitOccurrence, …)
 *
 * Key invariants:
 *   - toggleOccurrence.pending applies optimistic flip before server ack
 *   - toggleOccurrence.rejected reverts the flip
 *   - createActivity.fulfilled prepends to activities
 *   - selectTodayEntries returns [] when activities is empty (DS-1 gate)
 *   - TodayHabitEntry.accent must match spec colours per HabitCategory
 */

import reducer, {
  fetchToday,
  fetchWeekly,
  fetchMonthly,
  fetchMonthlySummary,
  toggleOccurrence,
  createActivity,
  clearSaveStatus,
  clearToggleError,
  selectTodayEntries,
  selectTodayHasEntries,
  selectWeeklyRows,
  selectMonthlyRows,
  selectMonthlyGoalsSummary,
  selectIsToggling,
  selectFetchStatus,
  selectActivitySaveStatus,
  selectActivityFieldError,
} from "@/store/habitsSlice";
import type {
  HabitActivity,
  HabitOccurrence,
  HabitOccurrenceStatus,
  PeriodSummary,
  MonthlyGoal,
  MonthlyResults,
} from "@/types/habit";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const TODAY = "2026-05-01";

const MED_ACTIVITY: HabitActivity = {
  id: "act-med",
  category: "medicine",
  name: "กินยา ABC",
  schedule: { frequency: "daily", weekdays: [1, 2, 3, 4, 5] },
  mealRelation: "after",
  mealSlots: ["breakfast", "dinner"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const FOOD_ACTIVITY: HabitActivity = {
  id: "act-food",
  category: "nutrition",
  name: "รับประทานอาหารครบ 5 หมู่",
  schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const BODY_ACTIVITY: HabitActivity = {
  id: "act-body",
  category: "physical",
  physicalCategory: "exercise",
  name: "ออกกำลังกาย",
  schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const PENDING_OCC: HabitOccurrence = {
  id: "occ-med",
  activityId: "act-med",
  date: TODAY,
  status: "pending",
};

const DONE_OCC: HabitOccurrence = {
  id: "occ-food",
  activityId: "act-food",
  date: TODAY,
  status: "done",
};

// Minimal weekly payload
const WEEKLY_PAYLOAD = {
  weekStartDate: "2026-04-28",
  rowsByActivity: {
    "act-med": ["done", "done", "pending", "pending", "pending", "pending", "pending"] as HabitOccurrenceStatus[],
    "act-food": ["done", "done", "done", "done", "pending", "pending", "pending"] as HabitOccurrenceStatus[],
  },
  summary: { done: 5, target: 14 } satisfies PeriodSummary,
};

// Minimal monthly payload (31 cells)
const MONTHLY_CELLS = Array.from<HabitOccurrenceStatus>({ length: 31 }, (_, i) =>
  i < 15 ? "done" : "pending"
);

const MONTHLY_PAYLOAD = {
  month: "2026-05",
  rowsByActivity: {
    "act-med": MONTHLY_CELLS,
    "act-food": MONTHLY_CELLS,
  },
  summary: { done: 30, target: 62 } satisfies PeriodSummary,
};

const GOALS: MonthlyGoal[] = [
  { activityId: "act-med", name: "กินยา ABC", subline: "กิจกรรม · ทุกวัน", progressPercent: 90 },
];

const RESULTS: MonthlyResults = {
  totalDone: 127,
  target: 155,
  skipped: 8,
  fullDays: 11,
  longestStreak: 9,
  completionPercent: 72,
};

type HabitsRoot = { habits: ReturnType<typeof reducer> };
function root(s: ReturnType<typeof reducer>): HabitsRoot {
  return { habits: s };
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — initial state", () => {
  it("starts with empty activities, no today data, no weekly/monthly", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.activities).toEqual({});
    expect(state.todayByActivity).toEqual({});
    expect(state.weekly).toBeNull();
    expect(state.monthly).toBeNull();
    expect(state.monthlySummary).toBeNull();
  });

  it("DS-1: selectTodayHasEntries is false on empty state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectTodayHasEntries(root(state))).toBe(false);
  });

  it("DS-1: selectTodayEntries returns [] on empty state", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectTodayEntries(root(state))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchToday
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — fetchToday", () => {
  it("pending → fetchStatus.today = 'loading'", () => {
    const state = reducer(undefined, fetchToday.pending("req", undefined));
    expect(state.fetchStatus.today).toBe("loading");
  });

  it("fulfilled → activities and todayByActivity populated", () => {
    const payload = {
      activities: { "act-med": MED_ACTIVITY, "act-food": FOOD_ACTIVITY },
      todayByActivity: { "act-med": PENDING_OCC, "act-food": DONE_OCC },
    };
    const state = reducer(
      undefined,
      fetchToday.fulfilled(payload, "req", undefined)
    );
    expect(state.fetchStatus.today).toBe("ready");
    expect(state.activities["act-med"]).toEqual(MED_ACTIVITY);
    expect(state.todayByActivity["act-med"]).toEqual(PENDING_OCC);
  });

  it("rejected → fetchStatus.today = 'error'", () => {
    const state = reducer(
      undefined,
      fetchToday.rejected(new Error("net"), "req", undefined)
    );
    expect(state.fetchStatus.today).toBe("error");
  });

  it("fulfilled populates selectors: selectTodayHasEntries becomes true", () => {
    const payload = {
      activities: { "act-med": MED_ACTIVITY },
      todayByActivity: { "act-med": PENDING_OCC },
    };
    const state = reducer(
      undefined,
      fetchToday.fulfilled(payload, "req", undefined)
    );
    expect(selectTodayHasEntries(root(state))).toBe(true);
  });

  it("selectTodayEntries returns TodayHabitEntry[] with correct shape", () => {
    const payload = {
      activities: { "act-med": MED_ACTIVITY, "act-food": FOOD_ACTIVITY },
      todayByActivity: { "act-med": PENDING_OCC, "act-food": DONE_OCC },
    };
    const state = reducer(
      undefined,
      fetchToday.fulfilled(payload, "req", undefined)
    );
    const entries = selectTodayEntries(root(state));
    expect(entries.length).toBe(2);
    entries.forEach((e) => {
      expect(e.activity).toBeDefined();
      expect(e.occurrence).toBeDefined();
      expect(typeof e.subline).toBe("string");
      expect(e.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchWeekly
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — fetchWeekly", () => {
  it("fulfilled → weekly populated, fetchStatus.weekly = 'ready'", () => {
    const state = reducer(
      undefined,
      fetchWeekly.fulfilled(WEEKLY_PAYLOAD, "req", undefined)
    );
    expect(state.fetchStatus.weekly).toBe("ready");
    expect(state.weekly).toEqual(WEEKLY_PAYLOAD);
  });

  it("selectWeeklyRows returns empty array when weekly is null", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectWeeklyRows(root(state))).toHaveLength(0);
  });

  it("selectWeeklyRows shape: each row has activityName and 7 cells", () => {
    // Need activities in state too for activityName lookup
    const s1 = reducer(
      undefined,
      fetchToday.fulfilled(
        {
          activities: { "act-med": MED_ACTIVITY, "act-food": FOOD_ACTIVITY },
          todayByActivity: {},
        },
        "req",
        undefined
      )
    );
    const s2 = reducer(
      s1,
      fetchWeekly.fulfilled(WEEKLY_PAYLOAD, "req", undefined)
    );
    const rows = selectWeeklyRows(root(s2));
    expect(rows.length).toBe(2);
    rows.forEach((r) => {
      expect(typeof r.activityName).toBe("string");
      expect(r.cells).toHaveLength(7);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchMonthly
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — fetchMonthly", () => {
  it("fulfilled → monthly populated, fetchStatus.monthly = 'ready'", () => {
    const state = reducer(
      undefined,
      fetchMonthly.fulfilled(MONTHLY_PAYLOAD, "req", undefined)
    );
    expect(state.fetchStatus.monthly).toBe("ready");
    expect(state.monthly).toEqual(MONTHLY_PAYLOAD);
  });

  it("selectMonthlyRows returns rows each with 31 cells", () => {
    const s1 = reducer(
      undefined,
      fetchToday.fulfilled(
        { activities: { "act-med": MED_ACTIVITY, "act-food": FOOD_ACTIVITY }, todayByActivity: {} },
        "req",
        undefined
      )
    );
    const s2 = reducer(s1, fetchMonthly.fulfilled(MONTHLY_PAYLOAD, "req", undefined));
    const rows = selectMonthlyRows(root(s2));
    expect(rows.length).toBe(2);
    rows.forEach((r) => {
      expect(r.cells).toHaveLength(31);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchMonthlySummary
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — fetchMonthlySummary", () => {
  it("fulfilled → monthlySummary populated", () => {
    const payload = { goals: GOALS, results: RESULTS };
    const state = reducer(
      undefined,
      fetchMonthlySummary.fulfilled(payload, "req", undefined)
    );
    expect(state.monthlySummary).toEqual(payload);
    expect(selectMonthlyGoalsSummary(root(state))).toEqual(payload);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleOccurrence — optimistic update (DS-2)
// spec: tap flips status immediately; spinner after 200ms; revert on rejection
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — toggleOccurrence (DS-2 optimistic)", () => {
  // Build a state with one pending occurrence
  function stateWithPendingOcc() {
    return reducer(
      undefined,
      fetchToday.fulfilled(
        {
          activities: { "act-med": MED_ACTIVITY },
          todayByActivity: { "act-med": PENDING_OCC },
        },
        "req",
        undefined
      )
    );
  }

  // Build a state with one done occurrence
  function stateWithDoneOcc() {
    return reducer(
      undefined,
      fetchToday.fulfilled(
        {
          activities: { "act-food": FOOD_ACTIVITY },
          todayByActivity: { "act-food": DONE_OCC },
        },
        "req",
        undefined
      )
    );
  }

  it("pending flips status pending→done optimistically", () => {
    const base = stateWithPendingOcc();
    const arg = { occurrenceId: "occ-med", activityId: "act-med" };
    const state = reducer(
      base,
      toggleOccurrence.pending("req", arg)
    );
    expect(state.todayByActivity["act-med"]!.status).toBe<HabitOccurrenceStatus>("done");
    expect(state.pendingToggles["occ-med"]).toBe(true);
  });

  it("pending flips status done→pending optimistically", () => {
    const base = stateWithDoneOcc();
    const arg = { occurrenceId: "occ-food", activityId: "act-food" };
    const state = reducer(
      base,
      toggleOccurrence.pending("req", arg)
    );
    expect(state.todayByActivity["act-food"]!.status).toBe<HabitOccurrenceStatus>("pending");
  });

  it("fulfilled clears pendingToggles entry", () => {
    const base = stateWithPendingOcc();
    const arg = { occurrenceId: "occ-med", activityId: "act-med" };
    const s1 = reducer(base, toggleOccurrence.pending("req", arg));
    expect(s1.pendingToggles["occ-med"]).toBe(true);

    const s2 = reducer(
      s1,
      toggleOccurrence.fulfilled({ occurrenceId: "occ-med", activityId: "act-med" }, "req", arg)
    );
    expect(s2.pendingToggles["occ-med"]).toBeUndefined();
  });

  it("rejected reverts optimistic flip and sets toggleError", () => {
    const base = stateWithPendingOcc();
    const arg = { occurrenceId: "occ-med", activityId: "act-med" };
    // Apply optimistic update
    const s1 = reducer(base, toggleOccurrence.pending("req", arg));
    expect(s1.todayByActivity["act-med"]!.status).toBe("done");

    // Rejection reverts
    const s2 = reducer(
      s1,
      toggleOccurrence.rejected(new Error("net"), "req", arg)
    );
    // Reverted back to "pending"
    expect(s2.todayByActivity["act-med"]!.status).toBe<HabitOccurrenceStatus>("pending");
    expect(s2.pendingToggles["occ-med"]).toBeUndefined();
    expect(s2.toggleErrors["occ-med"]).toBeDefined();
    expect(typeof s2.toggleErrors["occ-med"]).toBe("string");
  });

  it("selectIsToggling reflects pendingToggles", () => {
    const base = stateWithPendingOcc();
    const arg = { occurrenceId: "occ-med", activityId: "act-med" };
    const s1 = reducer(base, toggleOccurrence.pending("req", arg));
    expect(selectIsToggling(root(s1), "occ-med")).toBe(true);

    const s2 = reducer(
      s1,
      toggleOccurrence.fulfilled({ occurrenceId: "occ-med", activityId: "act-med" }, "req", arg)
    );
    expect(selectIsToggling(root(s2), "occ-med")).toBe(false);
  });

  it("clearToggleError removes the error entry", () => {
    const base = stateWithPendingOcc();
    const arg = { occurrenceId: "occ-med", activityId: "act-med" };
    const s1 = reducer(base, toggleOccurrence.pending("req", arg));
    const s2 = reducer(s1, toggleOccurrence.rejected(new Error("net"), "req", arg));
    expect(s2.toggleErrors["occ-med"]).toBeDefined();

    const s3 = reducer(s2, clearToggleError("occ-med"));
    expect(s3.toggleErrors["occ-med"]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createActivity
// spec: POST /api/habits/activities — on fulfilled, add to activities
//       activitySaveStatus flows idle→saving→saved
//       DS-3: rejected should map ACTIVITY_NAME_TAKEN onto activitySaveErrors.name
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — createActivity", () => {
  const NEW_ACTIVITY_INPUT = {
    category: "medicine" as const,
    name: "ยาใหม่",
    schedule: { frequency: "daily" as const, weekdays: [1, 2, 3, 4, 5] as const },
    mealRelation: "before" as const,
    mealSlots: ["breakfast"] as const,
  };

  const CREATED_ACTIVITY: HabitActivity = {
    ...NEW_ACTIVITY_INPUT,
    id: "act-new",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  };

  it("pending → activitySaveStatus 'saving', errors cleared", () => {
    const state = reducer(undefined, createActivity.pending("req", NEW_ACTIVITY_INPUT));
    expect(state.activitySaveStatus).toBe("saving");
    expect(state.activitySaveErrors).toEqual({});
  });

  it("fulfilled → activitySaveStatus 'saved', activity added to map", () => {
    const state = reducer(
      undefined,
      createActivity.fulfilled(CREATED_ACTIVITY, "req", NEW_ACTIVITY_INPUT)
    );
    expect(state.activitySaveStatus).toBe("saved");
    expect(state.activities["act-new"]).toEqual(CREATED_ACTIVITY);
    expect(state.lastCreatedActivityId).toBe("act-new");
  });

  it("rejected → activitySaveStatus 'error', error on name field", () => {
    const state = reducer(
      undefined,
      createActivity.rejected(new Error("err"), "req", NEW_ACTIVITY_INPUT)
    );
    expect(state.activitySaveStatus).toBe("error");
    // spec DS-3: 409 ACTIVITY_NAME_TAKEN must appear as activitySaveErrors.name
    expect(state.activitySaveErrors["name"]).toBeDefined();
  });

  it("selectActivitySaveStatus reflects slice state", () => {
    const saving = reducer(undefined, createActivity.pending("req", NEW_ACTIVITY_INPUT));
    expect(selectActivitySaveStatus(root(saving))).toBe("saving");

    const saved = reducer(
      undefined,
      createActivity.fulfilled(CREATED_ACTIVITY, "req", NEW_ACTIVITY_INPUT)
    );
    expect(selectActivitySaveStatus(root(saved))).toBe("saved");
  });

  it("selectActivityFieldError returns name error after rejection", () => {
    const state = reducer(
      undefined,
      createActivity.rejected(new Error("err"), "req", NEW_ACTIVITY_INPUT)
    );
    expect(selectActivityFieldError(root(state), "name")).toBeDefined();
  });

  it("clearSaveStatus resets activitySaveStatus to idle", () => {
    const errState = reducer(
      undefined,
      createActivity.rejected(new Error("err"), "req", NEW_ACTIVITY_INPUT)
    );
    const cleared = reducer(errState, clearSaveStatus());
    expect(cleared.activitySaveStatus).toBe("idle");
    expect(cleared.activitySaveErrors).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accent colour contract (spec: src/types/habit.ts category comment)
// ─────────────────────────────────────────────────────────────────────────────

describe("habitsSlice — TodayHabitEntry accent colours (spec contract)", () => {
  /**
   * Spec (src/types/habit.ts) defines:
   *   medicine  → cat-med  (#57a8db)
   *   nutrition → cat-food (#2eb563)
   *   physical  → cat-body (#ee8a4a)
   *
   * Bug signal: if implementation returns different colours, these tests fail.
   */

  function entryForActivity(activity: HabitActivity) {
    const occ: HabitOccurrence = {
      id: `occ-${activity.id}`,
      activityId: activity.id,
      date: TODAY,
      status: "pending",
    };
    const state = reducer(
      undefined,
      fetchToday.fulfilled(
        { activities: { [activity.id]: activity }, todayByActivity: { [activity.id]: occ } },
        "req",
        undefined
      )
    );
    return selectTodayEntries(root(state))[0]!;
  }

  it("medicine entry accent should be #57a8db (spec: cat-med)", () => {
    const entry = entryForActivity(MED_ACTIVITY);
    // SPEC EXPECTATION: #57a8db per src/types/habit.ts comment
    expect(entry.accent).toBe("#57a8db");
  });

  it("nutrition entry accent should be #2eb563 (spec: cat-food)", () => {
    const entry = entryForActivity(FOOD_ACTIVITY);
    // SPEC EXPECTATION: #2eb563 per src/types/habit.ts comment
    expect(entry.accent).toBe("#2eb563");
  });

  it("physical/exercise entry accent should be #ee8a4a (spec: cat-body)", () => {
    const entry = entryForActivity(BODY_ACTIVITY);
    // SPEC EXPECTATION: #ee8a4a per src/types/habit.ts comment
    expect(entry.accent).toBe("#ee8a4a");
  });
});
