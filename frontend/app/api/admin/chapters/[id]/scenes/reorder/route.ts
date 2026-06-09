import { requireAdmin } from "@/lib/api-auth";
import { adminReorderChapterScenes } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const chapterId = Number(id);
    if (!Number.isInteger(chapterId) || chapterId <= 0) {
      throw Errors.validation("invalid chapter id");
    }
    const { ids } = (await req.json()) as { ids?: unknown };
    if (!Array.isArray(ids) || !ids.every((sid) => typeof sid === "string")) {
      throw Errors.validation("`ids` must be an array of strings");
    }
    await adminReorderChapterScenes(chapterId, ids);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
