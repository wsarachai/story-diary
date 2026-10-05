import { requireAdmin } from "@/lib/api-auth";
import { adminRecordHabit } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

/** PUT { userId, status: "done" | "skipped" | "pending" } — record a day on the user's behalf. */
export async function PUT(req: Request, ctx: { params: Promise<{ occurrenceId: string }> }) {
  try {
    const adminId = await requireAdmin(req);
    const { occurrenceId } = await ctx.params;
    const body = (await req.json()) as { userId?: unknown; status?: unknown };
    if (typeof body.userId !== "string" || !body.userId) throw Errors.validation("`userId` is required");
    const occurrence = await adminRecordHabit(adminId, body.userId, occurrenceId, body.status);
    return ok({ occurrence });
  } catch (err) {
    return handleError(err);
  }
}
