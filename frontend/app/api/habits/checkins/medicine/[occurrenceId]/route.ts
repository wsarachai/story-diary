import { requireAuth } from "@/lib/api-auth";
import { saveMedicineCheckin } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { MedicineCheckinSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function PUT(req: Request, ctx: { params: Promise<{ occurrenceId: string }> }) {
  try {
    const userId = requireAuth(req);
    const { occurrenceId } = await ctx.params;
    const body = await req.json();
    const data = validate(MedicineCheckinSchema, { ...body, occurrenceId });
    await saveMedicineCheckin(userId, data);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
