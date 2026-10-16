"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { useParams } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetVideoClipsQuery } from "@/store/videoClipsApi";
import PageSpinner from "@/components/PageSpinner";
import type { VideoClip } from "@/types/chapters";
import { directVideoFileUrl, toEmbedUrl } from "@/lib/videoEmbed";
import { toggleVideoFullscreen } from "@/lib/videoFullscreen";
import styles from "../VideoClipPlayer.module.css";

const EMPTY_CLIPS: VideoClip[] = [];

function resolveClipByParam(
  clips: VideoClip[],
  clipParam: string,
): VideoClip | null {
  const byId = clips.find((item) => item.id === clipParam);
  if (byId) return byId;

  const asNumber = Number(clipParam);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    const byNumber = clips[asNumber - 1];
    if (byNumber) return byNumber;
  }

  const normalized = clipParam.replace(/^clip-/, "");
  const normalizedNumber = Number(normalized);
  if (!Number.isNaN(normalizedNumber) && normalizedNumber > 0) {
    const byNormalized = clips[normalizedNumber - 1];
    if (byNormalized) return byNormalized;
  }

  return null;
}

export default function VideoClipPlayerPage() {
  const { data: collection, isLoading } = useGetVideoClipsQuery();
  const params = useParams<{ clip: string }>();
  const clipParam = params?.clip ?? "";

  const clips = collection?.clips ?? EMPTY_CLIPS;
  const activeClip = useMemo(
    () => resolveClipByParam(clips, clipParam),
    [clips, clipParam],
  );
  const embedUrl = useMemo(
    () => toEmbedUrl(activeClip?.sourceUrl),
    [activeClip?.sourceUrl],
  );
  // Uploaded videos (public Blob store) and any other direct video file play
  // in a native <video> element instead of an embed iframe.
  const videoFileUrl = useMemo(
    () => directVideoFileUrl(activeClip?.sourceUrl),
    [activeClip?.sourceUrl],
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={<div />}
      right={<div />}
      mergedOnly
      merged={
        <div className={styles.clipPlayerPage}>
          <div className={styles.clipPlayerPageHeader}>
            <Link
              href="/video-clips"
              className={styles.clipPlayerBack}
              aria-label="กลับหน้าวิดีโอคลิป"
            >
              กลับ
            </Link>
            <h1 className={styles.clipPlayerTitle}>
              {activeClip?.caption ?? "ไม่พบคลิป"}
            </h1>
          </div>

          <div className={styles.clipPlayerFrameWrap}>
            {isLoading ? (
              <PageSpinner label="กำลังโหลดวิดีโอ…" />
            ) : videoFileUrl ? (
              <video
                ref={videoRef}
                className={styles.clipPlayerFrame}
                src={videoFileUrl}
                title={activeClip?.caption ?? "วิดีโอคลิป"}
                controls
                autoPlay
                playsInline
              />
            ) : embedUrl ? (
              <iframe
                className={styles.clipPlayerFrame}
                src={embedUrl}
                title={activeClip?.caption ?? "วิดีโอคลิป"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className={styles.clipPlayerFallback}>
                ไม่พบวิดีโอจากพารามิเตอร์นี้
              </div>
            )}
          </div>

          {/* iPhone Safari hides the native controls' expand button on
              playsinline videos, so fullscreen gets its own button — kept in
              normal flow below the player so no overlay positioning can push
              it off-screen on mobile. */}
          {videoFileUrl && (
            <div className={styles.clipPlayerActions}>
              <button
                type="button"
                className={styles.clipPlayerExpand}
                aria-label="ขยายวิดีโอเต็มจอ"
                onClick={() => {
                  if (videoRef.current) void toggleVideoFullscreen(videoRef.current);
                }}
              >
                <Maximize2 size={16} aria-hidden="true" /> ขยายเต็มจอ
              </button>
            </div>
          )}

          <div className={styles.clipPlayerCaption}>
            {activeClip
              ? `กำลังเล่น: ${activeClip.caption}`
              : "กรุณาตรวจสอบลิงก์คลิป"}
          </div>
        </div>
      }
    />
  );
}
