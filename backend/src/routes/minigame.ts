import { Router, type Router as ExpressRouter } from "express";
import "../lib/session";
import { requireAuth } from "../middleware/auth";
import { validate } from "../lib/validate";
import { SubmitQuizSchema } from "../lib/schemas";
import { getQuiz, submitQuiz } from "../services/minigameService";
import type { QuizAnswer } from "../../../src/types/minigame";

const router: ExpressRouter = Router();

router.get("/quiz", requireAuth, async (_req, res, next) => {
    try {
        const quiz = await getQuiz();
        res.status(200).json(quiz);
    } catch (err) {
        next(err);
    }
});

router.post("/quiz/attempts", requireAuth, async (req, res, next) => {
    try {
        const body = validate(SubmitQuizSchema, req.body);
        const score = await submitQuiz(req.session.userId!, body.quizId, body.answers as Record<string, QuizAnswer>);
        res.status(200).json({ score });
    } catch (err) {
        next(err);
    }
});

router.post("/quiz/submit", requireAuth, async (req, res, next) => {
    try {
        const body = validate(SubmitQuizSchema, req.body);
        const score = await submitQuiz(req.session.userId!, body.quizId, body.answers as Record<string, QuizAnswer>);
        res.status(200).json({ score });
    } catch (err) {
        next(err);
    }
});

export default router;
