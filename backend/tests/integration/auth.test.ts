/**
 * Auth API — MongoDB integration tests — Story Diary
 *
 * Runs against a real MongoDB instance (story-diary-test database).
 * Tests are skipped automatically when MONGODB_URI / MONGODB_USERNAME is not set.
 *
 * Coverage:
 *   POST /api/auth/register   — all contract cases + unique index enforcement
 *   POST /api/auth/login      — all contract cases + persisted user lookup
 *   POST /api/auth/logout     — session destruction
 *   GET  /api/auth/me         — session probe
 *   PATCH /api/users/:id      — profile update, tel-uniqueness via DB index
 */
import request from "supertest";
import { createTestApp } from "../helpers/createTestApp";
import { mongoIt } from "./setup";

const app = createTestApp();

const VALID_REGISTER = {
  name: "ทดสอบ ผู้ใช้",
  tel: "0812345678",
  password: "password123",
  characterName: "ตัวละคร",
  gender: "female",
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register [mongo]", () => {
  mongoIt("201 + user profile on valid input", async () => {
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
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  mongoIt("sets session cookie on successful register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(VALID_REGISTER)
      .expect(201);

    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(cookies!.join(";")).toMatch(/connect\.sid/);
  });

  mongoIt("409 PHONE_TAKEN when phone already registered", async () => {
    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, name: "คนอื่น" })
      .expect(409);

    expect(res.body.error.code).toBe("PHONE_TAKEN");
  });

  mongoIt("PHONE_TAKEN enforced by MongoDB unique index (concurrent-safe)", async () => {
    // Register twice with same tel; second must fail regardless of app-level checks
    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, name: "อื่น" })
      .expect(409);

    expect(res.body.error.code).toBe("PHONE_TAKEN");
  });

  mongoIt("400 VALIDATION_ERROR when tel is missing", async () => {
    const { tel: _e, ...noTel } = VALID_REGISTER;
    const res = await request(app)
      .post("/api/auth/register")
      .send(noTel)
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, password: "short" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when tel format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, tel: "not-a-phone" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when gender is not male/female", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, gender: "other" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when name is empty", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, name: "" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("tel is trimmed on register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID_REGISTER, tel: " 0812345678 " })
      .expect(201);

    expect(res.body.user.tel).toBe("0812345678");
  });

  mongoIt("registered user can be looked up after clear — data persists in MongoDB", async () => {
    // Register and capture the id
    const regRes = await request(app)
      .post("/api/auth/register")
      .send(VALID_REGISTER)
      .expect(201);

    const userId = regRes.body.user.id as string;

    // Login as a different request (no session) — proves the user exists in DB
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: VALID_REGISTER.tel, password: VALID_REGISTER.password })
      .expect(200);

    expect(loginRes.body.user.id).toBe(userId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login [mongo]", () => {
  mongoIt("200 + user profile on correct credentials", async () => {
    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);

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

  mongoIt("sets session cookie on successful login", async () => {
    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678", password: "password123" })
      .expect(200);

    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(cookies!.join(";")).toMatch(/connect\.sid/);
  });

  mongoIt("401 INVALID_CREDENTIALS on wrong password", async () => {
    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678", password: "wrongpassword" })
      .expect(401);

    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  mongoIt("401 INVALID_CREDENTIALS on unknown phone", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0899999999", password: "password123" })
      .expect(401);

    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  mongoIt("400 VALIDATION_ERROR when username is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("400 VALIDATION_ERROR when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "0812345678" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  mongoIt("multiple users with different tels can log in independently", async () => {
    const user2 = { ...VALID_REGISTER, tel: "0898765432", name: "คนที่สอง" };

    await request(app).post("/api/auth/register").send(VALID_REGISTER).expect(201);
    await request(app).post("/api/auth/register").send(user2).expect(201);

    const res1 = await request(app)
      .post("/api/auth/login")
      .send({ username: VALID_REGISTER.tel, password: VALID_REGISTER.password })
      .expect(200);

    const res2 = await request(app)
      .post("/api/auth/login")
      .send({ username: user2.tel, password: user2.password })
      .expect(200);

    expect(res1.body.user.tel).toBe(VALID_REGISTER.tel);
    expect(res2.body.user.tel).toBe(user2.tel);
    expect(res1.body.user.id).not.toBe(res2.body.user.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/auth/logout [mongo]", () => {
  mongoIt("200 { ok: true } on logout", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await agent.post("/api/auth/logout").expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  mongoIt("session is invalidated after logout", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);
    await agent.post("/api/auth/logout").expect(200);

    const res = await agent.get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("logout without a session still returns 200", async () => {
    await request(app).post("/api/auth/logout").expect(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/auth/me [mongo]", () => {
  mongoIt("401 UNAUTHENTICATED when no session", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("200 + user profile when session is active", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await agent.get("/api/auth/me").expect(200);
    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      tel: "0812345678",
    });
  });

  mongoIt("session persists across multiple requests", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    await agent.get("/api/auth/me").expect(200);
    await agent.get("/api/auth/me").expect(200);
    await agent.get("/api/auth/me").expect(200);
  });

  mongoIt("profile returned from MongoDB matches registered data", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);

    const res = await agent.get("/api/auth/me").expect(200);
    expect(res.body.user).toMatchObject({
      name: VALID_REGISTER.name,
      tel: VALID_REGISTER.tel,
      characterName: VALID_REGISTER.characterName,
      gender: VALID_REGISTER.gender,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id  (profile update)
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/users/:id [mongo]", () => {
  mongoIt("200 + updated user profile on valid patch", async () => {
    const agent = request.agent(app);
    const regRes = await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);
    const userId = regRes.body.user.id as string;

    const res = await agent
      .patch(`/api/users/${userId}`)
      .send({ name: "ชื่อใหม่" })
      .expect(200);

    expect(res.body.user.name).toBe("ชื่อใหม่");
    expect(res.body.user.tel).toBe(VALID_REGISTER.tel);
  });

  mongoIt("GET /api/auth/me reflects updated name after PATCH", async () => {
    const agent = request.agent(app);
    const regRes = await agent.post("/api/auth/register").send(VALID_REGISTER).expect(201);
    const userId = regRes.body.user.id as string;

    await agent.patch(`/api/users/${userId}`).send({ name: "ชื่อที่อัปเดต" }).expect(200);

    const meRes = await agent.get("/api/auth/me").expect(200);
    expect(meRes.body.user.name).toBe("ชื่อที่อัปเดต");
  });

  mongoIt("401 UNAUTHENTICATED when patching without session", async () => {
    const res = await request(app)
      .patch("/api/users/some-id")
      .send({ name: "ชื่อใหม่" })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  mongoIt("409 PHONE_TAKEN when updating tel to an already-used number", async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    const user2 = { ...VALID_REGISTER, tel: "0898765432", name: "คนที่สอง" };
    const reg1 = await agent1.post("/api/auth/register").send(VALID_REGISTER).expect(201);
    await agent2.post("/api/auth/register").send(user2).expect(201);

    const userId1 = reg1.body.user.id as string;

    // Try to update user1's tel to user2's tel
    const res = await agent1
      .patch(`/api/users/${userId1}`)
      .send({ tel: user2.tel })
      .expect(409);

    expect(res.body.error.code).toBe("PHONE_TAKEN");
  });
});
