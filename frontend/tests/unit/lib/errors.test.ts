// @vitest-environment node
import { describe, it, expect } from "vitest";
import { AppError, Errors } from "@/lib/errors";

describe("AppError", () => {
  it("is an Error subclass", () => {
    const err = Errors.unauthenticated();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("exposes statusCode, code, message", () => {
    const err = new AppError(418, "CUSTOM_CODE", "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("CUSTOM_CODE");
    expect(err.message).toBe("I'm a teapot");
  });
});

describe("Errors factories", () => {
  it("unauthenticated → 401 UNAUTHENTICATED", () => {
    const e = Errors.unauthenticated();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe("UNAUTHENTICATED");
  });

  it("forbidden → 403 FORBIDDEN", () => {
    const e = Errors.forbidden();
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe("FORBIDDEN");
  });

  it("notFound → 404 with default USER_NOT_FOUND code", () => {
    const e = Errors.notFound();
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe("USER_NOT_FOUND");
  });

  it("notFound accepts custom code and message", () => {
    const e = Errors.notFound("CHAPTER_NOT_FOUND", "Chapter missing");
    expect(e.code).toBe("CHAPTER_NOT_FOUND");
    expect(e.message).toBe("Chapter missing");
  });

  it("validation → 400 VALIDATION_ERROR with details", () => {
    const e = Errors.validation("Bad input", [{ field: "name", code: "REQUIRED", message: "Required" }]);
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.details).toHaveLength(1);
    expect(e.details![0].field).toBe("name");
    expect(e.details![0].code).toBe("REQUIRED");
  });

  it("conflict → 409 with custom code", () => {
    const e = Errors.conflict("PHONE_TAKEN", "Phone taken");
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe("PHONE_TAKEN");
    expect(e.message).toBe("Phone taken");
  });

  it("internal → 500 INTERNAL_ERROR", () => {
    const e = Errors.internal();
    expect(e.statusCode).toBe(500);
    expect(e.code).toBe("INTERNAL_ERROR");
  });

  it("internal accepts custom message", () => {
    const e = Errors.internal("DB exploded");
    expect(e.message).toBe("DB exploded");
  });

  it("invalidCredentials → 401 INVALID_CREDENTIALS", () => {
    const e = Errors.invalidCredentials();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe("INVALID_CREDENTIALS");
  });
});
