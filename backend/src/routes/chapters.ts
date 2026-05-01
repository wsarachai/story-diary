/**
 * Chapter routes: /api/chapters/*, /api/video-clips
 */
import { Router } from "express";
import "../lib/session";
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

const router = Router();

// GET /api/chapters
router.get("/", requireAuth, (req, res, next) => {
  try {
    const chapters = listChapters(req.session.userId!);
    res.status(200).json({ chapters });
  } catch (err) {
    next(err);
  }
});

// GET /api/chapters/:id
router.get("/:id", requireAuth, (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return next(Errors.validation("Chapter id must be a number"));
    }
    const chapter = getChapter(req.session.userId!, id);
    res.status(200).json(chapter);
  } catch (err) {
    next(err);
  }
});

// POST /api/chapters/:id/progress
router.post("/:id/progress", requireAuth, (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return next(Errors.validation("Chapter id must be a number"));
    }
    const { progress } = validate(ChapterProgressSchema, req.body);
    setChapterProgress(req.session.userId!, id, progress);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export { router as chaptersRouter };

// Video clips router (separate mount point)
export const videoClipsRouter = Router();

// GET /api/video-clips
videoClipsRouter.get("/", requireAuth, (_req, res, next) => {
  try {
    const collection = getVideoClips();
    res.status(200).json(collection);
  } catch (err) {
    next(err);
  }
});
