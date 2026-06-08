import { requireRootAdmin } from "@/lib/api-auth";
import { adminChangeUserRole } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRootAdmin(req);
    const { id } = await params;
    const body = await req.json() as { role?: string };
    if (body.role !== "user" && body.role !== "admin") {
      return new Response(JSON.stringify({ error: "role must be 'user' or 'admin'" }), { status: 400 });
    }
    const user = await adminChangeUserRole(id, body.role);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
