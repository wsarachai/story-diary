import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth handlers
  http.get("/api/auth/me", () => {
    // Default mock implementation, can be overridden in tests
    return HttpResponse.json({ user: null }, { status: 401 });
  }),
  
  http.post("/api/auth/login", () => {
    return HttpResponse.json({
      user: { id: "u1", tel: "0812345678", name: "Mock User" },
      token: "mock-token"
    });
  }),
  
  http.post("/api/auth/logout", () => {
    return HttpResponse.json({});
  }),
];
