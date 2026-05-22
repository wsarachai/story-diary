/**
 * authFlow integration tests — Story Diary
 * 
 * Verifies the end-to-end RTK Query-to-Network flow for authentication:
 * 1. Login success -> Token saved to localStorage
 * 2. Probe session (getMe) -> Correct header sent
 * 3. Logout -> Token removed from localStorage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "@/store/apiSlice";
import { authApi } from "@/store/authApi";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";

describe("Auth Flow Integration", () => {
  let store: any;

  function createTestStore() {
    return configureStore({
      reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: (gdm) => gdm({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(apiSlice.middleware),
    });
  }

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
  });

  it("completes a full login -> probe -> logout cycle", async () => {
    const MOCK_USER = { id: "usr-001", tel: "0812345678", name: "สมชาย ใจดี" };
    const loginResponse = {
      user: MOCK_USER,
      token: "valid-jwt-token"
    };

    // 1. LOGIN
    server.use(
      http.post("/api/auth/login", () => {
        return HttpResponse.json(loginResponse);
      })
    );

    await store.dispatch(authApi.endpoints.login.initiate({ username: "0812345678", password: "password123" })).unwrap();

    // Verify localStorage
    expect(localStorage.getItem("auth_token")).toBe("valid-jwt-token");

    // 2. PROBE SESSION (GET /auth/me)
    let capturedHeader = "";
    server.use(
      http.get("/api/auth/me", ({ request }) => {
        capturedHeader = request.headers.get("Authorization") || "";
        return HttpResponse.json({ user: MOCK_USER });
      })
    );

    await store.dispatch(authApi.endpoints.getMe.initiate()).unwrap();

    // Verify correct Authorization header was sent
    expect(capturedHeader).toBe("Bearer valid-jwt-token");

    // 3. LOGOUT
    server.use(
      http.post("/api/auth/logout", () => {
        return HttpResponse.json({});
      })
    );

    // Mock window.location.reload
    const reloadMock = vi.fn();
    vi.stubGlobal("location", { reload: reloadMock });

    await store.dispatch(authApi.endpoints.logout.initiate()).unwrap();

    // Verify localStorage is cleared
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(reloadMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
