import { requireAdmin } from "@/lib/api-auth";
import { adminListChapters, adminCreateChapter } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const chapters = await adminListChapters();
    return ok({ chapters });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const chapter = await adminCreateChapter(body);
    return ok(chapter, 201);
  } catch (err) {
    return handleError(err);
  }
}
