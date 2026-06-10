/**
 * Habit Tracker domain contracts for Story Diary.
 *
 * Source wireframes:
 *   - docz/wireframes/s006-habit-tracker.html        (overview: daily / weekly / monthly cards)
 *   - docz/wireframes/s012-habit-daily-today.html    (today list)
 *   - docz/wireframes/s013-habit-weekly-tracker.html (weekly grid)
 *   - docz/wireframes/s014-habit-monthly-tracker.html(31-day grid)
 *   - docz/wireframes/s015-habit-monthly-summary.html(goals + results)
 *   - docz/wireframes/s016-habit-add-activity.html   (3-category picker)
 *   - docz/wireframes/s020-create-activity.html      (medicine form)
 *   - docz/wireframes/s021-create-nutrition.html     (nutrition picklist)
 *   - docz/wireframes/s022-medecine-checkin.html     (medicine check-in + side effects)
 *   - docz/wireframes/s023-nutrition-checkin.html    (3-meal entry form)
 *   - docz/wireframes/s024-create-physical-activity-menu.html
 *   - docz/wireframes/s025-create-physical-activity-emotion-menu.html
 *   - docz/wireframes/s026-create-physical-activity-psunlight-menu.html
 *   - docz/wireframes/s027-create-physical-activity-usymptoms-menu.html
 *   - docz/wireframes/s028-create-physical-activity-explore-emotion-menu.html
 *   - docz/wireframes/s029-create-physical-activity.html
 *   - docz/wireframes/s030-create-physical-activity-pinfection-menu.html
 *
 * Cross-agent contract: shared by frontend (Redux + screens), backend, and tests.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Categories & taxonomies
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Top-level activity category. Mirrors the 3 tabs on s016 and the 3 left-side
 * accent colours on the today-list entries (s012):
 *
 *   medicine  → cat-med  (#57a8db / .entry-med)
 *   nutrition → cat-food (#2eb563 / .entry-food)
 *   physical  → cat-body (#ee8a4a / .entry-body, plus mood/symptoms variants)
 */
export type HabitCategory = "medicine" | "nutrition" | "physical";

/**
 * Sub-category for the "physical" branch, picked on s024.
 *
 *   emotion-management — s025 (further sub-menu)
 *   exercise           — leaf, navigates straight to s029
 *   sunlight           — s026 (sub-menu)
 *   infection          — s030 (sub-menu)
 *   symptoms           — s027 (checklist check-in, not a create form)
 *   doctor-visit       — leaf, s029 prefilled "ตรวจตามนัดแพทย์"
 *   pregnancy-planning — leaf, s029 prefilled
 *   other              — leaf, s029 free-form
 */
export type PhysicalCategory =
    | "emotion-management"
    | "exercise"
    | "sunlight"
    | "infection"
    | "symptoms"
    | "doctor-visit"
    | "pregnancy-planning"
    | "other";

/**
 * Frequency cadence for a habit activity. Mirrors the 4 chips on s020/s029
 * `.frequency-chip[data-frequency=…]`.
 *
 *   daily   — runs every day; s020 shows a 7-day weekday selector below
 *   weekly  — runs N days per week; s020 shows a number input "วัน/สัปดาห์"
 *   monthly — runs N days per month; s020 shows a number input "วัน/เดือน"
 *   todo    — one-off / ad-hoc; s020 shows an importance selector instead
 */
export type HabitFrequency = "daily" | "weekly" | "monthly" | "todo";

/** Importance (s020 + s029 importance-chips). Only relevant when freq = "todo". */
export type HabitImportance = "general" | "moderate" | "high";

/**
 * Status of a single occurrence (one cell in s013 weekly grid / s014 monthly
 * grid). Mirrors `.weekly-dot` / `.m-dot` modifier classes.
 *
 *   pending — default open dot (ยังไม่ถึง for future dates, ไม่ได้ทำ when past)
 *   partial — half-filled green dot (กำลังทำ); produced only by a nutrition
 *             check-in saved with 1–2 of its 3 meals filled. Counts as NOT
 *             done in all summaries. Never settable via the toggle API.
 *   done    — green dot (#08c65a)
 *   skipped — orange dot (#f4a261)
 *
 * `today` is rendered as an additional outline modifier, not a status — it
 * combines orthogonally with the above. UI handles that as a derived flag,
 * as is the past/future split of `pending` (no extra stored state).
 */
export type HabitOccurrenceStatus = "pending" | "partial" | "done" | "skipped";

/* ────────────────────────────────────────────────────────────────────────
 * Activity definitions (the "what to track")
 * ──────────────────────────────────────────────────────────────────────── */

/** Days of the week, 0 = Sunday (matches the s020 weekday-row order: อา จ อ พ พฤ ศ ส). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Meal slot used by medicine timing (s020 มื้อ chips) and nutrition logging (s023). */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "before-bed";

/** "before/after meal" relation for medicine (s020 ก่อน/หลัง chips). */
export type MealRelation = "before" | "after";

/**
 * Schedule rules — the "when this activity runs". The shape branches on
 * `frequency` so the form on s020/s029 can render the correct sub-panel.
 */
export type HabitSchedule =
    | {
          frequency: "daily";
          /** Selected weekdays (s020 `.weekday-row` is-selected items). */
          weekdays: WeekdayIndex[];
      }
    | {
          frequency: "weekly";
          /** Target days per week (s020 weekly count input). */
          daysPerWeek: number;
      }
    | {
          frequency: "monthly";
          /** Target days per month (s020 monthly count input). */
          daysPerMonth: number;
      }
    | {
          frequency: "todo";
          importance: HabitImportance;
      };

/**
 * Definition of a habit activity. Created on s020 (medicine), s021→s020
 * (nutrition presets), or s029 (physical activity).
 */
export interface HabitActivity {
    id: string;
    /** Owning user. Useful for backend; UI may omit. */
    userId?: string;
    category: HabitCategory;
    /** Only present when category === "physical". */
    physicalCategory?: PhysicalCategory;
    /**
     * Which s024-tree preset the activity was created from
     * (`/habit/add/physical/form?type=…`). Needed because the three emotion
     * presets share one display name — the checklist routes
     * `explore_emotion` to the mood check-in form by this key.
     */
    physicalPreset?: PhysicalPresetKey;
    /** Display name. e.g. "กินยา xxx" or "รับประทานอาหารครบ 5 หมู่". */
    name: string;
    /** Optional hex colour for the icon (s020 icon color picker). */
    iconColor?: `#${string}`;
    schedule: HabitSchedule;
    /** Medicine-only: meal relation chip (ก่อน/หลัง). */
    mealRelation?: MealRelation;
    /** Medicine-only: which meals it is taken with (multi-select). */
    mealSlots?: MealSlot[];
    /** ISO-8601. */
    createdAt: string;
    /** ISO-8601; bumped on edit. */
    updatedAt: string;
    /** Soft-archived (hidden from today list). v1 may omit. */
    archived?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────
 * Occurrences & check-ins (the "what was done")
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * One run of an activity on a given calendar date. Backed by
 * `habit_occurrences` (when DB exists). Cells in s013/s014 read this.
 */
export interface HabitOccurrence {
    id: string;
    activityId: string;
    /** ISO-8601 date in user's locale, format YYYY-MM-DD. */
    date: string;
    status: HabitOccurrenceStatus;
    /** Optional checked-in moment. Null when status === "pending". */
    completedAt?: string;
}

/**
 * Side effect / symptom checklist used by s022 medicine check-in and
 * s027 unusual-symptoms check-in.
 */
export interface SymptomCheck {
    id: string;
    /** Display copy; wireframe placeholder is "อาการ xxx". */
    label: string;
    checked: boolean;
}

/** Medicine check-in record (s022). */
export interface MedicineCheckin {
    occurrenceId: string;
    /** "ชื่อยา :" badge value. */
    medicineName: string;
    mealRelation: MealRelation;
    mealSlots: MealSlot[];
    sideEffects: SymptomCheck[];
}

/** Nutrition check-in record (s023). 3 meal text fields. */
export interface NutritionCheckin {
    occurrenceId: string;
    /** Activity display name pill, e.g. "รับประทานอาหารครบ 5 หมู่". */
    activityName: string;
    /** Free-text note for breakfast meal-field. */
    breakfast: string;
    /** Free-text note for lunch meal-field. */
    lunch: string;
    /** Free-text note for dinner meal-field. */
    dinner: string;
}

/** Unusual-symptoms check-in (s027). 5-item checklist. */
export interface UnusualSymptomsCheckin {
    occurrenceId: string;
    items: SymptomCheck[];
}

/**
 * Mood / emotion-explore check-in (s028). Captures both the discrete
 * 5-button emoji choice and the gradient slider position.
 */
export type MoodLevel = "very-bad" | "bad" | "neutral" | "good" | "very-good";

export interface MoodCheckin {
    occurrenceId: string;
    /** Selected mood emoji (`.mood-emoji` aria-label). */
    mood: MoodLevel;
    /**
     * Slider value, clamped to -100..+100. UI maps to a colour gradient from
     * #d63a3a (-) to #3aab3a (+). Slider sign labels: "−" (left) / "+" (right).
     */
    sliderValue: number;
}

/* ────────────────────────────────────────────────────────────────────────
 * Aggregations & summaries
 * ──────────────────────────────────────────────────────────────────────── */

/** Single goal card on s015 with its completion ring (90/70/50%). */
export interface MonthlyGoal {
    activityId: string;
    name: string;
    /** Sub-line under the name, e.g. "กิจกรรม · ทุกวัน · สำคัญมาก". */
    subline: string;
    /** 0-100 inclusive. */
    progressPercent: number;
}

/** s015 "ผลลัพธ์" stats grid (right page). */
export interface MonthlyResults {
    /** Total occurrences marked done. */
    totalDone: number;
    /** Target across all activities for the month. */
    target: number;
    /** Occurrences marked skipped. */
    skipped: number;
    /** Days in the month where every scheduled activity was done. */
    fullDays: number;
    /** Longest consecutive run of full days. */
    longestStreak: number;
    /** Optional precomputed pct, mirrors the `.result-bar` width on s015. */
    completionPercent: number;
}

/** Summary card on s013 / s014. */
export interface PeriodSummary {
    /** "ทำได้แล้ว" badge value. */
    done: number;
    /** "เป้าหมายสัปดาห์" / "เป้าหมายเดือน" badge value. */
    target: number;
}

/** One cell of the weekly/monthly tracker grids. */
export interface HabitGridCell {
    /** YYYY-MM-DD. */
    date: string;
    status: HabitOccurrenceStatus;
    /**
     * Whether the activity is scheduled on this date. False only for
     * daily-frequency activities on unselected weekdays — those cells render
     * muted and contribute nothing to the period target.
     */
    scheduled: boolean;
}

/**
 * One row of the weekly/monthly tracker grids. Covers all non-todo activities
 * scheduled in the period, regardless of their frequency cadence.
 */
export interface HabitGridRow {
    activityId: string;
    activityName: string;
    category: HabitCategory;
    cells: HabitGridCell[];
    /** Occurrences marked done within the period. */
    done: number;
    /**
     * Real period target: daily → count of scheduled weekdays in the period;
     * weekly → daysPerWeek (week view) or prorated to the month (month view);
     * monthly → daysPerMonth (month view) or 0 in the week view (visibility
     * only, no weekly target).
     */
    target: number;
}

/* ────────────────────────────────────────────────────────────────────────
 * Today / list views
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Row in the s012 today list. Combines an activity definition with its
 * resolved occurrence-for-today.
 */
export interface TodayHabitEntry {
    activity: HabitActivity;
    occurrence: HabitOccurrence;
    /**
     * Sub-text under the activity name, e.g. "หลังอาหารเช้า-เย็น" or "ทุกวัน · สำคัญ".
     * Derived from `activity.schedule` + `mealRelation` + `mealSlots`.
     */
    subline: string;
    /**
     * Border-left accent colour for the entry card. Mirrors the
     * `.entry-med / .entry-food / .entry-body / .entry-mood` modifiers.
     */
    accent: `#${string}`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Nutrition presets (s021)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Stable preset keys for the s021 nutrition picklist. Used as the `?type=`
 * query param feeding into s020.
 */
export type NutritionPresetKey =
    | "nutrition_5_groups"
    | "nutrition_clean_cooked"
    | "nutrition_mild_taste"
    | "nutrition_order_low_seasoning";

/** Display map for the s021 picklist. The wireframe is the source of truth. */
export const NUTRITION_PRESETS: Readonly<Record<NutritionPresetKey, string>> = {
    nutrition_5_groups: "รับประทานอาหารครบ 5 หมู่",
    nutrition_clean_cooked: "รับประทานอาหารปรุงสุก สะอาด",
    nutrition_mild_taste: "รับประทานอาหารรสไม่จัด",
    nutrition_order_low_seasoning: "ซื้ออาหารตามสั่งจากร้าน บอกแม่ค้าปรุงรสอ่อน",
};

export type PhysicalPresetKey =
  | "exercise"
  | "doctor_visit"
  | "pregnancy_planning"
  | "explore_emotion"
  | "positive_emotion"
  | "mindfulness"
  | "morning_sunlight"
  | "daytime_sunlight"
  | "wash_hands"
  | "wear_mask"
  | "social_distancing"
  | "symptoms"
  | "other";

export const PHYSICAL_PRESETS: Readonly<Record<PhysicalPresetKey, string>> = {
  exercise: "การออกกำลังกาย",
  doctor_visit: "ตรวจตามนัดแพทย์",
  pregnancy_planning: "วางแผนการตั้งครรภ์",
  explore_emotion: "สำรวจอารมณ์ตนเอง",
  positive_emotion: "สร้างอารมณ์เชิงบวก",
  mindfulness: "ฝึกสติ",
  morning_sunlight: "รับแสงแดดยามเช้า",
  daytime_sunlight: "รับแสงแดดช่วงกลางวัน",
  wash_hands: "ล้างมือด้วยสบู่",
  wear_mask: "สวมหน้ากากอนามัย",
  social_distancing: "เว้นระยะห่างทางสังคม",
  symptoms: "อาการผิดปกติ",
  other: "อื่นๆ",
};

/** Maps each form preset to the s024 physical sub-category it belongs to. */
export const PHYSICAL_PRESET_CATEGORY: Readonly<Record<PhysicalPresetKey, PhysicalCategory>> = {
  exercise: "exercise",
  doctor_visit: "doctor-visit",
  pregnancy_planning: "pregnancy-planning",
  explore_emotion: "emotion-management",
  positive_emotion: "emotion-management",
  mindfulness: "emotion-management",
  morning_sunlight: "sunlight",
  daytime_sunlight: "sunlight",
  wash_hands: "infection",
  wear_mask: "infection",
  social_distancing: "infection",
  symptoms: "symptoms",
  other: "other",
};
