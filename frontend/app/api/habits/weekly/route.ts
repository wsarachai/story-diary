import { requireAuth } from "@/lib/api-auth";
import { getWeeklyView } from "@/lib/services/habitService";
import { getUserTimezone } from "@/lib/services/authService";
import { localWeekStartStr } from "@/lib/utils/date";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const weekStart = url.searchParams.get("weekStart") ?? localWeekStartStr(await getUserTimezone(userId));
    const result = await getWeeklyView(userId, weekStart);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
