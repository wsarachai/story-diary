"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchSummaries,
  showLockHint,
  clearLockHint,
  selectChapterSummaries,
  selectSummariesStatus,
  selectLockHintFor,
} from "@/store/chaptersSlice";
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
  const dispatch = useAppDispatch();
  const summaries = useAppSelector(selectChapterSummaries);
  const status = useAppSelector(selectSummariesStatus);
  const lockHintFor = useAppSelector(selectLockHintFor);
  const [shakingId, setShakingId] = useState<ChapterId | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchSummaries());
    }
  }, [dispatch, status]);

  const handleLockedTap = (id: ChapterId) => {
    setShakingId(id);
    dispatch(showLockHint(id));

    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      dispatch(clearLockHint());
      setShakingId(null);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const leftChapters = summaries.slice(0, 2);
  const rightChapters = summaries.slice(2);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className="chapters-menu-page">
          <h1 className="chapter-title">เนื้อเรื่อง</h1>
          <div className="chapter-title-rule" aria-hidden="true" />
          <ol className="chapter-list" aria-label="รายการบทฝั่งซ้าย">
            {leftChapters.map((s) => (
              <ChapterRow
                key={s.id}
                id={s.id}
                title={s.title}
                isLocked={s.lockState === "locked"}
                hasLinkLine={s.id === 1}
                onLockedTap={handleLockedTap}
                isShaking={shakingId === s.id}
                showHint={lockHintFor === s.id}
              />
            ))}
          </ol>
        </div>
      }
      right={
        <div className="chapters-menu-page">
          <ol
            className="chapter-list chapter-list-right"
            aria-label="รายการบทฝั่งขวา"
          >
            {rightChapters.map((s) => (
              <ChapterRow
                key={s.id}
                id={s.id}
                title={s.title}
                isLocked={s.lockState === "locked"}
                hasLinkLine={s.id < 5}
                onLockedTap={handleLockedTap}
                isShaking={shakingId === s.id}
                showHint={lockHintFor === s.id}
              />
            ))}
          </ol>
        </div>
      }
    />
  );
}
