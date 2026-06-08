"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useGetMeQuery } from "@/store/authApi";
import styles from "./Admin.module.css";

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const { data: user, isLoading } = useGetMeQuery();

  const isAdmin = user?.role === "admin" || user?.role === "rootAdmin";

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/login");
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return <div className={styles.adminLoading}>กำลังโหลด…</div>;
  }

  if (!isAdmin) {
    return <div className={styles.adminLoading}>กำลังโหลด…</div>;
  }

  return <>{children}</>;
}
