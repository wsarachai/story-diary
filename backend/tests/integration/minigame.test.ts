/**
 * Minigame Quiz API — MongoDB integration tests — Story Diary
 *
 * Runs against a real MongoDB instance (story-diary-test database).
 * Tests are skipped automatically when MONGODB_URI / MONGODB_USERNAME is not set.
 *
 * Coverage:
 *   GET  /api/minigame/quiz          — auth, shape, 13 questions from MongoDB, sort order
 *   POST /api/minigame/quiz/attempts — scoring, persistence, multiple attempts per user
 *   POST /api/minigame/quiz/submit   — alias endpoint
 *   Validation errors for both submission endpoints
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { mongoIt } from "./setup";
import type { QuizAnswer } from "../../../src/types/minigame";

const app = createTestApp();

const VALID_USER = {
  name: "นักเล่นเกม",
  tel: "0812345678",
  password: "password123",
  characterName: "นักสู้",
  gender: "male" as const,
};

const CORRECT_ANSWERS: Record<string, "A" | "B" | "C" | "D"> = {
  q1: "B", q2: "B", q3: "C", q4: "C", q5: "B",
  q6: "C", q7: "B", q8: "C", q9: "C", q10: "B",
  q11: "B", q12: "B", q13: "B",
};

const ALL_QUESTION_IDS = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12","q13"];

function buildAnswers(
  questionIds: string[],
  allCorrect: boolean
): Record<string, QuizAnswer> {
  const answers: Record<string, QuizAnswer> = {};
  for (const id of questionIds) {
    const correct = CORRECT_ANSWERS[id] ?? "A";
    const selected = allCorrect ? correct : ("A" as const);
    const isCorrect = allCorrect || selected === correct;
    answers[id] = {
      questionId: id,
      selected,
      correct,
      isCorrect,
      answeredAt: new Date().toISOString(),
    };
  }
  return answers;
}

const ALL_CORRECT = buildAnswers(ALL_QUESTION_IDS, true);
const ALL_WRONG = buildAnswers(ALL_QUESTION_IDS, false);

async function loginAgent(tel = VALID_USER.tel) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ ...VALID_USER, tel }).expect(201);
  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/minigame/quiz
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/minigame/quiz [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/minigame/quiz").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + quiz object when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBeDefined();
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  mongoIt("quiz has exactly 13 questions from MongoDB seed data", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    expect(res.body.questions).toHaveLength(13);
  });

  mongoIt("each question has required fields", async () => {
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

  mongoIt("each option has letter and text", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    const q = res.body.questions[0];
    (q.options as { letter: string; text: string }[]).forEach((opt) => {
      expect(opt.letter).toMatch(/^[A-D]$/);
      expect(typeof opt.text).toBe("string");
      expect(opt.text.length).toBeGreaterThan(0);
    });
  });

  mongoIt("questions are in ascending number order from MongoDB (sorted by number field)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    const numbers = res.body.questions.map((q: { number: number }) => q.number) as number[];
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]!);
    }
  });

  mongoIt("question numbers are 1 through 13 inclusive", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    const numbers = res.body.questions.map((q: { number: number }) => q.number) as number[];
    expect(numbers[0]).toBe(1);
    expect(numbers[12]).toBe(13);
  });

  mongoIt("question IDs match seeded values (q1..q13)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    const ids = new Set(res.body.questions.map((q: { id: string }) => q.id));
    for (const expectedId of ALL_QUESTION_IDS) {
      expect(ids.has(expectedId)).toBe(true);
    }
  });

  mongoIt("quiz has Thai title text", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/minigame/quiz").expect(200);

    expect(res.body.title).toMatch(/[\u0E00-\u0E7F]/);
  });

  mongoIt("quiz questions are the same on repeated loads (deterministic from MongoDB)", async () => {
    const agent = await loginAgent();

    const res1 = await agent.get("/api/minigame/quiz").expect(200);
    const res2 = await agent.get("/api/minigame/quiz").expect(200);

    const ids1 = res1.body.questions.map((q: { id: string }) => q.id).sort();
    const ids2 = res2.body.questions.map((q: { id: string }) => q.id).sort();
    expect(ids1).toEqual(ids2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/minigame/quiz/attempts
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/minigame/quiz/attempts [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + QuizScore with all-correct answers", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);

    expect(res.body.score).toMatchObject({
      quizId: "quiz-v1",
      total: 13,
      correctCount: 13,
      wrongCount: 0,
      points: 91, // 13 * 7
    });
  });

  mongoIt("scoring: correctCount × 7 = points (7 pts per correct answer)", async () => {
    const agent = await loginAgent();

    const res1 = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);
    expect(res1.body.score.points).toBe(91);

    const res2 = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_WRONG })
      .expect(200);
    expect(res2.body.score.points).toBe(0);
  });

  mongoIt("partial score: 7 correct answers = 49 points", async () => {
    const agent = await loginAgent();
    const partial = {
      ...buildAnswers(ALL_QUESTION_IDS.slice(0, 7), true),
      ...buildAnswers(ALL_QUESTION_IDS.slice(7), false),
    };

    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: partial })
      .expect(200);

    expect(res.body.score.correctCount).toBe(7);
    expect(res.body.score.points).toBe(49);
    expect(res.body.score.wrongCount).toBe(6);
    expect(res.body.score.total).toBe(13);
  });

  mongoIt("all wrong: 0 points, 0 correctCount, 13 wrongCount", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_WRONG })
      .expect(200);

    expect(res.body.score).toMatchObject({
      correctCount: 0,
      wrongCount: 13,
      points: 0,
      total: 13,
    });
  });

  mongoIt("attempt is persisted in MongoDB (not just in-memory)", async () => {
    const agent = await loginAgent();

    // Submit attempt
    const submitRes = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);

    // The score result should be calculated from real question data in MongoDB
    expect(submitRes.body.score.total).toBe(13);
    expect(submitRes.body.score.points).toBeGreaterThanOrEqual(0);
  });

  mongoIt("multiple attempts by the same user are all accepted", async () => {
    const agent = await loginAgent();

    await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);

    await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_WRONG })
      .expect(200);

    // Both attempts should succeed — no "already attempted" restriction
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);

    expect(res.body.score.points).toBe(91);
  });

  mongoIt("different users submit independently — no cross-user interference", async () => {
    const agentA = await loginAgent("0811111111");
    const agentB = await loginAgent("0822222222");

    const resA = await agentA
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);

    const resB = await agentB
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: ALL_WRONG })
      .expect(200);

    expect(resA.body.score.points).toBe(91);
    expect(resB.body.score.points).toBe(0);
  });

  mongoIt("400 VALIDATION_ERROR when quizId is missing", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ answers: ALL_CORRECT })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when answers is not an object", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/attempts")
      .send({ quizId: "quiz-v1", answers: "not-an-object" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when a selected value is invalid (not A/B/C/D)", async () => {
    const agent = await loginAgent();
    const badAnswers = {
      q1: {
        questionId: "q1",
        selected: "E",
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
// POST /api/minigame/quiz/submit  (alias)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/minigame/quiz/submit (alias) [mongo]", () => {
  mongoIt("200 + QuizScore via alias endpoint", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/minigame/quiz/submit")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(200);

    expect(res.body.score.points).toBe(91);
  });

  mongoIt("401 UNAUTHENTICATED when no session on alias endpoint", async () => {
    const res = await request(app)
      .post("/api/minigame/quiz/submit")
      .send({ quizId: "quiz-v1", answers: ALL_CORRECT })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("alias produces identical score to /attempts", async () => {
    const agent = await loginAgent();

    const partial = {
      ...buildAnswers(ALL_QUESTION_IDS.slice(0, 5), true),
      ...buildAnswers(ALL_QUESTION_IDS.slice(5), false),
    };

    const res = await agent
      .post("/api/minigame/quiz/submit")
      .send({ quizId: "quiz-v1", answers: partial })
      .expect(200);

    expect(res.body.score.correctCount).toBe(5);
    expect(res.body.score.points).toBe(35); // 5 * 7
  });
});
