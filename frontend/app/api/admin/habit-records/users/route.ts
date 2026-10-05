import { requireAdmin } from "@/lib/api-auth";
import { adminListHabitUsers } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const users = await adminListHabitUsers();
    return ok({ users });
  } catch (err) {
    return handleError(err);
  }
}
