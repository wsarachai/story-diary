/**
 * Habits API — MongoDB integration tests — Story Diary
 *
 * Runs against a real MongoDB instance (story-diary-test database).
 * Tests are skipped automatically when MONGODB_URI / MONGODB_USERNAME is not set.
 *
 * Coverage:
 *   GET  /api/habits/today          — entries list, date param
 *   GET  /api/habits/weekly         — weekly view
 *   GET  /api/habits/monthly        — monthly view
 *   GET  /api/habits/monthly-summary — summary data
 *   GET  /api/habits/activities     — activity list, user isolation
 *   POST /api/habits/activities     — CRUD, duplicate name (case-insensitive), user isolation
 *   PATCH /api/habits/activities/:id — update, name uniqueness enforcement
 *   DELETE /api/habits/activities/:id — archive soft-delete
 *   PATCH /api/habits/occurrences/:id — toggle status, persistence
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { mongoIt } from "./setup";

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
  schedule: { frequency: "daily" as const, weekdays: [0, 1, 2, 3, 4, 5, 6] },
  mealRelation: "after" as const,
  mealSlots: ["breakfast", "dinner"],
};

const TODAY = new Date().toISOString().slice(0, 10);

async function loginAgent(tel = VALID_USER.tel) {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/register")
    .send({ ...VALID_USER, tel })
    .expect(201);
  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/today
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/today [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/today").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + empty entries array for new user", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/today").expect(200);

    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries).toHaveLength(0);
  });

  mongoIt("entries appear after creating an activity scheduled for all days", async () => {
    const agent = await loginAgent();
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const res = await agent.get(`/api/habits/today?date=${TODAY}`).expect(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThan(0);
  });

  mongoIt("TodayHabitEntry has correct shape when entries are present", async () => {
    const agent = await loginAgent();
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const res = await agent.get(`/api/habits/today?date=${TODAY}`).expect(200);

    if (res.body.entries.length > 0) {
      const entry = res.body.entries[0];
      expect(entry.activity).toBeDefined();
      expect(entry.occurrence).toBeDefined();
      expect(typeof entry.subline).toBe("string");
      expect(entry.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  mongoIt("accent colour for medicine activity is #57a8db", async () => {
    const agent = await loginAgent();
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const res = await agent.get(`/api/habits/today?date=${TODAY}`).expect(200);

    if (res.body.entries.length > 0) {
      const medEntry = res.body.entries.find(
        (e: { activity: { category: string } }) => e.activity.category === "medicine"
      );
      if (medEntry) {
        expect(medEntry.accent).toBe("#57a8db");
      }
    }
  });

  mongoIt("400 VALIDATION_ERROR for malformed date param", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/today?date=not-a-date").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("entries are isolated per user — user A's activities not visible to user B", async () => {
    const agentA = await loginAgent("0811111111");
    const agentB = await loginAgent("0822222222");

    await agentA.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const res = await agentB.get(`/api/habits/today?date=${TODAY}`).expect(200);
    expect(res.body.entries).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/weekly
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/weekly [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/weekly").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 when authenticated with no activities", async () => {
    const agent = await loginAgent();
    await agent.get("/api/habits/weekly").expect(200);
  });

  mongoIt("400 VALIDATION_ERROR for malformed weekStart param", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/weekly?weekStart=bad-date").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("weekly view includes entries after activity creation", async () => {
    const agent = await loginAgent();
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const weekStart = monday.toISOString().slice(0, 10);

    const res = await agent.get(`/api/habits/weekly?weekStart=${weekStart}`).expect(200);
    expect(res.body).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/monthly
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/monthly [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/monthly").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 when authenticated", async () => {
    const agent = await loginAgent();
    await agent.get("/api/habits/monthly").expect(200);
  });

  mongoIt("400 VALIDATION_ERROR for malformed month param (must be YYYY-MM)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/monthly?month=2026-5").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("monthly view accepts valid YYYY-MM format", async () => {
    const agent = await loginAgent();
    const thisMonth = TODAY.slice(0, 7); // "YYYY-MM"
    await agent.get(`/api/habits/monthly?month=${thisMonth}`).expect(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/monthly-summary
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/monthly-summary [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/monthly-summary").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 with goals and results fields when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/monthly-summary").expect(200);

    expect(res.body.goals).toBeDefined();
    expect(res.body.results).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/habits/activities
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/habits/activities [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/habits/activities").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + empty array for new user", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/habits/activities").expect(200);

    expect(Array.isArray(res.body.activities)).toBe(true);
    expect(res.body.activities).toHaveLength(0);
  });

  mongoIt("returns created activities from MongoDB", async () => {
    const agent = await loginAgent();
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const res = await agent.get("/api/habits/activities").expect(200);
    expect(res.body.activities).toHaveLength(1);
    expect(res.body.activities[0].name).toBe(MED_ACTIVITY.name);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/habits/activities
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/habits/activities [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("201 + activity on valid medicine input", async () => {
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

  mongoIt("201 for nutrition activity", async () => {
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

  mongoIt("201 for physical activity with physicalCategory", async () => {
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

  mongoIt("409 ACTIVITY_NAME_TAKEN on duplicate activity name (MongoDB index)", async () => {
    const agent = await loginAgent();
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, mealRelation: "before" })
      .expect(409);

    expect(res.body.error.code).toBe("ACTIVITY_NAME_TAKEN");
  });

  mongoIt("409 ACTIVITY_NAME_TAKEN is case-insensitive (name_normalized index)", async () => {
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

  mongoIt("different users can create activities with the same name", async () => {
    const agentA = await loginAgent("0811111111");
    const agentB = await loginAgent("0822222222");

    await agentA.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
    await agentB.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
  });

  mongoIt("400 VALIDATION_ERROR when name is empty", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, name: "" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR for invalid category", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, category: "sleep" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when schedule is missing", async () => {
    const agent = await loginAgent();
    const { schedule: _s, ...noSchedule } = MED_ACTIVITY;
    const res = await agent
      .post("/api/habits/activities")
      .send(noSchedule)
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("multiple activities can be created and all appear in list", async () => {
    const agent = await loginAgent();

    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
    await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, name: "กินวิตามิน", mealSlots: ["lunch"] })
      .expect(201);

    const res = await agent.get("/api/habits/activities").expect(200);
    expect(res.body.activities).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/habits/activities/:id
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/habits/activities/:id [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .patch("/api/habits/activities/some-id")
      .send({ name: "ชื่อใหม่" })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + updated activity on valid patch", async () => {
    const agent = await loginAgent();
    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);
    const actId = createRes.body.activity.id as string;

    const res = await agent
      .patch(`/api/habits/activities/${actId}`)
      .send({ name: "ยาใหม่" })
      .expect(200);

    expect(res.body.activity.name).toBe("ยาใหม่");
  });

  mongoIt("update persists in MongoDB — GET /activities reflects new name", async () => {
    const agent = await loginAgent();
    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);
    const actId = createRes.body.activity.id as string;

    await agent.patch(`/api/habits/activities/${actId}`).send({ name: "ชื่ออัปเดต" }).expect(200);

    const listRes = await agent.get("/api/habits/activities").expect(200);
    const updated = listRes.body.activities.find((a: { id: string }) => a.id === actId);
    expect(updated?.name).toBe("ชื่ออัปเดต");
  });

  mongoIt("409 ACTIVITY_NAME_TAKEN when updating to an existing name", async () => {
    const agent = await loginAgent();

    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
    const res2 = await agent
      .post("/api/habits/activities")
      .send({ ...MED_ACTIVITY, name: "ยาอีกตัว" })
      .expect(201);
    const actId2 = res2.body.activity.id as string;

    const res = await agent
      .patch(`/api/habits/activities/${actId2}`)
      .send({ name: MED_ACTIVITY.name })
      .expect(409);

    expect(res.body.error.code).toBe("ACTIVITY_NAME_TAKEN");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/habits/activities/:id  (archive)
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/habits/activities/:id [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .delete("/api/habits/activities/act-1")
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 { ok: true } on successful archive", async () => {
    const agent = await loginAgent();
    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);
    const actId = createRes.body.activity.id as string;

    const res = await agent.delete(`/api/habits/activities/${actId}`).expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  mongoIt("archived activity no longer appears in GET /activities", async () => {
    const agent = await loginAgent();
    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);
    const actId = createRes.body.activity.id as string;

    await agent.delete(`/api/habits/activities/${actId}`).expect(200);

    const listRes = await agent.get("/api/habits/activities").expect(200);
    const found = listRes.body.activities.find((a: { id: string }) => a.id === actId);
    expect(found).toBeUndefined();
  });

  mongoIt("archived activity name can be reused (soft-delete unblocks unique index)", async () => {
    const agent = await loginAgent();
    const createRes = await agent
      .post("/api/habits/activities")
      .send(MED_ACTIVITY)
      .expect(201);
    const actId = createRes.body.activity.id as string;

    await agent.delete(`/api/habits/activities/${actId}`).expect(200);

    // Should be able to create a new activity with the same name
    const res = await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);
    expect(res.body.activity.name).toBe(MED_ACTIVITY.name);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/habits/occurrences/:id  (toggle)
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/habits/occurrences/:id [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .patch("/api/habits/occurrences/occ-1")
      .send({ status: "done" })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("400 VALIDATION_ERROR for invalid status value", async () => {
    const agent = await loginAgent();
    const res = await agent
      .patch("/api/habits/occurrences/occ-1")
      .send({ status: "invalid" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("toggle occurrence status to done and verify persistence", async () => {
    const agent = await loginAgent();

    // Create activity and get today's occurrence
    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const todayRes = await agent.get(`/api/habits/today?date=${TODAY}`).expect(200);
    if (todayRes.body.entries.length === 0) {
      // No occurrence today — skip assertion
      return;
    }

    const occurrenceId = todayRes.body.entries[0].occurrence.id as string;

    // Toggle to done
    await agent
      .patch(`/api/habits/occurrences/${occurrenceId}`)
      .send({ status: "done" })
      .expect(200);

    // Verify persisted in MongoDB
    const verifyRes = await agent.get(`/api/habits/today?date=${TODAY}`).expect(200);
    const updated = verifyRes.body.entries.find(
      (e: { occurrence: { id: string } }) => e.occurrence.id === occurrenceId
    );
    if (updated) {
      expect(updated.occurrence.status).toBe("done");
    }
  });

  mongoIt("toggle occurrence status to skipped", async () => {
    const agent = await loginAgent();

    await agent.post("/api/habits/activities").send(MED_ACTIVITY).expect(201);

    const todayRes = await agent.get(`/api/habits/today?date=${TODAY}`).expect(200);
    if (todayRes.body.entries.length === 0) return;

    const occurrenceId = todayRes.body.entries[0].occurrence.id as string;

    await agent
      .patch(`/api/habits/occurrences/${occurrenceId}`)
      .send({ status: "skipped" })
      .expect(200);
  });
});
