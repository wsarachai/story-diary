import { requireAuth } from "@/lib/api-auth";
import { getTodayEntries } from "@/lib/services/habitService";
import { getUserTimezone } from "@/lib/services/authService";
import { localDateStr } from "@/lib/utils/date";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? localDateStr(await getUserTimezone(userId));
    const entries = await getTodayEntries(userId, date);
    return ok({ entries });
  } catch (err) {
    return handleError(err);
  }
}
