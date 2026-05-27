import { requireAuth } from "@/lib/api-auth";
import { getUserById } from "@/lib/services/authService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const user = await getUserById(userId);
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
