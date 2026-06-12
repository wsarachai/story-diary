"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetChapterSummariesQuery } from "@/store/chaptersApi";
import PageSpinner from "@/components/PageSpinner";
import type { ChapterId } from "@/types/chapters";
import styles from "../chapters.module.css";

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
    <li className={[styles.chapterRow, isShaking && styles.chapterRowShaking].filter(Boolean).join(" ")}>
      <Link
        href={`/chapters/${id}/explain`}
        className={styles.chapterRowLink}
        aria-label={`ไปหน้าบทบรรยาย บทที่ ${id}`}
        aria-disabled={isLocked ? "true" : undefined}
        onClick={handleClick}
      >
        <div className={styles.pin} aria-hidden="true">
          <div className={styles.pinCircle}>{num}</div>
          <div className={styles.pinTip} />
          <div className={styles.pinBase} />
          {hasLinkLine && <div className={styles.pinLinkLine} />}
        </div>
        <div className={styles.chapterPill}>
          <span className={styles.chapterPillText}>{title}</span>
          {isLocked && (
            <LockKeyhole
              className={styles.lockIcon}
              color="#1f8f9b"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          )}
        </div>
      </Link>
      {showHint && (
        <div role="status" className={styles.chapterLockHint}>
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
        <div className={styles.chaptersMenuPage}>
          <h1 className={styles.chapterTitle}>เนื้อเรื่อง</h1>
          <div className={styles.chapterTitleRule} aria-hidden="true" />
          {isLoading ? (
            <PageSpinner variant="inline" height="12rem" label="กำลังโหลดบท…" />
          ) : (
          <ol className={styles.chapterList} aria-label="รายการบทฝั่งซ้าย">
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
        <div className={styles.chaptersMenuPage}>
          {/* Invisible spacer mirrors the left-side title + rule so lists align */}
          <div aria-hidden="true" className={styles.hiddenPlaceholder}>
            <h1 className={styles.chapterTitle}>placeholder</h1>
            <div className={styles.chapterTitleRule} />
          </div>
          {isLoading ? (
            <PageSpinner variant="inline" height="12rem" label="กำลังโหลดบท…" />
          ) : (
          <ol
            className={[styles.chapterList, styles.chapterListRight].join(" ")}
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
