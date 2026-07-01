import { v4 as uuidv4 } from "uuid";
import {
    findHabitActivityById,
    findHabitActivityByIdForUser,
    findHabitActivityConflictByName,
    findOccurrenceById,
    listHabitActivitiesByUser,
    listOccurrencesByActivityAndDateRange,
    findMedicineCheckinByOccurrence,
    findNutritionCheckinByOccurrence,
    findSymptomsCheckinByOccurrence,
    findMoodCheckinByOccurrence,
    findExerciseCheckinByOccurrence,
    replaceMedicineCheckin,
    replaceMoodCheckin,
    replaceExerciseCheckin,
    replaceNutritionCheckin,
    replaceSymptomsCheckin,
    updateHabitActivity as updateHabitActivityDoc,
    updateOccurrence,
    upsertPendingOccurrence,
    insertHabitActivity,
    type HabitActivityDoc,
    type HabitOccurrenceDoc,
} from "@/lib/db";
import { Errors } from "@/lib/errors";
import type {
    HabitActivity,
    HabitOccurrence,
    HabitOccurrenceStatus,
    HabitSchedule,
    TodayHabitEntry,
    PeriodSummary,
    HabitGridCell,
    HabitGridRow,
    MedicineCheckin,
    NutritionCheckin,
    UnusualSymptomsCheckin,
    MoodCheckin,
    ExerciseCheckin,
    MoodLevel,
    SymptomCheck,
    MonthlyGoal,
    MonthlyResults,
    MealSlot,
    NutritionPresetKey,
    PhysicalPresetKey,
} from "@/types/habit";
import { NUTRITION_PRESETS, PHYSICAL_PRESET_CATEGORY } from "@/types/habit";

function isNutritionPresetKey(value: unknown): value is NutritionPresetKey {
    return typeof value === "string" && value in NUTRITION_PRESETS;
}

function resolveNutritionName(name: string, nutritionPreset?: NutritionPresetKey): string {
    if (nutritionPreset) {
        return NUTRITION_PRESETS[nutritionPreset];
    }
    return name.trim();
}

function rowToActivity(row: HabitActivityDoc): HabitActivity {
    const schedule = JSON.parse(row.schedule_json) as HabitSchedule;
    const nutritionPreset = isNutritionPresetKey(row.nutrition_preset) ? row.nutrition_preset : undefined;
    const activity: HabitActivity = {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        name: resolveNutritionName(row.name, nutritionPreset),
        schedule,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archived: row.archived,
    };
    if (nutritionPreset) activity.nutritionPreset = nutritionPreset;
    if (row.physical_category) {
        activity.physicalCategory = row.physical_category as HabitActivity["physicalCategory"];
    } else if (row.physical_preset && row.physical_preset in PHYSICAL_PRESET_CATEGORY) {
        activity.physicalCategory = PHYSICAL_PRESET_CATEGORY[row.physical_preset as PhysicalPresetKey];
    }
    if (row.physical_preset) activity.physicalPreset = row.physical_preset as HabitActivity["physicalPreset"];
    if (row.icon_color) activity.iconColor = row.icon_color as `#${string}`;
    if (row.meal_relation) activity.mealRelation = row.meal_relation;
    if (row.meal_slots_json) activity.mealSlots = JSON.parse(row.meal_slots_json);
    if (row.medicine_key) activity.medicineKey = row.medicine_key as HabitActivity["medicineKey"];
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
        // Format from local components: toISOString() converts to UTC, which
        // shifts local midnight to the previous day in UTC+ timezones.
        dates.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`);
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

/**
 * Real target for an activity over a period of dates.
 *   daily   → number of scheduled weekdays among `dates`
 *   weekly  → daysPerWeek in a week view; prorated by length in a month view
 *   monthly → daysPerMonth in a month view; 0 in a week view (row is shown
 *             for visibility but adds no weekly target)
 *   todo    → 0 (todo activities are excluded from the grids upstream)
 */
function periodTarget(activity: HabitActivity, dates: string[], period: "week" | "month"): number {
    const schedule = activity.schedule;
    switch (schedule.frequency) {
        case "daily":
            return dates.filter((date) => isScheduledOnDate(activity, date)).length;
        case "weekly":
            return period === "week"
                ? schedule.daysPerWeek
                : Math.round((schedule.daysPerWeek * dates.length) / 7);
        case "monthly":
            return period === "month" ? schedule.daysPerMonth : 0;
        default:
            return 0;
    }
}

async function buildGridRows(
    userId: string,
    dates: string[],
    period: "week" | "month"
): Promise<{ rowsByActivity: HabitGridRow[]; summary: PeriodSummary }> {
    const allActivities = await getActivities(userId);
    const activities = allActivities.filter((a) => a.schedule.frequency !== "todo");

    let totalDone = 0;
    let totalTarget = 0;

    const rowsByActivity = await Promise.all(activities.map(async (activity) => {
        const occurrenceRows = await listOccurrencesByActivityAndDateRange(activity.id, dates[0], dates[dates.length - 1]);
        const byDate = new Map(occurrenceRows.map((row) => [row.date, rowToOccurrence(row)]));
        const cells: HabitGridCell[] = dates.map((date) => ({
            date,
            status: byDate.get(date)?.status ?? "pending",
            scheduled: isScheduledOnDate(activity, date),
        }));

        const done = cells.filter((cell) => cell.status === "done").length;
        const target = periodTarget(activity, dates, period);
        totalDone += done;
        totalTarget += target;

        return {
            activityId: activity.id,
            activityName: activity.name,
            category: activity.category,
            physicalCategory: activity.physicalCategory,
            cells,
            done,
            target,
        };
    }));

    return { rowsByActivity, summary: { done: totalDone, target: totalTarget } };
}

export async function getTodayEntries(userId: string, date: string): Promise<TodayHabitEntry[]> {
    const rows = await listHabitActivitiesByUser(userId);
    const entries: TodayHabitEntry[] = [];

    for (const row of rows) {
        const activity = rowToActivity(row);
        if (!isScheduledOnDate(activity, date)) continue;

        const occurrence = await ensureOccurrence(activity.id, date);

        // Medicine with configured meals carries per-dose progress so the
        // checklist can render the tap counter + background fill without a
        // separate round-trip per row.
        if (activity.category === "medicine" && activity.mealSlots && activity.mealSlots.length > 0) {
            const checkin = await findMedicineCheckinByOccurrence(occurrence.id);
            const checked: MealSlot[] = checkin ? JSON.parse(checkin.meal_slots_json) : [];
            const taken = activity.mealSlots.filter((slot) => checked.includes(slot)).length;
            occurrence.doseProgress = { taken, total: activity.mealSlots.length };
        }

        // Nutrition activities carry per-meal progress so the checklist can
        // render the tap counter + background fill without a separate round-trip.
        if (activity.category === "nutrition") {
            const checkin = await findNutritionCheckinByOccurrence(occurrence.id);
            const slots: MealSlot[] = checkin?.meal_slots_json
                ? JSON.parse(checkin.meal_slots_json)
                : [];
            occurrence.doseProgress = { taken: slots.length, total: 3 };
        }

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
    const nutritionPreset = data.category === "nutrition" && isNutritionPresetKey(data.nutritionPreset)
        ? data.nutritionPreset
        : undefined;
    const resolvedName = resolveNutritionName(data.name, nutritionPreset);
    const normalizedName = normalizeActivityName(resolvedName);
    const conflict = await findHabitActivityConflictByName(userId, normalizedName);

    if (conflict) {
        throw Errors.conflict("ACTIVITY_NAME_TAKEN", "An activity with this name already exists");
    }

    const now = new Date().toISOString();
    const activity: HabitActivityDoc = {
        id: uuidv4(),
        user_id: userId,
        category: data.category,
        nutrition_preset: nutritionPreset ?? null,
        physical_category: data.physicalCategory ?? null,
        physical_preset: data.physicalPreset ?? null,
        name: resolvedName,
        name_normalized: normalizedName,
        icon_color: data.iconColor ?? null,
        schedule_json: JSON.stringify(data.schedule),
        meal_relation: data.mealRelation ?? null,
        meal_slots_json: data.mealSlots ? JSON.stringify(data.mealSlots) : null,
        medicine_key: data.medicineKey ?? null,
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

    const nextCategory = patch.category ?? existing.category;
    const existingNutritionPreset = isNutritionPresetKey(existing.nutrition_preset) ? existing.nutrition_preset : undefined;
    const nextNutritionPreset = nextCategory === "nutrition"
        ? (patch.nutritionPreset !== undefined
            ? (isNutritionPresetKey(patch.nutritionPreset) ? patch.nutritionPreset : undefined)
            : existingNutritionPreset)
        : undefined;

    const incomingName = patch.name ?? existing.name;
    const resolvedName = nextCategory === "nutrition"
        ? resolveNutritionName(incomingName, nextNutritionPreset)
        : incomingName.trim();
    const resolvedNormalized = normalizeActivityName(resolvedName);

    if (resolvedNormalized !== existing.name_normalized) {
        const conflict = await findHabitActivityConflictByName(userId, resolvedNormalized, activityId);
        if (conflict) {
            throw Errors.conflict("ACTIVITY_NAME_TAKEN", "An activity with this name already exists");
        }
    }

    const updates: Partial<HabitActivityDoc> = {};

    if (patch.name !== undefined || patch.category !== undefined || patch.nutritionPreset !== undefined) {
        updates.name = resolvedName;
        updates.name_normalized = resolvedNormalized;
    }
    if (patch.category !== undefined) updates.category = patch.category;
    if (patch.category !== undefined || patch.nutritionPreset !== undefined) {
        updates.nutrition_preset = nextCategory === "nutrition" ? (nextNutritionPreset ?? null) : null;
    }
    if (patch.physicalCategory !== undefined) updates.physical_category = patch.physicalCategory;
    if (patch.physicalPreset !== undefined) updates.physical_preset = patch.physicalPreset;
    if (patch.iconColor !== undefined) updates.icon_color = patch.iconColor;
    if (patch.schedule !== undefined) updates.schedule_json = JSON.stringify(patch.schedule);
    if (patch.mealRelation !== undefined) updates.meal_relation = patch.mealRelation;
    if (patch.mealSlots !== undefined) updates.meal_slots_json = JSON.stringify(patch.mealSlots);
    if (patch.medicineKey !== undefined) updates.medicine_key = patch.medicineKey ?? null;
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

export async function getMedicineCheckin(userId: string, occurrenceId: string): Promise<MedicineCheckin | null> {
    await getOwnedOccurrenceDoc(userId, occurrenceId);
    const doc = await findMedicineCheckinByOccurrence(occurrenceId);
    if (!doc) return null;
    return {
        occurrenceId: doc.occurrence_id,
        medicineName: doc.medicine_name,
        mealRelation: doc.meal_relation as MedicineCheckin["mealRelation"],
        mealSlots: JSON.parse(doc.meal_slots_json),
        sideEffects: JSON.parse(doc.side_effects_json),
        ...(doc.side_effect_note ? { sideEffectNote: doc.side_effect_note } : {}),
    };
}

export async function getNutritionCheckin(userId: string, occurrenceId: string): Promise<NutritionCheckin | null> {
    await getOwnedOccurrenceDoc(userId, occurrenceId);
    const doc = await findNutritionCheckinByOccurrence(occurrenceId);
    if (!doc) return null;
    return {
        occurrenceId: doc.occurrence_id,
        activityName: doc.activity_name,
        breakfast: doc.breakfast,
        lunch: doc.lunch,
        dinner: doc.dinner,
        mealSlots: doc.meal_slots_json ? JSON.parse(doc.meal_slots_json) : [],
    };
}

export async function getSymptomsCheckin(userId: string, occurrenceId: string): Promise<UnusualSymptomsCheckin | null> {
    await getOwnedOccurrenceDoc(userId, occurrenceId);
    const doc = await findSymptomsCheckinByOccurrence(occurrenceId);
    if (!doc) return null;
    return {
        occurrenceId: doc.occurrence_id,
        items: JSON.parse(doc.items_json) as SymptomCheck[],
    };
}

export async function getMoodCheckin(userId: string, occurrenceId: string): Promise<MoodCheckin | null> {
    await getOwnedOccurrenceDoc(userId, occurrenceId);
    const doc = await findMoodCheckinByOccurrence(occurrenceId);
    if (!doc) return null;
    return {
        occurrenceId: doc.occurrence_id,
        mood: (doc.mood ?? null) as MoodLevel | null,
        sliderValue: doc.slider_value ?? null,
        note: doc.note ?? null,
    };
}

export async function saveMedicineCheckin(userId: string, data: MedicineCheckin): Promise<void> {
    const occurrence = await getOwnedOccurrenceDoc(userId, data.occurrenceId);
    const activityDoc = await findHabitActivityById(occurrence.activity_id);
    if (!activityDoc) {
        throw Errors.notFound("VALIDATION_ERROR", "Activity not found");
    }
    const now = new Date().toISOString();

    await replaceMedicineCheckin({
        id: uuidv4(),
        occurrence_id: data.occurrenceId,
        medicine_name: data.medicineName,
        meal_relation: data.mealRelation,
        meal_slots_json: JSON.stringify(data.mealSlots),
        side_effects_json: JSON.stringify(data.sideEffects),
        side_effect_note: data.sideEffectNote ?? null,
        created_at: now,
    });

    const configSlots: MealSlot[] = activityDoc.meal_slots_json ? JSON.parse(activityDoc.meal_slots_json) : [];

    let status: HabitOccurrenceStatus = "done";
    if (configSlots.length > 0) {
        const checkedSlots = data.mealSlots ?? [];
        const allChecked = configSlots.every((slot) => checkedSlots.includes(slot));
        const someChecked = configSlots.some((slot) => checkedSlots.includes(slot));
        status = allChecked ? "done" : someChecked ? "partial" : "pending";
    }

    await updateOccurrence(data.occurrenceId, {
        status,
        completed_at: status === "done" ? now : null,
    });
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
        meal_slots_json: JSON.stringify(data.mealSlots ?? []),
        created_at: now,
    });

    // Status derives from how many meal text-fields contain non-whitespace content.
    const filledCount = [data.breakfast, data.lunch, data.dinner].filter((m) => m.trim().length > 0).length;
    const status: HabitOccurrenceStatus = filledCount === 3 ? "done" : filledCount > 0 ? "partial" : "pending";
    await updateOccurrence(data.occurrenceId, {
        status,
        completed_at: status === "done" ? now : null,
    });
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
        mood: data.mood ?? null,
        slider_value: data.sliderValue ?? null,
        note: data.note ?? null,
        created_at: now,
    });

    await updateOccurrence(data.occurrenceId, { status: "done", completed_at: now });
}

export async function getExerciseCheckin(userId: string, occurrenceId: string): Promise<ExerciseCheckin | null> {
    await getOwnedOccurrenceDoc(userId, occurrenceId);
    const doc = await findExerciseCheckinByOccurrence(occurrenceId);
    if (!doc) return null;
    return {
        occurrenceId: doc.occurrence_id,
        activityName: doc.activity_name,
        durationMinutes: doc.duration_minutes,
    };
}

export async function saveExerciseCheckin(userId: string, data: ExerciseCheckin): Promise<void> {
    await getOwnedOccurrenceDoc(userId, data.occurrenceId);
    const now = new Date().toISOString();

    await replaceExerciseCheckin({
        id: uuidv4(),
        occurrence_id: data.occurrenceId,
        activity_name: data.activityName ?? null,
        duration_minutes: data.durationMinutes ?? null,
        created_at: now,
    });

    await updateOccurrence(data.occurrenceId, { status: "done", completed_at: now });
}

export async function getWeeklyView(
    userId: string,
    weekStart: string
): Promise<{ weekStartDate: string; rowsByActivity: HabitGridRow[]; summary: PeriodSummary }> {
    const dates = weekDates(weekStart);
    const { rowsByActivity, summary } = await buildGridRows(userId, dates, "week");
    return { weekStartDate: weekStart, rowsByActivity, summary };
}

export async function getMonthlyView(
    userId: string,
    month: string
): Promise<{ month: string; rowsByActivity: HabitGridRow[]; summary: PeriodSummary }> {
    const dates = monthDates(month);
    const { rowsByActivity, summary } = await buildGridRows(userId, dates, "month");
    return { month, rowsByActivity, summary };
}

export async function getMonthlySummary(
    userId: string,
    month: string
): Promise<{ goals: MonthlyGoal[]; results: MonthlyResults }> {
    const dates = monthDates(month);
    const allActivities = await getActivities(userId);
    const activities = allActivities.filter((a) => a.schedule.frequency !== "todo");
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
        const target = periodTarget(activity, dates, "month");

        overallDone += done;
        overallSkipped += skipped;
        overallTarget += target;

        // Full days / streaks only consider daily-frequency activities: a
        // weekly or monthly cadence has no expectation on any specific day.
        if (activity.schedule.frequency === "daily") {
            for (const date of dates) {
                if (!isScheduledOnDate(activity, date)) continue;
                dayTotalCount[date]++;
                const occurrence = occurrences.find((item) => item.date === date);
                if (occurrence?.status === "done") {
                    dayDoneCount[date]++;
                }
            }
        }

        goals.push({
            activityId: activity.id,
            name: activity.name,
            subline: buildSubline(activity),
            progressPercent: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
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
            completionPercent: overallTarget > 0 ? Math.min(100, Math.round((overallDone / overallTarget) * 100)) : 0,
        },
    };
}
