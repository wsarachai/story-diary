import { Router, type Router as ExpressRouter } from "express";

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

const router: ExpressRouter = Router();

router.get("/today", requireAuth, async (req, res, next) => {
    try {
        const date = typeof req.query.date === "string"
            ? req.query.date
            : new Date().toISOString().slice(0, 10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return next(Errors.validation("date must be in YYYY-MM-DD format"));
        }

        const entries = await getTodayEntries((req as any).userId!, date);
        res.status(200).json({ entries });
    } catch (err) {
        next(err);
    }
});

router.get("/weekly", requireAuth, async (req, res, next) => {
    try {
        const weekStart = typeof req.query.weekStart === "string"
            ? req.query.weekStart
            : (() => {
                const today = new Date();
                const day = today.getDay();
                today.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
                return today.toISOString().slice(0, 10);
            })();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
            return next(Errors.validation("weekStart must be in YYYY-MM-DD format"));
        }

        const data = await getWeeklyView((req as any).userId!, weekStart);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
});

router.get("/monthly", requireAuth, async (req, res, next) => {
    try {
        const month = typeof req.query.month === "string"
            ? req.query.month
            : new Date().toISOString().slice(0, 7);

        if (!/^\d{4}-\d{2}$/.test(month)) {
            return next(Errors.validation("month must be in YYYY-MM format"));
        }

        const data = await getMonthlyView((req as any).userId!, month);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
});

router.get("/monthly-summary", requireAuth, async (req, res, next) => {
    try {
        const month = typeof req.query.month === "string"
            ? req.query.month
            : new Date().toISOString().slice(0, 7);

        if (!/^\d{4}-\d{2}$/.test(month)) {
            return next(Errors.validation("month must be in YYYY-MM format"));
        }

        const data = await getMonthlySummary((req as any).userId!, month);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
});

router.get("/summary", requireAuth, async (req, res, next) => {
    try {
        const month = typeof req.query.month === "string"
            ? req.query.month
            : new Date().toISOString().slice(0, 7);

        if (!/^\d{4}-\d{2}$/.test(month)) {
            return next(Errors.validation("month must be in YYYY-MM format"));
        }

        const data = await getMonthlySummary((req as any).userId!, month);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
});

router.get("/activities", requireAuth, async (req, res, next) => {
    try {
        const activities = await getActivities((req as any).userId!);
        res.status(200).json({ activities });
    } catch (err) {
        next(err);
    }
});

router.post("/activities", requireAuth, async (req, res, next) => {
    try {
        const body = validate(CreateActivitySchema, req.body);
        const activityData = body as Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">;
        const activity = await createActivity((req as any).userId!, activityData);
        res.status(201).json({ activity });
    } catch (err) {
        next(err);
    }
});

router.patch("/activities/:id", requireAuth, async (req, res, next) => {
    try {
        const body = validate(PatchActivitySchema, req.body);
        const activity = await updateActivity(
            (req as any).userId!,
            String(req.params.id),
            body as Partial<Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">>
        );
        res.status(200).json({ activity });
    } catch (err) {
        next(err);
    }
});

router.delete("/activities/:id", requireAuth, async (req, res, next) => {
    try {
        await archiveActivity((req as any).userId!, String(req.params.id));
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.patch("/occurrences/:id", requireAuth, async (req, res, next) => {
    try {
        const { status } = validate(ToggleOccurrenceSchema, req.body);
        const occurrence = await toggleOccurrence((req as any).userId!, String(req.params.id), status);
        res.status(200).json({ occurrence });
    } catch (err) {
        next(err);
    }
});

router.post("/occurrences/:id/toggle", requireAuth, async (req, res, next) => {
    try {
        const { status } = validate(ToggleOccurrenceSchema, req.body);
        const occurrence = await toggleOccurrence((req as any).userId!, String(req.params.id), status);
        res.status(200).json({ occurrence });
    } catch (err) {
        next(err);
    }
});

router.put("/checkins/medicine/:occurrenceId", requireAuth, async (req, res, next) => {
    try {
        const body = validate(MedicineCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
        await saveMedicineCheckin((req as any).userId!, body);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post("/checkin/medicine", requireAuth, async (req, res, next) => {
    try {
        const body = validate(MedicineCheckinSchema, req.body);
        await saveMedicineCheckin((req as any).userId!, body);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.put("/checkins/nutrition/:occurrenceId", requireAuth, async (req, res, next) => {
    try {
        const body = validate(NutritionCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
        await saveNutritionCheckin((req as any).userId!, body);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.post("/checkin/nutrition", requireAuth, async (req, res, next) => {
    try {
        const body = validate(NutritionCheckinSchema, req.body);
        await saveNutritionCheckin((req as any).userId!, body);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.put("/checkins/symptoms/:occurrenceId", requireAuth, async (req, res, next) => {
    try {
        const body = validate(SymptomsCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
        await saveSymptomsCheckin((req as any).userId!, body);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.put("/checkins/mood/:occurrenceId", requireAuth, async (req, res, next) => {
    try {
        const body = validate(MoodCheckinSchema, { ...req.body, occurrenceId: req.params.occurrenceId });
        await saveMoodCheckin((req as any).userId!, body);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

export default router;
