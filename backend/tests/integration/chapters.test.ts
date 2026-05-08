/**
 * Chapters API — MongoDB integration tests — Story Diary
 *
 * Runs against a real MongoDB instance (story-diary-test database).
 * Tests are skipped automatically when MONGODB_URI / MONGODB_USERNAME is not set.
 *
 * Coverage:
 *   GET  /api/chapters           — auth, list shape, sort order from MongoDB, 5 seeded chapters
 *   GET  /api/chapters/:id       — detail, scenes in idx order, not-found, validation
 *   POST /api/chapters/:id/progress — upsert idempotency, user isolation
 *   GET  /api/video-clips        — auth, clip list
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { mongoIt } from "./setup";

const app = createTestApp();

const VALID_USER = {
  name: "นักเดินทาง",
  tel: "0812345678",
  password: "password123",
  characterName: "ฮีโร่",
  gender: "male" as const,
};

async function loginAgent(tel = VALID_USER.tel, password = VALID_USER.password) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ ...VALID_USER, tel }).expect(201);
  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chapters
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/chapters [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/chapters").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + chapters array when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    expect(Array.isArray(res.body.chapters)).toBe(true);
    expect(res.body.chapters.length).toBeGreaterThan(0);
  });

  mongoIt("exactly 5 seeded chapters from MongoDB", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    expect(res.body.chapters).toHaveLength(5);
  });

  mongoIt("chapters returned in ascending sort_order from MongoDB", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    const ids = res.body.chapters.map((c: { id: number }) => c.id) as number[];
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]!);
    }
  });

  mongoIt("chapter 1 is unlocked in fresh state", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1).toBeDefined();
    expect(ch1.lockState).toBe("unlocked");
  });

  mongoIt("chapters 2+ are locked in fresh state", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    const locked = res.body.chapters.filter((c: { id: number }) => c.id > 1);
    expect(locked.length).toBeGreaterThan(0);
    locked.forEach((c: { lockState: string }) => {
      expect(c.lockState).toBe("locked");
    });
  });

  mongoIt("each chapter summary has required fields", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    res.body.chapters.forEach((c: Record<string, unknown>) => {
      expect(typeof c.id).toBe("number");
      expect(typeof c.title).toBe("string");
      expect(c.lockState).toMatch(/^(unlocked|locked)$/);
      expect(c.progress).toMatch(/^(not-started|in-progress|completed)$/);
    });
  });

  mongoIt("all chapters show 'not-started' progress for a new user", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    res.body.chapters.forEach((c: { progress: string }) => {
      expect(c.progress).toBe("not-started");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chapters/:id
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/chapters/:id [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/chapters/1").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + chapter detail for chapter 1", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/1").expect(200);

    expect(typeof res.body.id).toBe("number");
    expect(res.body.id).toBe(1);
    expect(typeof res.body.title).toBe("string");
    expect(Array.isArray(res.body.scenes)).toBe(true);
  });

  mongoIt("chapter 1 has exactly 5 scenes seeded in MongoDB", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/1").expect(200);

    expect(res.body.scenes).toHaveLength(5);
  });

  mongoIt("scenes are returned in ascending idx order from MongoDB", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/1").expect(200);

    const indices = res.body.scenes.map((s: { index: number }) => s.index) as number[];
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
    }
  });

  mongoIt("each scene has required shape", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/1").expect(200);

    res.body.scenes.forEach((scene: Record<string, unknown>) => {
      expect(typeof scene.id).toBe("string");
      expect(typeof scene.index).toBe("number");
      expect(typeof scene.speakerName).toBe("string");
      expect(typeof scene.text).toBe("string");
    });
  });

  mongoIt("400 VALIDATION_ERROR for non-numeric chapter id", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/abc").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("404 for chapter id that does not exist", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/999").expect(404);
    expect(res.body.error).toBeDefined();
  });

  mongoIt("all 5 chapter details are readable from MongoDB", async () => {
    const agent = await loginAgent();

    for (const id of [1, 2, 3, 4, 5]) {
      const res = await agent.get(`/api/chapters/${id}`).expect(200);
      expect(res.body.id).toBe(id);
      expect(Array.isArray(res.body.scenes)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chapters/:id/progress
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chapters/:id/progress [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .post("/api/chapters/1/progress")
      .send({ progress: "in-progress" })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 { ok: true } on valid progress update", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/chapters/1/progress")
      .send({ progress: "in-progress" })
      .expect(200);

    expect(res.body).toEqual({ ok: true });
  });

  mongoIt("progress is persisted in MongoDB — GET /chapters reflects it", async () => {
    const agent = await loginAgent();

    await agent
      .post("/api/chapters/1/progress")
      .send({ progress: "completed" })
      .expect(200);

    const res = await agent.get("/api/chapters").expect(200);
    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1.progress).toBe("completed");
  });

  mongoIt("upsert is idempotent — posting same progress twice does not error", async () => {
    const agent = await loginAgent();

    await agent.post("/api/chapters/1/progress").send({ progress: "in-progress" }).expect(200);
    await agent.post("/api/chapters/1/progress").send({ progress: "in-progress" }).expect(200);

    const res = await agent.get("/api/chapters").expect(200);
    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1.progress).toBe("in-progress");
  });

  mongoIt("progress update replaces previous value (upsert semantics)", async () => {
    const agent = await loginAgent();

    await agent.post("/api/chapters/1/progress").send({ progress: "in-progress" }).expect(200);
    await agent.post("/api/chapters/1/progress").send({ progress: "completed" }).expect(200);

    const res = await agent.get("/api/chapters").expect(200);
    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1.progress).toBe("completed");
  });

  mongoIt("progress is isolated per user (user A's progress does not affect user B)", async () => {
    const agentA = await loginAgent("0811111111");
    const agentB = request.agent(app);
    await agentB
      .post("/api/auth/register")
      .send({ ...VALID_USER, tel: "0822222222", name: "คนที่สอง" })
      .expect(201);

    // User A marks chapter 1 completed
    await agentA.post("/api/chapters/1/progress").send({ progress: "completed" }).expect(200);

    // User B should still see not-started
    const res = await agentB.get("/api/chapters").expect(200);
    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1.progress).toBe("not-started");
  });

  mongoIt("400 VALIDATION_ERROR for invalid progress value", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/chapters/1/progress")
      .send({ progress: "invalid-value" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR for non-numeric chapter id in progress endpoint", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/chapters/abc/progress")
      .send({ progress: "completed" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/video-clips
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/video-clips [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/video-clips").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + video clip data when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/video-clips").expect(200);

    expect(res.body).toBeDefined();
  });
});
