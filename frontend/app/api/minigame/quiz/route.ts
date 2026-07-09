import { requireAuth } from "@/lib/api-auth";
import { getQuiz } from "@/lib/services/minigameService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const result = await getQuiz(userId);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
