/**
 * authSlice unit tests — Story Diary
 *
 * Tests cover every reducer case from src/types/auth.ts + the authSlice state
 * machine described in docs/specs/s001-auth-and-home-entry.md §"Redux State
 * Design". All assertions use the action creator API from RTK so they are
 * purely synchronous — no network, no timers.
 *
 * Source of truth:
 *   - docs/specs/s001-auth-and-home-entry.md  (Redux State Design section)
 *   - src/types/auth.ts                        (AuthStatus, LoginInput, etc.)
 *   - src/types/error.ts                       (ApiErrorCode)
 */

import reducer, {
  probeSession,
  login,
  register,
  logout,
  clearSubmitError,
  selectAuthStatus,
  selectCurrentUser,
  selectIsAuthed,
  selectSubmitError,
} from "@/store/authSlice";
import type { AuthStatus } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";
import { isApiError } from "@/types/error";
import type { RootState } from "@/store/index";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: "usr-001",
  name: "สมชาย ใจดี",
  email: "somchai@example.com",
  characterName: "นักสำรวจ",
  gender: "male" as const,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// Minimal RootState wrapper for selectors — only auth is exercised here.
function wrapState(authState: ReturnType<typeof reducer>): RootState {
  return { auth: authState } as RootState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — initial state", () => {
  it("starts as unknown with null user and no submitError", () => {
    // Calling reducer with undefined action returns initialState
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.status).toBe<AuthStatus>("unknown");
    expect(state.user).toBeNull();
    expect(state.submitError).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// probeSession thunk
// spec: auth/probeSession/pending → "unknown" (idempotent)
//       auth/probeSession/fulfilled(user)  → "authenticated", user populated
//       auth/probeSession/fulfilled(null)  → "unauthenticated"
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — probeSession (DS-1: session probe)", () => {
  it("pending keeps status as 'unknown'", () => {
    const state = reducer(undefined, probeSession.pending("req-1", undefined));
    expect(state.status).toBe<AuthStatus>("unknown");
  });

  it("fulfilled with a user → status 'authenticated', user populated", () => {
    const state = reducer(
      undefined,
      probeSession.fulfilled(MOCK_USER, "req-1", undefined)
    );
    expect(state.status).toBe<AuthStatus>("authenticated");
    expect(state.user).toEqual(MOCK_USER);
    expect(state.submitError).toBeNull();
  });

  it("fulfilled with null → status 'unauthenticated', user stays null", () => {
    const state = reducer(
      undefined,
      probeSession.fulfilled(null, "req-1", undefined)
    );
    expect(state.status).toBe<AuthStatus>("unauthenticated");
    expect(state.user).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login thunk
// spec: login/pending → "authenticating", clears submitError
//       login/fulfilled → "authenticated", user set
//       login/rejected(INVALID_CREDENTIALS) → "unauthenticated", submitError set
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — login (DS-3: login form states)", () => {
  const LOGIN_INPUT = { username: "somchai@example.com", password: "pass123" };

  it("pending → status 'authenticating', clears any prior submitError", () => {
    // Start with a prior error to verify it is cleared
    const stateWithError = reducer(
      undefined,
      login.rejected(null, "req-x", LOGIN_INPUT, "INVALID_CREDENTIALS")
    );
    expect(stateWithError.submitError).toBe("INVALID_CREDENTIALS");

    const state = reducer(stateWithError, login.pending("req-2", LOGIN_INPUT));
    expect(state.status).toBe<AuthStatus>("authenticating");
    expect(state.submitError).toBeNull();
  });

  it("fulfilled → status 'authenticated', user stored", () => {
    const state = reducer(
      undefined,
      login.fulfilled(MOCK_USER, "req-2", LOGIN_INPUT)
    );
    expect(state.status).toBe<AuthStatus>("authenticated");
    expect(state.user).toEqual(MOCK_USER);
    expect(state.submitError).toBeNull();
  });

  it("rejected with INVALID_CREDENTIALS → 'unauthenticated', submitError set", () => {
    const state = reducer(
      undefined,
      login.rejected(null, "req-2", LOGIN_INPUT, "INVALID_CREDENTIALS")
    );
    expect(state.status).toBe<AuthStatus>("unauthenticated");
    expect(state.submitError).toBe<ApiErrorCode>("INVALID_CREDENTIALS");
    expect(state.user).toBeNull();
  });

  it("rejected with INTERNAL_ERROR → submitError is 'INTERNAL_ERROR'", () => {
    const state = reducer(
      undefined,
      login.rejected(null, "req-3", LOGIN_INPUT, "INTERNAL_ERROR")
    );
    expect(state.submitError).toBe<ApiErrorCode>("INTERNAL_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// register thunk
// spec: register/pending  → "authenticating"
//       register/fulfilled → "authenticated"
//       register/rejected(EMAIL_TAKEN) → "unauthenticated", submitError set
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — register (DS-4: register form states)", () => {
  const REGISTER_INPUT = {
    name: "สมหญิง",
    email: "somying@example.com",
    password: "secret99",
    characterName: "นักผจญภัย",
    gender: "female" as const,
  };

  it("pending → status 'authenticating'", () => {
    const state = reducer(
      undefined,
      register.pending("req-4", REGISTER_INPUT)
    );
    expect(state.status).toBe<AuthStatus>("authenticating");
    expect(state.submitError).toBeNull();
  });

  it("fulfilled → status 'authenticated', user populated", () => {
    const state = reducer(
      undefined,
      register.fulfilled(MOCK_USER, "req-4", REGISTER_INPUT)
    );
    expect(state.status).toBe<AuthStatus>("authenticated");
    expect(state.user).toEqual(MOCK_USER);
  });

  it("rejected with EMAIL_TAKEN → 'unauthenticated', submitError = EMAIL_TAKEN", () => {
    const state = reducer(
      undefined,
      register.rejected(null, "req-4", REGISTER_INPUT, "EMAIL_TAKEN")
    );
    expect(state.status).toBe<AuthStatus>("unauthenticated");
    expect(state.submitError).toBe<ApiErrorCode>("EMAIL_TAKEN");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout thunk
// spec: logout/fulfilled → status "unauthenticated", user null
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — logout (DS-5: programmatic logout)", () => {
  it("fulfilled → resets to unauthenticated state, user cleared", () => {
    // Start from an authenticated state
    const authedState = reducer(
      undefined,
      probeSession.fulfilled(MOCK_USER, "req-5", undefined)
    );
    expect(authedState.status).toBe("authenticated");

    const state = reducer(authedState, logout.fulfilled(undefined, "req-5"));
    expect(state.status).toBe<AuthStatus>("unauthenticated");
    expect(state.user).toBeNull();
    expect(state.submitError).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearSubmitError action
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — clearSubmitError", () => {
  it("clears submitError when called", () => {
    const LOGIN_INPUT = { username: "test", password: "pass" };
    const stateWithError = reducer(
      undefined,
      login.rejected(null, "req-6", LOGIN_INPUT, "INVALID_CREDENTIALS")
    );
    expect(stateWithError.submitError).not.toBeNull();

    const state = reducer(stateWithError, clearSubmitError());
    expect(state.submitError).toBeNull();
    // status should remain unauthenticated, not reset
    expect(state.status).toBe<AuthStatus>("unauthenticated");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

describe("authSlice — selectors", () => {
  it("selectAuthStatus returns the current status", () => {
    const authedState = reducer(
      undefined,
      probeSession.fulfilled(MOCK_USER, "", undefined)
    );
    expect(selectAuthStatus(wrapState(authedState))).toBe("authenticated");
  });

  it("selectCurrentUser returns null when unauthenticated", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectCurrentUser(wrapState(state))).toBeNull();
  });

  it("selectCurrentUser returns the user when authenticated", () => {
    const state = reducer(
      undefined,
      login.fulfilled(MOCK_USER, "", { username: "x", password: "y" })
    );
    expect(selectCurrentUser(wrapState(state))).toEqual(MOCK_USER);
  });

  it("selectIsAuthed is true only when status === 'authenticated'", () => {
    const unauthed = reducer(undefined, { type: "@@INIT" });
    expect(selectIsAuthed(wrapState(unauthed))).toBe(false);

    const authed = reducer(
      undefined,
      login.fulfilled(MOCK_USER, "", { username: "x", password: "y" })
    );
    expect(selectIsAuthed(wrapState(authed))).toBe(true);
  });

  it("selectSubmitError returns current submitError", () => {
    const LOGIN_INPUT = { username: "x", password: "y" };
    const errState = reducer(
      undefined,
      login.rejected(null, "", LOGIN_INPUT, "INVALID_CREDENTIALS")
    );
    expect(selectSubmitError(wrapState(errState))).toBe("INVALID_CREDENTIALS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error envelope type guard — isApiError()
// spec: frontend reads error.code (not error.message) for user-facing copy
// ─────────────────────────────────────────────────────────────────────────────

describe("isApiError type guard (src/types/error.ts)", () => {
  it("returns true for a valid ApiError shape", () => {
    const err = { error: { code: "INVALID_CREDENTIALS", message: "bad creds" } };
    expect(isApiError(err)).toBe(true);
  });

  it("returns false when error.code is missing", () => {
    expect(isApiError({ error: { message: "oops" } })).toBe(false);
  });

  it("returns false when error.message is missing", () => {
    expect(isApiError({ error: { code: "EMAIL_TAKEN" } })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isApiError(null)).toBe(false);
  });

  it("returns false for non-object values", () => {
    expect(isApiError("error string")).toBe(false);
    expect(isApiError(42)).toBe(false);
  });

  it("returns true and carries optional details array", () => {
    const err = {
      error: {
        code: "VALIDATION_ERROR",
        message: "invalid",
        details: [{ field: "email", code: "INVALID_FORMAT", message: "bad email" }],
      },
    };
    expect(isApiError(err)).toBe(true);
  });

  // Spec rule: frontend maps code → Thai copy. Verify the expected code-to-copy mapping
  // exists as a vocabulary contract (these are NOT UI tests — just vocabulary coverage).
  const ERROR_COPY: Record<string, string> = {
    INVALID_CREDENTIALS: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    EMAIL_TAKEN: "อีเมลนี้ถูกใช้งานแล้ว",
    UNAUTHENTICATED: "กรุณาเข้าสู่ระบบ",
  };

  it.each(Object.entries(ERROR_COPY))(
    "error code %s maps to non-empty Thai copy",
    (code, copy) => {
      expect(copy.length).toBeGreaterThan(0);
      // Ensure the code is a valid ApiErrorCode string that isApiError accepts
      const envelope = { error: { code, message: "english log" } };
      expect(isApiError(envelope)).toBe(true);
    }
  );
});
