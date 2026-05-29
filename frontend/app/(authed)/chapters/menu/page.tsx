"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetChapterSummariesQuery } from "@/store/chaptersApi";
import PageSpinner from "@/components/PageSpinner";
import type { ChapterId } from "@/types/chapters";

function ChapterRow({
  id,
  title,
  isLocked,
  hasLinkLine,
  onLockedTap,
  isShaking,
  showHint,
}: {
  id: ChapterId;
  title: string;
  isLocked: boolean;
  hasLinkLine?: boolean;
  onLockedTap: (id: ChapterId) => void;
  isShaking: boolean;
  showHint: boolean;
}) {
  const num = String(id).padStart(2, "0");

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      onLockedTap(id);
    }
  };

  return (
    <li className={`chapter-row${isShaking ? " chapter-row-shaking" : ""}`}>
      <Link
        href={`/chapters/${id}/explain`}
        className="chapter-row-link"
        aria-label={`ไปหน้าบทบรรยาย บทที่ ${id}`}
        aria-disabled={isLocked ? "true" : undefined}
        onClick={handleClick}
      >
        <div className="pin" aria-hidden="true">
          <div className="pin-circle">{num}</div>
          <div className="pin-tip" />
          <div className="pin-base" />
          {hasLinkLine && <div className="pin-link-line" />}
        </div>
        <div className="chapter-pill">
          <span className="chapter-pill-text">{title}</span>
          {isLocked && (
            <Image
              className="lock-icon"
              src="/icons/lock-key.svg"
              alt="ล็อก"
              width={53}
              height={53}
              aria-hidden="true"
            />
          )}
        </div>
      </Link>
      {showHint && (
        <div role="status" className="chapter-lock-hint">
          บทนี้ยังไม่ปลดล็อก
        </div>
      )}
    </li>
  );
}

export default function ChaptersMenuPage() {
  const { data: summaries = [], isLoading } = useGetChapterSummariesQuery();
  const [lockHintFor, setLockHintFor] = useState<ChapterId | null>(null);
  const [shakingId, setShakingId] = useState<ChapterId | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLockedTap = (id: ChapterId) => {
    setShakingId(id);
    setLockHintFor(id);

    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      setLockHintFor(null);
      setShakingId(null);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const leftChapters = summaries.filter((s) => s.id % 2 !== 0);
  const rightChapters = summaries.filter((s) => s.id % 2 === 0);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className="chapters-menu-page">
          <h1 className="chapter-title">เนื้อเรื่อง</h1>
          <div className="chapter-title-rule" aria-hidden="true" />
          {isLoading ? (
            <PageSpinner variant="inline" height="12rem" label="กำลังโหลดบท…" />
          ) : (
          <ol className="chapter-list" aria-label="รายการบทฝั่งซ้าย">
            {leftChapters.map((s, i) => (
              <ChapterRow
                key={s.id}
                id={s.id}
                title={s.title}
                isLocked={s.lockState === "locked"}
                hasLinkLine={i < leftChapters.length - 1}
                onLockedTap={handleLockedTap}
                isShaking={shakingId === s.id}
                showHint={lockHintFor === s.id}
              />
            ))}
          </ol>
          )}
        </div>
      }
      right={
        <div className="chapters-menu-page">
          {/* Invisible spacer mirrors the left-side title + rule so lists align */}
          <div aria-hidden="true" style={{ visibility: "hidden" }}>
            <h1 className="chapter-title">placeholder</h1>
            <div className="chapter-title-rule" />
          </div>
          {isLoading ? (
            <PageSpinner variant="inline" height="12rem" label="กำลังโหลดบท…" />
          ) : (
          <ol
            className="chapter-list chapter-list-right"
            aria-label="รายการบทฝั่งขวา"
          >
            {rightChapters.map((s, i) => (
              <ChapterRow
                key={s.id}
                id={s.id}
                title={s.title}
                isLocked={s.lockState === "locked"}
                hasLinkLine={i < rightChapters.length - 1}
                onLockedTap={handleLockedTap}
                isShaking={shakingId === s.id}
                showHint={lockHintFor === s.id}
              />
            ))}
          </ol>
          )}
        </div>
      }
    />
  );
}
