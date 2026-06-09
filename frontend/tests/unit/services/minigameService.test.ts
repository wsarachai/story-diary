// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import { getQuiz, submitQuiz } from "@/lib/services/minigameService";
import type { AnswerLetter } from "@/types/minigame";

beforeEach(() => {
  clearTestData();
});

describe("getQuiz", () => {
  it("returns a quiz with an id and title", async () => {
    const quiz = await getQuiz();
    expect(typeof quiz.id).toBe("string");
    expect(typeof quiz.title).toBe("string");
    expect(quiz.showFinalScore).toBe(true);
  });

  it("contains all 13 seeded questions", async () => {
    const quiz = await getQuiz();
    expect(quiz.questions).toHaveLength(13);
  });

  it("each question has options A, B, C, D in order", async () => {
    const quiz = await getQuiz();
    for (const q of quiz.questions) {
      const letters = q.options.map((o) => o.letter);
      expect(letters).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("each question has a correctAnswer that is one of A-D", async () => {
    const quiz = await getQuiz();
    for (const q of quiz.questions) {
      expect(["A", "B", "C", "D"]).toContain(q.correctAnswer);
    }
  });

  it("each question has a non-empty text", async () => {
    const quiz = await getQuiz();
    for (const q of quiz.questions) {
      expect(q.text.length).toBeGreaterThan(0);
    }
  });

  it("returns questions ordered by sort_order", async () => {
    const quiz = await getQuiz();
    const ids = quiz.questions.map((q) => q.id);
    // Seed defines q1..q13 with sort_order 1..13, so getQuiz must echo that order.
    const expected = Array.from({ length: 13 }, (_, i) => `q${i + 1}`);
    expect(ids).toEqual(expected);
  });
});

describe("submitQuiz", () => {
  it("scores 7 points per correct answer (all correct)", async () => {
    const quiz = await getQuiz();
    const answers: Record<string, {
      questionId: string;
      selected: AnswerLetter;
      correct: AnswerLetter;
      isCorrect: boolean;
      answeredAt: string;
    }> = {};

    for (const q of quiz.questions) {
      answers[q.id] = {
        questionId: q.id,
        selected: q.correctAnswer,
        correct: q.correctAnswer,
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      };
    }

    const score = await submitQuiz("user-1", quiz.id, answers);
    expect(score.correctCount).toBe(13);
    expect(score.wrongCount).toBe(0);
    expect(score.total).toBe(13);
    expect(score.points).toBe(13 * 7);
    expect(score.quizId).toBe(quiz.id);
  });

  it("scores 0 points for all-wrong answers", async () => {
    const quiz = await getQuiz();
    const answers: Record<string, {
      questionId: string;
      selected: AnswerLetter;
      correct: AnswerLetter;
      isCorrect: boolean;
      answeredAt: string;
    }> = {};

    for (const q of quiz.questions) {
      const wrong = (["A", "B", "C", "D"] as const).find((l) => l !== q.correctAnswer)!;
      answers[q.id] = {
        questionId: q.id,
        selected: wrong,
        correct: q.correctAnswer,
        isCorrect: false,
        answeredAt: new Date().toISOString(),
      };
    }

    const score = await submitQuiz("user-1", quiz.id, answers);
    expect(score.correctCount).toBe(0);
    expect(score.wrongCount).toBe(13);
    expect(score.points).toBe(0);
  });

  it("total equals the number of submitted answers", async () => {
    const quiz = await getQuiz();
    const firstQ = quiz.questions[0];
    const answers = {
      [firstQ.id]: {
        questionId: firstQ.id,
        selected: firstQ.correctAnswer,
        correct: firstQ.correctAnswer,
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      },
    };

    const score = await submitQuiz("user-1", quiz.id, answers);
    expect(score.total).toBe(1);
    expect(score.correctCount).toBe(1);
  });

  it("stores the attempt (multiple calls do not error)", async () => {
    const quiz = await getQuiz();
    const score1 = await submitQuiz("user-1", quiz.id, {});
    const score2 = await submitQuiz("user-1", quiz.id, {});
    expect(score1.total).toBe(0);
    expect(score2.total).toBe(0);
  });
});
