/**
 * Minigame routes: /api/minigame/*
 * GET /api/minigame/quiz, POST /api/minigame/quiz/attempts (also /quiz/submit)
 */
import { Router } from "express";
import "../lib/session";
import { requireAuth } from "../middleware/auth";
import { validate } from "../lib/validate";
import { SubmitQuizSchema } from "../lib/schemas";
import { getQuiz, submitQuiz } from "../services/minigameService";

import type { QuizAnswer } from "../../../src/types/minigame";

const router = Router();

// GET /api/minigame/quiz
router.get("/quiz", requireAuth, (_req, res, next) => {
  try {
    const quiz = getQuiz();
    res.status(200).json(quiz);
  } catch (err) {
    next(err);
  }
});

// POST /api/minigame/quiz/attempts
router.post("/quiz/attempts", requireAuth, (req, res, next) => {
  try {
    const body = validate(SubmitQuizSchema, req.body);
    const score = submitQuiz(req.session.userId!, body.quizId, body.answers as Record<string, QuizAnswer>);
    res.status(200).json({ score });
  } catch (err) {
    next(err);
  }
});

// POST /api/minigame/quiz/submit  (alias per task spec endpoint list)
router.post("/quiz/submit", requireAuth, (req, res, next) => {
  try {
    const body = validate(SubmitQuizSchema, req.body);
    const score = submitQuiz(req.session.userId!, body.quizId, body.answers as Record<string, QuizAnswer>);
    res.status(200).json({ score });
  } catch (err) {
    next(err);
  }
});

export default router;
