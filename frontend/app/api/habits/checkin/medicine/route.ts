import { requireAuth } from "@/lib/api-auth";
import { saveMedicineCheckin } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { MedicineCheckinSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const data = validate(MedicineCheckinSchema, body);
    await saveMedicineCheckin(userId, data);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
