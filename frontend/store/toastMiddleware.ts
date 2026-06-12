import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { showToast } from "./toastSlice";

/**
 * Auth mutations render their own error states on the login/register forms,
 * so the generic failure toast would duplicate them.
 */
const SILENCED_ENDPOINTS = new Set(["login", "register", "logout"]);

/**
 * Surfaces every failed RTK Query mutation as a toast. Mutations are
 * optimistic where possible, so without this the rollback would be silent
 * and read as a UI glitch.
 */
export const mutationErrorToastMiddleware: Middleware = (api) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const meta = (action as { meta?: { arg?: { type?: string; endpointName?: string } } }).meta;
    if (meta?.arg?.type === "mutation" && !SILENCED_ENDPOINTS.has(meta.arg.endpointName ?? "")) {
      api.dispatch(showToast("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"));
    }
  }
  return next(action);
};
