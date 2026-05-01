/**
 * Chapter service — reads chapter and scene data, merges user progress.
 */
import db from "../db";
import { Errors } from "../lib/errors";
import type { Chapter, ChapterSummary, ChapterProgressState, VideoClipsCollection } from "../../../src/types/chapters";

interface ChapterRow {
  id: number;
  title: string;
  intro_title: string;
  background_image_url: string | null;
  lock_state: string;
  sort_order: number;
}

interface SceneRow {
  id: string;
  chapter_id: number;
  idx: number;
  speaker_name: string;
  speaker_image_url: string | null;
  text: string;
}

interface ProgressRow {
  progress: string;
}

function getProgress(userId: string, chapterId: number): ChapterProgressState {
  const row = db
    .prepare("SELECT progress FROM user_chapter_progress WHERE user_id = ? AND chapter_id = ?")
    .get(userId, chapterId) as ProgressRow | undefined;
  return (row?.progress as ChapterProgressState) ?? "not-started";
}

export function listChapters(userId: string): ChapterSummary[] {
  const rows = db
    .prepare("SELECT * FROM chapters ORDER BY sort_order ASC")
    .all() as ChapterRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    lockState: row.lock_state as "unlocked" | "locked",
    progress: getProgress(userId, row.id),
  }));
}

export function getChapter(userId: string, chapterId: number): Chapter {
  const row = db
    .prepare("SELECT * FROM chapters WHERE id = ?")
    .get(chapterId) as ChapterRow | undefined;

  if (!row) {
    throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);
  }

  const scenes = db
    .prepare("SELECT * FROM chapter_scenes WHERE chapter_id = ? ORDER BY idx ASC")
    .all(chapterId) as SceneRow[];

  return {
    id: row.id,
    title: row.title,
    introTitle: row.intro_title,
    ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
    lockState: row.lock_state as "unlocked" | "locked",
    progress: getProgress(userId, row.id),
    scenes: scenes.map((s) => ({
      id: s.id,
      index: s.idx,
      speakerName: s.speaker_name,
      ...(s.speaker_image_url ? { speakerImageUrl: s.speaker_image_url } : {}),
      text: s.text,
    })),
  };
}

export function setChapterProgress(
  userId: string,
  chapterId: number,
  progress: ChapterProgressState
): void {
  // Verify chapter exists
  const row = db.prepare("SELECT id FROM chapters WHERE id = ?").get(chapterId);
  if (!row) {
    throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);
  }

  db.prepare(`
    INSERT INTO user_chapter_progress (user_id, chapter_id, progress)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, chapter_id) DO UPDATE SET progress = excluded.progress
  `).run(userId, chapterId, progress);
}

// Static video clips collection (no DB backing in v1)
export function getVideoClips(): VideoClipsCollection {
  return {
    badge: "ดาวแห่งการเรียนรู้",
    clips: [
      {
        id: "clip-1",
        caption: "คลิป 1",
        thumbnailUrl: undefined,
        sourceUrl: undefined,
        durationSec: undefined,
      },
      {
        id: "clip-2",
        caption: "คลิป 2",
        thumbnailUrl: undefined,
        sourceUrl: undefined,
        durationSec: undefined,
      },
    ],
  };
}
