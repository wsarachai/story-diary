/**
 * Chapters / Story domain contracts for Story Diary.
 *
 * Source wireframes:
 *   - docz/wireframes/s005-chapters.html              (hub: เนื้อเรื่อง diamond + 2 cards)
 *   - docz/wireframes/s008-chapters-menu.html         (5-chapter list with pin pills)
 *   - docz/wireframes/s009-chapters-explain.html      (full-bleed scene, "บทบรรยาย" panel)
 *   - docz/wireframes/s010-chapters-explain-details.html (dialog panel + character speaker)
 *   - docz/wireframes/s011-video-clips.html           (2 video-clip thumbnails)
 *
 * Cross-agent contract: shared by frontend, backend (when story content lives
 * in a CMS / DB), and tests. Keep framework-agnostic.
 */

/**
 * Chapter identifier. Maps to the "บทที่ N" pin in s008.
 * Wireframes show 5 chapters (1-5) but the type is open for expansion.
 */
export type ChapterId = number;

/**
 * Lock state of a chapter as shown by the lock icon in s008.
 *
 *   "unlocked" — fully accessible (s008 chapter 1: no lock icon)
 *   "locked"   — gated; the wireframe still renders the pin-pill but with a
 *                lock-key.svg overlay. Tapping it should NOT navigate; UI
 *                should show a tooltip / inline copy explaining the gate.
 *
 * The wireframe currently has chapters 2-5 all locked, suggesting the gate is
 * "unlock chapter N when chapter N-1 is completed". The exact gating rule is
 * an API concern; the type just reflects the binary outcome.
 */
export type ChapterLockState = "unlocked" | "locked";

/**
 * Read/play progress for a chapter scene flow.
 */
export type ChapterProgressState = "not-started" | "in-progress" | "completed";

/**
 * Lightweight summary used by the s008 chapter list.
 */
export interface ChapterSummary {
    id: ChapterId;
    /** Display title; the wireframe uses "บทที่ {id}" but the API may carry richer copy. */
    title: string;
    lockState: ChapterLockState;
    progress: ChapterProgressState;
}

/**
 * One scene/dialogue step within a chapter, as rendered by s010.
 *
 * The wireframe shows a single placeholder dialogue with the character's name
 * in a label badge ("ชื่อตัวละคร") and the body text ("บทสนทนา"). A real
 * chapter is a sequence of these scenes; tapping the bottom-right next arrow
 * advances to the next scene or back to the chapter menu (s008) when done.
 *
 * Active Story Diary fixtures should seed roughly 5-6 scenes per chapter so
 * the reader flow can exercise repeated scene advancement.
 */
export interface ChapterScene {
    /** Stable id within a chapter; may be a numeric index. */
    id: string;
    /** 0-based position within the chapter's scene array. */
    index: number;
    /** Speaker display name shown in the orange .speaker-name pill. */
    speakerName: string;
    /** Optional asset URL for the speaker figure (s010 .speaker-figure). */
    speakerImageUrl?: string;
    /** Body copy shown in the dialog panel. May contain `\n` for line breaks. */
    text: string;
}

/**
 * Full chapter, used by s009 (intro) and s010 (scene-by-scene playback).
 */
export interface Chapter {
    id: ChapterId;
    title: string;
    /** Intro panel copy on s009. Defaults to "บทบรรยาย" when not provided. */
    introTitle: string;
    /** Optional bg image URL used by s009/s010 .chapter-explain-bg. */
    backgroundImageUrl?: string;
    lockState: ChapterLockState;
    progress: ChapterProgressState;
    /** Ordered scene flow; fixtures should typically provide 5-6 scenes. */
    scenes: ChapterScene[];
}

/**
 * Video clip card on s011. Two clips are rendered side-by-side under the
 * "ดาวแห่งการเรียนรู้" badge.
 */
export interface VideoClip {
    id: string;
    /** "คลิป 1", "คลิป 2", … — visible caption. */
    caption: string;
    /** Asset URL for the thumbnail; render a play icon overlay. */
    thumbnailUrl?: string;
    /** Source URL for the player; out of scope for v1 (no inline player yet). */
    sourceUrl?: string;
    /** Total duration in seconds. UI may format as mm:ss when present. */
    durationSec?: number;
}

/**
 * Banner badge above the video-clip grid on s011. Links back to s005.
 */
export interface VideoClipsCollection {
    /** Visible Thai badge — wireframe value: "ดาวแห่งการเรียนรู้". */
    badge: string;
    clips: VideoClip[];
}
