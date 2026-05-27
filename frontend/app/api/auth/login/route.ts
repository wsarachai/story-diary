import { loginUser, signToken } from "@/lib/services/authService";
import { validate } from "@/lib/validate";
import { LoginSchema } from "@/lib/schemas";
import { ok, handleError } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = validate(LoginSchema, body);
    const user = await loginUser(data.username, data.password);
    const token = signToken(user.id);
    return ok({ user, token });
  } catch (err) {
    return handleError(err);
  }
}
