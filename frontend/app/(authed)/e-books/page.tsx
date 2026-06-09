"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import PageSpinner from "@/components/PageSpinner";
import type { EBookChapter } from "@/types/ebook";
import styles from "./EBooks.module.css";

function EBookCard({ ebook }: { ebook: EBookChapter }) {
  return (
    <Link href={`/e-books/${ebook.id}`} className={styles.clipThumbnail} aria-label={`อ่าน ${ebook.title}`}>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={styles.clipThumbnailBookIcon}>
        <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM6 4h5v8l-2.5-1.5L6 12V4Z" />
      </svg>
      <div className={styles.clipThumbnailTitle} title={ebook.title}>
        {ebook.title}
      </div>
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
                  <EBookCard ebook={ebook} />
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
                  <EBookCard ebook={ebook} />
                </div>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}
