import { requireAuth } from "@/lib/api-auth";
import { toggleOccurrence } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { ToggleOccurrenceSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const data = validate(ToggleOccurrenceSchema, body);
    const occurrence = await toggleOccurrence(userId, id, data.status);
    return ok({ occurrence });
  } catch (err) {
    return handleError(err);
  }
}
