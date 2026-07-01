import { requireAuth } from "@/lib/api-auth";
import { getExerciseCheckin, saveExerciseCheckin } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { ExerciseCheckinSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ occurrenceId: string }> }) {
  try {
    const userId = requireAuth(req);
    const { occurrenceId } = await ctx.params;
    const checkin = await getExerciseCheckin(userId, occurrenceId);
    return ok({ checkin: checkin ?? null });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ occurrenceId: string }> }) {
  try {
    const userId = requireAuth(req);
    const { occurrenceId } = await ctx.params;
    const body = await req.json();
    const data = validate(ExerciseCheckinSchema, { ...body, occurrenceId });
    await saveExerciseCheckin(userId, data);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
