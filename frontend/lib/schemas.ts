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
    /** Base64 JPEG data URL from client-side canvas resize. Null clears avatar. */
    avatarUrl: z.string().nullable().optional(),
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

export const CreateActivitySchema = z.object({
  category: z.enum(["medicine", "nutrition", "physical"]),
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
  name: z.string().trim().min(1, "REQUIRED").max(100, "TOO_LONG"),
  iconColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "INVALID_FORMAT")
    .optional(),
  schedule: HabitScheduleSchema,
  mealRelation: z.enum(["before", "after"]).optional(),
  mealSlots: z.array(MealSlotEnum).optional(),
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
});

export const NutritionCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  activityName: z.string().min(1),
  breakfast: z.string().default(""),
  lunch: z.string().default(""),
  dinner: z.string().default(""),
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
  mood: z.enum(["very-bad", "bad", "neutral", "good", "very-good"]),
  sliderValue: z.number().int().min(-100).max(100),
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
