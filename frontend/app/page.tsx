"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetMeQuery } from "@/store/authApi";
import styles from "./page.module.css";
import layoutStyles from "@/components/BookShellLayout.module.css";

/**
 * s001 Landing Screen — public entry point.
 * DS-2: already-authed users are redirected to /home.
 * DS-1: while status is "unknown", the CTA is disabled (aria-busy).
 */
export default function LandingPage() {
  const router = useRouter();
  const { data: user, isLoading } = useGetMeQuery();

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const isPending = isLoading;

  return (
    <main
      className={layoutStyles.screen}
      aria-label="Story Diary Landing"
    >
      {/* Decorative paper/envelope element */}
      <div
        aria-hidden="true"
        className={styles.decorativePaper}
      />

      {/* Book panel */}
      <section className={styles.bookPanel}>
        {/* Book spine */}
        <div
          aria-hidden="true"
          className={styles.bookSpine}
        />

        {/* Book content */}
        <div className={styles.bookContent}>
          <h1 className={styles.title}>
            Story
            <br />
            Diary
          </h1>

          {isPending ? (
            <button
              type="button"
              disabled
              aria-busy="true"
              aria-label="เริ่มใช้งาน Story Diary"
              className={styles.pendingButton}
            >
              -กดเพื่อเริ่ม-
            </button>
          ) : (
            <Link
              href="/login"
              role="button"
              aria-label="เริ่มใช้งาน Story Diary"
              className={styles.startButton}
            >
              -กดเพื่อเริ่ม-
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
