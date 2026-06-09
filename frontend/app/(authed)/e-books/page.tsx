"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import PageSpinner from "@/components/PageSpinner";
import type { EBookChapter } from "@/types/ebook";
import styles from "./EBooks.module.css";

function PlayButton({ ebook }: { ebook: EBookChapter }) {
  return (
    <Link
      href={`/e-books/${ebook.id}`}
      className={styles.clipPlayButton}
      aria-label={`อ่าน ${ebook.title}`}
      title={`อ่าน ${ebook.title}`}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
    </Link>
  );
}

export default function EBooksPage() {
  const { data: collection, isLoading } = useGetEBooksQuery();

  const chapters = collection?.chapters ?? [];
  const leftChapters = chapters.filter((_, index) => (index + 1) % 2 === 1);
  const rightChapters = chapters.filter((_, index) => (index + 1) % 2 === 0);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className={styles.eBooksPage}>
          <Link
            href="/chapters"
            className={styles.clipSectionLabelBadge}
            aria-label="E-book — กลับหน้าบท"
          >
            {collection?.badge ?? "E-book"}
          </Link>

          {isLoading ? (
            <PageSpinner variant="inline" height="14rem" label="กำลังโหลด E-book…" />
          ) : (
          <div className={styles.clipsGridContainer}>
            {leftChapters.map((ebook) => (
              <div key={ebook.id} className={styles.clipsGridItem}>
                <div className={styles.clipThumbnail} aria-label={`E-book ${ebook.title}`}>
                  <PlayButton ebook={ebook} />
                  <div className={styles.clipThumbnailTitle} title={ebook.title}>
                    {ebook.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      }
      right={
        <div className={styles.eBooksPage}>
          <div className={styles.clipSectionLabelSpacer} aria-hidden="true" />

          {isLoading ? (
            <PageSpinner variant="inline" height="14rem" label="กำลังโหลด E-book…" />
          ) : (
          <div className={styles.clipsGridContainer}>
            {rightChapters.map((ebook) => (
              <div key={ebook.id} className={styles.clipsGridItem}>
                <div className={styles.clipThumbnail} aria-label={`E-book ${ebook.title}`}>
                  <PlayButton ebook={ebook} />
                  <div className={styles.clipThumbnailTitle} title={ebook.title}>
                    {ebook.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      }
    />
  );
}
