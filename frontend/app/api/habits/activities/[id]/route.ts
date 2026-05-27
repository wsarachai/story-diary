import { requireAuth } from "@/lib/api-auth";
import { updateActivity, archiveActivity } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { PatchActivitySchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";
import type { HabitActivity } from "@/types/habit";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const data = validate(PatchActivitySchema, body);
    const activity = await updateActivity(userId, id, data as Partial<Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">>);
    return ok({ activity });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    await archiveActivity(userId, id);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
