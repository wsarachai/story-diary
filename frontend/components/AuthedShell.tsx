"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { selectIsAuthed, selectAuthStatus, logout } from "@/store/authSlice";

/**
 * Auth guard wrapper for the (authed) route group.
 * If status is "unauthenticated", redirects to /login with a `from=` param.
 * If status is "unknown", shows nothing (probe is still in flight).
 */
export default function AuthedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const isAuthed = useAppSelector(selectIsAuthed);

  useEffect(() => {
    if (status === "unauthenticated") {
      dispatch(logout());
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router, dispatch]);

  if (status === "unknown" || status === "unauthenticated") {
    return null;
  }

  if (!isAuthed) return null;

  return <>{children}</>;
}
