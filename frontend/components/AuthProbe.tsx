"use client";

import { useGetMeQuery } from "@/store/authApi";

/**
 * DS-1: Fires GET /api/auth/me on first mount to resolve session status.
 * Renders nothing — purely a side-effect component mounted in the root layout.
 * Maximum probe hold: 1200 ms; after that the UI falls through regardless.
 */
export default function AuthProbe() {
  useGetMeQuery(undefined, {
    // Avoid re-probing too often, but ensure it runs on mount
    refetchOnMountOrArgChange: false,
  });

  return null;
}
