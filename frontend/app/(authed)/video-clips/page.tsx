"use client";

import { useEffect } from "react";
import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchCollection,
  selectVideoClipsCollection,
  selectVideoClipsStatus,
} from "@/store/videoClipsSlice";
import type { VideoClip } from "@/types/chapters";

function PlayButton({ clip }: { clip: VideoClip }) {
  return (
    <button
      className="clip-play-button"
      aria-disabled="true"
      aria-label={`เล่นวิดีโอ ${clip.caption} — เร็ว ๆ นี้`}
      title="เร็ว ๆ นี้"
      onClick={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  );
}

export default function VideoClipsPage() {
  const dispatch = useAppDispatch();
  const collection = useAppSelector(selectVideoClipsCollection);
  const status = useAppSelector(selectVideoClipsStatus);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchCollection());
    }
  }, [dispatch, status]);

  const clips = collection?.clips ?? [];
  const clip1 = clips[0];
  const clip2 = clips[1];

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className="video-clips-page">
          <Link
            href="/chapters"
            className="clip-section-label-badge"
            aria-label="ดาวแห่งการเรียนรู้ — กลับหน้าบท"
          >
            {collection?.badge ?? "ดาวแห่งการเรียนรู้"}
          </Link>

          <div className="clip-thumbnail" aria-label="วิดีโอคลิป 1">
            {clip1 && <PlayButton clip={clip1} />}
          </div>

          <div className="clip-caption" aria-label="คลิป 1">
            {clip1?.caption ?? "คลิป 1"}
          </div>
        </div>
      }
      right={
        <div className="video-clips-page-right">
          <div className="clip-caption" aria-label="คลิป 2">
            {clip2?.caption ?? "คลิป 2"}
          </div>

          <div
            className="clip-thumbnail"
            aria-label="วิดีโอคลิป 2"
            style={{ position: "relative" }}
          >
            {clip2 && <PlayButton clip={clip2} />}

            <div className="sparkle-group" aria-hidden="true">
              <svg
                className="sparkle sparkle-md"
                style={{ alignSelf: "end", justifySelf: "end" }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
              </svg>
              <svg
                className="sparkle sparkle-sm"
                style={{ alignSelf: "start" }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
              </svg>
              <svg
                className="sparkle sparkle-lg"
                style={{ alignSelf: "end", justifySelf: "end" }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
              </svg>
              <svg className="sparkle sparkle-md" viewBox="0 0 24 24">
                <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
              </svg>
            </div>
          </div>
        </div>
      }
    />
  );
}
