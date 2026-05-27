import { requireAuth } from "@/lib/api-auth";
import { getChapter } from "@/lib/services/chapterService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const chapter = await getChapter(userId, Number(id));
    return ok(chapter);
  } catch (err) {
    return handleError(err);
  }
}
