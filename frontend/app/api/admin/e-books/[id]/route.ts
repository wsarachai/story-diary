import { requireAdmin } from "@/lib/api-auth";
import { adminUpdateEBook, adminDeleteEBook } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const ebook = await adminUpdateEBook(id, body);
    return ok(ebook);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await adminDeleteEBook(id);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
