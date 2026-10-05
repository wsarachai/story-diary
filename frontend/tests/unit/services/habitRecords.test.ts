// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import { registerUser } from "@/lib/services/authService";
import {
  createActivity,
  getTodayEntries,
  toggleOccurrence,
  getWeeklyView,
  getNutritionCheckin,
  getMedicineCheckin,
} from "@/lib/services/habitService";
import { adminGetHabitDay, adminRecordHabit, adminListHabitUsers } from "@/lib/services/adminService";
import { localDateStr, DEFAULT_TIMEZONE } from "@/lib/utils/date";
import { AppError } from "@/lib/errors";
import type { WeekdayIndex } from "@/types/habit";

const ADMIN = "admin-1";
let userId = "";
let otherUserId = "";

const TODAY = localDateStr(DEFAULT_TIMEZONE);
function shift(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}
const YESTERDAY = shift(TODAY, -1);
const TOMORROW = shift(TODAY, 1);
const everyDay = { frequency: "daily" as const, weekdays: [] as WeekdayIndex[] };

beforeEach(async () => {
  clearTestData();
  userId = (await registerUser({ name: "ผู้ใช้", tel: "0811111111", password: "password123", characterName: "U", gender: "female" })).id;
  otherUserId = (await registerUser({ name: "คนอื่น", tel: "0822222222", password: "password123", characterName: "O", gender: "male" })).id;
});

async function dayEntry(date: string, name: string) {
  const day = await adminGetHabitDay(userId, date);
  const entry = day.entries.find((e) => e.activity.name === name);
  if (!entry) throw new Error(`no entry ${name} on ${date}`);
  return entry;
}

describe("adminListHabitUsers", () => {
  it("lists users with id, name and tel only", async () => {
    const users = await adminListHabitUsers();
    expect(users.map((u) => u.name).sort()).toEqual(["คนอื่น", "ผู้ใช้"].sort());
    expect(Object.keys(users[0]).sort()).toEqual(["id", "name", "tel"]);
  });
});

describe("adminGetHabitDay", () => {
  it("returns the activities scheduled that day plus the user's today", async () => {
    await createActivity(userId, { category: "physical", name: "เดิน", schedule: everyDay, archived: false });
    const day = await adminGetHabitDay(userId, TODAY);
    expect(day.today).toBe(TODAY);
    expect(day.entries.map((e) => e.activity.name)).toEqual(["เดิน"]);
    expect(day.entries[0].occurrence.date).toBe(TODAY);
  });

  it("leaves out activities created after the requested date", async () => {
    await createActivity(userId, { category: "physical", name: "เดิน", schedule: everyDay, archived: false });
    const day = await adminGetHabitDay(userId, shift(TODAY, -3));
    expect(day.entries).toHaveLength(0);
  });

  it("shows an appointment only on its own date", async () => {
    await createActivity(userId, {
      category: "physical", physicalCategory: "doctor-visit", name: "ตรวจตามนัดแพทย์",
      schedule: { frequency: "todo", importance: "high" }, appointmentDate: TODAY, archived: false,
    });
    expect((await adminGetHabitDay(userId, TODAY)).entries).toHaveLength(1);
    expect((await adminGetHabitDay(userId, YESTERDAY)).entries).toHaveLength(0);
  });

  it("rejects future dates, malformed dates and unknown users", async () => {
    await expect(adminGetHabitDay(userId, TOMORROW)).rejects.toBeInstanceOf(AppError);
    await expect(adminGetHabitDay(userId, "2026-02-30")).rejects.toBeInstanceOf(AppError);
    await expect(adminGetHabitDay(userId, "yesterday")).rejects.toBeInstanceOf(AppError);
    await expect(adminGetHabitDay("nobody", TODAY)).rejects.toBeInstanceOf(AppError);
  });
});

describe("adminRecordHabit", () => {
  it("marks a forgotten day done, attributed to the admin, and it counts in the totals", async () => {
    await createActivity(userId, { category: "physical", name: "เดิน", schedule: everyDay, archived: false });
    const entry = await dayEntry(TODAY, "เดิน");

    const occ = await adminRecordHabit(ADMIN, userId, entry.occurrence.id, "done");
    expect(occ.status).toBe("done");
    expect(occ.recordedByAdmin).toBe(true);
    expect(occ.recordedAt).toBeDefined();

    const [weekStartY, weekStartM, weekStartD] = TODAY.split("-").map(Number);
    const local = new Date(weekStartY, weekStartM - 1, weekStartD);
    local.setDate(local.getDate() - ((local.getDay() + 6) % 7));
    const weekStart = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
    const week = await getWeeklyView(userId, weekStart);
    expect(week.summary.done).toBe(1);
  });

  it("fills nutrition meals so the checklist counter agrees, and keeps meal notes", async () => {
    await createActivity(userId, {
      category: "nutrition", name: "x", nutritionPreset: "nutrition_5_groups", schedule: everyDay, archived: false,
    });
    const entry = (await adminGetHabitDay(userId, TODAY)).entries[0];

    await adminRecordHabit(ADMIN, userId, entry.occurrence.id, "done");
    const [today] = await getTodayEntries(userId, TODAY);
    expect(today.occurrence.status).toBe("done");
    expect(today.occurrence.doseProgress).toEqual({ taken: 3, total: 3 });

    await adminRecordHabit(ADMIN, userId, entry.occurrence.id, "pending");
    const [reset] = await getTodayEntries(userId, TODAY);
    expect(reset.occurrence.status).toBe("pending");
    expect(reset.occurrence.doseProgress).toEqual({ taken: 0, total: 3 });
    expect((await getNutritionCheckin(userId, entry.occurrence.id))!.mealSlots).toEqual([]);
  });

  it("fills medicine meal slots from the activity configuration", async () => {
    await createActivity(userId, {
      category: "medicine", name: "ยาเช้าเย็น", schedule: everyDay, mealRelation: "after",
      mealSlots: ["breakfast", "dinner"], archived: false,
    });
    const entry = await dayEntry(TODAY, "ยาเช้าเย็น");
    await adminRecordHabit(ADMIN, userId, entry.occurrence.id, "done");
    const checkin = await getMedicineCheckin(userId, entry.occurrence.id);
    expect(checkin!.mealSlots).toEqual(["breakfast", "dinner"]);
    const [today] = await getTodayEntries(userId, TODAY);
    expect(today.occurrence.doseProgress).toEqual({ taken: 2, total: 2 });
  });

  it("can mark a day skipped", async () => {
    await createActivity(userId, { category: "physical", name: "เดิน", schedule: everyDay, archived: false });
    const entry = await dayEntry(TODAY, "เดิน");
    expect((await adminRecordHabit(ADMIN, userId, entry.occurrence.id, "skipped")).status).toBe("skipped");
  });

  it("clears the admin attribution once the user records the day themselves", async () => {
    await createActivity(userId, { category: "physical", name: "เดิน", schedule: everyDay, archived: false });
    const entry = await dayEntry(TODAY, "เดิน");
    await adminRecordHabit(ADMIN, userId, entry.occurrence.id, "done");
    const own = await toggleOccurrence(userId, entry.occurrence.id, "done");
    expect(own.recordedByAdmin).toBeUndefined();
  });

  it("rejects bad statuses and occurrences that belong to another user", async () => {
    await createActivity(userId, { category: "physical", name: "เดิน", schedule: everyDay, archived: false });
    const entry = await dayEntry(TODAY, "เดิน");
    await expect(adminRecordHabit(ADMIN, userId, entry.occurrence.id, "partial")).rejects.toBeInstanceOf(AppError);
    await expect(adminRecordHabit(ADMIN, otherUserId, entry.occurrence.id, "done")).rejects.toBeInstanceOf(AppError);
  });
});
