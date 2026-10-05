"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGetMeQuery } from "@/store/authApi";

/**
 * Auth guard wrapper for the (authed) route group.
 * Redirects to /login only when the session is truly gone: getMe fulfilled
 * with no user, or rejected with a 401. Transient failures (network errors,
 * 5xx) keep the page mounted rather than bouncing a signed-in user to /login.
 * If status is "unknown", shows nothing (probe is still in flight).
 */
export default function AuthedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, error, status, isFetching } = useGetMeQuery();

  const isUnauthorized =
    (status === "fulfilled" && !user) ||
    (status === "rejected" && error != null && "status" in error && error.status === 401);
  // Only block on the first probe. Background refetches (focus/reconnect) keep
  // the cached user, so unmounting here would wipe page state on every tab focus.
  const isLoading = user === undefined && (status === "pending" || isFetching);

  useEffect(() => {
    if (isUnauthorized) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isUnauthorized, pathname, router]);

  if (isLoading || isUnauthorized) {
    return null;
  }

  return <>{children}</>;
}
