import { requireAdmin } from "@/lib/api-auth";
import { adminUpdateVideoClip, adminDeleteVideoClip } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const clip = await adminUpdateVideoClip(id, body);
    return ok(clip);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await adminDeleteVideoClip(id);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
