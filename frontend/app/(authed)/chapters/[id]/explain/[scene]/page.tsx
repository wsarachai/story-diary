"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ScrollText, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useGetChapterQuery, useUpdateChapterProgressMutation } from "@/store/chaptersApi";
import { useGetMeQuery } from "@/store/authApi";
import { MAIN_ACTOR_SPEAKER_NAME, mainActorImageUrl } from "@/lib/character";
import TypewriterScene from "@/components/TypewriterScene";
import SoundToggleButton from "@/components/SoundToggleButton";
import { sceneAudio } from "@/lib/audio/sceneAudio";
import { resolveSceneMusic } from "@/lib/sounds";
import PageSpinner from "@/components/PageSpinner";
import styles from "../../../chapters.module.css";
import layoutStyles from "@/components/BookShellLayout.module.css";


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

  const currentScene = chapter?.scenes[sceneIndex];
  const musicUrl = currentScene
    ? resolveSceneMusic(currentScene.backgroundMusicUrl, chapter?.backgroundMusicUrl)
    : undefined;
  const effectUrl = currentScene?.soundEffectUrl ?? null;
  const nextScene = chapter?.scenes[sceneIndex + 1];

  // Music continues across scenes that share a track (cross-fades otherwise);
  // the scene's effect plays once per visit, including when revisiting.
  useEffect(() => {
    if (musicUrl === undefined) return;
    sceneAudio.setMusic(musicUrl);
    sceneAudio.playEffect(effectUrl);
  }, [sceneIndex, musicUrl, effectUrl]);

  useEffect(() => {
    if (!nextScene) return;
    sceneAudio.preload(nextScene.soundEffectUrl);
    sceneAudio.preload(resolveSceneMusic(nextScene.backgroundMusicUrl, chapter?.backgroundMusicUrl));
  }, [nextScene, chapter?.backgroundMusicUrl]);

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

  // A scene's own background overrides the chapter background.
  const bgUrl = scene.backgroundImageUrl || chapter.backgroundImageUrl;
  const isSystemScene = scene.type === "system";
  const isMainActor = scene.type === "actor" && scene.actorKind === "main";
  const speakerImageUrl = isMainActor
    ? mainActorImageUrl(currentUser?.gender, scene.actorExpression)
    : scene.speakerImageUrl;
  const speakerDisplayName = isMainActor
    ? MAIN_ACTOR_SPEAKER_NAME
    : scene.speakerName;

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

      <div className={styles.sceneTopActions}>
        <SoundToggleButton
          className={`${styles.transcriptButton} ${styles.soundToggleButton}`}
          iconClassName={styles.chapterSceneExitIcon}
          labelClassName={styles.chapterSceneExitLabel}
        />
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
      </div>

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

      {!isSystemScene && speakerImageUrl ? (
        <Image
          className={styles.speakerFigure}
          src={speakerImageUrl}
          alt="ตัวละครผู้พูด"
          width={isMainActor ? 466 : 540}
          height={760}
        />
      ) : !isSystemScene ? (
        <SpeakerPlaceholder />
      ) : null}

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
                const isMain = s.type === "actor" && s.actorKind === "main";
                const isSystem = s.type === "system";
                const displayName = isMain ? MAIN_ACTOR_SPEAKER_NAME : s.speakerName;
                return (
                  <div
                    key={i}
                    className={[
                      styles.transcriptBubbleWrap,
                      isMain ? styles.transcriptRight : styles.transcriptLeft,
                    ].join(" ")}
                  >
                    {!isSystem && (
                      <span className={styles.transcriptSpeakerName}>{displayName}</span>
                    )}
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
        {!isSystemScene && (
          <h1 className={styles.speakerName}>{speakerDisplayName}</h1>
        )}
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
