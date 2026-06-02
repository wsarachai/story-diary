"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useGetChapterQuery } from "@/store/chaptersApi";
import PageSpinner from "@/components/PageSpinner";
import styles from "../../chapters.module.css";
import layoutStyles from "@/components/BookShellLayout.module.css";

export default function ChapterIntroPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;

  const {
    data: chapter,
    isError,
    isLoading: isDetailLoading,
    isUninitialized,
    isSuccess,
  } = useGetChapterQuery(id, { skip: isNaN(id) });

  useEffect(() => {
    if (isNaN(id)) {
      router.replace("/chapters/menu");
      return;
    }
  }, [id, router]);

  useEffect(() => {
    if (isError) {
      router.replace("/chapters/menu");
      return;
    }

    // Guard against successful responses that still return no chapter payload.
    if (isSuccess && !chapter) {
      router.replace("/chapters/menu");
    }
  }, [chapter, isError, isSuccess, router]);

  const isLoading = isDetailLoading || isUninitialized;
  const introTitle = chapter?.introTitle ?? "บทบรรยาย";
  const bgUrl = chapter?.backgroundImageUrl;

  return (
    <main
      className={`${layoutStyles.screen} ${styles.chapterExplainScreen}`}
      aria-label="Story Diary Chapters Explain"
    >
      {bgUrl ? (
        <Image
          className={styles.chapterExplainBg}
          src={bgUrl}
          alt=""
          fill
          priority
          style={{ objectFit: "cover", zIndex: -1 }}
        />
      ) : (
        <div
          className={styles.chapterExplainBg}
          style={{ background: "var(--book-fill)" }}
        />
      )}

      <section
        className={[styles.chapterExplainPanel, isLoading && styles.loading].filter(Boolean).join(" ")}
        aria-label="บทบรรยาย"
      >
        {isLoading ? (
          <PageSpinner label="กำลังโหลด…" />
        ) : (
          <h1>{introTitle}</h1>
        )}
        <div className={styles.chapterExplainNext} aria-hidden="true" />
      </section>

      {!isLoading && chapter && (
        <Link
          href={`/chapters/${id}/explain/0`}
          className={styles.chapterExplainLink}
          aria-label="ไปหน้ารายละเอียดบทบรรยาย"
        />
      )}
    </main>
  );
}
