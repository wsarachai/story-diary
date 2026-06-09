import { requireAdmin } from "@/lib/api-auth";
import { adminReorderChapters } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { ids } = (await req.json()) as { ids?: unknown };
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "number")) {
      throw Errors.validation("`ids` must be an array of numbers");
    }
    await adminReorderChapters(ids);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
