import { requireAdmin } from "@/lib/api-auth";
import { adminUpdateScene, adminDeleteScene } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PATCH(req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  try {
    await requireAdmin(req);
    const { sceneId } = await ctx.params;
    const body = await req.json();
    const scene = await adminUpdateScene(sceneId, body);
    return ok(scene);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  try {
    await requireAdmin(req);
    const { sceneId } = await ctx.params;
    await adminDeleteScene(sceneId);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
