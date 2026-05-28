// @vitest-environment node
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validate } from "@/lib/validate";
import { AppError } from "@/lib/errors";

const Schema = z.object({
  name: z.string().min(1, "REQUIRED").max(5, "TOO_LONG"),
  age: z.number().int().min(0),
});

describe("validate", () => {
  it("returns parsed data on valid input", () => {
    const result = validate(Schema, { name: "Ali", age: 25 });
    expect(result).toEqual({ name: "Ali", age: 25 });
  });

  it("throws AppError with VALIDATION_ERROR code on failure", () => {
    expect(() => validate(Schema, {})).toThrow(AppError);
    try {
      validate(Schema, {});
    } catch (err) {
      const e = err as AppError;
      expect(e.code).toBe("VALIDATION_ERROR");
      expect(e.statusCode).toBe(400);
      expect(Array.isArray(e.details)).toBe(true);
      expect(e.details!.length).toBeGreaterThan(0);
    }
  });

  it("maps stable code TOO_LONG from message", () => {
    try {
      validate(Schema, { name: "TOOLONGNAME", age: 1 });
    } catch (err) {
      const e = err as AppError;
      const detail = e.details!.find((d) => d.field === "name");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("TOO_LONG");
    }
  });

  it("maps stable code REQUIRED from message", () => {
    try {
      validate(Schema, { name: "", age: 1 });
    } catch (err) {
      const e = err as AppError;
      const detail = e.details!.find((d) => d.field === "name");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("REQUIRED");
    }
  });

  it("includes field path in details", () => {
    try {
      validate(Schema, { name: "X", age: -1 });
    } catch (err) {
      const e = err as AppError;
      const detail = e.details!.find((d) => d.field === "age");
      expect(detail).toBeDefined();
    }
  });
});
