import { requireAuth } from "@/lib/api-auth";
import { getMedicineCheckin, saveMedicineCheckin } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { MedicineCheckinSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ occurrenceId: string }> }) {
  try {
    const userId = requireAuth(req);
    const { occurrenceId } = await ctx.params;
    const checkin = await getMedicineCheckin(userId, occurrenceId);
    return ok({ checkin });
  } catch (err) {
    return handleError(err);
  }
}

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
