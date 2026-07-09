// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import { getQuiz, submitQuiz } from "@/lib/services/minigameService";
import { registerUser } from "@/lib/services/authService";
import type { AnswerLetter } from "@/types/minigame";

let maleUserId = "";
let femaleUserId = "";

beforeEach(async () => {
  clearTestData();
  const male = await registerUser({
    name: "ชาย", tel: "0800000001", password: "password123", characterName: "M", gender: "male",
  });
  const female = await registerUser({
    name: "หญิง", tel: "0800000002", password: "password123", characterName: "F", gender: "female",
  });
  maleUserId = male.id;
  femaleUserId = female.id;
});

describe("getQuiz", () => {
  it("returns a quiz with a gender-specific id and title", async () => {
    const quiz = await getQuiz(maleUserId);
    expect(quiz.id).toBe("quiz-male");
    expect(typeof quiz.title).toBe("string");
    expect(quiz.showFinalScore).toBe(true);
  });

  it("serves the male set to a male user (ids q1..q13)", async () => {
    const quiz = await getQuiz(maleUserId);
    expect(quiz.questions).toHaveLength(13);
    expect(quiz.questions.map((q) => q.id)).toEqual(
      Array.from({ length: 13 }, (_, i) => `q${i + 1}`)
    );
  });

  it("serves the female set to a female user (ids qf1..qf13)", async () => {
    const quiz = await getQuiz(femaleUserId);
    expect(quiz.id).toBe("quiz-female");
    expect(quiz.questions).toHaveLength(13);
    expect(quiz.questions.map((q) => q.id)).toEqual(
      Array.from({ length: 13 }, (_, i) => `qf${i + 1}`)
    );
  });

  it("each question has options A, B, C, D in order", async () => {
    const quiz = await getQuiz(maleUserId);
    for (const q of quiz.questions) {
      expect(q.options.map((o) => o.letter)).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("each question has a correctAnswer that is one of A-D", async () => {
    const quiz = await getQuiz(maleUserId);
    for (const q of quiz.questions) {
      expect(["A", "B", "C", "D"]).toContain(q.correctAnswer);
    }
  });
});

describe("submitQuiz", () => {
  it("scores 7 points per correct answer and records the gender", async () => {
    const quiz = await getQuiz(femaleUserId);
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

    const score = await submitQuiz(femaleUserId, quiz.id, answers);
    expect(score.correctCount).toBe(13);
    expect(score.wrongCount).toBe(0);
    expect(score.total).toBe(13);
    expect(score.points).toBe(13 * 7);
    expect(score.quizId).toBe("quiz-female");
  });

  it("scores 0 points for all-wrong answers", async () => {
    const quiz = await getQuiz(maleUserId);
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

    const score = await submitQuiz(maleUserId, quiz.id, answers);
    expect(score.correctCount).toBe(0);
    expect(score.wrongCount).toBe(13);
    expect(score.points).toBe(0);
  });

  it("total equals the number of submitted answers", async () => {
    const quiz = await getQuiz(maleUserId);
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

    const score = await submitQuiz(maleUserId, quiz.id, answers);
    expect(score.total).toBe(1);
    expect(score.correctCount).toBe(1);
  });

  it("stores the attempt (multiple calls do not error)", async () => {
    const quiz = await getQuiz(maleUserId);
    const score1 = await submitQuiz(maleUserId, quiz.id, {});
    const score2 = await submitQuiz(maleUserId, quiz.id, {});
    expect(score1.total).toBe(0);
    expect(score2.total).toBe(0);
  });
});
