/**
 * requireAuth middleware — rejects requests with no active session.
 * Attaches req.session.userId; downstream handlers read it directly.
 */
import type { Request, Response, NextFunction } from "express";
import { Errors } from "../lib/errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    return next(Errors.unauthenticated());
  }
  next();
}
