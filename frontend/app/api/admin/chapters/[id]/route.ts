import { requireAdmin } from "@/lib/api-auth";
import { adminGetChapter, adminUpdateChapter, adminDeleteChapter } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { validate } from "@/lib/validate";
import { UpdateChapterSchema } from "@/lib/schemas";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const chapter = await adminGetChapter(Number(id));
    return ok(chapter);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const body = validate(UpdateChapterSchema, await req.json());
    const chapter = await adminUpdateChapter(Number(id), body);
    return ok(chapter);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await adminDeleteChapter(Number(id));
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
