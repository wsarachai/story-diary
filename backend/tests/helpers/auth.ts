import request from "supertest";

interface RegisterPayload {
  name: string;
  tel: string;
  password: string;
  characterName: string;
  gender: "male" | "female";
}

type RequestFactory = ReturnType<typeof request>;
type AppLike = Parameters<typeof request>[0];

export interface AuthClient {
  token: string;
  get: RequestFactory["get"];
  post: RequestFactory["post"];
  patch: RequestFactory["patch"];
  put: RequestFactory["put"];
  delete: RequestFactory["delete"];
}

export function createAuthClient(app: AppLike, token: string): AuthClient {
  return {
    token,
    get: (path: string) => request(app).get(path).set("Authorization", `Bearer ${token}`),
    post: (path: string) => request(app).post(path).set("Authorization", `Bearer ${token}`),
    patch: (path: string) => request(app).patch(path).set("Authorization", `Bearer ${token}`),
    put: (path: string) => request(app).put(path).set("Authorization", `Bearer ${token}`),
    delete: (path: string) => request(app).delete(path).set("Authorization", `Bearer ${token}`),
  };
}

export async function registerAndAuth(app: AppLike, payload: RegisterPayload): Promise<AuthClient> {
  const res = await request(app).post("/api/auth/register").send(payload).expect(201);
  return createAuthClient(app, String(res.body.token));
}

export async function loginAndAuth(
  app: AppLike,
  username: string,
  password: string
): Promise<AuthClient> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);

  return createAuthClient(app, String(res.body.token));
}
