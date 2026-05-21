import { Router, type Router as ExpressRouter } from "express";

import { requireAuth } from "../middleware/auth";
import { validate } from "../lib/validate";
import { ChapterProgressSchema } from "../lib/schemas";
import {
    listChapters,
    getChapter,
    setChapterProgress,
    getVideoClips,
} from "../services/chapterService";
import { Errors } from "../lib/errors";

const router: ExpressRouter = Router();

router.get("/", requireAuth, async (req, res, next) => {
    try {
        const chapters = await listChapters((req as any).userId!);
        res.status(200).json({ chapters });
    } catch (err) {
        next(err);
    }
});

router.get("/:id", requireAuth, async (req, res, next) => {
    try {
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) {
            return next(Errors.validation("Chapter id must be a number"));
        }
        const chapter = await getChapter((req as any).userId!, id);
        res.status(200).json(chapter);
    } catch (err) {
        next(err);
    }
});

router.post("/:id/progress", requireAuth, async (req, res, next) => {
    try {
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) {
            return next(Errors.validation("Chapter id must be a number"));
        }
        const { progress } = validate(ChapterProgressSchema, req.body);
        await setChapterProgress((req as any).userId!, id, progress);
        res.status(200).json({ ok: true });
    } catch (err) {
        next(err);
    }
});

export { router as chaptersRouter };

export const videoClipsRouter: ExpressRouter = Router();

videoClipsRouter.get("/", requireAuth, (_req, res, next) => {
    try {
        const collection = getVideoClips();
        res.status(200).json(collection);
    } catch (err) {
        next(err);
    }
});
