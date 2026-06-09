import { requireAuth } from "@/lib/api-auth";
import { getVideoClips } from "@/lib/services/chapterService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const result = await getVideoClips();
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
