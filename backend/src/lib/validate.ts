/**
 * Utility: validates a Zod schema and converts ZodError into an AppError
 * with the canonical VALIDATION_ERROR + ApiErrorDetail[] shape.
 */
import { z, ZodError } from "zod";
import { AppError } from "./errors";

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details = buildDetails(result.error);
  throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", details);
}

function buildDetails(err: ZodError) {
  return err.issues.map((issue) => {
    const field = issue.path.join(".");
    // Use the message as the code when it's one of our stable codes, otherwise
    // map the ZodIssueCode to a ValidationFieldCode.
    const stableCodes = new Set([
      "REQUIRED", "TOO_SHORT", "TOO_LONG", "INVALID_FORMAT",
      "INVALID_ENUM", "INVALID_CHAR", "PASSWORDS_DO_NOT_MATCH",
    ]);
    const code = stableCodes.has(issue.message) ? issue.message : zodCodeToFieldCode(issue.code);
    return { field, code, message: issue.message };
  });
}

function zodCodeToFieldCode(code: string): string {
  switch (code) {
    case "too_small": return "TOO_SHORT";
    case "too_big": return "TOO_LONG";
    case "invalid_type": return "REQUIRED";
    case "invalid_enum_value": return "INVALID_ENUM"; // zod v3
    case "invalid_value": return "INVALID_ENUM";      // zod v4 enum
    case "invalid_string": return "INVALID_FORMAT";
    case "unrecognized_keys": return "INVALID_FORMAT";
    default: return "INVALID_FORMAT";
  }
}
