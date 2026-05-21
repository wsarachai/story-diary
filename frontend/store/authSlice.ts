import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AuthStatus, LoginInput, RegisterInput, User } from "@/types/auth";
import type { ApiErrorCode } from "@/types/error";
import { isApiError } from "@/types/error";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  submitError: ApiErrorCode | null;
}

const initialState: AuthState = {
  status: "unknown",
  user: null,
  token: null,
  submitError: null,
};

// ──────────────────────────────────────────────────────────
// Thunks
// ──────────────────────────────────────────────────────────

export const probeSession = createAsyncThunk<User | null, void, { state: { auth: AuthState } }>(
  "auth/probeSession",
  async (_, { getState }) => {
    try {
      const state = getState();
      const token = state.auth.token;
      if (!token) return null;
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as { user: User };
      return data.user;
    } catch {
      return null;
    }
  }
);

export const login = createAsyncThunk<{ user: User; token: string }, LoginInput, { rejectValue: ApiErrorCode }>(
  "auth/login",
  async (input, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: any = await res.json();
      if (!res.ok) {
        if (isApiError(data)) {
          return rejectWithValue(data.error.code as ApiErrorCode);
        }
        return rejectWithValue("INTERNAL_ERROR");
      }
      return { user: data.user, token: data.token };
    } catch {
      return rejectWithValue("INTERNAL_ERROR");
    }
  }
);


type RegisterRequest = Omit<RegisterInput, "confirmPassword">;

export const register = createAsyncThunk<{ user: User; token: string }, RegisterRequest, { rejectValue: ApiErrorCode }>(
  "auth/register",
  async (input, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: any = await res.json();
      if (!res.ok) {
        if (isApiError(data)) {
          return rejectWithValue(data.error.code as ApiErrorCode);
        }
        return rejectWithValue("INTERNAL_ERROR");
      }
      return { user: data.user, token: data.token };
    } catch {
      return rejectWithValue("INTERNAL_ERROR");
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async (_, { getState }) => {
  try {
    const state = getState() as { auth: AuthState };
    const token = state.auth.token;
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
          state.user = null;
          state.token = null;
        }
      })
      // login
      .addCase(login.pending, (state) => {
        state.status = "authenticating";
        state.submitError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.user = null;
        state.token = null;
        state.submitError = action.payload ?? "INTERNAL_ERROR";
      })
      // register
      .addCase(register.pending, (state) => {
        state.status = "authenticating";
        state.submitError = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.user = null;
        state.token = null;
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
