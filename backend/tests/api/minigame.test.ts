/**
 * Minigame Quiz API contract tests — Story Diary
 *
 * Source of truth:
 *   - docs/specs/s007-minigame-quiz.md
 *   - src/types/minigame.ts   (Quiz, QuizQuestion, QuizScore, QuizAnswer)
 *   - backend/src/routes/minigame.ts
 *   - backend/src/services/minigameService.ts
 *
 * Coverage:
 *   GET  /api/minigame/quiz          — quiz loading: auth, shape, 13 questions
 *   POST /api/minigame/quiz/attempts — submit: scoring, all-correct, all-wrong, partial
 *   POST /api/minigame/quiz/submit   — alias endpoint
 *   Validation errors for both submission endpoints
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { clearTestData } from "../helpers/testDb";
import type { QuizAnswer } from "../../../src/types/minigame";
import { registerAndAuth } from "../helpers/auth";

const app = createTestApp();

const VALID_USER = {
  name: "นักเล่นเกม",
  tel: "0812345678",
  password: "password123",
  characterName: "นักสู้",
  gender: "male" as const,
};

/** Build a QuizAnswer record for N questions from the seeded quiz (q1..q13) */
function buildAnswers(
  questionIds: string[],
  allCorrect: boolean
): Record<string, QuizAnswer> {
  const answers: Record<string, QuizAnswer> = {};
  const correctAnswers: Record<string, "A" | "B" | "C" | "D"> = {
    q1: "B", q2: "B", q3: "C", q4: "C", q5: "B",
    q6: "C", q7: "B", q8: "C", q9: "C", q10: "B",
    q11: "B", q12: "B", q13: "B",
  };

  for (const id of questionIds) {
    const correct = correctAnswers[id] ?? "A";
    const selected = allCorrect ? correct : ("A" as const);
    const isCorrect = selected === correct;
    answers[id] = {
      questionId: id,
      selected,
      correct,
      isCorrect: allCorrect ? true : isCorrect,
      answeredAt: new Date().toISOString(),
    };
  }
  return answers;
}

const ALL_QUESTION_IDS = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12","q13"];
const ALL_CORRECT_ANSWERS = buildAnswers(ALL_QUESTION_IDS, true);
const ALL_WRONG_ANSWERS = buildAnswers(ALL_QUESTION_IDS, false);

async function loginAgent() {
  return registerAndAuth(app, VALID_USER);
}

beforeEach(() => {
  clearTestData();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/minigame/quiz
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/minigame/quiz", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/minigame/quiz").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + quiz object when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBeDefined();
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it("quiz has exactly 13 questions (spec canonical quiz)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    expect(res.body.questions).toHaveLength(13);
  });

  it("each question has required fields", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    res.body.questions.forEach((q: Record<string, unknown>) => {
      expect(typeof q.id).toBe("string");
      expect(typeof q.number).toBe("number");
      expect(typeof q.text).toBe("string");
      expect(Array.isArray(q.options)).toBe(true);
      expect((q.options as unknown[]).length).toBe(4);
      expect(q.correctAnswer).toMatch(/^[A-D]$/);
    });
  });

  it("each option has letter and text", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    const q = res.body.questions[0];
    (q.options as { letter: string; text: string }[]).forEach((opt) => {
      expect(opt.letter).toMatch(/^[A-D]$/);
      expect(typeof opt.text).toBe("string");
      expect(opt.text.length).toBeGreaterThan(0);
    });
  });

  it("questions are in ascending number order", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    const numbers = res.body.questions.map((q: { number: number }) => q.number) as number[];
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]!);
    }
  });

  it("quiz has Thai title text", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    // Title should contain Thai characters
    expect(res.body.title).toMatch(/[\u0E00-\u0E7F]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/minigame/quiz/attempts  (submit quiz)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/minigame/quiz/attempts", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT_ANSWERS })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + QuizScore when authenticated with all-correct answers", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT_ANSWERS })
      .expect(200);

    expect(res.body.score).toMatchObject({
      quizId: "quiz-v1",
      total: 13,
      correctCount: 13,
      wrongCount: 0,
      points: 91, // 13 * 7 per spec
    });
  });

  it("scoring: correctCount * 7 = points (spec: 7pts per correct answer)", async () => {
    const agent = await loginAgent();

    // All 13 correct → 91 points
    const res1 = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT_ANSWERS })
      .expect(200);

    expect(res1.body.score.points).toBe(91);

    const res2 = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_WRONG_ANSWERS })
      .expect(200);

    expect(res2.body.score.points).toBe(0);
  });

  it("partial score: answering 7 correctly = 49 points", async () => {
    const agent = await loginAgent();
    const partial = {
      ...buildAnswers(ALL_QUESTION_IDS.slice(0, 7), true),  // q1-q7 correct
      ...buildAnswers(ALL_QUESTION_IDS.slice(7), false),     // q8-q13 wrong
    };

    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: partial })
      .expect(200);

    expect(res.body.score.correctCount).toBe(7);
    expect(res.body.score.points).toBe(49); // 7 * 7
    expect(res.body.score.wrongCount).toBe(6);
    expect(res.body.score.total).toBe(13);
  });

  it("all wrong: 0 points, 0 correctCount, 13 wrongCount", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_WRONG_ANSWERS })
      .expect(200);

    expect(res.body.score).toMatchObject({
      correctCount: 0,
      wrongCount: 13,
      points: 0,
      total: 13,
    });
  });

  it("400 VALIDATION_ERROR when quizId is missing", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ answers: ALL_CORRECT_ANSWERS })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when answers is not an object", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: "not-an-object" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when a selected value is invalid (not A/B/C/D)", async () => {
    const agent = await loginAgent();

    const badAnswers = {
      q1: {
        questionId: "q1",
        selected: "E", // invalid letter
        correct: "B",
        isCorrect: false,
        answeredAt: new Date().toISOString(),
      },
    };

    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: badAnswers })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/minigame/quiz/submit  (alias endpoint — spec s007)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/minigame/quiz/submit (alias)", () => {
  it("200 + QuizScore via alias endpoint", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/submit")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT_ANSWERS })
      .expect(200);

    expect(res.body.score.points).toBe(91);
  });

  it("ignores client's isCorrect flag and validates selected answer", async () => {
    const agent = await loginAgent();
    const maliciousAnswers = {
      q1: {
        questionId: "q1",
        selected: "A" as const, // WRONG (correct is B)
        correct: "B" as const,
        isCorrect: true, // MALICIOUS: claiming it's correct
        answeredAt: new Date().toISOString(),
      },
    };

    const res = await agent
      .post("/api/minigame/quiz/submit")
      .send({ quizId: "quiz-v1", answers: maliciousAnswers })
      .expect(200);

    // Should be 0 correct because 'A' is wrong for q1
    expect(res.body.score.correctCount).toBe(0);
    expect(res.body.score.points).toBe(0);
  });

  it("401 UNAUTHENTICATED when no session on alias endpoint", async () => {
    const res = await request(app)
      .post("/api/minigame/quiz/submit")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT_ANSWERS })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
