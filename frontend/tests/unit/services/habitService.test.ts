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
  getMedicineCheckin,
  saveNutritionCheckin,
  getNutritionCheckin,
  saveSymptomsCheckin,
  getSymptomsCheckin,
  saveMoodCheckin,
  getMoodCheckin,
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

  it("persists physicalPreset and physicalCategory round-trip", async () => {
    const a = await createActivity(USER, {
      category: "physical" as const,
      physicalCategory: "emotion-management" as const,
      physicalPreset: "explore_emotion" as const,
      name: "จัดการอารมณ์",
      schedule: { frequency: "daily" as const, weekdays: [] as WeekdayIndex[] },
      archived: false,
    });
    expect(a.physicalPreset).toBe("explore_emotion");
    expect(a.physicalCategory).toBe("emotion-management");

    const [loaded] = await getActivities(USER);
    expect(loaded.physicalPreset).toBe("explore_emotion");
    expect(loaded.physicalCategory).toBe("emotion-management");
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

  it("marks occurrence as partial when some but not all meal slots are checked", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["breakfast" as const, "dinner" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;

    await saveMedicineCheckin(USER, {
      occurrenceId: occ.id,
      medicineName: "ยาเช้า",
      mealRelation: "after",
      mealSlots: ["breakfast"],
      sideEffects: [],
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("partial");
    expect(after[0].occurrence.completedAt).toBeUndefined();
  });

  it("marks occurrence as pending when zero configured meal slots are checked", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["breakfast" as const, "dinner" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;

    await saveMedicineCheckin(USER, {
      occurrenceId: occ.id,
      medicineName: "ยาเช้า",
      mealRelation: "after",
      mealSlots: [],
      sideEffects: [],
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("pending");
    expect(after[0].occurrence.completedAt).toBeUndefined();
  });

  it("marks occurrence as done when all configured meal slots are checked", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["breakfast" as const, "dinner" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;

    await saveMedicineCheckin(USER, {
      occurrenceId: occ.id,
      medicineName: "ยาเช้า",
      mealRelation: "after",
      mealSlots: ["breakfast", "dinner"],
      sideEffects: [],
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
    expect(after[0].occurrence.completedAt).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────
// getMedicineCheckin (pre-populate round-trip)
// ────────────────────────────────────────────────────────────────────
describe("getMedicineCheckin", () => {
  it("returns null before any checkin is saved", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["breakfast" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const result = await getMedicineCheckin(USER, entries[0].occurrence.id);
    expect(result).toBeNull();
  });

  it("returns saved checkin data after saveMedicineCheckin", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["breakfast" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;

    await saveMedicineCheckin(USER, {
      occurrenceId: occ.id,
      medicineName: "ยาเช้า",
      mealRelation: "after",
      mealSlots: ["breakfast"],
      sideEffects: [{ id: "se1", label: "คลื่นไส้", checked: true }],
    });

    const loaded = await getMedicineCheckin(USER, occ.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.medicineName).toBe("ยาเช้า");
    expect(loaded!.mealRelation).toBe("after");
    expect(loaded!.mealSlots).toEqual(["breakfast"]);
    expect(loaded!.sideEffects).toHaveLength(1);
    expect(loaded!.sideEffects[0]).toMatchObject({ id: "se1", label: "คลื่นไส้", checked: true });
  });

  it("returns latest values when checkin is overwritten", async () => {
    await createActivity(USER, { ...DAILY, mealRelation: "after", mealSlots: ["dinner" as const] });
    const entries = await getTodayEntries(USER, TODAY);
    const occ = entries[0].occurrence;

    await saveMedicineCheckin(USER, { occurrenceId: occ.id, medicineName: "ยาเช้า", mealRelation: "after", mealSlots: ["dinner"], sideEffects: [] });
    await saveMedicineCheckin(USER, { occurrenceId: occ.id, medicineName: "ยาเช้า", mealRelation: "before", mealSlots: ["dinner"], sideEffects: [{ id: "se2", label: "ปวดท้อง", checked: true }] });

    const loaded = await getMedicineCheckin(USER, occ.id);
    expect(loaded!.mealRelation).toBe("before");
    expect(loaded!.sideEffects[0].checked).toBe(true);
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(getMedicineCheckin(USER, "no-such-id")).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// saveNutritionCheckin + getNutritionCheckin
// ────────────────────────────────────────────────────────────────────
describe("saveNutritionCheckin", () => {
  it("marks occurrence done when all 3 meals are filled", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, {
      occurrenceId: occ.id,
      activityName: "บันทึกอาหาร",
      breakfast: "ข้าวต้ม",
      lunch: "ข้าวราดแกง",
      dinner: "ต้มยำ",
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
    expect(after[0].occurrence.completedAt).toBeDefined();
  });

  it("marks occurrence partial when only some meals are filled", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, {
      occurrenceId: occ.id,
      activityName: "บันทึกอาหาร",
      breakfast: "ข้าวต้ม",
      lunch: "",
      dinner: "",
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("partial");
    expect(after[0].occurrence.completedAt).toBeUndefined();
  });

  it("whitespace-only meals do not count as filled", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, {
      occurrenceId: occ.id,
      activityName: "บันทึกอาหาร",
      breakfast: "ข้าวต้ม",
      lunch: "ผัดผัก",
      dinner: "   ",
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("partial");
  });

  it("keeps occurrence pending when no meals are filled", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, {
      occurrenceId: occ.id,
      activityName: "บันทึกอาหาร",
      breakfast: "",
      lunch: "",
      dinner: "",
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("pending");
  });

  it("completing the remaining meals upgrades partial to done", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, { occurrenceId: occ.id, activityName: "X", breakfast: "ข้าวต้ม", lunch: "", dinner: "" });
    await saveNutritionCheckin(USER, { occurrenceId: occ.id, activityName: "X", breakfast: "ข้าวต้ม", lunch: "ผัดผัก", dinner: "ปลา" });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(
      saveNutritionCheckin(USER, { occurrenceId: "bad-id", activityName: "X", breakfast: "", lunch: "", dinner: "" })
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("getNutritionCheckin", () => {
  it("returns null before any checkin is saved", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const result = await getNutritionCheckin(USER, entry.occurrence.id);
    expect(result).toBeNull();
  });

  it("returns saved data after saveNutritionCheckin", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, {
      occurrenceId: occ.id,
      activityName: "บันทึกอาหาร",
      breakfast: "ข้าวต้ม",
      lunch: "ข้าวราดแกง",
      dinner: "ต้มยำ",
    });

    const loaded = await getNutritionCheckin(USER, occ.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.activityName).toBe("บันทึกอาหาร");
    expect(loaded!.breakfast).toBe("ข้าวต้ม");
    expect(loaded!.lunch).toBe("ข้าวราดแกง");
    expect(loaded!.dinner).toBe("ต้มยำ");
  });

  it("returns latest values when overwritten", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveNutritionCheckin(USER, { occurrenceId: occ.id, activityName: "X", breakfast: "ข้าว", lunch: "", dinner: "" });
    await saveNutritionCheckin(USER, { occurrenceId: occ.id, activityName: "X", breakfast: "โจ๊ก", lunch: "ผัดผัก", dinner: "ปลา" });

    const loaded = await getNutritionCheckin(USER, occ.id);
    expect(loaded!.breakfast).toBe("โจ๊ก");
    expect(loaded!.dinner).toBe("ปลา");
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(getNutritionCheckin(USER, "no-such-id")).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// saveSymptomsCheckin + getSymptomsCheckin
// ────────────────────────────────────────────────────────────────────
const PHYSICAL_SYMPTOMS = {
  category: "physical" as const,
  physicalCategory: "symptoms" as const,
  name: "ติดตามอาการ",
  schedule: { frequency: "daily" as const, weekdays: [] as WeekdayIndex[] },
  archived: false,
};

describe("saveSymptomsCheckin", () => {
  it("saves the checkin and marks occurrence as done", async () => {
    await createActivity(USER, PHYSICAL_SYMPTOMS);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveSymptomsCheckin(USER, {
      occurrenceId: occ.id,
      items: [
        { id: "s1", label: "เหนื่อยง่าย", checked: true },
        { id: "s2", label: "ปวดหัว", checked: false },
      ],
    });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(
      saveSymptomsCheckin(USER, { occurrenceId: "bad-id", items: [] })
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("getSymptomsCheckin", () => {
  it("returns null before any checkin is saved", async () => {
    await createActivity(USER, PHYSICAL_SYMPTOMS);
    const [entry] = await getTodayEntries(USER, TODAY);
    const result = await getSymptomsCheckin(USER, entry.occurrence.id);
    expect(result).toBeNull();
  });

  it("returns saved items after saveSymptomsCheckin", async () => {
    await createActivity(USER, PHYSICAL_SYMPTOMS);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    const items = [
      { id: "s1", label: "เหนื่อยง่าย", checked: true },
      { id: "s2", label: "ปวดหัว", checked: false },
      { id: "s3", label: "คลื่นไส้", checked: true },
    ];

    await saveSymptomsCheckin(USER, { occurrenceId: occ.id, items });

    const loaded = await getSymptomsCheckin(USER, occ.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.items).toHaveLength(3);
    expect(loaded!.items[0]).toMatchObject({ id: "s1", checked: true });
    expect(loaded!.items[1]).toMatchObject({ id: "s2", checked: false });
  });

  it("preserves checked=false items (not just truthy ones)", async () => {
    await createActivity(USER, PHYSICAL_SYMPTOMS);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveSymptomsCheckin(USER, { occurrenceId: occ.id, items: [{ id: "s1", label: "X", checked: false }] });

    const loaded = await getSymptomsCheckin(USER, occ.id);
    expect(loaded!.items[0].checked).toBe(false);
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(getSymptomsCheckin(USER, "no-such-id")).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// saveMoodCheckin + getMoodCheckin
// ────────────────────────────────────────────────────────────────────
const PHYSICAL_EMOTION = {
  category: "physical" as const,
  physicalCategory: "emotion-management" as const,
  name: "บันทึกอารมณ์",
  schedule: { frequency: "daily" as const, weekdays: [] as WeekdayIndex[] },
  archived: false,
};

describe("saveMoodCheckin", () => {
  it("saves the checkin and marks occurrence as done", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: "good", sliderValue: 40 });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
  });

  it("accepts all 5 mood levels", async () => {
    const levels = ["very-bad", "bad", "neutral", "good", "very-good"] as const;
    for (const mood of levels) {
      clearTestData();
      await createActivity(USER, PHYSICAL_EMOTION);
      const [entry] = await getTodayEntries(USER, TODAY);
      await expect(saveMoodCheckin(USER, { occurrenceId: entry.occurrence.id, mood, sliderValue: 0 })).resolves.toBeUndefined();
    }
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(
      saveMoodCheckin(USER, { occurrenceId: "bad-id", mood: "neutral", sliderValue: 0 })
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("getMoodCheckin", () => {
  it("returns null before any checkin is saved", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const result = await getMoodCheckin(USER, entry.occurrence.id);
    expect(result).toBeNull();
  });

  it("returns saved mood and sliderValue after saveMoodCheckin", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: "very-good", sliderValue: 80 });

    const loaded = await getMoodCheckin(USER, occ.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.mood).toBe("very-good");
    expect(loaded!.sliderValue).toBe(80);
  });

  it("returns negative slider values correctly", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: "very-bad", sliderValue: -100 });

    const loaded = await getMoodCheckin(USER, occ.id);
    expect(loaded!.mood).toBe("very-bad");
    expect(loaded!.sliderValue).toBe(-100);
  });

  it("returns latest values when overwritten", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: "bad", sliderValue: -40 });
    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: "good", sliderValue: 60 });

    const loaded = await getMoodCheckin(USER, occ.id);
    expect(loaded!.mood).toBe("good");
    expect(loaded!.sliderValue).toBe(60);
  });

  it("throws for an unknown occurrence id", async () => {
    await expect(getMoodCheckin(USER, "no-such-id")).rejects.toBeInstanceOf(AppError);
  });
});

// ────────────────────────────────────────────────────────────────────
// getWeeklyView
// ────────────────────────────────────────────────────────────────────
const TODO = {
  category: "physical" as const,
  name: "งานครั้งเดียว",
  schedule: { frequency: "todo" as const, importance: "general" as const },
  archived: false,
};

describe("getWeeklyView", () => {
  it("includes all scheduled activities except todo", async () => {
    await createActivity(USER, DAILY);   // daily — included
    await createActivity(USER, WEEKLY);  // weekly — included
    await createActivity(USER, MONTHLY); // monthly — included (visibility)
    await createActivity(USER, TODO);    // todo — excluded
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.weekStartDate).toBe("2026-05-25");
    expect(result.rowsByActivity).toHaveLength(3);
    const names = result.rowsByActivity.map((r) => r.activityName);
    expect(names).toContain("ยาเช้า");
    expect(names).toContain("บันทึกอาหาร");
    expect(names).not.toContain("งานครั้งเดียว");
  });

  it("rows span exactly 7 cells with dates", async () => {
    await createActivity(USER, WEEKLY);
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity[0].cells).toHaveLength(7);
    expect(result.rowsByActivity[0].cells[0].date).toBe("2026-05-25");
    expect(result.rowsByActivity[0].cells[6].date).toBe("2026-05-31");
  });

  it("weekly target uses daysPerWeek, not 7", async () => {
    await createActivity(USER, WEEKLY); // 3 days/week
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity[0].target).toBe(3);
    expect(result.summary.target).toBe(3);
  });

  it("daily target counts only selected weekdays; off days are unscheduled", async () => {
    // Mon/Wed/Fri only (1, 3, 5)
    await createActivity(USER, {
      ...DAILY,
      schedule: { frequency: "daily" as const, weekdays: [1, 3, 5] as WeekdayIndex[] },
    });
    const result = await getWeeklyView(USER, "2026-05-25"); // Mon 25 – Sun 31
    const row = result.rowsByActivity[0];
    expect(row.target).toBe(3);
    expect(row.cells.map((c) => c.scheduled)).toEqual([true, false, true, false, true, false, false]);
  });

  it("daily with no weekday selection targets all 7 days", async () => {
    await createActivity(USER, DAILY);
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity[0].target).toBe(7);
  });

  it("monthly-frequency rows are visible but add no weekly target", async () => {
    await createActivity(USER, MONTHLY);
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity).toHaveLength(1);
    expect(result.rowsByActivity[0].target).toBe(0);
    expect(result.summary.target).toBe(0);
  });

  it("counts done occurrences into row and summary", async () => {
    await createActivity(USER, DAILY);
    const [entry] = await getTodayEntries(USER, TODAY); // TODAY is in this week
    await toggleOccurrence(USER, entry.occurrence.id, "done");
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity[0].done).toBe(1);
    expect(result.summary.done).toBe(1);
  });

  it("partial occurrences do not count as done", async () => {
    await createActivity(USER, WEEKLY);
    const [entry] = await getTodayEntries(USER, TODAY);
    await saveNutritionCheckin(USER, { occurrenceId: entry.occurrence.id, activityName: "X", breakfast: "ข้าว", lunch: "", dinner: "" });
    const result = await getWeeklyView(USER, "2026-05-25");
    expect(result.rowsByActivity[0].done).toBe(0);
    const thursday = result.rowsByActivity[0].cells.find((c) => c.date === TODAY);
    expect(thursday?.status).toBe("partial");
  });
});

// ────────────────────────────────────────────────────────────────────
// getMonthlyView
// ────────────────────────────────────────────────────────────────────
describe("getMonthlyView", () => {
  it("includes all scheduled activities except todo", async () => {
    await createActivity(USER, DAILY);
    await createActivity(USER, MONTHLY);
    await createActivity(USER, TODO);
    const result = await getMonthlyView(USER, "2026-05");
    expect(result.month).toBe("2026-05");
    expect(result.rowsByActivity).toHaveLength(2);
  });

  it("rows span all days of the requested month", async () => {
    await createActivity(USER, MONTHLY);
    const result = await getMonthlyView(USER, "2026-05");
    expect(result.rowsByActivity[0].cells).toHaveLength(31); // May has 31 days
  });

  it("monthly target uses daysPerMonth; weekly is prorated", async () => {
    await createActivity(USER, MONTHLY); // 4 days/month
    await createActivity(USER, WEEKLY);  // 3 days/week → ~13 over 31 days
    const result = await getMonthlyView(USER, "2026-05");
    const monthlyRow = result.rowsByActivity.find((r) => r.activityName === "ติดตามน้ำหนัก");
    const weeklyRow = result.rowsByActivity.find((r) => r.activityName === "บันทึกอาหาร");
    expect(monthlyRow?.target).toBe(4);
    expect(weeklyRow?.target).toBe(Math.round((3 * 31) / 7)); // 13
  });
});

// ────────────────────────────────────────────────────────────────────
// getMonthlySummary
// ────────────────────────────────────────────────────────────────────
describe("getMonthlySummary", () => {
  it("returns one goal per activity, excluding todo", async () => {
    await createActivity(USER, DAILY);
    await createActivity(USER, WEEKLY);
    await createActivity(USER, TODO);
    const result = await getMonthlySummary(USER, "2026-05");
    expect(result.goals).toHaveLength(2);
  });

  it("goal targets follow the activity schedule", async () => {
    await createActivity(USER, MONTHLY); // 4 days/month
    const [entry] = await getTodayEntries(USER, TODAY);
    await toggleOccurrence(USER, entry.occurrence.id, "done");
    const result = await getMonthlySummary(USER, "2026-05");
    expect(result.goals[0].progressPercent).toBe(25); // 1 of 4
    expect(result.results.target).toBe(4);
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
