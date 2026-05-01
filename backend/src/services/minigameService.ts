/**
 * Minigame service — quiz questions, attempts, and scoring.
 */
import { v4 as uuidv4 } from "uuid";
import db from "../db";
import type { Quiz, QuizScore, QuizAnswer } from "../../../src/types/minigame";

// Stable quiz id — we only have one quiz set in v1
const QUIZ_ID = "quiz-v1";
const POINTS_PER_CORRECT = 7;

interface QuizQuestionRow {
  id: string;
  number: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
}

export function getQuiz(): Quiz {
  const rows = db
    .prepare("SELECT * FROM quiz_questions ORDER BY number ASC")
    .all() as QuizQuestionRow[];

  return {
    id: QUIZ_ID,
    title: "บททดสอบความรู้สุขภาพ",
    showFinalScore: true,
    questions: rows.map((row) => ({
      id: row.id,
      number: row.number,
      text: row.text,
      options: [
        { letter: "A" as const, text: row.option_a },
        { letter: "B" as const, text: row.option_b },
        { letter: "C" as const, text: row.option_c },
        { letter: "D" as const, text: row.option_d },
      ],
      correctAnswer: row.correct_answer as "A" | "B" | "C" | "D",
      ...(row.explanation ? { explanation: row.explanation } : {}),
    })),
  };
}

export function submitQuiz(
  userId: string,
  quizId: string,
  answers: Record<string, QuizAnswer>
): QuizScore {
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const total = Object.values(answers).length;
  const points = correctCount * POINTS_PER_CORRECT;

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO quiz_attempts (id, user_id, quiz_id, started_at, completed_at, score_points, score_correct, answers_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, quizId, now, now, points, correctCount, JSON.stringify(answers));

  return {
    quizId,
    total,
    correctCount,
    wrongCount: total - correctCount,
    points,
  };
}
