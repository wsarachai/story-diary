import { v4 as uuidv4 } from "uuid";
import {
    findHabitActivityById,
    findHabitActivityByIdForUser,
    findHabitActivityConflictByName,
    findOccurrenceById,
    listHabitActivitiesByUser,
    listOccurrencesByActivityAndDateRange,
    replaceMedicineCheckin,
    replaceMoodCheckin,
    replaceNutritionCheckin,
    replaceSymptomsCheckin,
    updateHabitActivity as updateHabitActivityDoc,
    updateOccurrence,
    upsertPendingOccurrence,
    insertHabitActivity,
    type HabitActivityDoc,
    type HabitOccurrenceDoc,
} from "../db";
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

function rowToActivity(row: HabitActivityDoc): HabitActivity {
    const schedule = JSON.parse(row.schedule_json) as HabitSchedule;
    const activity: HabitActivity = {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        name: row.name,
        schedule,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archived: row.archived,
    };
    if (row.physical_category) activity.physicalCategory = row.physical_category as HabitActivity["physicalCategory"];
    if (row.icon_color) activity.iconColor = row.icon_color as `#${string}`;
    if (row.meal_relation) activity.mealRelation = row.meal_relation;
    if (row.meal_slots_json) activity.mealSlots = JSON.parse(row.meal_slots_json);
    return activity;
}

function rowToOccurrence(row: HabitOccurrenceDoc): HabitOccurrence {
    return {
        id: row.id,
        activityId: row.activity_id,
        date: row.date,
        status: row.status,
        ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    };
}

function normalizeActivityName(name: string): string {
    return name.trim().toLowerCase();
}

function isScheduledOnDate(activity: HabitActivity, date: string): boolean {
    const currentDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = currentDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const schedule = activity.schedule;

    switch (schedule.frequency) {
        case "daily":
            return schedule.weekdays.length === 0 || schedule.weekdays.includes(dayOfWeek);
        case "weekly":
        case "monthly":
        case "todo":
            return true;
        default:
            return false;
    }
}

async function ensureOccurrence(activityId: string, date: string): Promise<HabitOccurrence> {
    const saved = await upsertPendingOccurrence({
        id: uuidv4(),
        activity_id: activityId,
        date,
        status: "pending",
        completed_at: null,
    });
    return rowToOccurrence(saved);
}

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
    const schedule = activity.schedule;

    switch (schedule.frequency) {
        case "daily": parts.push("ทุกวัน"); break;
        case "weekly": parts.push(`${schedule.daysPerWeek} วัน/สัปดาห์`); break;
        case "monthly": parts.push(`${schedule.daysPerMonth} วัน/เดือน`); break;
        case "todo":
            if (schedule.importance === "high") parts.push("สำคัญมาก");
            else if (schedule.importance === "moderate") parts.push("สำคัญปานกลาง");
            else parts.push("ทั่วไป");
            break;
    }

    if (activity.mealRelation) {
        const relation = activity.mealRelation === "before" ? "ก่อนอาหาร" : "หลังอาหาร";
        const slots = (activity.mealSlots ?? []).map((slot) => {
            switch (slot) {
                case "breakfast": return "เช้า";
                case "lunch": return "กลางวัน";
                case "dinner": return "เย็น";
                case "before-bed": return "ก่อนนอน";
            }
        });
        parts.push(slots.length > 0 ? `${relation}${slots.join("-")}` : relation);
    }

    return parts.join(" · ");
}

async function getOwnedOccurrenceDoc(userId: string, occurrenceId: string): Promise<HabitOccurrenceDoc> {
    const occurrence = await findOccurrenceById(occurrenceId);
    if (!occurrence) {
        throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
    }

    const activity = await findHabitActivityById(occurrence.activity_id);
    if (!activity || activity.user_id !== userId) {
        throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
    }

    return occurrence;
}

function weekDates(weekStart: string): string[] {
    const dates: string[] = [];
    const start = new Date(`${weekStart}T00:00:00`);
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        dates.push(currentDate.toISOString().slice(0, 10));
    }
    return dates;
}

function monthDates(month: string): string[] {
    const [year, monthIndex] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
        dates.push(`${month}-${String(day).padStart(2, "0")}`);
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

interface MonthlyRow {
    activityId: string;
    activityName: string;
    category: string;
    occurrences: HabitOccurrence[];
    dates: string[];
}

export async function getTodayEntries(userId: string, date: string): Promise<TodayHabitEntry[]> {
    const rows = await listHabitActivitiesByUser(userId);
    const entries: TodayHabitEntry[] = [];

    for (const row of rows) {
        const activity = rowToActivity(row);
        if (!isScheduledOnDate(activity, date)) continue;

        const occurrence = await ensureOccurrence(activity.id, date);
        entries.push({
            activity,
            occurrence,
            subline: buildSubline(activity),
            accent: accentForCategory(activity.category),
        });
    }

    return entries;
}

export async function getActivities(userId: string): Promise<HabitActivity[]> {
    const rows = await listHabitActivitiesByUser(userId);
    return rows.map(rowToActivity);
}

export async function createActivity(
    userId: string,
    data: Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<HabitActivity> {
    const normalizedName = normalizeActivityName(data.name);
    const conflict = await findHabitActivityConflictByName(userId, normalizedName);

    if (conflict) {
        throw Errors.conflict("ACTIVITY_NAME_TAKEN", "An activity with this name already exists");
    }

    const now = new Date().toISOString();
    const activity: HabitActivityDoc = {
        id: uuidv4(),
        user_id: userId,
        category: data.category,
        physical_category: data.physicalCategory ?? null,
        name: data.name.trim(),
        name_normalized: normalizedName,
        icon_color: data.iconColor ?? null,
        schedule_json: JSON.stringify(data.schedule),
        meal_relation: data.mealRelation ?? null,
        meal_slots_json: data.mealSlots ? JSON.stringify(data.mealSlots) : null,
        created_at: now,
        updated_at: now,
        archived: data.archived ?? false,
    };

    await insertHabitActivity(activity);
    return rowToActivity(activity);
}

export async function updateActivity(
    userId: string,
    activityId: string,
    patch: Partial<Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<HabitActivity> {
    const existing = await findHabitActivityByIdForUser(activityId, userId);

    if (!existing) {
        throw Errors.notFound("VALIDATION_ERROR", "Activity not found");
    }

    if (patch.name && normalizeActivityName(patch.name) !== existing.name_normalized) {
        const conflict = await findHabitActivityConflictByName(userId, normalizeActivityName(patch.name), activityId);
        if (conflict) {
            throw Errors.conflict("ACTIVITY_NAME_TAKEN", "An activity with this name already exists");
        }
    }

    const updates: Partial<HabitActivityDoc> = {};

    if (patch.name !== undefined) {
        updates.name = patch.name.trim();
        updates.name_normalized = normalizeActivityName(patch.name);
    }
    if (patch.category !== undefined) updates.category = patch.category;
    if (patch.physicalCategory !== undefined) updates.physical_category = patch.physicalCategory;
    if (patch.iconColor !== undefined) updates.icon_color = patch.iconColor;
    if (patch.schedule !== undefined) updates.schedule_json = JSON.stringify(patch.schedule);
    if (patch.mealRelation !== undefined) updates.meal_relation = patch.mealRelation;
    if (patch.mealSlots !== undefined) updates.meal_slots_json = JSON.stringify(patch.mealSlots);
    if (patch.archived !== undefined) updates.archived = patch.archived;

    if (Object.keys(updates).length === 0) {
        return rowToActivity(existing);
    }

    updates.updated_at = new Date().toISOString();

    const updated = await updateHabitActivityDoc(activityId, updates);
    if (!updated) {
        throw Errors.notFound("VALIDATION_ERROR", "Activity not found");
    }

    return rowToActivity(updated);
}

export async function archiveActivity(userId: string, activityId: string): Promise<void> {
    const existing = await findHabitActivityByIdForUser(activityId, userId);

    if (!existing) {
        throw Errors.notFound("VALIDATION_ERROR", "Activity not found");
    }

    await updateHabitActivityDoc(activityId, {
        archived: true,
        updated_at: new Date().toISOString(),
    });
}

export async function toggleOccurrence(
    userId: string,
    occurrenceId: string,
    status: HabitOccurrenceStatus
): Promise<HabitOccurrence> {
    await getOwnedOccurrenceDoc(userId, occurrenceId);

    const updated = await updateOccurrence(occurrenceId, {
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
    });

    if (!updated) {
        throw Errors.notFound("VALIDATION_ERROR", "Occurrence not found");
    }

    return rowToOccurrence(updated);
}

export async function saveMedicineCheckin(userId: string, data: MedicineCheckin): Promise<void> {
    await getOwnedOccurrenceDoc(userId, data.occurrenceId);
    const now = new Date().toISOString();

    await replaceMedicineCheckin({
        id: uuidv4(),
        occurrence_id: data.occurrenceId,
        medicine_name: data.medicineName,
        meal_relation: data.mealRelation,
        meal_slots_json: JSON.stringify(data.mealSlots),
        side_effects_json: JSON.stringify(data.sideEffects),
        created_at: now,
    });

    await updateOccurrence(data.occurrenceId, { status: "done", completed_at: now });
}

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
        created_at: now,
    });

    await updateOccurrence(data.occurrenceId, { status: "done", completed_at: now });
}

export async function saveSymptomsCheckin(userId: string, data: UnusualSymptomsCheckin): Promise<void> {
    await getOwnedOccurrenceDoc(userId, data.occurrenceId);
    const now = new Date().toISOString();

    await replaceSymptomsCheckin({
        id: uuidv4(),
        occurrence_id: data.occurrenceId,
        items_json: JSON.stringify(data.items),
        created_at: now,
    });

    await updateOccurrence(data.occurrenceId, { status: "done", completed_at: now });
}

export async function saveMoodCheckin(userId: string, data: MoodCheckin): Promise<void> {
    await getOwnedOccurrenceDoc(userId, data.occurrenceId);
    const now = new Date().toISOString();

    await replaceMoodCheckin({
        id: uuidv4(),
        occurrence_id: data.occurrenceId,
        mood: data.mood,
        slider_value: data.sliderValue,
        created_at: now,
    });

    await updateOccurrence(data.occurrenceId, { status: "done", completed_at: now });
}

export async function getWeeklyView(
    userId: string,
    weekStart: string
): Promise<{ weekStartDate: string; rowsByActivity: WeeklyRow[]; summary: PeriodSummary }> {
    const dates = weekDates(weekStart);
    const allActivities = await getActivities(userId);
    const activities = allActivities.filter(a => a.schedule.frequency === "weekly");

    let totalDone = 0;
    let totalTarget = 0;

    const rowsByActivity = await Promise.all(activities.map(async (activity) => {
        const occurrenceRows = await listOccurrencesByActivityAndDateRange(activity.id, dates[0], dates[dates.length - 1]);
        const byDate = new Map(occurrenceRows.map((row) => [row.date, rowToOccurrence(row)]));
        const occurrences = dates.map((date) => byDate.get(date) ?? {
            id: "",
            activityId: activity.id,
            date,
            status: "pending" as HabitOccurrenceStatus,
        });

        const done = occurrences.filter((occurrence) => occurrence.status === "done").length;
        totalDone += done;
        totalTarget += 7;

        return {
            activityId: activity.id,
            activityName: activity.name,
            category: activity.category,
            occurrences,
            dates,
        };
    }));

    return {
        weekStartDate: weekStart,
        rowsByActivity,
        summary: { done: totalDone, target: totalTarget },
    };
}

export async function getMonthlyView(
    userId: string,
    month: string
): Promise<{ month: string; rowsByActivity: MonthlyRow[]; summary: PeriodSummary }> {
    const dates = monthDates(month);
    const allActivities = await getActivities(userId);
    const activities = allActivities.filter(a => a.schedule.frequency === "monthly");

    let totalDone = 0;
    let totalTarget = 0;

    const rowsByActivity = await Promise.all(activities.map(async (activity) => {
        const occurrenceRows = await listOccurrencesByActivityAndDateRange(activity.id, dates[0], dates[dates.length - 1]);
        const byDate = new Map(occurrenceRows.map((row) => [row.date, rowToOccurrence(row)]));
        const occurrences = dates.map((date) => byDate.get(date) ?? {
            id: "",
            activityId: activity.id,
            date,
            status: "pending" as HabitOccurrenceStatus,
        });

        const done = occurrences.filter((occurrence) => occurrence.status === "done").length;
        totalDone += done;
        totalTarget += dates.length;

        return {
            activityId: activity.id,
            activityName: activity.name,
            category: activity.category,
            occurrences,
            dates,
        };
    }));

    return {
        month,
        rowsByActivity,
        summary: { done: totalDone, target: totalTarget },
    };
}

export async function getMonthlySummary(
    userId: string,
    month: string
): Promise<{ goals: MonthlyGoal[]; results: MonthlyResults }> {
    const dates = monthDates(month);
    const activities = await getActivities(userId);
    const totalDays = dates.length;

    const goals: MonthlyGoal[] = [];
    let overallDone = 0;
    let overallSkipped = 0;
    let overallTarget = 0;

    const dayDoneCount: Record<string, number> = {};
    const dayTotalCount: Record<string, number> = {};

    for (const date of dates) {
        dayDoneCount[date] = 0;
        dayTotalCount[date] = 0;
    }

    for (const activity of activities) {
        const occurrenceRows = await listOccurrencesByActivityAndDateRange(activity.id, dates[0], dates[totalDays - 1]);
        const occurrences = occurrenceRows.map(rowToOccurrence);
        const done = occurrences.filter((occurrence) => occurrence.status === "done").length;
        const skipped = occurrences.filter((occurrence) => occurrence.status === "skipped").length;
        const target = totalDays;

        overallDone += done;
        overallSkipped += skipped;
        overallTarget += target;

        for (const date of dates) {
            dayTotalCount[date]++;
            const occurrence = occurrences.find((item) => item.date === date);
            if (occurrence?.status === "done") {
                dayDoneCount[date]++;
            }
        }

        goals.push({
            activityId: activity.id,
            name: activity.name,
            subline: buildSubline(activity),
            progressPercent: target > 0 ? Math.round((done / target) * 100) : 0,
        });
    }

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

    return {
        goals,
        results: {
            totalDone: overallDone,
            target: overallTarget,
            skipped: overallSkipped,
            fullDays,
            longestStreak,
            completionPercent: overallTarget > 0 ? Math.round((overallDone / overallTarget) * 100) : 0,
        },
    };
}
