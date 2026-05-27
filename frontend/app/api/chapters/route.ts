import { requireAuth } from "@/lib/api-auth";
import { listChapters } from "@/lib/services/chapterService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const chapters = await listChapters(userId);
    return ok({ chapters });
  } catch (err) {
    return handleError(err);
  }
}
