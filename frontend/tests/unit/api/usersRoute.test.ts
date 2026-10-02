// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { GET, PATCH } from "@/app/api/users/[id]/route";
import { clearTestData, insertUser } from "@/lib/db";
import { getJwtSecret } from "@/lib/services/authService";

process.env.JWT_SECRET ??= "unit-test-jwt-secret";

function makeReq(id: string, token: string, method: "GET" | "PATCH", body?: unknown): Request {
  return new Request(`http://localhost:3000/api/users/${id}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function seed(id: string, tel: string, role?: "admin") {
  return insertUser({
    id,
    name: `User ${id}`,
    tel,
    password_hash: "x",
    character_name: "Char",
    gender: "male",
    ...(role ? { role } : {}),
    timezone: "Asia/Bangkok",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

beforeEach(() => {
  clearTestData();
});

describe("GET /api/users/[id] ownership", () => {
  it("returns the own profile via 'me'", async () => {
    await seed("u-a", "0800000001");
    const token = jwt.sign({ userId: "u-a" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await GET(makeReq("me", token, "GET"), { params: Promise.resolve({ id: "me" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).user.id).toBe("u-a");
  });

  it("allows another user's id for an admin", async () => {
    await seed("u-a", "0800000001");
    await seed("u-admin", "0800000002", "admin");
    const token = jwt.sign({ userId: "u-admin" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await GET(makeReq("u-a", token, "GET"), { params: Promise.resolve({ id: "u-a" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).user.id).toBe("u-a");
  });

  it("forbids a regular user from reading another user's profile (IDOR)", async () => {
    await seed("u-a", "0800000001");
    await seed("u-b", "0800000003");
    const token = jwt.sign({ userId: "u-a" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await GET(makeReq("u-b", token, "GET"), { params: Promise.resolve({ id: "u-b" }) });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/users/[id] ownership", () => {
  it("forbids a regular user from editing another user's profile (IDOR)", async () => {
    await seed("u-a", "0800000001");
    await seed("u-b", "0800000003");
    const token = jwt.sign({ userId: "u-a" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await PATCH(
      makeReq("u-b", token, "PATCH", { name: "Hacked" }),
      { params: Promise.resolve({ id: "u-b" }) }
    );
    expect(res.status).toBe(403);
  });

  it("edits the own profile via 'me'", async () => {
    await seed("u-a", "0800000001");
    const token = jwt.sign({ userId: "u-a" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await PATCH(
      makeReq("me", token, "PATCH", { name: "New Name" }),
      { params: Promise.resolve({ id: "me" }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).user.name).toBe("New Name");
  });
});
