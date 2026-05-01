/**
 * Augments express-session's SessionData to include our custom fields.
 * Import this file anywhere that uses req.session.userId.
 */
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}
