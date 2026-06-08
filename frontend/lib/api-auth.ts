import jwt from "jsonwebtoken";
import { findUserById } from "@/lib/db";
import { Errors } from "@/lib/errors";

export function requireAuth(request: Request): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw Errors.unauthenticated();
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "story-diary-dev-secret") as { userId: string };
    return payload.userId;
  } catch {
    throw Errors.unauthenticated();
  }
}

export async function requireAdmin(request: Request): Promise<string> {
  const userId = requireAuth(request);
  const user = await findUserById(userId);
  if (!user || (user.role !== "admin" && user.role !== "rootAdmin")) {
    throw Errors.forbidden();
  }
  return userId;
}

export async function requireRootAdmin(request: Request): Promise<string> {
  const userId = requireAuth(request);
  const user = await findUserById(userId);
  const rootAdminTel = (process.env.ROOT_ADMIN_TEL ?? "").trim();
  const isRootAdmin =
    (rootAdminTel && user?.tel === rootAdminTel) || user?.role === "rootAdmin";
  if (!user || !isRootAdmin) {
    throw Errors.forbidden();
  }
  return userId;
}
