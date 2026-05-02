"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchChapter,
  markCompleted,
  selectChapter,
  selectChapterDetailStatus,
} from "@/store/chaptersSlice";

/** Milliseconds between each revealed character — tuned to natural speech pace. */
const TYPEWRITER_SPEED_MS = 60;

function SpeakerPlaceholder() {
  return (
    <svg
      className="speaker-figure"
      viewBox="0 0 200 400"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="80" rx="55" ry="60" fill="rgba(0,0,0,0.12)" />
      <rect x="45" y="140" width="110" height="180" rx="20" fill="rgba(0,0,0,0.1)" />
    </svg>
  );
}

/** Renders text with a typewriter effect, revealing `visibleCount` characters. */
function TypewriterText({
  fullText,
  visibleCount,
}: {
  fullText: string;
  visibleCount: number;
}) {
  const visible = fullText.slice(0, visibleCount);
  const hidden = fullText.slice(visibleCount);
  const visibleLines = visible.split("\n");
  const hiddenLines = hidden.split("\n");

  return (
    <>
      {visibleLines.map((line, i) => (
        <span key={`v${i}`}>
          {line}
          {/* join visible last line with hidden first line on the same visual line */}
          {i === visibleLines.length - 1 ? (
            <span style={{ visibility: "hidden" }}>{hiddenLines[0]}</span>
          ) : (
            <br />
          )}
        </span>
      ))}
      {hiddenLines.slice(1).map((line, i) => (
        <span key={`h${i}`} style={{ visibility: "hidden" }}>
          {line}
          {i < hiddenLines.length - 2 && <br />}
        </span>
      ))}
    </>
  );
}

export default function ChapterScenePage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const rawScene = params?.scene;
  const id = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;
  const sceneIndex = typeof rawScene === "string" ? parseInt(rawScene, 10) : NaN;

  const dispatch = useAppDispatch();
  const chapter = useAppSelector((s) => selectChapter(s, id));
  const detailStatus = useAppSelector((s) => selectChapterDetailStatus(s, id));

  // Typewriter state: how many characters of the current scene text are visible
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullText = chapter?.scenes[sceneIndex]?.text ?? "";
  const isTypingDone = visibleCount >= fullText.length;

  // Reset typewriter whenever the scene changes
  useEffect(() => {
    setVisibleCount(0);
  }, [sceneIndex, fullText]);

  // Drive the typewriter tick
  useEffect(() => {
    if (isTypingDone) return;

    timerRef.current = setTimeout(() => {
      setVisibleCount((n) => Math.min(n + 1, fullText.length));
    }, TYPEWRITER_SPEED_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visibleCount, isTypingDone, fullText]);

  useEffect(() => {
    if (isNaN(id) || isNaN(sceneIndex)) {
      router.replace("/chapters/menu");
      return;
    }
    if (detailStatus === "idle") {
      dispatch(fetchChapter(id));
    }
  }, [dispatch, id, sceneIndex, detailStatus, router]);

  useEffect(() => {
    if (detailStatus === "error") {
      router.replace("/chapters/menu");
      return;
    }
    if (detailStatus === "ready" && chapter) {
      if (sceneIndex < 0 || sceneIndex >= chapter.scenes.length) {
        router.replace("/chapters/menu");
      }
    }
  }, [detailStatus, chapter, sceneIndex, router]);

  const handleAdvance = () => {
    if (!chapter) return;
    // First tap: skip animation to show full text
    if (!isTypingDone) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisibleCount(fullText.length);
      return;
    }
    // Second tap: advance to next scene or finish chapter
    if (sceneIndex < chapter.scenes.length - 1) {
      router.push(`/chapters/${id}/explain/${sceneIndex + 1}`);
    } else {
      dispatch(markCompleted(id));
      router.push("/chapters/menu");
    }
  };

  if (!chapter || isNaN(sceneIndex)) return null;

  const scene = chapter.scenes[sceneIndex];
  if (!scene) return null;

  const bgUrl = chapter.backgroundImageUrl;

  return (
    <main
      className="screen chapter-details-screen"
      aria-label="Story Diary Chapters Explain Details"
    >
      <Link
        href="/chapters/menu"
        className="chapter-scene-exit"
        aria-label="กลับไปหน้าเลือกบท"
      >
        <span className="chapter-scene-exit-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.5 5L7.5 12L14.5 19" />
          </svg>
        </span>
        <span className="chapter-scene-exit-label">กลับ</span>
      </Link>

      {bgUrl ? (
        <Image
          className="chapter-details-bg"
          src={bgUrl}
          alt=""
          fill
          priority
          style={{ objectFit: "cover", zIndex: -2 }}
        />
      ) : (
        <div
          className="chapter-details-bg"
          style={{ background: "var(--book-fill)", zIndex: -2 }}
        />
      )}

      {scene.speakerImageUrl ? (
        <Image
          className="speaker-figure"
          src={scene.speakerImageUrl}
          alt="ตัวละครผู้พูด"
          width={540}
          height={760}
          style={{ position: "absolute", right: "22%", top: "7%", width: "30%", maxWidth: "540px", height: "auto", zIndex: 1 }}
        />
      ) : (
        <SpeakerPlaceholder />
      )}

      <section className="dialog-panel" aria-label="บทสนทนา">
        <h1 className="speaker-name">{scene.speakerName}</h1>
        <p className="dialog-text">
          <TypewriterText fullText={scene.text} visibleCount={visibleCount} />
        </p>
        <div className="dialog-next" aria-hidden="true" />
        <button
          className="dialog-next-link"
          onClick={handleAdvance}
          aria-label={
            !isTypingDone
              ? "แสดงข้อความทั้งหมด"
              : sceneIndex < chapter.scenes.length - 1
                ? "ไปฉากถัดไป"
                : "กลับไปหน้าเลือกบท"
          }
        />
      </section>
    </main>
  );
}
