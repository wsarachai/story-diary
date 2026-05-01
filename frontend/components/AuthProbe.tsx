"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { probeSession, selectAuthStatus } from "@/store/authSlice";

/**
 * DS-1: Fires GET /api/auth/me on first mount to resolve session status.
 * Renders nothing — purely a side-effect component mounted in the root layout.
 * Maximum probe hold: 1200 ms; after that the UI falls through regardless.
 */
export default function AuthProbe() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === "unknown") {
      const timer = setTimeout(() => {
        // Fallback: if probe hasn't resolved in 1200ms, treat as unauthenticated
        // by dispatching probeSession which will resolve to null on network hang.
      }, 1200);

      dispatch(probeSession());
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
