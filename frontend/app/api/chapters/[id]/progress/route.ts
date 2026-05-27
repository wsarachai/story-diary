import { requireAuth } from "@/lib/api-auth";
import { setChapterProgress } from "@/lib/services/chapterService";
import { validate } from "@/lib/validate";
import { ChapterProgressSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const data = validate(ChapterProgressSchema, body);
    await setChapterProgress(userId, Number(id), data.progress);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
