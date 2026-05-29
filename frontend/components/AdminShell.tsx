"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useGetMeQuery } from "@/store/authApi";

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const { data: user, isLoading } = useGetMeQuery();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <div className="admin-loading">กำลังโหลด…</div>;
  }

  if (!user || user.role !== "admin") {
    return <div className="admin-loading">กำลังโหลด…</div>;
  }

  return <>{children}</>;
}
