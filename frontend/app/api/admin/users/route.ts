import { requireRootAdmin } from "@/lib/api-auth";
import { adminListUsers } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireRootAdmin(req);
    const users = await adminListUsers();
    return ok({ users });
  } catch (err) {
    return handleError(err);
  }
}
