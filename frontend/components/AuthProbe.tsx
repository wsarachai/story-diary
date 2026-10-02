"use client";

import { useGetMeQuery } from "@/store/authApi";

/**
 * DS-1: Fires GET /api/auth/me on first mount to resolve session status.
 * Renders nothing — purely a side-effect component mounted in the root layout.
 * Re-probes when the tab regains focus or the network reconnects so an expired
 * token surfaces (AuthedShell then redirects) instead of the fulfilled cache
 * masking it for the rest of the session.
 */
export default function AuthProbe() {
  useGetMeQuery(undefined, {
    // Avoid re-probing too often, but ensure it runs on mount
    refetchOnMountOrArgChange: false,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  return null;
}
