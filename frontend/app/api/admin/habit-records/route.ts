import { requireAdmin } from "@/lib/api-auth";
import { adminGetHabitDay } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

/** GET ?userId=…&date=YYYY-MM-DD → the user's scheduled habits on that day. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const date = url.searchParams.get("date");
    if (!userId || !date) throw Errors.validation("`userId` and `date` are required");
    const day = await adminGetHabitDay(userId, date);
    return ok(day);
  } catch (err) {
    return handleError(err);
  }
}
