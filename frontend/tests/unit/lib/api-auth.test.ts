// @vitest-environment node
import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { requireAuth } from "@/lib/api-auth";
import { AppError } from "@/lib/errors";

const SECRET = "story-diary-dev-secret";

function makeReq(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/test", { headers });
}

describe("requireAuth", () => {
  it("throws 401 when Authorization header is missing", () => {
    expect(() => requireAuth(makeReq())).toThrow(AppError);
    try {
      requireAuth(makeReq());
    } catch (e) {
      expect((e as AppError).statusCode).toBe(401);
      expect((e as AppError).code).toBe("UNAUTHENTICATED");
    }
  });

  it("throws 401 when header is not Bearer scheme", () => {
    expect(() => requireAuth(makeReq("Basic dXNlcjpwYXNz"))).toThrow(AppError);
  });

  it("returns userId for a valid JWT", () => {
    const token = jwt.sign({ userId: "user-abc" }, SECRET, { expiresIn: "1h" });
    const userId = requireAuth(makeReq(`Bearer ${token}`));
    expect(userId).toBe("user-abc");
  });

  it("throws 401 for a malformed JWT", () => {
    expect(() => requireAuth(makeReq("Bearer not.a.real.token"))).toThrow(AppError);
  });

  it("throws 401 for an expired JWT", () => {
    const token = jwt.sign({ userId: "user-xyz" }, SECRET, { expiresIn: -10 });
    expect(() => requireAuth(makeReq(`Bearer ${token}`))).toThrow(AppError);
  });

  it("throws 401 for a JWT signed with wrong secret", () => {
    const token = jwt.sign({ userId: "user-xyz" }, "wrong-secret");
    expect(() => requireAuth(makeReq(`Bearer ${token}`))).toThrow(AppError);
  });
});
