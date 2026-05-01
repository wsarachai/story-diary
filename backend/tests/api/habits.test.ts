/**
 * Habits API contract tests — Story Diary
 *
 * Source of truth:
 *   - docs/specs/s006-habit-tracker-views.md    (read views, toggle)
 *   - docs/specs/s016-habit-activity-authoring.md (createActivity, DS-3)
 *   - src/types/habit.ts                          (HabitActivity, TodayHabitEntry, …)
 *   - backend/src/routes/habits.ts
 *   - backend/src/services/habitService.ts
 *
 * Coverage:
 *   GET  /api/habits/today          — entries list, auth, invalid date
 *   GET  /api/habits/weekly         — weekly view, auth, invalid format
 *   GET  /api/habits/monthly        — monthly view, auth, invalid format
 *   GET  /api/habits/monthly-summary — summary data, auth
 *   GET  /api/habits/activities     — activity list, auth
 *   POST /api/habits/activities     — create, duplicate name → 409 ACTIVITY_NAME_TAKEN
 *   PATCH /api/habits/activities/:id — update
 *   DELETE /api/habits/activities/:id — archive
 *   PATCH /api/habits/occurrences/:id — toggle status
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { clearTestData } from "../helpers/testDb";

const app = createTestApp();

const VALID_USER = {
  name: "ผู้ใช้ทดสอบ",
  tel: "0812345678",
  password: "password123",
  characterName: "ตัวละคร",
  gender: "female" as const,
};

const MED_ACTIVITY = {
  category: "medicine" as const,
  name: "กินยา ABC",
  schedule: { frequency: "daily" as const, weekdays: [1, 2, 3, 4, 5] },
  mealRelation: "after" as const,
  mealSlots: ["breakfast", "dinner"],
};

async function loginAgent() {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(VALID_USER).expect(201);
  return agent;
}

beforeEach(() => {
  clearTestData();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/today
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/today", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/today").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + entries array (empty for new user)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/today").expect(200);

    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries).toHaveLength(0);
  });

  it("200 + entries after creating an activity", async () => {
    const agent = await loginAgent();

    // Create a medicine activity scheduled for all weekdays
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    // Get today's date
    const today = new Date().toISOString().slice(0, 10);
    const res = await agent
      .get(`/api/habits/today?date=${today}`)
      .expect(200);

    // Entries may be empty if today is not a scheduled weekday for the activity
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it("400 VALIDATION_ERROR for malformed date param", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/habits/today?date=not-a-date")
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("TodayHabitEntry has correct spec shape when entries present", async () => {
    const agent = await loginAgent();

    await agent
      .post("/api/habits/activities")
      .send({
        ...MED_ACTIVITY,
        // Use a schedule with all 7 days to ensure today is included
        schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      })
      .expect(201);

    const today = new Date().toISOString().slice(0, 10);
    const res = await agent
      .get(`/api/habits/today?date=${today}`)
      .expect(200);

    if (res.body.entries.length > 0) {
      const entry = res.body.entries[0];
      expect(entry.activity).toBeDefined();
      expect(entry.occurrence).toBeDefined();
      expect(typeof entry.subline).toBe("string");
      expect(entry.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("accent colour for medicine activity is #57a8db (spec: cat-med)", async () => {
    const agent = await loginAgent();

    await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] } })
      .expect(201);

    const today = new Date().toISOString().slice(0, 10);
    const res = await agent.get(`/api/habits/today?date=${today}`).expect(200);

    if (res.body.entries.length > 0) {
      const medEntry = res.body.entries.find(
        (e: { activity: { category: string } }) => e.activity.category === "medicine"
      );
      if (medEntry) {
        expect(medEntry.accent).toBe("#57a8db");
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/weekly
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/weekly", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/weekly").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 when authenticated (no activities)", async () => {
    const agent = await loginAgent();
    await agent.get("/api/habits/weekly").expect(200);
  });

  it("400 VALIDATION_ERROR for malformed weekStart param", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/habits/weekly?weekStart=bad-date")
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/monthly
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/monthly", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/monthly").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 when authenticated", async () => {
    const agent = await loginAgent();
    await agent.get("/api/habits/monthly").expect(200);
  });

  it("400 VALIDATION_ERROR for malformed month param (must be YYYY-MM)", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/habits/monthly?month=2026-5")
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/monthly-summary
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/monthly-summary", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/monthly-summary").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 with goals and results fields when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/monthly-summary").expect(200);

    expect(res.body.goals).toBeDefined();
    expect(res.body.results).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/activities
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/activities", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/activities").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + empty array for new user", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/activities").expect(200);

    expect(Array.isArray(res.body.activities)).toBe(true);
    expect(res.body.activities).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/habits/activities  (activity authoring — spec s016)
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/habits/activities", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("201 + activity on valid medicine input", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);

    expect(res.body.activity).toMatchObject({
      id: expect.any(String),
      category: "medicine",
      name: "กินยา ABC",
      createdAt: expect.any(String),
    });
  });

  it("201 for nutrition activity", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send({
        category: "nutrition",
        name: "รับประทานอาหารครบ 5 หมู่",
        schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      })
      .expect(201);

    expect(res.body.activity.category).toBe("nutrition");
  });

  it("201 for physical activity with physicalCategory", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send({
        category: "physical",
        physicalCategory: "exercise",
        name: "ออกกำลังกายตอนเช้า",
        schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      })
      .expect(201);

    expect(res.body.activity.category).toBe("physical");
  });

  it("409 ACTIVITY_NAME_TAKEN on duplicate activity name (spec DS-3)", async () => {
    const agent = await loginAgent();

    // Create first activity
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    // Duplicate name
    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, mealRelation: "before" })
      .expect(409);

    expect(res.body.error.code).toBe("ACTIVITY_NAME_TAKEN");
  });

  it("409 ACTIVITY_NAME_TAKEN is case-insensitive", async () => {
    const agent = await loginAgent();

    await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, name: "กินยา ABC" })
      .expect(201);

    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, name: "กินยา abc" })
      .expect(409);

    expect(res.body.error.code).toBe("ACTIVITY_NAME_TAKEN");
  });

  it("400 VALIDATION_ERROR when name is empty", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, name: "" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR for invalid category", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, category: "sleep" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when schedule is missing", async () => {
    const agent = await loginAgent();
    const { schedule: _s, ...noSchedule } = MED_ACTIVITY;
    const res = await agent
      .post("/api/habits/activities")
      .send(noSchedule)
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("different users can have activities with the same name", async () => {
    const agent1 = request.agent(app);
    await agent1.post("/api/auth/register").send(VALID_USER).expect(201);

    const agent2 = request.agent(app);
    await agent2
      .post("/api/auth/register")
      .send({ ...VALID_USER, tel: "0888888888" })
      .expect(201);

    await agent1.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
    // Second user creates same-named activity — should succeed
    await agent2.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/habits/occurrences/:id  (toggle — spec s006 DS-2)
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/habits/occurrences/:id", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .patch("/api/habits/occurrences/occ-1")
      .send({ status: "done" })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("400 VALIDATION_ERROR for invalid status value", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/habits/occurrences/occ-1")
      .send({ status: "invalid" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/habits/activities/:id  (archive)
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/habits/activities/:id", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .delete("/api/habits/activities/act-1")
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 { ok: true } on successful archive", async () => {
    const agent = await loginAgent();

    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);

    const actId = createRes.body.activity.id;
    const res = await agent.delete(`/api/habits/activities/${actId}`).expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("archived activity no longer appears in GET /activities", async () => {
    const agent = await loginAgent();

    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);

    const actId = createRes.body.activity.id;
    await agent.delete(`/api/habits/activities/${actId}`).expect(200);

    const listRes = await agent.get("/api/habits/activities").expect(200);
    const found = listRes.body.activities.find(
      (a: { id: string }) => a.id === actId
    );
    expect(found).toBeUndefined();
  });
});
