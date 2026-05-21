/**
 * requireAuth middleware — rejects requests with no active session.
 * Attaches req.session.userId; downstream handlers read it directly.
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Errors } from "../lib/errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(Errors.unauthenticated());
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "story-diary-dev-secret") as { userId: string };
    (req as any).userId = payload.userId;
    next();
  } catch {
    return next(Errors.unauthenticated());
  }
}
