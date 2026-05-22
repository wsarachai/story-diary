"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { useGetVideoClipsQuery } from "@/store/videoClipsApi";
import type { VideoClip } from "@/types/chapters";

function toEmbedUrl(sourceUrl?: string): string {
    if (!sourceUrl) return "";

    try {
        const parsed = new URL(sourceUrl);
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
    } catch {
        return "";
    }
}

function resolveClipByParam(clips: VideoClip[], clipParam: string): VideoClip | null {
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
    const { data: collection } = useGetVideoClipsQuery();
    const params = useParams<{ clip: string }>();
    const clipParam = params?.clip ?? "";

    const clips = collection?.clips ?? [];
    const activeClip = useMemo(() => resolveClipByParam(clips, clipParam), [clips, clipParam]);
    const embedUrl = useMemo(() => toEmbedUrl(activeClip?.sourceUrl), [activeClip?.sourceUrl]);

    return (
        <BookShellLayout
            tight
            rail={<IconRail />}
            left={<div />}
            right={<div />}
            mergedOnly
            merged={
                <div className="clip-player-page">
                    <div className="clip-player-page-header">
                        <Link href="/video-clips" className="clip-player-back" aria-label="กลับหน้าวิดีโอคลิป">
                            กลับ
                        </Link>
                        <h1 className="clip-player-title">{activeClip?.caption ?? "ไม่พบคลิป"}</h1>
                    </div>

                    <div className="clip-player-frame-wrap">
                        {embedUrl ? (
                            <iframe
                                className="clip-player-frame"
                                src={embedUrl}
                                title={activeClip?.caption ?? "วิดีโอคลิป"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                            />
                        ) : (
                            <div className="clip-player-fallback">ไม่พบวิดีโอจากพารามิเตอร์นี้</div>
                        )}
                    </div>

                    <div className="clip-player-caption">
                        {activeClip ? `กำลังเล่น: ${activeClip.caption}` : "กรุณาตรวจสอบลิงก์คลิป"}
                    </div>
                </div>
            }
        />
    );
}
