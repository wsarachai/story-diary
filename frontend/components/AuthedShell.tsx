"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGetMeQuery, useLogoutMutation } from "@/store/authApi";

/**
 * Auth guard wrapper for the (authed) route group.
 * If status is "unauthenticated", redirects to /login with a `from=` param.
 * If status is "unknown", shows nothing (probe is still in flight).
 */
export default function AuthedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, status, isFetching } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const isUnauthenticated = status === "rejected" || (status === "fulfilled" && !user);
  const isLoading = status === "pending" || isFetching;

  useEffect(() => {
    if (isUnauthenticated) {
      logout();
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isUnauthenticated, pathname, router, logout]);

  if (isLoading || isUnauthenticated) {
    return null;
  }

  return <>{children}</>;
}
