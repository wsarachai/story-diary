"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetEBooksQuery } from "@/store/ebookApi";
import PageSpinner from "@/components/PageSpinner";
import type { EBookChapter } from "@/types/ebook";

function PlayButton({ ebook }: { ebook: EBookChapter }) {
  return (
    <Link
      href={`/e-books/${ebook.id}`}
      className="clip-play-button"
      style={{ opacity: 1 }}
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
        <div className="video-clips-page">
          <Link
            href="/chapters"
            className="clip-section-label-badge"
            style={{ background: "#508db9" }}
            aria-label="E-book — กลับหน้าบท"
          >
            {collection?.badge ?? "E-book"}
          </Link>

          {isLoading ? (
            <PageSpinner variant="inline" height="14rem" label="กำลังโหลด E-book…" />
          ) : (
          <div className="clips-grid-container">
            {leftChapters.map((ebook) => (
              <div key={ebook.id} className="clips-grid-item">
                <div className="clip-thumbnail" style={{ background: "#508db9" }} aria-label={`E-book ${ebook.title}`}>
                  <PlayButton ebook={ebook} />
                </div>
                <div className="clip-caption" style={{ color: "#508db9" }} aria-label={ebook.title}>
                  {ebook.title}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      }
      right={
        <div className="video-clips-page">
          <div className="clip-section-label-spacer" aria-hidden="true" />

          {isLoading ? (
            <PageSpinner variant="inline" height="14rem" label="กำลังโหลด E-book…" />
          ) : (
          <div className="clips-grid-container">
            {rightChapters.map((ebook) => (
              <div key={ebook.id} className="clips-grid-item">
                <div className="clip-thumbnail" style={{ background: "#508db9" }} aria-label={`E-book ${ebook.title}`}>
                  <PlayButton ebook={ebook} />
                </div>
                <div className="clip-caption" style={{ color: "#508db9" }} aria-label={ebook.title}>
                  {ebook.title}
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
