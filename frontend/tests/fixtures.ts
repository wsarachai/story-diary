/**
 * Shared test-data fixtures for all jsdom + MSW tests.
 *
 * Think of this file as the "data sheet": every mock object lives here once
 * and every test imports what it needs.  Mutating a fixture in a test is
 * always done with a spread copy — never mutate the originals.
 *
 * Sections
 * ─────────
 *  AUTH          – user, token, credentials
 *  ACTIVITIES    – one per category / physicalCategory
 *  OCCURRENCES   – one per activity, keyed by activity id
 *  CHECKINS      – medicine, nutrition, symptoms, mood
 *  TODAY_ENTRIES – the /habits/today response payload
 *  WEEKLY        – the /habits/weekly response payload
 *  MONTHLY       – the /habits/monthly response payload
 *  SUMMARY       – the /habits/monthly-summary response payload
 */

import type { UserProfile } from "@/types/user";
import type {
  HabitActivity,
  HabitOccurrence,
  MedicineCheckin,
  NutritionCheckin,
  UnusualSymptomsCheckin,
  MoodCheckin,
  TodayHabitEntry,
} from "@/types/habit";

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const MOCK_TOKEN = "mock-jwt-token-abc123";

export const MOCK_USER: UserProfile = {
  id: "user-001",
  name: "สมชาย ใจดี",
  tel: "0812345678",
  characterName: "สุดหล่อ",
  gender: "male",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
};

export const MOCK_CREDENTIALS = {
  username: "0812345678",
  password: "password123",
};

// ─── ACTIVITIES ──────────────────────────────────────────────────────────────

export const ACTIVITY_MEDICINE: HabitActivity = {
  id: "act-med-001",
  userId: MOCK_USER.id,
  category: "medicine",
  name: "ยาเช้า",
  schedule: { frequency: "daily", weekdays: [] },
  mealRelation: "after",
  mealSlots: ["breakfast"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archived: false,
};

export const ACTIVITY_NUTRITION: HabitActivity = {
  id: "act-nut-001",
  userId: MOCK_USER.id,
  category: "nutrition",
  name: "บันทึกอาหาร",
  schedule: { frequency: "daily", weekdays: [] },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archived: false,
};

export const ACTIVITY_SYMPTOMS: HabitActivity = {
  id: "act-sym-001",
  userId: MOCK_USER.id,
  category: "physical",
  physicalCategory: "symptoms",
  name: "ติดตามอาการ",
  schedule: { frequency: "daily", weekdays: [] },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archived: false,
};

export const ACTIVITY_EMOTION: HabitActivity = {
  id: "act-emo-001",
  userId: MOCK_USER.id,
  category: "physical",
  physicalCategory: "emotion-management",
  name: "บันทึกอารมณ์",
  schedule: { frequency: "daily", weekdays: [] },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archived: false,
};

export const ACTIVITY_EXERCISE: HabitActivity = {
  id: "act-exe-001",
  userId: MOCK_USER.id,
  category: "physical",
  physicalCategory: "exercise",
  name: "ออกกำลังกาย",
  schedule: { frequency: "weekly", daysPerWeek: 3 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archived: false,
};

export const ACTIVITY_MONTHLY: HabitActivity = {
  id: "act-mon-001",
  userId: MOCK_USER.id,
  category: "physical",
  physicalCategory: "doctor-visit",
  name: "พบแพทย์",
  schedule: { frequency: "monthly", daysPerMonth: 1 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archived: false,
};

// ─── OCCURRENCES ─────────────────────────────────────────────────────────────

export const TODAY = "2026-05-29";

export const OCC_MEDICINE: HabitOccurrence = {
  id: "occ-med-001",
  activityId: ACTIVITY_MEDICINE.id,
  date: TODAY,
  status: "pending",
};

export const OCC_NUTRITION: HabitOccurrence = {
  id: "occ-nut-001",
  activityId: ACTIVITY_NUTRITION.id,
  date: TODAY,
  status: "pending",
};

export const OCC_SYMPTOMS: HabitOccurrence = {
  id: "occ-sym-001",
  activityId: ACTIVITY_SYMPTOMS.id,
  date: TODAY,
  status: "pending",
};

export const OCC_EMOTION: HabitOccurrence = {
  id: "occ-emo-001",
  activityId: ACTIVITY_EMOTION.id,
  date: TODAY,
  status: "pending",
};

export const OCC_DONE: HabitOccurrence = {
  id: "occ-done-001",
  activityId: ACTIVITY_MEDICINE.id,
  date: TODAY,
  status: "done",
  completedAt: "2026-05-29T08:00:00.000Z",
};

// ─── CHECKINS ─────────────────────────────────────────────────────────────────

export const MEDICINE_CHECKIN: MedicineCheckin = {
  occurrenceId: OCC_MEDICINE.id,
  medicineName: "ยาเช้า",
  mealRelation: "after",
  mealSlots: ["breakfast"],
  sideEffects: [
    { id: "se1", label: "คลื่นไส้", checked: true },
    { id: "se2", label: "ปวดท้อง", checked: false },
    { id: "se3", label: "ผื่นคัน", checked: false },
  ],
};

export const NUTRITION_CHECKIN: NutritionCheckin = {
  occurrenceId: OCC_NUTRITION.id,
  activityName: "บันทึกอาหาร",
  breakfast: "ข้าวต้มหมู",
  lunch: "ผัดกะเพรา",
  dinner: "ต้มยำกุ้ง",
};

export const SYMPTOMS_CHECKIN: UnusualSymptomsCheckin = {
  occurrenceId: OCC_SYMPTOMS.id,
  items: [
    { id: "s1", label: "เหนื่อยง่าย / อ่อนเพลีย", checked: true },
    { id: "s2", label: "ปวดหัว", checked: false },
    { id: "s3", label: "คลื่นไส้ / อาเจียน", checked: false },
    { id: "s4", label: "ปวดตามข้อหรือกล้ามเนื้อ", checked: true },
    { id: "s5", label: "มีไข้ / หนาวสั่น", checked: false },
  ],
};

export const MOOD_CHECKIN: MoodCheckin = {
  occurrenceId: OCC_EMOTION.id,
  mood: "good",
  sliderValue: 40,
};

// ─── TODAY ENTRIES (raw API payload) ─────────────────────────────────────────

/** What GET /api/habits/today returns (before transformResponse). */
export const TODAY_ENTRIES_RESPONSE = {
  entries: [
    {
      activity: ACTIVITY_MEDICINE,
      occurrence: OCC_MEDICINE,
      subline: "หลังอาหารเช้า",
      accent: "#57a8db",
    },
    {
      activity: ACTIVITY_NUTRITION,
      occurrence: OCC_NUTRITION,
      subline: "ทุกวัน",
      accent: "#2eb563",
    },
    {
      activity: ACTIVITY_SYMPTOMS,
      occurrence: OCC_SYMPTOMS,
      subline: "ทุกวัน",
      accent: "#e76f51",
    },
    {
      activity: ACTIVITY_EMOTION,
      occurrence: OCC_EMOTION,
      subline: "ทุกวัน",
      accent: "#ee8a4a",
    },
  ] as TodayHabitEntry[],
};

// ─── WEEKLY (raw API payload) ─────────────────────────────────────────────────

export const WEEK_START = "2026-05-25";
const WEEK_DATES = ["2026-05-25","2026-05-26","2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-05-31"];

export const WEEKLY_RESPONSE = {
  weekStartDate: WEEK_START,
  rowsByActivity: [
    {
      activityId: ACTIVITY_EXERCISE.id,
      activityName: ACTIVITY_EXERCISE.name,
      category: "physical",
      dates: WEEK_DATES,
      occurrences: WEEK_DATES.map((date, i) => ({
        id: `occ-exe-w${i}`,
        activityId: ACTIVITY_EXERCISE.id,
        date,
        status: i < 2 ? "done" : "pending" as const,
      })),
    },
  ],
  summary: { done: 2, target: 7 },
};

// ─── MONTHLY (raw API payload) ────────────────────────────────────────────────

export const MONTH = "2026-05";
const MONTH_DATES = Array.from({ length: 31 }, (_, i) =>
  `2026-05-${String(i + 1).padStart(2, "0")}`
);

export const MONTHLY_RESPONSE = {
  month: MONTH,
  rowsByActivity: [
    {
      activityId: ACTIVITY_MONTHLY.id,
      activityName: ACTIVITY_MONTHLY.name,
      category: "physical",
      dates: MONTH_DATES,
      occurrences: MONTH_DATES.map((date, i) => ({
        id: `occ-mon-m${i}`,
        activityId: ACTIVITY_MONTHLY.id,
        date,
        status: i === 14 ? "done" : "pending" as const,
      })),
    },
  ],
  summary: { done: 1, target: 31 },
};

// ─── MONTHLY SUMMARY (raw API payload) ────────────────────────────────────────

export const SUMMARY_RESPONSE = {
  goals: [
    { activityId: ACTIVITY_MEDICINE.id,  name: ACTIVITY_MEDICINE.name,  subline: "หลังอาหารเช้า", progressPercent: 70 },
    { activityId: ACTIVITY_NUTRITION.id, name: ACTIVITY_NUTRITION.name, subline: "ทุกวัน",          progressPercent: 50 },
  ],
  results: {
    totalDone: 30,
    target: 62,
    skipped: 2,
    fullDays: 8,
    longestStreak: 5,
    completionPercent: 48,
  },
};
