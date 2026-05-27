import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
      { status: err.statusCode }
    );
  }
  console.error("[API]", err);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
}
