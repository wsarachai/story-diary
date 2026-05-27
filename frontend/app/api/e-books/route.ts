import { requireAuth } from "@/lib/api-auth";
import { getEBooks } from "@/lib/services/chapterService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const result = await getEBooks();
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
