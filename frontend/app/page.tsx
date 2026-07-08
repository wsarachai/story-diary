"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetMeQuery } from "@/store/authApi";
import styles from "./page.module.css";

/**
 * s001 Landing Screen — public entry point.
 * DS-2: already-authed users are redirected to /home.
 * DS-1: the full screen acts as a single navigation target to /login.
 */
export default function LandingPage() {
  const router = useRouter();
  const { data: user } = useGetMeQuery();

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const handleNavigateToLogin = () => {
    router.push("/login");
  };

  return (
    <main
      className={styles.landingScreen}
      aria-label="เริ่มใช้งาน Story Diary"
      role="link"
      tabIndex={0}
      onClick={handleNavigateToLogin}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigateToLogin();
        }
      }}
    >
      <span className={styles.visuallyHidden}>กดเพื่อเริ่ม</span>
    </main>
  );
}
