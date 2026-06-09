import { requireAdmin } from "@/lib/api-auth";
import { adminListVideoClips, adminCreateVideoClip } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const clips = await adminListVideoClips();
    return ok({ clips });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const clip = await adminCreateVideoClip(body);
    return ok(clip, 201);
  } catch (err) {
    return handleError(err);
  }
}
