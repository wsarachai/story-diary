import { requireAuth } from "@/lib/api-auth";
import { getMonthlyView } from "@/lib/services/habitService";
import { getUserTimezone } from "@/lib/services/authService";
import { localMonthStr } from "@/lib/utils/date";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? localMonthStr(await getUserTimezone(userId));
    const result = await getMonthlyView(userId, month);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
