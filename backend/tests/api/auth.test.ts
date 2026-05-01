/**
 * Auth API contract tests — Story Diary
 *
 * Source of truth:
 *   - docs/specs/s001-auth-and-home-entry.md
 *   - src/types/auth.ts   (RegisterRequest, LoginRequest, SessionUser)
 *   - src/types/error.ts  (ApiErrorCode envelope)
 *   - backend/src/routes/auth.ts
 *   - backend/src/services/authService.ts
 *
 * Coverage:
 *   POST /api/auth/register  — happy path, duplicate phone, validation
 *   POST /api/auth/login     — happy path, invalid creds, missing fields
 *   POST /api/auth/logout    — destroys session
 *   GET  /api/auth/me        — session probe: authenticated / unauthenticated
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { clearTestData } from "../helpers/testDb";

const app = createTestApp();

const VALID_REGISTER = {
  name: "ทดสอบ ผู้ใช้",
  tel: "0812345678",
  password: "password123",
  characterName: "ตัวละคร",
  gender: "female",
};

beforeEach(() => {
  clearTestData();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("201 + user profile on valid input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(VALID_REGISTER)
      .expect(201);

    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      name: "ทดสอบ ผู้ใช้",
      tel: "0812345678",
      characterName: "ตัวละคร",
      gender: "female",
      createdAt: expect.any(String),
    });
    // Password must never be returned
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("sets session cookie on successful register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(VALID_REGISTER)
      .expect(201);

    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(cookies!.join(";")).toMatch(/connect\.sid/);
  });

  it("409 PHONE_TAKEN when phone already registered", async () => {
    // Register first time
    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);

    // Duplicate attempt
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, name: "อื่น" })
      .expect(409);

    expect(res.body.error.code).toBe("PHONE_TAKEN");
  });

  it("400 VALIDATION_ERROR when tel is missing", async () => {
    const { tel: _e, ...noTel } = VALID_REGISTER;
    const res = await request(app)
      .post("/api/auth/register")
      .send(noTel)
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when password is too short (<8 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, password: "short" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when tel format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, tel: "not-a-phone" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when gender is not male/female", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, gender: "other" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when name is empty string", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, name: "" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("tel is trimmed on register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, tel: " 0812345678 " })
      .expect(201);

    expect(res.body.user.tel).toBe("0812345678");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Create a user to log in as
    await request(app).post("/api/auth/register").send(VALID_REGISTER);
  });

  it("200 + user profile on correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678", password: "password123" })
      .expect(200);

    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      tel: "0812345678",
    });
    expect(res.body.user.password).toBeUndefined();
  });

  it("sets session cookie on successful login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678", password: "password123" })
      .expect(200);

    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(cookies!.join(";")).toMatch(/connect\.sid/);
  });

  it("401 INVALID_CREDENTIALS on wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678", password: "wrongpassword" })
      .expect(401);

    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("401 INVALID_CREDENTIALS on unknown phone", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0888888888", password: "password123" })
      .expect(401);

    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("400 VALIDATION_ERROR when username is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 VALIDATION_ERROR when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("200 { ok: true } on logout", async () => {
    // Use agent to maintain session across requests
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await agent.post("/api/auth/logout").expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("session is invalidated after logout (GET /me returns 401)", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);
    await agent.post("/api/auth/logout").expect(200);

    const res = await agent.get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logout without a session still returns 200", async () => {
    // No prior login — session destroy still succeeds
    await request(app).post("/api/auth/logout").expect(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (session probe — spec s001)
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("401 UNAUTHENTICATED when no session (unauthenticated probe)", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("200 + user profile when session is active (authenticated probe)", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await agent.get("/api/auth/me").expect(200);
    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      tel: "0812345678",
    });
  });

  it("session persists across multiple requests (already-authenticated state)", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    // Multiple consecutive probes all succeed
    await agent.get("/api/auth/me").expect(200);
    await agent.get("/api/auth/me").expect(200);
    await agent.get("/api/auth/me").expect(200);
  });
});
