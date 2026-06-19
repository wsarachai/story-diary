"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ScrollText, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useGetChapterQuery, useUpdateChapterProgressMutation } from "@/store/chaptersApi";
import { useGetMeQuery } from "@/store/authApi";
import PageSpinner from "@/components/PageSpinner";
import styles from "../../../chapters.module.css";
import layoutStyles from "@/components/BookShellLayout.module.css";

/** Milliseconds between each revealed character — tuned to natural speech pace. */
const TYPEWRITER_SPEED_MS = 60;

function SpeakerPlaceholder() {
  return (
    <svg
      className={styles.speakerFigure}
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

/**
 * Self-contained typewriter for a single scene.
 * Remounted via `key={sceneIndex}` so state resets automatically on scene change.
 */
function TypewriterScene({
  fullText,
  onTypingDone,
}: {
  fullText: string;
  onTypingDone: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingDone = visibleCount >= fullText.length;

  useEffect(() => {
    if (isTypingDone) {
      onTypingDone();
      return;
    }
    timerRef.current = setTimeout(() => {
      setVisibleCount((n) => Math.min(n + 1, fullText.length));
    }, TYPEWRITER_SPEED_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // onTypingDone is stable (defined inline at callsite) — exclude to avoid re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, isTypingDone, fullText]);

  const visible = fullText.slice(0, visibleCount);
  const hidden = fullText.slice(visibleCount);
  const visibleLines = visible.split("\n");
  const hiddenLines = hidden.split("\n");

  return (
    <>
      {visibleLines.map((line, i) => (
        <span key={`v${i}`}>
          {line}
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

  const { data: chapter, status: detailStatus } = useGetChapterQuery(id, { skip: isNaN(id) });
  const { data: currentUser } = useGetMeQuery();
  const [updateProgress] = useUpdateChapterProgressMutation();

  // Track which scene index typing has been completed for, so the "done" state
  // automatically resets when sceneIndex changes (no setState-in-effect needed).
  const [typingDoneForScene, setTypingDoneForScene] = useState<number | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const typingDone = typingDoneForScene === sceneIndex;
  const fullText = chapter?.scenes[sceneIndex]?.text ?? "";

  useEffect(() => {
    if (isNaN(id) || isNaN(sceneIndex)) {
      router.replace("/chapters/menu");
      return;
    }
  }, [id, sceneIndex, router]);

  useEffect(() => {
    if (detailStatus === "rejected") {
      router.replace("/chapters/menu");
      return;
    }
    if (detailStatus === "fulfilled" && chapter) {
      if (sceneIndex < 0 || sceneIndex >= chapter.scenes.length) {
        router.replace("/chapters/menu");
      }
    }
  }, [detailStatus, chapter, sceneIndex, router]);

  const handleAdvance = () => {
    if (!chapter) return;
    if (!typingDone) {
      // Clicking before typing finishes marks this scene as done
      setTypingDoneForScene(sceneIndex);
      return;
    }
    if (sceneIndex < chapter.scenes.length - 1) {
      router.push(`/chapters/${id}/explain/${sceneIndex + 1}`);
    } else {
      updateProgress({ id, progress: "completed" });
      router.push("/chapters/menu");
    }
  };

  if (detailStatus === "pending" || detailStatus === "uninitialized") {
    return (
      <main className={`${layoutStyles.screen} ${styles.chapterDetailsScreen}`} aria-label="กำลังโหลดบท">
        <PageSpinner label="กำลังโหลดบท…" />
      </main>
    );
  }

  if (!chapter || isNaN(sceneIndex)) return null;

  const scene = chapter.scenes[sceneIndex];
  if (!scene) return null;

  const bgUrl = chapter.backgroundImageUrl;

  return (
    <main
      className={`${layoutStyles.screen} ${styles.chapterDetailsScreen}`}
      aria-label="Story Diary Chapters Explain Details"
    >
      <Link
        href="/chapters/menu"
        className={styles.chapterSceneExit}
        aria-label="กลับไปหน้าเลือกบท"
      >
        <span className={styles.chapterSceneExitIcon} aria-hidden="true">
          <ChevronLeft />
        </span>
        <span className={styles.chapterSceneExitLabel}>กลับ</span>
      </Link>

      <button
        className={styles.transcriptButton}
        onClick={() => setShowTranscript(true)}
        aria-label="ดูบทสนทนาทั้งหมด"
      >
        <span className={styles.chapterSceneExitLabel}>บทสนทนา</span>
        <span className={styles.chapterSceneExitIcon} aria-hidden="true">
          <ScrollText />
        </span>
      </button>

      {bgUrl ? (
        <Image
          className={styles.chapterDetailsBg}
          src={bgUrl}
          alt=""
          fill
          priority
          style={{ objectFit: "cover", zIndex: -2 }}
        />
      ) : (
        <div
          className={`${styles.chapterDetailsBg} ${styles.fallbackBg}`}
          style={{ zIndex: -2 }}
        />
      )}

      {scene.speakerImageUrl ? (
        <Image
          className={styles.speakerFigure}
          src={scene.speakerImageUrl}
          alt="ตัวละครผู้พูด"
          width={540}
          height={760}
          style={{ position: "absolute", right: "22%", top: "7%", width: "30%", maxWidth: "540px", height: "auto", zIndex: 1 }}
        />
      ) : (
        <SpeakerPlaceholder />
      )}

      {showTranscript && (
        <div
          className={styles.transcriptOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="บทสนทนาทั้งหมด"
        >
          <div className={styles.transcriptPanel}>
            <div className={styles.transcriptHeader}>
              <h2 className={styles.transcriptTitle}>บทสนทนาทั้งหมด</h2>
              <button
                className={styles.transcriptClose}
                onClick={() => setShowTranscript(false)}
                aria-label="ปิด"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.transcriptList}>
              {chapter.scenes.map((s, i) => {
                const isUser = s.speakerName === "ชื่อตัวละคร";
                const displayName = isUser
                  ? (currentUser?.characterName ?? s.speakerName)
                  : s.speakerName;
                return (
                  <div
                    key={i}
                    className={[
                      styles.transcriptBubbleWrap,
                      isUser ? styles.transcriptRight : styles.transcriptLeft,
                    ].join(" ")}
                  >
                    <span className={styles.transcriptSpeakerName}>{displayName}</span>
                    <div className={styles.transcriptBubble}>
                      {s.text.split("\n").map((line, j, arr) => (
                        <span key={j}>
                          {line}
                          {j < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <section className={styles.dialogPanel} aria-label="บทสนทนา">
        <h1 className={styles.speakerName}>
          {scene.speakerName === "ชื่อตัวละคร"
            ? (currentUser?.characterName ?? scene.speakerName)
            : scene.speakerName}
        </h1>
        <p className={styles.dialogText}>
          {typingDone ? (
            // Typing skipped — render full text directly
            fullText.split("\n").map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))
          ) : (
            <TypewriterScene
              key={`${id}-${sceneIndex}`}
              fullText={fullText}
              onTypingDone={() => setTypingDoneForScene(sceneIndex)}
            />
          )}
        </p>
        <div className={styles.dialogNext} aria-hidden="true" />
        <button
          className={styles.dialogNextLink}
          onClick={handleAdvance}
          aria-label={
            !typingDone
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
