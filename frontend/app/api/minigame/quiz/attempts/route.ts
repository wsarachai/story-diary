import { requireAuth } from "@/lib/api-auth";
import { submitQuiz } from "@/lib/services/minigameService";
import { validate } from "@/lib/validate";
import { SubmitQuizSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const data = validate(SubmitQuizSchema, body);
    const score = await submitQuiz(userId, data.quizId, data.answers);
    return ok({ score });
  } catch (err) {
    return handleError(err);
  }
}
