// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import type { WeekdayIndex } from "@/types/habit";
import {
  createActivity,
  updateActivity,
  archiveActivity,
  getActivities,
  getTodayEntries,
  toggleOccurrence,
  saveMedicineCheckin,
  getWeeklyView,
  getMonthlyView,
  getMonthlySummary,
} from "@/lib/services/habitService";
import { AppError } from "@/lib/errors";

const USER = "habit-test-user";
const TODAY = "2026-05-28"; // Thursday (day 4)

const DAILY = {
  category: "medicine" as const,
  name: "ยาเช้า",
  schedule: { frequency: "daily" as const, weekdays: [] as WeekdayIndex[] },
  archived: false,
};

const WEEKLY = {
  category: "nutrition" as const,
  name: "บันทึกอาหาร",
  schedule: { frequency: "weekly" as const, daysPerWeek: 3 },
  archived: false,
};

const MONTHLY = {
  category: "physical" as const,
  name: "ติดตามน้ำหนัก",
  schedule: { frequency: "monthly" as const, daysPerMonth: 4 },
  archived: false,
};

beforeEach(() => {
  clearTestData();
});

// ────────────────────────────────────────────────────────────────────
// createActivity
// ────────────────────────────────────────────────────────────────────
describe("createActivity", () => {
  it("creates and returns an activity owned by the user", async () => {
    const a = await createActivity(USER, DAILY);
    expect(a.name).toBe("ยาเช้า");
    expect(a.userId).toBe(USER);
    expect(a.id).toBeDefined();
    expect(a.category).toBe("medicine");
  });

  it("throws ACTIVITY_NAME_TAKEN on duplicate name (same user)", async () => {
    await createActivity(USER, DAILY);
    await expect(createActivity(USER, DAILY)).rejects.toMatchObject({
      code: "ACTIVITY_NAME_TAKEN",
      statusCode: 409,
    });
  });

  it("name uniqueness is case-insensitive", async () => {
    await createActivity(USER, DAILY);
    await expect(createActivity(USER, { ...DAILY, name: "ยาเช้า" })).rejects.toMatchObject({
      code: "ACTIVITY_NAME_TAKEN",
    });
  });

  it("same name is allowed for different users", async () => {
    await createActivity(USER, DAILY);
    const other = await createActivity("other-user", DAILY);
    expect(other.name).toBe("ยาเช้า");
  });
});

// ────────────────────────────────────────────────────────────────────
// getActivities
// ────────────────────────────────────────────────────────────────────
describe("getActivities", () => {
  it("returns all non-archived activities for the user", async () => {
    await createActivity(USER, DAILY);
    await createActivity(USER, WEEKLY);
    const list = await getActivities(USER);
    expect(list).toHaveLength(2);
  });

  it("does not return archived activities", async () => {
    const a = await createActivity(USER, DAILY);
    await archiveActivity(USER, a.id);
    const list = await getActivities(USER);
    expect(list.find((x) => x.id === a.id)).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────
// updateActivity
// ────────────────────────────────────────────────────────────────────
describe("updateActivity", () => {
  it("updates the name and returns updated activity", async () => {
    const a = await createActivity(USER, DAILY);
    const updated = await updateActivity(USER, a.id, { name: "ยากลางคืน" });
    expect(updated.name).toBe("ยากลางคืน");
    expect(updated.id).toBe(a.id);
  });

  it("throws when activity belongs to a different user", async () => {
    const a = await createActivity(USER, DAILY);
    await expect(updateActivity("wrong-user", a.id, { name: "X" })).rejects.toBeInstanceOf(AppError);
  });

  it("throws ACTIVITY_NAME_TAKEN when renaming conflicts with another activity", async () => {
    const a = await createActivity(USER, DAILY);
    await createActivity(USER, WEEKLY);
    await expect(updateActivity(USER, a.id, { name: "บันทึกอาหาร" })).rejects.toMatchObject({
      code: "ACTIVITY_NAME_TAKEN",
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// archiveActivity
// ────────────────────────────────────────────────────────────────────
describe("archiveActivity", () => {
  it("hides the activity from getActivities after archiving", async () => {
    const a = await createActivity(USER, DAILY);
    await archiveActivity(USER, a.id);
    const list = await getActivities(USER);
    expect(list.find((x) => x.id === a.id)).toBeUndefined();
  });

  it("throws for an unknown activity id", async () => {
    await expect(archiveActivity(USER, "no-such-id")).rejects.toBeInstanceOf(AppError);
  });

  it("throws when activity belongs to a different user", async () => {
    const a = await createActivity(USER, DAILY);
    await expect(archiveActivity("wrong-user", a.id)).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// getTodayEntries
// ────────────────────────────────────────────────────────────────────
describe("getTodayEntries", () => {
  it("returns one entry per scheduled activity", async () => {
    await createActivity(USER, DAILY);
    const entries = await getTodayEntries(USER, TODAY);
    expect(entries).toHaveLength(1);
    expect(entries[0].activity.name).toBe("ยาเช้า");
    expect(entries[0].occurrence).toBeDefined();
    expect(entries[0].occurrence.status).toBe("pending");
    expect(entries[0].subline).toBeDefined();
    expect(entries[0].accent).toMatch(/^#/);
  });

  it("returns no entries for an empty user", async () => {
    const entries = await getTodayEntries(USER, TODAY);
    expect(entries).toHaveLength(0);
  });

  it("excludes archived activities", async () => {
    const a = await createActivity(USER, DAILY);
    await archiveActivity(USER, a.id);
    const entries = await getTodayEntries(USER, TODAY);
    expect(entries).toHaveLength(0);
  });

  it("filters daily activity by weekday (creates occurrence when scheduled)", async () => {
    // weekdays: [4] = Thursday only (TODAY is Thursday)
    await createActivity(USER, { ...DAILY, schedule: { frequency: "daily", weekdays: [4 as WeekdayIndex] } });
    const entries = await getTodayEntries(USER, TODAY);
    expect(entries).toHaveLength(1);
  });

  it("excludes daily activity on wrong weekday", async () => {
    // weekdays: [0] = Sunday only; TODAY is Thursday
    await createActivity(USER, { ...DAILY, schedule: { frequency: "daily", weekdays: [0 as WeekdayIndex] } });
    const entries = await getTodayEntries(USER, TODAY);
    expect(entries).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// toggleOccurrence
// ────────────────────────────────────────────────────────────────────
describe("toggleOccurrence", () => {
  it("sets status to done and records completedAt", async () => {
    await createActivity(USER, DAILY);
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;
    const updated = await toggleOccurrence(USER, occ.id, "done");
    expect(updated.status).toBe("done");
    expect(updated.completedAt).toBeDefined();
  });

  it("sets status to skipped", async () => {
    await createActivity(USER, DAILY);
    const entries = await getTodayEntries(USER, TODAY);
    const updated = await toggleOccurrence(USER, entries[0].occurrence.id, "skipped");
    expect(updated.status).toBe("skipped");
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(toggleOccurrence(USER, "bad-id", "done")).rejects.toBeInstanceOf(AppError);
  });

  it("throws when the occurrence belongs to a different user", async () => {
    await createActivity(USER, DAILY);
    const entries = await getTodayEntries(USER, TODAY);
    const occId = entries[0].occurrence.id;
    await expect(toggleOccurrence("wrong-user", occId, "done")).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// saveMedicineCheckin
// ────────────────────────────────────────────────────────────────────
describe("saveMedicineCheckin", () => {
  it("saves the checkin and marks occurrence as done", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["breakfast" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;

    await saveMedicineCheckin(USER, {
      occurrenceId: occ.id,
      medicineName: "ยาเช้า",
      mealRelation: "after",
      mealSlots: ["breakfast"],
      sideEffects: [{ id: "se1", label: "คลื่นไส้", checked: false }],
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(
      saveMedicineCheckin(USER, {
        occurrenceId: "bad-id",
        medicineName: "X",
        mealRelation: "after",
        mealSlots: [],
        sideEffects: [],
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// getWeeklyView
// ────────────────────────────────────────────────────────────────────
describe("getWeeklyView", () => {
  it("includes only weekly-frequency activities", async () => {
    await createActivity(USER, DAILY);  // daily — excluded
    await createActivity(USER, WEEKLY); // weekly — included
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.weekStartDate).toBe("2026-05-25");
    expect(result.rowsByActivity).toHaveLength(1);
    expect(result.rowsByActivity[0].activityName).toBe("บันทึกอาหาร");
  });

  it("rows span exactly 7 dates", async () => {
    await createActivity(USER, WEEKLY);
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity[0].dates).toHaveLength(7);
  });

  it("summary.done is 0 when no occurrences are marked done", async () => {
    await createActivity(USER, WEEKLY);
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.summary.done).toBe(0);
    expect(result.summary.target).toBe(7);
  });
});

// ────────────────────────────────────────────────────────────────────
// getMonthlyView
// ────────────────────────────────────────────────────────────────────
describe("getMonthlyView", () => {
  it("includes only monthly-frequency activities", async () => {
    await createActivity(USER, DAILY);   // daily — excluded
    await createActivity(USER, MONTHLY); // monthly — included
    const result = await getMonthlyView(USER, "2026-05");
    expect(result.month).toBe("2026-05");
    expect(result.rowsByActivity).toHaveLength(1);
    expect(result.rowsByActivity[0].activityName).toBe("ติดตามน้ำหนัก");
  });

  it("rows span all days of the requested month", async () => {
    await createActivity(USER, MONTHLY);
    const result = await getMonthlyView(USER, "2026-05");
    expect(result.rowsByActivity[0].dates).toHaveLength(31); // May has 31 days
  });
});

// ────────────────────────────────────────────────────────────────────
// getMonthlySummary
// ────────────────────────────────────────────────────────────────────
describe("getMonthlySummary", () => {
  it("returns one goal per activity", async () => {
    await createActivity(USER, DAILY);
    await createActivity(USER, WEEKLY);
    const result = await getMonthlySummary(USER, "2026-05");
    expect(result.goals).toHaveLength(2);
  });

  it("results start at 0 done with a positive target", async () => {
    await createActivity(USER, DAILY);
    const result = await getMonthlySummary(USER, "2026-05");
    expect(result.results.totalDone).toBe(0);
    expect(result.results.target).toBeGreaterThan(0);
    expect(result.results.completionPercent).toBe(0);
  });

  it("each goal has activityId, name, subline, and progressPercent", async () => {
    await createActivity(USER, DAILY);
    const result = await getMonthlySummary(USER, "2026-05");
    const goal = result.goals[0];
    expect(goal.activityId).toBeDefined();
    expect(goal.name).toBe("ยาเช้า");
    expect(goal.subline).toBeDefined();
    expect(typeof goal.progressPercent).toBe("number");
  });

  it("returns empty goals for a user with no activities", async () => {
    const result = await getMonthlySummary(USER, "2026-05");
    expect(result.goals).toHaveLength(0);
    expect(result.results.totalDone).toBe(0);
    expect(result.results.target).toBe(0);
  });
});
