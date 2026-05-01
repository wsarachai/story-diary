import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AuthStatus, LoginInput, RegisterInput, User } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";
import { isApiError } from "@/types/error";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  submitError: ApiErrorCode | null;
}

const initialState: AuthState = {
  status: "unknown",
  user: null,
  submitError: null,
};

// ──────────────────────────────────────────────────────────
// Thunks
// ──────────────────────────────────────────────────────────

export const probeSession = createAsyncThunk<User | null>(
  "auth/probeSession",
  async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json() as { user: User };
      return data.user;
    } catch {
      return null;
    }
  }
);

export const login = createAsyncThunk<User, LoginInput, { rejectValue: ApiErrorCode }>(
  "auth/login",
  async (input, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        if (isApiError(data)) {
          return rejectWithValue(data.error.code as ApiErrorCode);
        }
        return rejectWithValue("INTERNAL_ERROR");
      }
      return (data as { user: User }).user;
    } catch {
      return rejectWithValue("INTERNAL_ERROR");
    }
  }
);

type RegisterRequest = Omit<RegisterInput, "confirmPassword">;

export const register = createAsyncThunk<User, RegisterRequest, { rejectValue: ApiErrorCode }>(
  "auth/register",
  async (input, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        if (isApiError(data)) {
          return rejectWithValue(data.error.code as ApiErrorCode);
        }
        return rejectWithValue("INTERNAL_ERROR");
      }
      return (data as { user: User }).user;
    } catch {
      return rejectWithValue("INTERNAL_ERROR");
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore — client state is cleared regardless
  }
});

// ──────────────────────────────────────────────────────────
// Slice
// ──────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearSubmitError(state) {
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    // probeSession
    builder
      .addCase(probeSession.pending, (state) => {
        state.status = "unknown";
      })
      .addCase(probeSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = "authenticated";
          state.user = action.payload;
        } else {
          state.status = "unauthenticated";
        }
      })
      // login
      .addCase(login.pending, (state) => {
        state.status = "authenticating";
        state.submitError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.submitError = action.payload ?? "INTERNAL_ERROR";
      })
      // register
      .addCase(register.pending, (state) => {
        state.status = "authenticating";
        state.submitError = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.submitError = action.payload ?? "INTERNAL_ERROR";
      })
      // logout
      .addCase(logout.fulfilled, () => ({
        ...initialState,
        status: "unauthenticated" as const,
      }));
  },
});

export const { clearSubmitError } = authSlice.actions;
export default authSlice.reducer;

// ──────────────────────────────────────────────────────────
// Selectors
// ──────────────────────────────────────────────────────────

import type { RootState } from "./index";

export const selectAuthStatus = (state: RootState): AuthStatus => state.auth.status;
export const selectCurrentUser = (state: RootState): User | null => state.auth.user;
export const selectIsAuthed = (state: RootState): boolean => state.auth.status === "authenticated";
export const selectSubmitError = (state: RootState): ApiErrorCode | null => state.auth.submitError;
