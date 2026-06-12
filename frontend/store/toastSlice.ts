import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export interface ToastItem {
  id: string;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
}

const initialState: ToastState = { toasts: [] };

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast: {
      reducer(state, action: PayloadAction<ToastItem>) {
        state.toasts.push(action.payload);
      },
      prepare(message: string) {
        return { payload: { id: nanoid(), message } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { showToast, dismissToast } = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
