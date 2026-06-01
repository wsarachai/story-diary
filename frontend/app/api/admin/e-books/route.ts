import { requireAdmin } from "@/lib/api-auth";
import { adminListEBooks, adminCreateEBook } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const chapters = await adminListEBooks();
    return ok({ chapters });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const ebook = await adminCreateEBook(body);
    return ok(ebook, 201);
  } catch (err) {
    return handleError(err);
  }
}
