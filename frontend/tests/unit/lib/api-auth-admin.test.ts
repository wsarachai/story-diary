// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { requireAdmin } from "@/lib/api-auth";
import { clearTestData, insertUser } from "@/lib/db";
import { AppError } from "@/lib/errors";

const SECRET = "story-diary-dev-secret";

function makeReq(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/admin/test", { headers });
}

function makeToken(userId: string) {
  return jwt.sign({ userId }, SECRET, { expiresIn: "1h" });
}

beforeEach(() => {
  clearTestData();
});

describe("requireAdmin", () => {
  it("throws 401 when no token provided", async () => {
    await expect(requireAdmin(makeReq())).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("throws 403 when user has role=user", async () => {
    await insertUser({
      id: "u-regular",
      name: "Regular",
      tel: "0800000001",
      password_hash: "x",
      character_name: "Char",
      gender: "female",
      role: "user",
      timezone: "Asia/Bangkok",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const token = makeToken("u-regular");
    await expect(requireAdmin(makeReq(`Bearer ${token}`))).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("throws 403 when user has no role field", async () => {
    await insertUser({
      id: "u-norole",
      name: "NoRole",
      tel: "0800000002",
      password_hash: "x",
      character_name: "Char",
      gender: "male",
      timezone: "Asia/Bangkok",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const token = makeToken("u-norole");
    await expect(requireAdmin(makeReq(`Bearer ${token}`))).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("returns userId when user has role=admin", async () => {
    await insertUser({
      id: "u-admin",
      name: "Admin",
      tel: "0800000003",
      password_hash: "x",
      character_name: "Char",
      gender: "male",
      role: "admin",
      timezone: "Asia/Bangkok",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const token = makeToken("u-admin");
    const result = await requireAdmin(makeReq(`Bearer ${token}`));
    expect(result).toBe("u-admin");
  });

  it("throws 401 for expired token even if user is admin", async () => {
    await insertUser({
      id: "u-admin2",
      name: "Admin2",
      tel: "0800000004",
      password_hash: "x",
      character_name: "Char",
      gender: "male",
      role: "admin",
      timezone: "Asia/Bangkok",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const expiredToken = jwt.sign({ userId: "u-admin2" }, SECRET, { expiresIn: -10 });
    await expect(requireAdmin(makeReq(`Bearer ${expiredToken}`))).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
