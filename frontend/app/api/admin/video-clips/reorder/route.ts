import { requireAdmin } from "@/lib/api-auth";
import { adminReorderVideoClips } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { ids } = await req.json();
    await adminReorderVideoClips(ids);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
