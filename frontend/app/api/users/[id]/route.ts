import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { getUserById, updateUser } from "@/lib/services/authService";
import { validate } from "@/lib/validate";
import { UpdateUserSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

/**
 * Resolve the target user id, enforcing ownership: a user may only read or
 * edit their own profile ("me" or their own id); any other id requires an
 * admin. Without this check any authenticated user could read or overwrite
 * another user's profile (IDOR).
 */
async function resolveTargetId(req: Request, id: string): Promise<string> {
  const userId = requireAuth(req);
  if (id === "me" || id === userId) return userId;
  await requireAdmin(req);
  return id;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const resolvedId = await resolveTargetId(req, id);
    const user = await getUserById(resolvedId);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const resolvedId = await resolveTargetId(req, id);
    const body = await req.json();
    const data = validate(UpdateUserSchema, body);
    const user = await updateUser(resolvedId, data);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
