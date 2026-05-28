// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

// Mock bcrypt to avoid 12-round hashing overhead in unit tests.
// hash stores "hashed:<plain>" so compare can verify it deterministically.
vi.mock("bcrypt", () => {
  const impl = {
    hash: vi.fn().mockImplementation(async (plain: string) => `hashed:${plain}`),
    compare: vi.fn().mockImplementation(async (plain: string, hash: string) =>
      Promise.resolve(hash === `hashed:${plain}`)
    ),
  };
  return { default: impl, ...impl };
});

import { clearTestData } from "@/lib/db";
import {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  signToken,
} from "@/lib/services/authService";
import { AppError } from "@/lib/errors";

const BASE = {
  name: "สมชาย ใจดี",
  tel: "0812345678",
  password: "correct-password",
  characterName: "ฮีโร่",
  gender: "male" as const,
};

beforeEach(() => {
  clearTestData();
});

describe("registerUser", () => {
  it("creates and returns a UserProfile without password_hash", async () => {
    const profile = await registerUser(BASE);
    expect(profile.name).toBe(BASE.name);
    expect(profile.tel).toBe(BASE.tel);
    expect(profile.characterName).toBe(BASE.characterName);
    expect(profile.gender).toBe("male");
    expect(profile.id).toBeDefined();
    expect((profile as Record<string, unknown>).password_hash).toBeUndefined();
  });

  it("throws PHONE_TAKEN when the same tel is registered twice", async () => {
    await registerUser(BASE);
    await expect(registerUser(BASE)).rejects.toMatchObject({ code: "PHONE_TAKEN", statusCode: 409 });
  });

  it("allows different tel numbers", async () => {
    await registerUser(BASE);
    const second = await registerUser({ ...BASE, tel: "0899999999" });
    expect(second.tel).toBe("0899999999");
  });
});

describe("loginUser", () => {
  beforeEach(async () => {
    await registerUser(BASE);
  });

  it("returns profile for valid credentials", async () => {
    const profile = await loginUser(BASE.tel, BASE.password);
    expect(profile.tel).toBe(BASE.tel);
  });

  it("throws INVALID_CREDENTIALS for unknown phone number", async () => {
    await expect(loginUser("0000000000", "any")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
    });
  });

  it("throws INVALID_CREDENTIALS for wrong password", async () => {
    await expect(loginUser(BASE.tel, "wrong-password")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });
});

describe("getUserById", () => {
  it("returns profile for an existing user", async () => {
    const created = await registerUser(BASE);
    const fetched = await getUserById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe(BASE.name);
  });

  it("throws USER_NOT_FOUND for a nonexistent id", async () => {
    await expect(getUserById("does-not-exist")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      statusCode: 404,
    });
  });
});

describe("updateUser", () => {
  let userId: string;

  beforeEach(async () => {
    const profile = await registerUser(BASE);
    userId = profile.id;
  });

  it("updates name and returns new profile", async () => {
    const updated = await updateUser(userId, { name: "ชื่อใหม่" });
    expect(updated.name).toBe("ชื่อใหม่");
    expect(updated.id).toBe(userId);
  });

  it("updates characterName", async () => {
    const updated = await updateUser(userId, { characterName: "นักรบ" });
    expect(updated.characterName).toBe("นักรบ");
  });

  it("throws VALIDATION_ERROR on empty patch", async () => {
    await expect(updateUser(userId, {})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });

  it("throws USER_NOT_FOUND for nonexistent id", async () => {
    await expect(updateUser("bad-id", { name: "X" })).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("throws PHONE_TAKEN when tel is taken by another user", async () => {
    await registerUser({ ...BASE, tel: "0899999999" });
    await expect(updateUser(userId, { tel: "0899999999" })).rejects.toMatchObject({
      code: "PHONE_TAKEN",
    });
  });
});

describe("signToken", () => {
  it("returns a JWT that decodes to the correct userId", () => {
    const token = signToken("user-test-123");
    const payload = jwt.decode(token) as { userId: string; exp: number };
    expect(payload.userId).toBe("user-test-123");
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });
});
