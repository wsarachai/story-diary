"use client";

import Link from "next/link";
import { useState } from "react";
import { Play } from "lucide-react";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetVideoClipsQuery } from "@/store/videoClipsApi";
import PageSpinner from "@/components/PageSpinner";
import type { VideoClip } from "@/types/chapters";
import { clipThumbnailUrl } from "@/lib/videoEmbed";
import styles from "./VideoClips.module.css";

function PlayButton({ clip }: { clip: VideoClip }) {
  return (
    <Link
      href={`/video-clips/${clip.id}`}
      className={styles.clipPlayButton}
      aria-label={`เล่นวิดีโอ ${clip.caption}`}
      title={`เล่นวิดีโอ ${clip.caption}`}
    >
      <Play aria-hidden="true" />
    </Link>
  );
}

/** Clip still (explicit image or YouTube's), hidden if it fails to load. */
function ClipThumbnailImage({ clip }: { clip: VideoClip }) {
  const src = clipThumbnailUrl(clip.thumbnailUrl, clip.sourceUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;
  return (
    // External hosts (i.ytimg.com or admin-supplied) — not routed through next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.clipThumbnailImg}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}

export default function VideoClipsPage() {
  const { data: collection, isLoading } = useGetVideoClipsQuery();

  const clips = collection?.clips ?? [];
  const mid = Math.ceil(clips.length / 2);
  const leftClips = clips.slice(0, mid);
  const rightClips = clips.slice(mid);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className={styles.videoClipsPage}>
          <Link
            href="/chapters"
            className={styles.clipSectionLabelBadge}
            aria-label="ดาวแห่งการเรียนรู้ — กลับหน้าบท"
          >
            {collection?.badge ?? "ดาวแห่งการเรียนรู้"}
          </Link>

          {isLoading ? (
            <PageSpinner variant="inline" height="14rem" label="กำลังโหลดวิดีโอ…" />
          ) : (
          <div className={styles.clipsGridContainer}>
            {leftClips.map((clip) => (
              <div key={clip.id} className={styles.clipsGridItem}>
                <div className={styles.clipThumbnail} aria-label={`วิดีโอคลิป ${clip.caption}`}>
                  <ClipThumbnailImage clip={clip} />
                  <PlayButton clip={clip} />
                </div>
                <div className={styles.clipCaption} aria-label={clip.caption}>
                  {clip.caption}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      }
      right={
        <div className={styles.videoClipsPage}>
          <div className={styles.clipSectionLabelSpacer} aria-hidden="true" />

          {isLoading ? (
            <PageSpinner variant="inline" height="14rem" label="กำลังโหลดวิดีโอ…" />
          ) : (
          <div className={styles.clipsGridContainer}>
            {rightClips.map((clip) => (
              <div key={clip.id} className={styles.clipsGridItem}>
                <div className={styles.clipThumbnail} aria-label={`วิดีโอคลิป ${clip.caption}`}>
                  <ClipThumbnailImage clip={clip} />
                  <PlayButton clip={clip} />
                </div>
                <div className={styles.clipCaption} aria-label={clip.caption}>
                  {clip.caption}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      }
    />
  );
}
