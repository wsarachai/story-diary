import { requireAuth } from "@/lib/api-auth";
import { getActivities, createActivity } from "@/lib/services/habitService";
import { validate } from "@/lib/validate";
import { CreateActivitySchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";
import type { HabitActivity } from "@/types/habit";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const activities = await getActivities(userId);
    return ok({ activities });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const data = validate(CreateActivitySchema, body);
    const activity = await createActivity(userId, data as Omit<HabitActivity, "id" | "userId" | "createdAt" | "updatedAt">);
    return ok({ activity }, 201);
  } catch (err) {
    return handleError(err);
  }
}
