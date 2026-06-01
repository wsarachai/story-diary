import { requireAdmin } from "@/lib/api-auth";
import { adminListScenes, adminCreateScene } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const scenes = await adminListScenes(Number(id));
    return ok({ scenes });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const scene = await adminCreateScene(Number(id), body);
    return ok(scene, 201);
  } catch (err) {
    return handleError(err);
  }
}
