import { registerUser, signToken } from "@/lib/services/authService";
import { validate } from "@/lib/validate";
import { RegisterSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = validate(RegisterSchema, body);
    const user = await registerUser(data);
    const token = signToken(user.id);
    return ok({ user, token }, 201);
  } catch (err) {
    return handleError(err);
  }
}
