/**
 * userApi integration tests — Story Diary
 *
 * Verifies the RTK Query contract for PATCH /api/users/me:
 * 1. Request body is sent correctly
 * 2. getMe cache is updated on success
 * 3. Cache is left unchanged on failure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "@/store/apiSlice";
import { authApi } from "@/store/authApi";
import { userApi } from "@/store/userApi";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { MOCK_USER, MOCK_TOKEN } from "../fixtures";

function createTestStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        apiSlice.middleware
      ),
  });
}

describe("userApi – updateProfile mutation", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", MOCK_TOKEN);
  });

  it("sends PATCH /api/users/me with the request body", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/me", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ user: { ...MOCK_USER, name: "ชื่อใหม่" } });
      })
    );

    const store = createTestStore();
    await store
      .dispatch(userApi.endpoints.updateProfile.initiate({ name: "ชื่อใหม่" }))
      .unwrap();

    expect(capturedBody).toEqual({ name: "ชื่อใหม่" });
  });

  it("includes the Bearer token in the Authorization header", async () => {
    let capturedAuth = "";
    server.use(
      http.patch("/api/users/me", async ({ request }) => {
        capturedAuth = request.headers.get("Authorization") ?? "";
        return HttpResponse.json({ user: MOCK_USER });
      })
    );

    const store = createTestStore();
    await store
      .dispatch(userApi.endpoints.updateProfile.initiate({ name: "สมชาย ใจดี" }))
      .unwrap();

    expect(capturedAuth).toBe(`Bearer ${MOCK_TOKEN}`);
  });

  it("updates the getMe cache after a successful update", async () => {
    const updatedUser = { ...MOCK_USER, name: "ชื่อใหม่" };
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json({ user: MOCK_USER })),
      http.patch("/api/users/me", () => HttpResponse.json({ user: updatedUser }))
    );

    const store = createTestStore();

    // Pre-populate the getMe cache
    await store.dispatch(authApi.endpoints.getMe.initiate()).unwrap();

    // Perform the update
    await store
      .dispatch(userApi.endpoints.updateProfile.initiate({ name: "ชื่อใหม่" }))
      .unwrap();

    // onQueryStarted side-effect runs async; wait for cache to update
    await vi.waitFor(() => {
      const result = authApi.endpoints.getMe.select()(store.getState() as never);
      expect(result.data?.name).toBe("ชื่อใหม่");
    });
  });

  it("leaves the getMe cache unchanged when the update fails", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json({ user: MOCK_USER })),
      http.patch("/api/users/me", () =>
        HttpResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
      )
    );

    const store = createTestStore();

    await store.dispatch(authApi.endpoints.getMe.initiate()).unwrap();

    // Dispatch update and swallow the rejection
    await store
      .dispatch(userApi.endpoints.updateProfile.initiate({ name: "ชื่อล้มเหลว" }))
      .catch(() => {});

    await vi.waitFor(() => {
      const result = authApi.endpoints.getMe.select()(store.getState() as never);
      expect(result.data?.name).toBe("สมชาย ใจดี");
    });
  });

  it("transforms the response to extract the user object", async () => {
    server.use(
      http.patch("/api/users/me", () =>
        HttpResponse.json({ user: { ...MOCK_USER, characterName: "ฮีโร่ใหม่" } })
      )
    );

    const store = createTestStore();
    const result = await store
      .dispatch(
        userApi.endpoints.updateProfile.initiate({ characterName: "ฮีโร่ใหม่" })
      )
      .unwrap();

    expect(result.characterName).toBe("ฮีโร่ใหม่");
    expect((result as unknown as Record<string, unknown>).user).toBeUndefined();
  });
});
