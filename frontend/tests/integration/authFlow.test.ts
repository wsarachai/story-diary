/**
 * authFlow integration tests — Story Diary
 * 
 * Verifies the end-to-end Redux-to-Network flow for authentication:
 * 1. Login success -> Store updated, Token saved to localStorage
 * 2. Probe session -> Correct header sent, Store recovered
 * 3. Logout -> Store cleared, Token removed from localStorage
 */

import { configureStore } from "@reduxjs/toolkit";

// We'll import these inside the test to allow module resetting
let authReducer: any, login: any, probeSession: any, logout: any;

describe("Auth Flow Integration", () => {
  beforeEach(() => {
    jest.resetModules();
    // Re-import after reset
    const authSlice = require("@/store/authSlice");
    authReducer = authSlice.default;
    login = authSlice.login;
    probeSession = authSlice.probeSession;
    logout = authSlice.logout;

    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("completes a full login -> probe -> logout cycle", async () => {
    const store = configureStore({
      reducer: { auth: authReducer }
    });

    // 1. LOGIN
    const MOCK_USER = { id: "usr-001", tel: "0812345678", name: "สมชาย ใจดี" };
    const loginResponse = {
      user: MOCK_USER,
      token: "valid-jwt-token"
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => loginResponse,
    });

    await store.dispatch(login({ username: "0812345678", password: "password123" }));

    // Verify store state
    expect(store.getState().auth.status).toBe("authenticated");
    expect(store.getState().auth.token).toBe("valid-jwt-token");
    expect(localStorage.getItem("auth_token")).toBe("valid-jwt-token");

    // 2. PROBE SESSION (simulate page refresh by resetting modules and re-importing)
    jest.resetModules();
    const freshAuthSlice = require("@/store/authSlice");
    const freshAuthReducer = freshAuthSlice.default;
    const freshProbeSession = freshAuthSlice.probeSession;

    const newStore = configureStore({
      reducer: { auth: freshAuthReducer }
    });
    
    // Initial state of new store SHOULD have the token from localStorage
    expect(newStore.getState().auth.token).toBe("valid-jwt-token");

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: MOCK_USER }),
    });

    await newStore.dispatch(freshProbeSession());

    // Verify fetch was called with correct Authorization header
    expect(global.fetch).toHaveBeenLastCalledWith("/api/auth/me", expect.objectContaining({
      headers: { Authorization: "Bearer valid-jwt-token" }
    }));

    // 3. LOGOUT
    const freshLogout = freshAuthSlice.logout;
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    await newStore.dispatch(freshLogout());

    // Verify store and localStorage are cleared
    expect(newStore.getState().auth.status).toBe("unauthenticated");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
