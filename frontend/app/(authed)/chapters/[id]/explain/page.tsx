"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchChapter,
  selectChapter,
  selectChapterDetailStatus,
} from "@/store/chaptersSlice";

export default function ChapterIntroPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;

  const dispatch = useAppDispatch();
  const chapter = useAppSelector((s) => selectChapter(s, id));
  const detailStatus = useAppSelector((s) => selectChapterDetailStatus(s, id));

  useEffect(() => {
    if (isNaN(id)) {
      router.replace("/chapters/menu");
      return;
    }
    if (detailStatus === "idle") {
      dispatch(fetchChapter(id));
    }
  }, [dispatch, id, detailStatus, router]);

  useEffect(() => {
    if (detailStatus === "error") {
      router.replace("/chapters/menu");
    }
  }, [detailStatus, router]);

  const isLoading = detailStatus === "loading" || detailStatus === "idle";
  const introTitle = chapter?.introTitle ?? "บทบรรยาย";
  const bgUrl = chapter?.backgroundImageUrl;

  return (
    <main
      className="screen chapter-explain-screen"
      aria-label="Story Diary Chapters Explain"
    >
      {bgUrl ? (
        <Image
          className="chapter-explain-bg"
          src={bgUrl}
          alt=""
          fill
          priority
          style={{ objectFit: "cover", zIndex: -1 }}
        />
      ) : (
        <div
          className="chapter-explain-bg"
          style={{ background: "var(--book-fill)" }}
        />
      )}

      <section
        className={`chapter-explain-panel${isLoading ? " loading" : ""}`}
        aria-label="บทบรรยาย"
      >
        {isLoading ? (
          <div className="chapter-spinner" role="status" aria-label="กำลังโหลด" />
        ) : (
          <h1>{introTitle}</h1>
        )}
        <div className="chapter-explain-next" aria-hidden="true" />
      </section>

      {!isLoading && chapter && (
        <Link
          href={`/chapters/${id}/explain/0`}
          className="chapter-explain-link"
          aria-label="ไปหน้ารายละเอียดบทบรรยาย"
        />
      )}
    </main>
  );
}
