import { requireAdmin } from "@/lib/api-auth";
import { adminListQuestions, adminCreateQuestion } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const questions = await adminListQuestions();
    return ok({ questions });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const question = await adminCreateQuestion(body);
    return ok(question, 201);
  } catch (err) {
    return handleError(err);
  }
}
