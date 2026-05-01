/**
 * Habit routes: /api/habits/*
 * Read views, activity authoring, occurrence toggle, check-ins.
 */
import { Router } from "express";
import "../lib/session";
import { requireAuth } from "../middleware/auth";
import { validate } from "../lib/validate";
import {
  CreateActivitySchema,
  PatchActivitySchema,
  ToggleOccurrenceSchema,
  MedicineCheckinSchema,
  NutritionCheckinSchema,
  SymptomsCheckinSchema,
  MoodCheckinSchema,
} from "../lib/schemas";
import {
  getTodayEntries,
  getActivities,
  createActivity,
  updateActivity,
  archiveActivity,
  toggleOccurrence,
  saveMedicineCheckin,
  saveNutritionCheckin,
  saveSymptomsCheckin,
  saveMoodCheckin,
  getWeeklyView,
  getMonthlyView,
  getMonthlySummary,
} from "../services/habitService";
import type { HabitActivity } from "../../../src/types/habit";
import { Errors } from "../lib/errors";

const router = Router();

// ── Read views ──────────────────────────────────────────────────────────

// GET /api/habits/today?date=YYYY-MM-DD
router.get("/today", requireAuth, (req, res, next) => {
  try {
    const date = typeof req.query.date === "string"
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(Errors.validation("date must be in YYYY-MM-DD format"));
    }

    const entries = getTodayEntries(req.session.userId!, date);
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/weekly?weekStart=YYYY-MM-DD
router.get("/weekly", requireAuth, (req, res, next) => {
  try {
    const weekStart = typeof req.query.weekStart === "string"
      ? req.query.weekStart
      : (() => {
          const d = new Date();
          const day = d.getDay();
          d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // Monday
          return d.toISOString().slice(0, 10);
        })();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return next(Errors.validation("weekStart must be in YYYY-MM-DD format"));
    }

    const data = getWeeklyView(req.session.userId!, weekStart);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/monthly?month=YYYY-MM
router.get("/monthly", requireAuth, (req, res, next) => {
  try {
    const month = typeof req.query.month === "string"
      ? req.query.month
      : new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return next(Errors.validation("month must be in YYYY-MM format"));
    }

    const data = getMonthlyView(req.session.userId!, month);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/monthly-summary?month=YYYY-MM
// Also serves /api/habits/summary (alias per task spec)
router.get("/monthly-summary", requireAuth, (req, res, next) => {
  try {
    const month = typeof req.query.month === "string"
      ? req.query.month
      : new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return next(Errors.validation("month must be in YYYY-MM format"));
    }

    const data = getMonthlySummary(req.session.userId!, month);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// alias
router.get("/summary", requireAuth, (req, res, next) => {
  try {
    const month = typeof req.query.month === "string"
      ? req.query.month
      : new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return next(Errors.validation("month must be in YYYY-MM format"));
    }

    const data = getMonthlySummary(req.session.userId!, month);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// ── Activities ───────────────────────────────────────────────────────────

// GET /api/habits/activities
router.get("/activities", requireAuth, (req, res, next) => {
  try {
    const activities = getActivities(req.session.userId!);
    res.status(200).json({ activities });
  } catch (err) {
    next(err);
  }
});

// POST /api/habits/activities
router.post("/activities", requireAuth, (req, res, next) => {
  try {
    const body = validate(CreateActivitySchema, req.body);
    // Cast weekdays to WeekdayIndex[] since the schema validates the range 0-6
    const activityData = body as Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">;
    const activity = createActivity(req.session.userId!, activityData);
    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/habits/activities/:id
router.patch("/activities/:id", requireAuth, (req, res, next) => {
  try {
    const body = validate(PatchActivitySchema, req.body);
    const activity = updateActivity(req.session.userId!, String(req.params.id), body as Partial<Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">>);
    res.status(200).json({ activity });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habits/activities/:id  (soft archive)
router.delete("/activities/:id", requireAuth, (req, res, next) => {
  try {
    archiveActivity(req.session.userId!, String(req.params.id));
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Occurrences ──────────────────────────────────────────────────────────

// PATCH /api/habits/occurrences/:id  (toggle status)
router.patch("/occurrences/:id", requireAuth, (req, res, next) => {
  try {
    const { status } = validate(ToggleOccurrenceSchema, req.body);
    const occurrence = toggleOccurrence(req.session.userId!, String(req.params.id), status);
    res.status(200).json({ occurrence });
  } catch (err) {
    next(err);
  }
});

// Also expose the spec-defined path: POST /api/habits/occurrences/:id/toggle
router.post("/occurrences/:id/toggle", requireAuth, (req, res, next) => {
  try {
    const { status } = validate(ToggleOccurrenceSchema, req.body);
    const occurrence = toggleOccurrence(req.session.userId!, String(req.params.id), status);
    res.status(200).json({ occurrence });
  } catch (err) {
    next(err);
  }
});

// ── Check-ins ────────────────────────────────────────────────────────────

// PUT /api/habits/checkins/medicine/:occurrenceId
// POST /api/habits/checkin/medicine  (body contains occurrenceId)
router.put("/checkins/medicine/:occurrenceId", requireAuth, (req, res, next) => {
  try {
    const body = validate(MedicineCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
    saveMedicineCheckin(req.session.userId!, body);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/checkin/medicine", requireAuth, (req, res, next) => {
  try {
    const body = validate(MedicineCheckinSchema, req.body);
    saveMedicineCheckin(req.session.userId!, body);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/checkins/nutrition/:occurrenceId
router.put("/checkins/nutrition/:occurrenceId", requireAuth, (req, res, next) => {
  try {
    const body = validate(NutritionCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
    saveNutritionCheckin(req.session.userId!, body);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/checkin/nutrition", requireAuth, (req, res, next) => {
  try {
    const body = validate(NutritionCheckinSchema, req.body);
    saveNutritionCheckin(req.session.userId!, body);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/checkins/symptoms/:occurrenceId
router.put("/checkins/symptoms/:occurrenceId", requireAuth, (req, res, next) => {
  try {
    const body = validate(SymptomsCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
    saveSymptomsCheckin(req.session.userId!, body);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/checkins/mood/:occurrenceId
router.put("/checkins/mood/:occurrenceId", requireAuth, (req, res, next) => {
  try {
    const body = validate(MoodCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
    saveMoodCheckin(req.session.userId!, body);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
