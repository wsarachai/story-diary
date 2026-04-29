/**
 * Tests for GET /api/users/[id] and PATCH /api/users/[id]
 *
 * All DB and auth dependencies are mocked — no real DB required.
 *
 * Spec: docs/specs/user-profile.md
 * Implementation: app/api/users/[id]/route.ts
 */

// jest.mock calls are hoisted before imports by Jest.
jest.mock("@/lib/auth");
jest.mock("@/db/users", () => {
  // Keep EmailTakenError as the real class so instanceof checks work.
  const actual = jest.requireActual<typeof import("@/db/users")>("@/db/users");
  return {
    ...actual,
    findUserById: jest.fn(),
    updateUser: jest.fn(),
  };
});

import { GET, PATCH } from "@/app/api/users/[id]/route";
import * as auth from "@/lib/auth";
import { findUserById, updateUser, EmailTakenError } from "@/db/users";
import type { UserProfile } from "@/lib/types/user";

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockGetSessionUser = jest.mocked(auth.getSessionUser);
const mockFindUserById = jest.mocked(findUserById);
const mockUpdateUser = jest.mocked(updateUser);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

const USER_PROFILE: UserProfile = {
  id: SESSION_USER_ID,
  name: "Ariya",
  email: "ariya@example.com",
  characterName: "Hero",
  gender: "female",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Request / context factories
// ---------------------------------------------------------------------------

/** Build a minimal GET-style Request (no body). */
function makeGetReq(url = "http://localhost/api/users/placeholder"): Request {
  return new Request(url);
}

/** Build a PATCH Request with JSON body and Content-Type header. */
function makePatchReq(
  body: unknown,
  contentType = "application/json"
): Request {
  return new Request("http://localhost/api/users/placeholder", {
    method: "PATCH",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Build a PATCH Request without any Content-Type header. */
function makePatchReqNoContentType(body: unknown): Request {
  return new Request("http://localhost/api/users/placeholder", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** Create a route context with params as a resolved Promise. */
function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Parse a Response body as JSON. */
async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.resetAllMocks();
  // Default: authenticated as SESSION_USER_ID.
  mockGetSessionUser.mockResolvedValue({ id: SESSION_USER_ID });
});

// ===========================================================================
// GET /api/users/[id]
// ===========================================================================

describe("GET /api/users/[id]", () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe("happy path", () => {
    test("returns 200 with user profile when fetching own UUID", async () => {
      mockFindUserById.mockResolvedValue(USER_PROFILE);

      const res = await GET(
        makeGetReq() as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual(USER_PROFILE);
    });

    test("returns 200 when using 'me' alias", async () => {
      mockFindUserById.mockResolvedValue(USER_PROFILE);

      const res = await GET(makeGetReq() as any, makeCtx("me") as any);

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual(USER_PROFILE);
      // "me" must resolve to the session user's own ID
      expect(mockFindUserById).toHaveBeenCalledWith(SESSION_USER_ID);
    });

    test("response shape never includes passwordHash", async () => {
      mockFindUserById.mockResolvedValue(USER_PROFILE);

      const res = await GET(
        makeGetReq() as any,
        makeCtx(SESSION_USER_ID) as any
      );
      const body = await json(res);

      expect(body).not.toHaveProperty("passwordHash");
      expect(body).not.toHaveProperty("password_hash");
    });
  });

  // -------------------------------------------------------------------------
  // Auth & authorisation
  // -------------------------------------------------------------------------

  describe("authentication / authorisation", () => {
    test("returns 401 UNAUTHENTICATED when no session", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await GET(
        makeGetReq() as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(401);
      const body = await json(res);
      expect((body.error as any).code).toBe("UNAUTHENTICATED");
    });

    test("returns 403 FORBIDDEN when requesting another user's UUID", async () => {
      const res = await GET(makeGetReq() as any, makeCtx(OTHER_USER_ID) as any);

      expect(res.status).toBe(403);
      const body = await json(res);
      expect((body.error as any).code).toBe("FORBIDDEN");
      // Must not leak existence — DB must not have been queried.
      expect(mockFindUserById).not.toHaveBeenCalled();
    });

    test("returns 401 when using 'me' alias with no session", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await GET(makeGetReq() as any, makeCtx("me") as any);

      expect(res.status).toBe(401);
      const body = await json(res);
      expect((body.error as any).code).toBe("UNAUTHENTICATED");
    });
  });

  // -------------------------------------------------------------------------
  // Path parameter validation
  // -------------------------------------------------------------------------

  describe("path parameter validation", () => {
    test("returns 400 VALIDATION_ERROR for malformed id (non-UUID, non-me)", async () => {
      const res = await GET(makeGetReq() as any, makeCtx("abc-not-a-uuid") as any);

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 for plain numeric string as id", async () => {
      const res = await GET(makeGetReq() as any, makeCtx("12345") as any);

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });
  });

  // -------------------------------------------------------------------------
  // Not found / DB errors
  // -------------------------------------------------------------------------

  describe("not found & errors", () => {
    test("returns 404 USER_NOT_FOUND when DB returns null (stale session)", async () => {
      mockFindUserById.mockResolvedValue(null);

      const res = await GET(
        makeGetReq() as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(404);
      const body = await json(res);
      expect((body.error as any).code).toBe("USER_NOT_FOUND");
    });

    test("returns 500 INTERNAL_ERROR when DB throws unexpected error", async () => {
      mockFindUserById.mockRejectedValue(new Error("DB connection lost"));

      const res = await GET(
        makeGetReq() as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(500);
      const body = await json(res);
      expect((body.error as any).code).toBe("INTERNAL_ERROR");
    });
  });
});

// ===========================================================================
// PATCH /api/users/[id]
// ===========================================================================

describe("PATCH /api/users/[id]", () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe("happy path", () => {
    test("returns 200 with updated profile when patching a single field", async () => {
      const updated = { ...USER_PROFILE, name: "NewName", updatedAt: "2026-04-29T12:00:00.000Z" };
      mockUpdateUser.mockResolvedValue(updated);

      const res = await PATCH(
        makePatchReq({ name: "NewName" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual(updated);
      expect(mockUpdateUser).toHaveBeenCalledWith(SESSION_USER_ID, { name: "NewName" });
    });

    test("returns 200 when patching multiple fields", async () => {
      const updated = { ...USER_PROFILE, characterName: "Sage", gender: "male" as const };
      mockUpdateUser.mockResolvedValue(updated);

      const res = await PATCH(
        makePatchReq({ characterName: "Sage", gender: "male" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toEqual(updated);
    });

    test("lowercases email before passing to DB", async () => {
      const updated = { ...USER_PROFILE, email: "new@example.com" };
      mockUpdateUser.mockResolvedValue(updated);

      await PATCH(
        makePatchReq({ email: "NEW@EXAMPLE.COM" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(mockUpdateUser).toHaveBeenCalledWith(
        SESSION_USER_ID,
        expect.objectContaining({ email: "new@example.com" })
      );
    });

    test("trims whitespace from name before passing to DB", async () => {
      const updated = { ...USER_PROFILE, name: "Trimmed" };
      mockUpdateUser.mockResolvedValue(updated);

      await PATCH(
        makePatchReq({ name: "  Trimmed  " }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(mockUpdateUser).toHaveBeenCalledWith(
        SESSION_USER_ID,
        expect.objectContaining({ name: "Trimmed" })
      );
    });

    test("returns 200 using 'me' alias", async () => {
      const updated = { ...USER_PROFILE, name: "ViaMe" };
      mockUpdateUser.mockResolvedValue(updated);

      const res = await PATCH(
        makePatchReq({ name: "ViaMe" }) as any,
        makeCtx("me") as any
      );

      expect(res.status).toBe(200);
      expect(mockUpdateUser).toHaveBeenCalledWith(SESSION_USER_ID, { name: "ViaMe" });
    });
  });

  // -------------------------------------------------------------------------
  // Auth & authorisation
  // -------------------------------------------------------------------------

  describe("authentication / authorisation", () => {
    test("returns 401 UNAUTHENTICATED when no session", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const res = await PATCH(
        makePatchReq({ name: "X" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(401);
      const body = await json(res);
      expect((body.error as any).code).toBe("UNAUTHENTICATED");
    });

    test("returns 403 FORBIDDEN when patching another user's profile", async () => {
      const res = await PATCH(
        makePatchReq({ name: "Hack" }) as any,
        makeCtx(OTHER_USER_ID) as any
      );

      expect(res.status).toBe(403);
      const body = await json(res);
      expect((body.error as any).code).toBe("FORBIDDEN");
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Path parameter validation
  // -------------------------------------------------------------------------

  describe("path parameter validation", () => {
    test("returns 400 for malformed id", async () => {
      const res = await PATCH(
        makePatchReq({ name: "X" }) as any,
        makeCtx("not-a-uuid") as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });
  });

  // -------------------------------------------------------------------------
  // Content-Type validation
  // -------------------------------------------------------------------------

  describe("Content-Type validation", () => {
    test("returns 415 UNSUPPORTED_MEDIA when Content-Type is missing", async () => {
      const res = await PATCH(
        makePatchReqNoContentType({ name: "X" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(415);
      const body = await json(res);
      expect((body.error as any).code).toBe("UNSUPPORTED_MEDIA");
    });

    test("returns 415 when Content-Type is text/plain", async () => {
      const res = await PATCH(
        makePatchReq({ name: "X" }, "text/plain") as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(415);
    });
  });

  // -------------------------------------------------------------------------
  // JSON body validation
  // -------------------------------------------------------------------------

  describe("request body validation", () => {
    test("returns 400 VALIDATION_ERROR for invalid (non-JSON) body", async () => {
      const res = await PATCH(
        makePatchReq("this is not json", "application/json") as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 when body is a JSON array (not an object)", async () => {
      const res = await PATCH(
        makePatchReq([{ name: "X" }]) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 when body is JSON null", async () => {
      const res = await PATCH(
        makePatchReq(null) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 VALIDATION_ERROR for empty patch body {}", async () => {
      const res = await PATCH(
        makePatchReq({}) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 for unknown field (strict parse — blocks privilege escalation)", async () => {
      const res = await PATCH(
        makePatchReq({ role: "admin" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      expect((body.error as any).code).toBe("VALIDATION_ERROR");
    });

    test("returns 400 NULL_NOT_ALLOWED when a field is null", async () => {
      const res = await PATCH(
        makePatchReq({ name: null }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name", code: "NULL_NOT_ALLOWED" }),
        ])
      );
    });
  });

  // -------------------------------------------------------------------------
  // Field-level validation — name
  // -------------------------------------------------------------------------

  describe("field validation — name", () => {
    test("returns 400 TOO_SHORT when name is whitespace-only", async () => {
      const res = await PATCH(
        makePatchReq({ name: "   " }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name", code: "TOO_SHORT" }),
        ])
      );
    });

    test("returns 400 TOO_LONG when name exceeds 80 chars", async () => {
      const longName = "a".repeat(81);
      const res = await PATCH(
        makePatchReq({ name: longName }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name", code: "TOO_LONG" }),
        ])
      );
    });

    test("returns 400 INVALID_TYPE when name is a number", async () => {
      const res = await PATCH(
        makePatchReq({ name: 42 }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name", code: "INVALID_TYPE" }),
        ])
      );
    });

    test("accepts name of exactly 80 characters", async () => {
      const maxName = "a".repeat(80);
      mockUpdateUser.mockResolvedValue({ ...USER_PROFILE, name: maxName });

      const res = await PATCH(
        makePatchReq({ name: maxName }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
    });

    test("returns 400 INVALID_CHAR when name contains control characters", async () => {
      const res = await PATCH(
        // \x01 is a C0 control character (SOH)
        makePatchReq({ name: "bad\x01name" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "name", code: "INVALID_CHAR" }),
        ])
      );
    });
  });

  // -------------------------------------------------------------------------
  // Field-level validation — email
  // -------------------------------------------------------------------------

  describe("field validation — email", () => {
    test("returns 400 INVALID_FORMAT when email lacks @", async () => {
      const res = await PATCH(
        makePatchReq({ email: "notanemail.com" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "email", code: "INVALID_FORMAT" }),
        ])
      );
    });

    test("returns 400 TOO_LONG when email exceeds 254 characters", async () => {
      // 250 'a's + "@x.co" (5) = 255 chars, which exceeds the 254 limit
      const longEmail = "a".repeat(250) + "@x.co";
      expect(longEmail.length).toBeGreaterThan(254);

      const res = await PATCH(
        makePatchReq({ email: longEmail }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "email", code: "TOO_LONG" }),
        ])
      );
    });

    test("returns 400 INVALID_TYPE when email is a number", async () => {
      const res = await PATCH(
        makePatchReq({ email: 123 }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "email", code: "INVALID_TYPE" }),
        ])
      );
    });
  });

  // -------------------------------------------------------------------------
  // Field-level validation — gender
  // -------------------------------------------------------------------------

  describe("field validation — gender", () => {
    test("returns 400 INVALID_ENUM for gender 'other'", async () => {
      const res = await PATCH(
        makePatchReq({ gender: "other" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "gender", code: "INVALID_ENUM" }),
        ])
      );
    });

    test("returns 400 INVALID_TYPE when gender is a boolean", async () => {
      const res = await PATCH(
        makePatchReq({ gender: true }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "gender", code: "INVALID_TYPE" }),
        ])
      );
    });

    test("accepts gender 'male'", async () => {
      mockUpdateUser.mockResolvedValue({ ...USER_PROFILE, gender: "male" });

      const res = await PATCH(
        makePatchReq({ gender: "male" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
    });

    test("accepts gender 'female'", async () => {
      mockUpdateUser.mockResolvedValue({ ...USER_PROFILE, gender: "female" });

      const res = await PATCH(
        makePatchReq({ gender: "female" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Field-level validation — characterName
  // -------------------------------------------------------------------------

  describe("field validation — characterName", () => {
    test("returns 400 TOO_LONG when characterName exceeds 40 chars", async () => {
      const res = await PATCH(
        makePatchReq({ characterName: "a".repeat(41) }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "characterName", code: "TOO_LONG" }),
        ])
      );
    });

    test("returns 400 TOO_SHORT when characterName is whitespace-only", async () => {
      const res = await PATCH(
        makePatchReq({ characterName: "   " }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "characterName", code: "TOO_SHORT" }),
        ])
      );
    });

    test("accepts characterName of exactly 40 characters", async () => {
      mockUpdateUser.mockResolvedValue({ ...USER_PROFILE, characterName: "a".repeat(40) });

      const res = await PATCH(
        makePatchReq({ characterName: "a".repeat(40) }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Conflict
  // -------------------------------------------------------------------------

  describe("conflict", () => {
    test("returns 409 EMAIL_TAKEN when email is already in use", async () => {
      mockUpdateUser.mockRejectedValue(new EmailTakenError());

      const res = await PATCH(
        makePatchReq({ email: "taken@example.com" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(409);
      const body = await json(res);
      expect((body.error as any).code).toBe("EMAIL_TAKEN");
    });
  });

  // -------------------------------------------------------------------------
  // Unexpected DB errors
  // -------------------------------------------------------------------------

  describe("unexpected errors", () => {
    test("returns 500 INTERNAL_ERROR when updateUser throws an unexpected error", async () => {
      mockUpdateUser.mockRejectedValue(new Error("DB timeout"));

      const res = await PATCH(
        makePatchReq({ name: "Test" }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(500);
      const body = await json(res);
      expect((body.error as any).code).toBe("INTERNAL_ERROR");
    });
  });

  // -------------------------------------------------------------------------
  // Multiple validation errors accumulated
  // -------------------------------------------------------------------------

  describe("multi-field validation errors", () => {
    test("accumulates errors for multiple invalid fields", async () => {
      const res = await PATCH(
        makePatchReq({
          name: "   ", // TOO_SHORT
          gender: "other", // INVALID_ENUM
        }) as any,
        makeCtx(SESSION_USER_ID) as any
      );

      expect(res.status).toBe(400);
      const body = await json(res);
      const err = body.error as any;
      expect(err.details.length).toBeGreaterThanOrEqual(2);
      const codes = err.details.map((d: any) => d.code);
      expect(codes).toContain("TOO_SHORT");
      expect(codes).toContain("INVALID_ENUM");
    });
  });
});
