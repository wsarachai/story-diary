/**
 * Shared Zod validation schemas derived from src/types/*.
 * Never redeclare types already in src/types/; just build schemas that
 * produce the same shapes.
 */
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Auth schemas
// ──────────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().trim().min(1, "REQUIRED").max(80, "TOO_LONG"),
  /** Thai phone number: 10 digits starting with 0, e.g. "0812345678". */
  tel: z.string().trim().regex(/^0[0-9]{9}$/, "INVALID_FORMAT"),
  password: z.string().min(8, "TOO_SHORT").max(128, "TOO_LONG"),
  characterName: z.string().trim().min(1, "REQUIRED").max(40, "TOO_LONG"),
  gender: z.enum(["male", "female"]),
  timezone: z.string().optional(),
});

export const LoginSchema = z.object({
  username: z.string().trim().min(1, "REQUIRED"),
  password: z.string().min(1, "REQUIRED"),
});

export const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(1, "REQUIRED").max(80, "TOO_LONG").optional(),
    /** Thai phone number: 10 digits starting with 0, e.g. "0812345678". */
    tel: z.string().trim().regex(/^0[0-9]{9}$/, "INVALID_FORMAT").optional(),
    characterName: z.string().trim().min(1, "REQUIRED").max(40, "TOO_LONG").optional(),
    gender: z.enum(["male", "female"]).optional(),
    /** Base64 image data URL. Null clears avatar. */
    avatarUrl: z.string().max(350_000, "TOO_LONG").nullable().optional(),
  })
  .strict();

// ──────────────────────────────────────────────────────────────────────────
// Habit schemas
// ──────────────────────────────────────────────────────────────────────────

export const HabitScheduleSchema = z.discriminatedUnion("frequency", [
  z.object({
    frequency: z.literal("daily"),
    weekdays: z.array(z.number().int().min(0).max(6)),
  }),
  z.object({
    frequency: z.literal("weekly"),
    daysPerWeek: z.number().int().min(1).max(7),
  }),
  z.object({
    frequency: z.literal("monthly"),
    daysPerMonth: z.number().int().min(1).max(31),
  }),
  z.object({
    frequency: z.literal("todo"),
    importance: z.enum(["general", "moderate", "high"]),
  }),
]);

const MealSlotEnum = z.enum(["breakfast", "lunch", "dinner", "before-bed"]);

const MedicineKeyEnum = z.enum([
  "prednisolone",
  "cyclophosphamide",
  "azathioprine",
  "mycophenolate",
  "cyclosporine",
  "quinnel",
  "nsaid",
  "vitamin-d2",
  "calcium-835",
]);

export const CreateActivitySchema = z.object({
  category: z.enum(["medicine", "nutrition", "physical"]),
  nutritionPreset: z
    .enum([
      "nutrition_5_groups",
      "nutrition_clean_cooked",
      "nutrition_mild_taste",
      "nutrition_order_low_seasoning",
    ])
    .optional(),
  physicalCategory: z
    .enum([
      "emotion-management",
      "exercise",
      "sunlight",
      "infection",
      "symptoms",
      "doctor-visit",
      "pregnancy-planning",
      "other",
    ])
    .optional(),
  physicalPreset: z
    .enum([
      "exercise",
      "doctor_visit",
      "pregnancy_planning",
      "oral_contraceptive",
      "condom",
      "explore_emotion",
      "stress_relief",
      "sleep_rest",
      "sun_protection_clothing",
      "sunscreen",
      "avoid_midday_sun",
      "wash_hands",
      "wear_mask",
      "social_distancing",
      "avoid_sick_people",
      "symptoms",
      "other",
    ])
    .optional(),
  name: z.string().trim().min(1, "REQUIRED").max(100, "TOO_LONG"),
  iconColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "INVALID_FORMAT")
    .optional(),
  schedule: HabitScheduleSchema,
  mealRelation: z.enum(["before", "after"]).optional(),
  mealSlots: z.array(MealSlotEnum).optional(),
  medicineKey: MedicineKeyEnum.nullish(),
  archived: z.boolean().optional(),
});

export const PatchActivitySchema = CreateActivitySchema.partial();

export const ToggleOccurrenceSchema = z.object({
  status: z.enum(["pending", "done", "skipped"]),
});

export const MedicineCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  medicineName: z.string().min(1),
  mealRelation: z.enum(["before", "after"]),
  mealSlots: z.array(MealSlotEnum),
  sideEffects: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      checked: z.boolean(),
    })
  ),
  sideEffectNote: z.string().max(1000).optional(),
});

export const NutritionCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  activityName: z.string().min(1),
  breakfast: z.string().default(""),
  lunch: z.string().default(""),
  dinner: z.string().default(""),
  mealSlots: z.array(MealSlotEnum).default([]),
});

export const SymptomsCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      checked: z.boolean(),
    })
  ),
});

export const MoodCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  mood: z.enum(["very-bad", "bad", "neutral", "good", "very-good"]).nullable(),
  sliderValue: z.number().int().min(-100).max(100).nullable(),
  note: z.string().nullable().optional(),
});

export const ExerciseCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  activityName: z.string().min(1).nullable(),
  durationMinutes: z.number().int().min(0).max(1440).nullable(),
});

// ──────────────────────────────────────────────────────────────────────────
// Minigame schemas
// ──────────────────────────────────────────────────────────────────────────

export const QuizAnswerSchema = z.object({
  questionId: z.string(),
  selected: z.enum(["A", "B", "C", "D"]).nullable(),
  correct: z.enum(["A", "B", "C", "D"]),
  isCorrect: z.boolean(),
  answeredAt: z.string(),
});

export const SubmitQuizSchema = z.object({
  quizId: z.string().min(1),
  answers: z.record(z.string(), QuizAnswerSchema),
});

// ──────────────────────────────────────────────────────────────────────────
// Chapter schemas
// ──────────────────────────────────────────────────────────────────────────

export const ChapterProgressSchema = z.object({
  progress: z.enum(["not-started", "in-progress", "completed"]),
});
