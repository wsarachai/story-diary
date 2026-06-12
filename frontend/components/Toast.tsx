"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { dismissToast, type ToastItem } from "@/store/toastSlice";
import type { RootState } from "@/store/index";

const AUTO_DISMISS_MS = 4000;

function ToastCard({ toast }: { toast: ToastItem }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      role="alert"
      style={{
        background: "#9c2f2f",
        color: "#fff",
        padding: "0.7rem 1.1rem",
        borderRadius: "0.6rem",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
        fontSize: "0.95rem",
        cursor: "pointer",
      }}
      onClick={() => dispatch(dismissToast(toast.id))}
    >
      {toast.message}
    </div>
  );
}

/** Global failure-toast stack; mounted once inside Providers. */
export default function ToastViewport() {
  const toasts = useSelector((state: RootState) => state.toast.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        zIndex: 1000,
      }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
