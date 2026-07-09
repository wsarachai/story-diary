// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import {
  createActivity,
  getTodayEntries,
  toggleOccurrence,
} from "@/lib/services/habitService";
import type { HabitOccurrenceStatus } from "@/types/habit";

const USER = "period-user";

// 2026-06-01 is a Monday, so 06-01..06-07 is one Mon–Sun week.
const MON = "2026-06-01";
const TUE = "2026-06-02";
const WED = "2026-06-03";
const THU = "2026-06-04";

beforeEach(() => {
  clearTestData();
});

async function markDay(activityId: string, date: string, status: HabitOccurrenceStatus) {
  const entries = await getTodayEntries(USER, date);
  const occ = entries.find((e) => e.activity.id === activityId)!.occurrence;
  await toggleOccurrence(USER, occ.id, status);
}

async function progressOn(activityId: string, date: string) {
  const entries = await getTodayEntries(USER, date);
  return entries.find((e) => e.activity.id === activityId)!.occurrence.doseProgress;
}

describe("weekly period progress", () => {
  it("reports days-done this week over the target", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "กิจกรรมผ่อนคลายความเครียด",
      schedule: { frequency: "weekly", daysPerWeek: 3 },
      archived: false,
    });

    // Nothing done yet → 0/3.
    expect(await progressOn(act.id, MON)).toEqual({ taken: 0, total: 3 });

    // One distinct day done → 1/3 (in progress, not complete).
    await markDay(act.id, MON, "done");
    expect(await progressOn(act.id, TUE)).toEqual({ taken: 1, total: 3 });

    // Two days → 2/3.
    await markDay(act.id, TUE, "done");
    expect(await progressOn(act.id, WED)).toEqual({ taken: 2, total: 3 });

    // Three days → 3/3 (complete).
    await markDay(act.id, WED, "done");
    expect(await progressOn(act.id, THU)).toEqual({ taken: 3, total: 3 });
  });

  it("decrements when a day is un-done", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "เดินเล่น",
      schedule: { frequency: "weekly", daysPerWeek: 3 },
      archived: false,
    });
    await markDay(act.id, MON, "done");
    await markDay(act.id, TUE, "done");
    expect(await progressOn(act.id, WED)).toEqual({ taken: 2, total: 3 });

    await markDay(act.id, MON, "pending");
    expect(await progressOn(act.id, WED)).toEqual({ taken: 1, total: 3 });
  });

  it("does not count skipped days toward progress", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "โยคะ",
      schedule: { frequency: "weekly", daysPerWeek: 3 },
      archived: false,
    });
    await markDay(act.id, MON, "done");
    await markDay(act.id, TUE, "skipped");
    expect(await progressOn(act.id, WED)).toEqual({ taken: 1, total: 3 });
  });

  it("allows over-achievement beyond the target", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "วิ่ง",
      schedule: { frequency: "weekly", daysPerWeek: 2 },
      archived: false,
    });
    await markDay(act.id, MON, "done");
    await markDay(act.id, TUE, "done");
    await markDay(act.id, WED, "done");
    expect(await progressOn(act.id, THU)).toEqual({ taken: 3, total: 2 });
  });
});

describe("monthly period progress", () => {
  it("reports days-done this month over the target", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "ตรวจสุขภาพตนเอง",
      schedule: { frequency: "monthly", daysPerMonth: 4 },
      archived: false,
    });
    await markDay(act.id, "2026-06-03", "done");
    await markDay(act.id, "2026-06-20", "done");
    // A different day in the same month reads the month aggregate.
    expect(await progressOn(act.id, "2026-06-28")).toEqual({ taken: 2, total: 4 });
  });

  it("resets across month boundaries", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "ทบทวนเป้าหมาย",
      schedule: { frequency: "monthly", daysPerMonth: 2 },
      archived: false,
    });
    await markDay(act.id, "2026-06-15", "done");
    expect(await progressOn(act.id, "2026-06-16")).toEqual({ taken: 1, total: 2 });
    // July is a fresh period.
    expect(await progressOn(act.id, "2026-07-01")).toEqual({ taken: 0, total: 2 });
  });
});

describe("scope", () => {
  it("does not attach period progress to daily activities", async () => {
    const act = await createActivity(USER, {
      category: "physical",
      name: "ดื่มน้ำ",
      schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      archived: false,
    });
    const progress = await progressOn(act.id, MON);
    expect(progress).toBeUndefined();
  });
});
