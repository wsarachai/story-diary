/**
 * Chapters API contract tests — Story Diary
 *
 * Source of truth:
 *   - docs/specs/s005-chapters-and-story.md
 *   - src/types/chapters.ts   (Chapter, ChapterSummary, lockState, progress)
 *   - backend/src/routes/chapters.ts
 *   - backend/src/services/chapterService.ts
 *
 * Coverage:
 *   GET  /api/chapters         — list with lock state, auth required
 *   GET  /api/chapters/:id     — detail, invalid id, not-found
 *   POST /api/chapters/:id/progress — mark progress
 *   GET  /api/video-clips      — video clip collection, auth required
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { clearTestData } from "../helpers/testDb";
import { registerAndAuth } from "../helpers/auth";

const app = createTestApp();

const VALID_USER = {
  name: "นักเดินทาง",
  tel: "0812345678",
  password: "password123",
  characterName: "ฮีโร่",
  gender: "male" as const,
};

async function loginAgent() {
  return registerAndAuth(app, VALID_USER);
}

beforeEach(() => {
  clearTestData();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chapters  (chapter list / summaries)
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/chapters", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/chapters").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + chapters array when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    expect(Array.isArray(res.body.chapters)).toBe(true);
    expect(res.body.chapters.length).toBeGreaterThan(0);
  });

  it("chapter 1 is unlocked in fresh state (spec: only first chapter starts unlocked)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1).toBeDefined();
    expect(ch1.lockState).toBe("unlocked");
  });

  it("chapters 2+ are locked in fresh state", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    const locked = res.body.chapters.filter((c: { id: number }) => c.id > 1);
    locked.forEach((c: { lockState: string }) => {
      expect(c.lockState).toBe("locked");
    });
  });

  it("each chapter summary has required fields", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters").expect(200);

    res.body.chapters.forEach((c: Record<string, unknown>) => {
      expect(typeof c.id).toBe("number");
      expect(typeof c.title).toBe("string");
      expect(c.lockState).toMatch(/^(unlocked|locked)$/);
      expect(c.progress).toMatch(/^(not-started|in-progress|completed)$/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chapters/:id  (chapter detail)
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/chapters/:id", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/chapters/1").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + chapter detail with 5 seeded scenes for chapter 1", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/1").expect(200);

    expect(typeof res.body.id).toBe("number");
    expect(res.body.id).toBe(1);
    expect(typeof res.body.title).toBe("string");
    expect(Array.isArray(res.body.scenes)).toBe(true);
    expect(res.body.scenes).toHaveLength(5);
  });

  it("each scene has required shape (spec s005 scene contract)", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/1").expect(200);

    res.body.scenes.forEach((scene: Record<string, unknown>) => {
      expect(typeof scene.id).toBe("string");
      expect(typeof scene.index).toBe("number");
      expect(typeof scene.speakerName).toBe("string");
      expect(typeof scene.text).toBe("string");
    });
  });

  it("400 VALIDATION_ERROR for non-numeric chapter id", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/abc").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("404 for chapter id that does not exist", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/chapters/999").expect(404);
    expect(res.body.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chapters/:id/progress
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chapters/:id/progress", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app)
      .post("/api/chapters/1/progress")
      .send({ progress: "in-progress" })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 { ok: true } on valid progress update", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/chapters/1/progress")
      .send({ progress: "in-progress" })
      .expect(200);

    expect(res.body).toEqual({ ok: true });
  });

  it("progress is persisted — subsequent GET /chapters reflects it", async () => {
    const agent = await loginAgent();

    await agent
      .post("/api/chapters/1/progress")
      .send({ progress: "completed" })
      .expect(200);

    const res = await agent.get("/api/chapters").expect(200);
    const ch1 = res.body.chapters.find((c: { id: number }) => c.id === 1);
    expect(ch1.progress).toBe("completed");
  });

  it("400 VALIDATION_ERROR for invalid progress value", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/chapters/1/progress")
      .send({ progress: "invalid-value" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR for non-numeric chapter id in progress endpoint", async () => {
    const agent = await loginAgent();
    const res = await agent
      .post("/api/chapters/abc/progress")
      .send({ progress: "completed" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/e-books
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/e-books", () => {
  it("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/e-books").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + e-book collection when authenticated", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/e-books").expect(200);

    expect(res.body.badge).toBe("E-book");
    expect(Array.isArray(res.body.chapters)).toBe(true);
    expect(res.body.chapters.length).toBeGreaterThan(0);

    res.body.chapters.forEach((ebook: Record<string, unknown>) => {
      expect(typeof ebook.id).toBe("string");
      expect(typeof ebook.title).toBe("string");
      expect(typeof ebook.pdfUrl).toBe("string");
    });
  });
});
