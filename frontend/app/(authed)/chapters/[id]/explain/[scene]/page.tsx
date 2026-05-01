"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchChapter,
  markCompleted,
  selectChapter,
  selectChapterDetailStatus,
} from "@/store/chaptersSlice";

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
  const dialogLines = scene.text.split("\n");

  return (
    <main
      className="screen chapter-details-screen"
      aria-label="Story Diary Chapters Explain Details"
    >
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
          {dialogLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < dialogLines.length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="dialog-next" aria-hidden="true" />
        <button
          className="dialog-next-link"
          onClick={handleAdvance}
          aria-label={
            sceneIndex < chapter.scenes.length - 1
              ? "ไปฉากถัดไป"
              : "กลับไปหน้าเลือกบท"
          }
        />
      </section>
    </main>
  );
}
