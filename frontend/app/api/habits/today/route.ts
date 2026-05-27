import { requireAuth } from "@/lib/api-auth";
import { getTodayEntries } from "@/lib/services/habitService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const entries = await getTodayEntries(userId, date);
    return ok({ entries });
  } catch (err) {
    return handleError(err);
  }
}
