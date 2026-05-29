/**
 * authFlow integration tests — Story Diary
 *
 * Verifies the RTK Query ↔ network contract for authentication:
 * 1. Login success  → token saved to localStorage
 * 2. getMe request  → Authorization header is injected
 * 3. Logout         → token removed + page reloaded
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "@/store/apiSlice";
import { authApi } from "@/store/authApi";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { MOCK_USER, MOCK_TOKEN, MOCK_CREDENTIALS } from "../fixtures";

function createTestStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        apiSlice.middleware
      ),
  });
}

describe("Auth Flow Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ──────────────────────────────────────────────────────────────────
  // Test 1: Login saves token
  // ──────────────────────────────────────────────────────────────────
  it("login mutation stores token in localStorage after success", async () => {
    const store = createTestStore();
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ user: MOCK_USER, token: MOCK_TOKEN })
      )
    );

    await store
      .dispatch(
        authApi.endpoints.login.initiate(MOCK_CREDENTIALS)
      )
      .unwrap();

    // onQueryStarted runs async; wait for the side-effect
    await vi.waitFor(() => {
      expect(localStorage.getItem("auth_token")).toBe(MOCK_TOKEN);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Test 2: getMe sends Authorization header
  // ──────────────────────────────────────────────────────────────────
  it("getMe request includes Bearer token from localStorage", async () => {
    // Pre-seed the token as if login already ran
    localStorage.setItem("auth_token", "probe-jwt-token");

    const store = createTestStore(); // fresh store = no pre-populated cache
    let capturedHeader = "";

    server.use(
      http.get("/api/auth/me", ({ request }) => {
        capturedHeader = request.headers.get("Authorization") ?? "";
        return HttpResponse.json({ user: MOCK_USER });
      })
    );

    await store.dispatch(authApi.endpoints.getMe.initiate()).unwrap();

    expect(capturedHeader).toBe("Bearer probe-jwt-token");
  });

  // ──────────────────────────────────────────────────────────────────
  // Test 3: Logout clears token
  // ──────────────────────────────────────────────────────────────────
  it("logout mutation removes token from localStorage", async () => {
    localStorage.setItem("auth_token", "existing-token");
    const store = createTestStore();

    // Default handler in handlers.ts covers POST /api/auth/logout.
    // onQueryStarted finally-block removes the token regardless of network result.
    await store.dispatch(authApi.endpoints.logout.initiate());

    await vi.waitFor(() => {
      expect(localStorage.getItem("auth_token")).toBeNull();
    });
  });
});
