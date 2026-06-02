"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetVideoClipsQuery } from "@/store/videoClipsApi";
import PageSpinner from "@/components/PageSpinner";
import type { VideoClip } from "@/types/chapters";
import styles from "./VideoClips.module.css";

function PlayButton({ clip }: { clip: VideoClip }) {
  return (
    <Link
      href={`/video-clips/${clip.id}`}
      className={styles.clipPlayButton}
      aria-label={`เล่นวิดีโอ ${clip.caption}`}
      title={`เล่นวิดีโอ ${clip.caption}`}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </Link>
  );
}

export default function VideoClipsPage() {
  const { data: collection, isLoading } = useGetVideoClipsQuery();

  const clips = collection?.clips ?? [];
  const leftClips = clips.filter((_, index) => (index + 1) % 2 === 1);
  const rightClips = clips.filter((_, index) => (index + 1) % 2 === 0);

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
