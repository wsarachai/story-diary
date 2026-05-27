import { requireAuth } from "@/lib/api-auth";
import { getMonthlyView } from "@/lib/services/habitService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const result = await getMonthlyView(userId, month);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
