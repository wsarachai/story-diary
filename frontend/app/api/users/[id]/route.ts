import { requireAuth } from "@/lib/api-auth";
import { getUserById, updateUser } from "@/lib/services/authService";
import { validate } from "@/lib/validate";
import { UpdateUserSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const resolvedId = id === "me" ? userId : id;
    const user = await getUserById(resolvedId);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const resolvedId = id === "me" ? userId : id;
    const body = await req.json();
    const data = validate(UpdateUserSchema, body);
    const user = await updateUser(resolvedId, data);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
