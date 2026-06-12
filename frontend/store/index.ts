import { configureStore } from "@reduxjs/toolkit";
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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
