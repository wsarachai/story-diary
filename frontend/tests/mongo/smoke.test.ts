/**
 * Mongo-mode smoke test — Story Diary
 *
 * Drives ONE golden end-to-end flow through the real `app/api/**` route
 * handlers against a real mongod (booted by tests/mongo/setup.ts). This is the
 * only coverage of the `mongo` branch of lib/db.ts — the rest of the suite runs
 * the in-memory branch.
 *
 * What the flow transitively proves on real Mongo:
 *   - index creation + dropStaleIndexes (ensureMongoIndexes, on first init)
 *   - reference-data seeding (chapters, quiz questions)
 *   - insertOne, findOne-by-field, sorted find
 *   - upsert (upsertChapterProgress) + the unlock side-effect (updateOne)
 *   - $setOnInsert upsert (upsertPendingOccurrence) + findOneAndUpdate
 *   - replaceOne upsert (medicine check-in)
 *
 * Run with: pnpm test:mongo
 */
import { describe, it, expect, beforeAll } from "vitest";

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as listChapters } from "@/app/api/chapters/route";
import { POST as setProgress } from "@/app/api/chapters/[id]/progress/route";
import { POST as createActivity } from "@/app/api/habits/activities/route";
import { GET as today } from "@/app/api/habits/today/route";
import { POST as checkinMedicine } from "@/app/api/habits/checkin/medicine/route";
import { GET as getQuiz } from "@/app/api/minigame/quiz/route";
import { POST as submitQuiz } from "@/app/api/minigame/quiz/attempts/route";

const ORIGIN = "http://localhost:3000";
const TEST_DATE = "2026-06-09"; // fixed so habit scheduling is deterministic

function jsonReq(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Request {
  const { method = "GET", body, token } = opts;
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("mongo-mode smoke: golden flow", () => {
  let token = "";
  let userId = "";
  let occurrenceId = "";

  // Clear any user data left by a previous run so re-runs against the same
  // (in-process) mongod start clean. Reference data (chapters/quiz) is re-seeded
  // idempotently by initializeDatabase.
  beforeAll(async () => {
    const { initializeDatabase, clearUserDataForTesting } = await import("@/lib/db");
    await initializeDatabase();
    await clearUserDataForTesting();
  });

  it("registers a new user (insertUser)", async () => {
    const res = await register(
      jsonReq("/api/auth/register", {
        method: "POST",
        body: {
          name: "สมชาย ทดสอบ",
          tel: "0812345678",
          password: "password123",
          characterName: "ฮีโร่",
          gender: "male",
          timezone: "Asia/Bangkok",
        },
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.tel).toBe("0812345678");
    expect(data.user.role).toBe("user");
    expect(typeof data.token).toBe("string");
    userId = data.user.id;
  });

  it("logs in with the same credentials (findUserByTel)", async () => {
    const res = await login(
      jsonReq("/api/auth/login", {
        method: "POST",
        body: { username: "0812345678", password: "password123" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(userId);
    expect(typeof data.token).toBe("string");
    token = data.token;
  });

  it("lists seeded chapters with chapter 1 unlocked (listChaptersDocs + seeding)", async () => {
    const res = await listChapters(jsonReq("/api/chapters", { token }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chapters).toHaveLength(5);
    const ch1 = data.chapters.find((c: { id: number }) => c.id === 1);
    const ch2 = data.chapters.find((c: { id: number }) => c.id === 2);
    expect(ch1.lockState).toBe("unlocked");
    expect(ch2.lockState).toBe("locked");
  });

  it("completing chapter 1 unlocks chapter 2 (upsertChapterProgress + unlockNext)", async () => {
    const res = await setProgress(
      jsonReq("/api/chapters/1/progress", {
        method: "POST",
        body: { progress: "completed" },
        token,
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);

    const after = await (await listChapters(jsonReq("/api/chapters", { token }))).json();
    const ch1 = after.chapters.find((c: { id: number }) => c.id === 1);
    const ch2 = after.chapters.find((c: { id: number }) => c.id === 2);
    expect(ch1.progress).toBe("completed");
    expect(ch2.lockState).toBe("unlocked");
  });

  it("creates a daily habit activity (insertHabitActivity)", async () => {
    const res = await createActivity(
      jsonReq("/api/habits/activities", {
        method: "POST",
        body: {
          category: "medicine",
          name: "ยาลดความดัน",
          schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
          mealRelation: "after",
          mealSlots: ["breakfast"],
        },
        token,
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.activity.id).toBeTruthy();
    expect(data.activity.name).toBe("ยาลดความดัน");
  });

  it("materializes today's occurrence (upsertPendingOccurrence)", async () => {
    const res = await today(jsonReq(`/api/habits/today?date=${TEST_DATE}`, { token }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toHaveLength(1);
    const entry = data.entries[0];
    expect(entry.occurrence.status).toBe("pending");
    occurrenceId = entry.occurrence.id;
    expect(occurrenceId).toBeTruthy();
  });

  it("saves a medicine check-in and marks the occurrence done (replaceOne + updateOne)", async () => {
    const res = await checkinMedicine(
      jsonReq("/api/habits/checkin/medicine", {
        method: "POST",
        body: {
          occurrenceId,
          medicineName: "ยาลดความดัน",
          mealRelation: "after",
          mealSlots: ["breakfast"],
          sideEffects: [{ id: "dizzy", label: "เวียนหัว", checked: true }],
        },
        token,
      })
    );
    expect(res.status).toBe(200);

    const after = await (
      await today(jsonReq(`/api/habits/today?date=${TEST_DATE}`, { token }))
    ).json();
    expect(after.entries[0].occurrence.status).toBe("done");
  });

  it("loads the seeded quiz (listQuizQuestionsDocs)", async () => {
    const res = await getQuiz(jsonReq("/api/minigame/quiz", { token }));

    expect(res.status).toBe(200);
    const quiz = await res.json();
    expect(quiz.id).toBe("quiz-v1");
    expect(quiz.questions.length).toBeGreaterThanOrEqual(10);
  });

  it("submits a fully-correct quiz attempt and scores it (insertQuizAttempt)", async () => {
    const quiz = await (await getQuiz(jsonReq("/api/minigame/quiz", { token }))).json();

    const answers: Record<string, unknown> = {};
    for (const q of quiz.questions as Array<{ id: string; correctAnswer: "A" | "B" | "C" | "D" }>) {
      answers[q.id] = {
        questionId: q.id,
        selected: q.correctAnswer,
        correct: q.correctAnswer,
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      };
    }

    const res = await submitQuiz(
      jsonReq("/api/minigame/quiz/attempts", {
        method: "POST",
        body: { quizId: quiz.id, answers },
        token,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.score.total).toBe(quiz.questions.length);
    expect(data.score.correctCount).toBe(quiz.questions.length);
    expect(data.score.wrongCount).toBe(0);
    expect(data.score.points).toBe(quiz.questions.length * 7);
  });
});
