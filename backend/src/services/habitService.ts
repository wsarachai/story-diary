/**
 * Habit service — activities, occurrences, check-ins, and aggregated views.
 */
import { v4 as uuidv4 } from "uuid";
import db from "../db";
import { Errors } from "../lib/errors";
import type {
  HabitActivity,
  HabitOccurrence,
  HabitOccurrenceStatus,
  HabitSchedule,
  TodayHabitEntry,
  PeriodSummary,
  MedicineCheckin,
  NutritionCheckin,
  UnusualSymptomsCheckin,
  MoodCheckin,
  MonthlyGoal,
  MonthlyResults,
} from "../../../src/types/habit";

// ──────────────────────────────────────────────────────────────────────────
// Row types
// ──────────────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  user_id: string;
  category: string;
  physical_category: string | null;
  name: string;
  icon_color: string | null;
  schedule_json: string;
  meal_relation: string | null;
  meal_slots_json: string | null;
  created_at: string;
  updated_at: string;
  archived: number;
}

interface OccurrenceRow {
  id: string;
  activity_id: string;
  date: string;
  status: string;
  completed_at: string | null;
}

// ──────────────────────────────────────────────────────────────────────────
// Converters
// ──────────────────────────────────────────────────────────────────────────

function rowToActivity(row: ActivityRow): HabitActivity {
  const schedule = JSON.parse(row.schedule_json) as HabitSchedule;
  const activity: HabitActivity = {
    id: row.id,
    userId: row.user_id,
    category: row.category as HabitActivity["category"],
    name: row.name,
    schedule,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived === 1,
  };
  if (row.physical_category) activity.physicalCategory = row.physical_category as HabitActivity["physicalCategory"];
  if (row.icon_color) activity.iconColor = row.icon_color as `#${string}`;
  if (row.meal_relation) activity.mealRelation = row.meal_relation as HabitActivity["mealRelation"];
  if (row.meal_slots_json) activity.mealSlots = JSON.parse(row.meal_slots_json);
  return activity;
}

function rowToOccurrence(row: OccurrenceRow): HabitOccurrence {
  return {
    id: row.id,
    activityId: row.activity_id,
    date: row.date,
    status: row.status as HabitOccurrenceStatus,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Occurrence generation helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Returns true if an activity is scheduled for a given date (YYYY-MM-DD).
 */
function isScheduledOnDate(activity: HabitActivity, date: string): boolean {
  const d = new Date(date + "T00:00:00");
  const dayOfWeek = d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const schedule = activity.schedule;

  switch (schedule.frequency) {
    case "daily":
      return schedule.weekdays.length === 0 || schedule.weekdays.includes(dayOfWeek);
    case "weekly":
    case "monthly":
      // For weekly/monthly activities, we create occurrences for every day — the
      // count constraint is advisory (target); tracking shows all days.
      return true;
    case "todo":
      // Todo activities appear every day until done
      return true;
    default:
      return false;
  }
}

/**
 * Ensures an occurrence row exists for the given activity+date.
 * Returns the existing or newly created row.
 */
function ensureOccurrence(activityId: string, date: string): HabitOccurrence {
  const existing = db
    .prepare("SELECT * FROM habit_occurrences WHERE activity_id = ? AND date = ?")
    .get(activityId, date) as OccurrenceRow | undefined;

  if (existing) return rowToOccurrence(existing);

  const id = uuidv4();
  db.prepare(
    "INSERT INTO habit_occurrences (id, activity_id, date, status) VALUES (?, ?, ?, 'pending')"
  ).run(id, activityId, date);

  return { id, activityId, date, status: "pending" };
}

// ──────────────────────────────────────────────────────────────────────────
// Accent colours (s012 entry-med / entry-food / entry-body)
// ──────────────────────────────────────────────────────────────────────────

function accentForCategory(category: string): `#${string}` {
  switch (category) {
    case "medicine": return "#57a8db";
    case "nutrition": return "#2eb563";
    case "physical": return "#ee8a4a";
    default: return "#aaaaaa";
  }
}

function buildSubline(activity: HabitActivity): string {
  const parts: string[] = [];
  const sched = activity.schedule;

  switch (sched.frequency) {
    case "daily": parts.push("ทุกวัน"); break;
    case "weekly": parts.push(`${sched.daysPerWeek} วัน/สัปดาห์`); break;
    case "monthly": parts.push(`${sched.daysPerMonth} วัน/เดือน`); break;
    case "todo":
      if (sched.importance === "high") parts.push("สำคัญมาก");
      else if (sched.importance === "moderate") parts.push("สำคัญปานกลาง");
      else parts.push("ทั่วไป");
      break;
  }

  if (activity.mealRelation) {
    const rel = activity.mealRelation === "before" ? "ก่อนอาหาร" : "หลังอาหาร";
    const slots = (activity.mealSlots ?? []).map((s) => {
      switch (s) {
        case "breakfast": return "เช้า";
        case "lunch": return "กลางวัน";
        case "dinner": return "เย็น";
        case "before-bed": return "ก่อนนอน";
      }
    });
    if (slots.length > 0) parts.push(`${rel}${slots.join("-")}`);
    else parts.push(rel);
  }

  return parts.join(" · ");
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

export function getTodayEntries(userId: string, date: string): TodayHabitEntry[] {
  const rows = db
    .prepare("SELECT * FROM habit_activities WHERE user_id = ? AND archived = 0")
    .all(userId) as ActivityRow[];

  const entries: TodayHabitEntry[] = [];

  for (const row of rows) {
    const activity = rowToActivity(row);
    if (!isScheduledOnDate(activity, date)) continue;

    const occurrence = ensureOccurrence(activity.id, date);

    entries.push({
      activity,
      occurrence,
      subline: buildSubline(activity),
      accent: accentForCategory(activity.category),
    });
  }

  return entries;
}

export function getActivities(userId: string): HabitActivity[] {
  const rows = db
    .prepare("SELECT * FROM habit_activities WHERE user_id = ? AND archived = 0 ORDER BY created_at ASC")
    .all(userId) as ActivityRow[];
  return rows.map(rowToActivity);
}

export function createActivity(
  userId: string,
  data: Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">
): HabitActivity {
  // Check for duplicate name within user's activities
  const conflict = db
    .prepare("SELECT id FROM habit_activities WHERE user_id = ? AND LOWER(name) = LOWER(?) AND archived = 0")
    .get(userId, data.name.trim()) as { id: string } | undefined;

  if (conflict) {
    throw Errors.conflict("ACTIVITY_NAME_TAKEN", "An activity with this name already exists");
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO habit_activities
      (id, user_id, category, physical_category, name, icon_color, schedule_json, meal_relation, meal_slots_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.category,
    data.physicalCategory ?? null,
    data.name.trim(),
    data.iconColor ?? null,
    JSON.stringify(data.schedule),
    data.mealRelation ?? null,
    data.mealSlots ? JSON.stringify(data.mealSlots) : null,
    now,
    now
  );

  const row = db.prepare("SELECT * FROM habit_activities WHERE id = ?").get(id) as ActivityRow;
  return rowToActivity(row);
}

export function updateActivity(
  userId: string,
  activityId: string,
  patch: Partial<Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">>
): HabitActivity {
  const existing = db
    .prepare("SELECT * FROM habit_activities WHERE id = ? AND user_id = ?")
    .get(activityId, userId) as ActivityRow | undefined;

  if (!existing) {
    throw Errors.notFound("VALIDATION_ERROR", "Activity not found");
  }

  // Check name uniqueness if name is being changed
  if (patch.name && patch.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const conflict = db
      .prepare("SELECT id FROM habit_activities WHERE user_id = ? AND LOWER(name) = LOWER(?) AND archived = 0 AND id != ?")
      .get(userId, patch.name.trim(), activityId) as { id: string } | undefined;
    if (conflict) {
      throw Errors.conflict("ACTIVITY_NAME_TAKEN", "An activity with this name already exists");
    }
  }

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) { updates.push("name = ?"); values.push(patch.name.trim()); }
  if (patch.category !== undefined) { updates.push("category = ?"); values.push(patch.category); }
  if (patch.physicalCategory !== undefined) { updates.push("physical_category = ?"); values.push(patch.physicalCategory); }
  if (patch.iconColor !== undefined) { updates.push("icon_color = ?"); values.push(patch.iconColor); }
  if (patch.schedule !== undefined) { updates.push("schedule_json = ?"); values.push(JSON.stringify(patch.schedule)); }
  if (patch.mealRelation !== undefined) { updates.push("meal_relation = ?"); values.push(patch.mealRelation); }
  if (patch.mealSlots !== undefined) { updates.push("meal_slots_json = ?"); values.push(JSON.stringify(patch.mealSlots)); }
  if (patch.archived !== undefined) { updates.push("archived = ?"); values.push(patch.archived ? 1 : 0); }

  if (updates.length === 0) {
    return rowToActivity(existing);
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(activityId);

  db.prepare(`UPDATE habit_activities SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT * FROM habit_activities WHERE id = ?").get(activityId) as ActivityRow;
  return rowToActivity(updated);
}

export function archiveActivity(userId: string, activityId: string): void {
  const existing = db
    .prepare("SELECT id FROM habit_activities WHERE id = ? AND user_id = ?")
    .get(activityId, userId) as { id: string } | undefined;

  if (!existing) {
    throw Errors.notFound("VALIDATION_ERROR", "Activity not found");
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE habit_activities SET archived = 1, updated_at = ? WHERE id = ?").run(now, activityId);
}

export function toggleOccurrence(
  userId: string,
  occurrenceId: string,
  status: HabitOccurrenceStatus
): HabitOccurrence {
  // Join to verify ownership
  const row = db.prepare(`
    SELECT o.* FROM habit_occurrences o
    JOIN habit_activities a ON a.id = o.activity_id
    WHERE o.id = ? AND a.user_id = ?
  `).get(occurrenceId, userId) as OccurrenceRow | undefined;

  if (!row) {
    throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
  }

  const completedAt = status === "done" ? new Date().toISOString() : null;
  db.prepare("UPDATE habit_occurrences SET status = ?, completed_at = ? WHERE id = ?")
    .run(status, completedAt, occurrenceId);

  const updated = db.prepare("SELECT * FROM habit_occurrences WHERE id = ?").get(occurrenceId) as OccurrenceRow;
  return rowToOccurrence(updated);
}

export function saveMedicineCheckin(userId: string, data: MedicineCheckin): void {
  // Verify occurrence ownership
  const row = db.prepare(`
    SELECT o.id FROM habit_occurrences o
    JOIN habit_activities a ON a.id = o.activity_id
    WHERE o.id = ? AND a.user_id = ?
  `).get(data.occurrenceId, userId);

  if (!row) {
    throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO medicine_checkins (id, occurrence_id, medicine_name, meal_relation, meal_slots_json, side_effects_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.occurrenceId, data.medicineName, data.mealRelation, JSON.stringify(data.mealSlots), JSON.stringify(data.sideEffects), now);

  // Mark occurrence done
  db.prepare("UPDATE habit_occurrences SET status = 'done', completed_at = ? WHERE id = ?")
    .run(now, data.occurrenceId);
}

export function saveNutritionCheckin(userId: string, data: NutritionCheckin): void {
  const row = db.prepare(`
    SELECT o.id FROM habit_occurrences o
    JOIN habit_activities a ON a.id = o.activity_id
    WHERE o.id = ? AND a.user_id = ?
  `).get(data.occurrenceId, userId);

  if (!row) {
    throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO nutrition_checkins (id, occurrence_id, activity_name, breakfast, lunch, dinner, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.occurrenceId, data.activityName, data.breakfast, data.lunch, data.dinner, now);

  db.prepare("UPDATE habit_occurrences SET status = 'done', completed_at = ? WHERE id = ?")
    .run(now, data.occurrenceId);
}

export function saveSymptomsCheckin(userId: string, data: UnusualSymptomsCheckin): void {
  const row = db.prepare(`
    SELECT o.id FROM habit_occurrences o
    JOIN habit_activities a ON a.id = o.activity_id
    WHERE o.id = ? AND a.user_id = ?
  `).get(data.occurrenceId, userId);

  if (!row) {
    throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO symptoms_checkins (id, occurrence_id, items_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, data.occurrenceId, JSON.stringify(data.items), now);

  db.prepare("UPDATE habit_occurrences SET status = 'done', completed_at = ? WHERE id = ?")
    .run(now, data.occurrenceId);
}

export function saveMoodCheckin(userId: string, data: MoodCheckin): void {
  const row = db.prepare(`
    SELECT o.id FROM habit_occurrences o
    JOIN habit_activities a ON a.id = o.activity_id
    WHERE o.id = ? AND a.user_id = ?
  `).get(data.occurrenceId, userId);

  if (!row) {
    throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO mood_checkins (id, occurrence_id, mood, slider_value, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.occurrenceId, data.mood, data.sliderValue, now);

  db.prepare("UPDATE habit_occurrences SET status = 'done', completed_at = ? WHERE id = ?")
    .run(now, data.occurrenceId);
}

// ──────────────────────────────────────────────────────────────────────────
// Weekly / monthly views
// ──────────────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD strings for a 7-day week starting from weekStart */
function weekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Returns YYYY-MM-DD strings for every day in a month (YYYY-MM) */
function monthDates(month: string): string[] {
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

interface WeeklyRow {
  activityId: string;
  activityName: string;
  category: string;
  occurrences: HabitOccurrence[];
  dates: string[];
}

export function getWeeklyView(
  userId: string,
  weekStart: string
): { weekStartDate: string; rowsByActivity: WeeklyRow[]; summary: PeriodSummary } {
  const dates = weekDates(weekStart);
  const activities = getActivities(userId);

  let totalDone = 0;
  let totalTarget = 0;

  const rowsByActivity: WeeklyRow[] = activities.map((activity) => {
    const occurrences = dates.map((date) => {
      const existing = db
        .prepare("SELECT * FROM habit_occurrences WHERE activity_id = ? AND date = ?")
        .get(activity.id, date) as OccurrenceRow | undefined;

      if (existing) return rowToOccurrence(existing);
      return { id: "", activityId: activity.id, date, status: "pending" as HabitOccurrenceStatus };
    });

    const done = occurrences.filter((o) => o.status === "done").length;
    totalDone += done;
    totalTarget += 7; // one per day in a week

    return { activityId: activity.id, activityName: activity.name, category: activity.category, occurrences, dates };
  });

  return {
    weekStartDate: weekStart,
    rowsByActivity,
    summary: { done: totalDone, target: totalTarget },
  };
}

interface MonthlyRow {
  activityId: string;
  activityName: string;
  category: string;
  occurrences: HabitOccurrence[];
  dates: string[];
}

export function getMonthlyView(
  userId: string,
  month: string
): { month: string; rowsByActivity: MonthlyRow[]; summary: PeriodSummary } {
  const dates = monthDates(month);
  const activities = getActivities(userId);

  let totalDone = 0;
  let totalTarget = 0;

  const rowsByActivity: MonthlyRow[] = activities.map((activity) => {
    const occurrences = dates.map((date) => {
      const existing = db
        .prepare("SELECT * FROM habit_occurrences WHERE activity_id = ? AND date = ?")
        .get(activity.id, date) as OccurrenceRow | undefined;

      if (existing) return rowToOccurrence(existing);
      return { id: "", activityId: activity.id, date, status: "pending" as HabitOccurrenceStatus };
    });

    const done = occurrences.filter((o) => o.status === "done").length;
    totalDone += done;
    totalTarget += dates.length;

    return { activityId: activity.id, activityName: activity.name, category: activity.category, occurrences, dates };
  });

  return {
    month,
    rowsByActivity,
    summary: { done: totalDone, target: totalTarget },
  };
}

export function getMonthlySummary(
  userId: string,
  month: string
): { goals: MonthlyGoal[]; results: MonthlyResults } {
  const dates = monthDates(month);
  const activities = getActivities(userId);
  const totalDays = dates.length;

  const goals: MonthlyGoal[] = [];
  let overallDone = 0;
  let overallSkipped = 0;
  let overallTarget = 0;

  // Track per-day completion for streak/fullDays
  const dayDoneCount: Record<string, number> = {};
  const dayTotalCount: Record<string, number> = {};

  for (const date of dates) {
    dayDoneCount[date] = 0;
    dayTotalCount[date] = 0;
  }

  for (const activity of activities) {
    const occurrences = db
      .prepare("SELECT * FROM habit_occurrences WHERE activity_id = ? AND date >= ? AND date <= ?")
      .all(activity.id, dates[0], dates[totalDays - 1]) as OccurrenceRow[];

    const done = occurrences.filter((o) => o.status === "done").length;
    const skipped = occurrences.filter((o) => o.status === "skipped").length;
    const target = totalDays;

    overallDone += done;
    overallSkipped += skipped;
    overallTarget += target;

    for (const date of dates) {
      dayTotalCount[date]++;
      const occ = occurrences.find((o) => o.date === date);
      if (occ?.status === "done") dayDoneCount[date]++;
    }

    goals.push({
      activityId: activity.id,
      name: activity.name,
      subline: buildSubline(activity),
      progressPercent: target > 0 ? Math.round((done / target) * 100) : 0,
    });
  }

  // Full days (every scheduled activity done)
  let fullDays = 0;
  let longestStreak = 0;
  let currentStreak = 0;

  for (const date of dates) {
    const isFullDay = dayTotalCount[date] > 0 && dayDoneCount[date] === dayTotalCount[date];
    if (isFullDay) {
      fullDays++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const completionPercent = overallTarget > 0 ? Math.round((overallDone / overallTarget) * 100) : 0;

  return {
    goals,
    results: {
      totalDone: overallDone,
      target: overallTarget,
      skipped: overallSkipped,
      fullDays,
      longestStreak,
      completionPercent,
    },
  };
}
