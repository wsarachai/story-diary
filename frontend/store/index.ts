import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { apiSlice } from "./apiSlice";
import { toastReducer } from "./toastSlice";
import { mutationErrorToastMiddleware } from "./toastMiddleware";

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    toast: toastReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, mutationErrorToastMiddleware),
});

// Powers refetchOnFocus / refetchOnReconnect opt-ins (see AuthProbe): without
// this, an expired token would never be re-checked mid-session.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
