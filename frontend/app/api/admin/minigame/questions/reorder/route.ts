import { requireAdmin } from "@/lib/api-auth";
import { adminReorderQuestions } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { gender, ids } = (await req.json()) as { gender?: unknown; ids?: unknown };
    if (gender !== "male" && gender !== "female") {
      throw Errors.validation("`gender` must be 'male' or 'female'");
    }
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      throw Errors.validation("`ids` must be an array of strings");
    }
    await adminReorderQuestions(gender, ids);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
