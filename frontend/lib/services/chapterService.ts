import {
    findChapterById,
    getChapterProgressDoc,
    listChapterProgressByUser,
    listChapterScenesByChapterId,
    listChaptersDocs,
    upsertChapterProgress,
    listEBooksDocs,
    listVideoClipsDocs,
} from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { Chapter, ChapterSummary, ChapterProgressState, VideoClipsCollection } from "@/types/chapters";

async function getProgress(userId: string, chapterId: number): Promise<ChapterProgressState> {
    const row = await getChapterProgressDoc(userId, chapterId);
    return row?.progress ?? "not-started";
}

/**
 * Lock derivation, position-based: chapter N is unlocked when the chapter
 * immediately before it (by sorted order) is completed. Matching the previous
 * chapter by `sort_order - 1` (the old approach) strands every chapter after
 * a gap — e.g. legacy rows left over from deletions.
 */
function deriveLockState(
    storedLock: Chapter["lockState"],
    prevProgress: ChapterProgressState | undefined,
): Chapter["lockState"] {
    if (prevProgress === undefined) return storedLock;
    return prevProgress === "completed" ? "unlocked" : "locked";
}

export async function listChapters(userId: string): Promise<ChapterSummary[]> {
    const [chapterRows, progressRows] = await Promise.all([
        listChaptersDocs(),
        listChapterProgressByUser(userId),
    ]);
    const rows = chapterRows.slice().sort((a, b) => a.sort_order - b.sort_order);
    const storedProgress = new Map(progressRows.map((p) => [p.chapter_id, p.progress]));
    const progressById = new Map<number, ChapterProgressState>(
        rows.map((row) => [row.id, storedProgress.get(row.id) ?? "not-started"])
    );

    return rows.map((row, index) => ({
        id: row.id,
        title: row.title,
        lockState: deriveLockState(row.lock_state, progressById.get(rows[index - 1]?.id ?? -1)),
        progress: progressById.get(row.id) ?? "not-started",
    }));
}

export async function getChapter(userId: string, chapterId: number): Promise<Chapter> {
    const row = await findChapterById(chapterId);

    if (!row) {
        throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);
    }

    const [scenes, chapterRows, progress] = await Promise.all([
        listChapterScenesByChapterId(chapterId),
        listChaptersDocs(),
        getProgress(userId, row.id),
    ]);

    let lockState = row.lock_state;
    const rows = chapterRows.slice().sort((a, b) => a.sort_order - b.sort_order);
    const index = rows.findIndex((r) => r.id === row.id);
    if (index > 0) {
        const prevProgress = await getProgress(userId, rows[index - 1].id);
        lockState = deriveLockState(row.lock_state, prevProgress);
    }

    return {
        id: row.id,
        title: row.title,
        introTitle: row.intro_title,
        ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
        lockState,
        progress,
        scenes: scenes.map((scene) => ({
            id: scene.id,
            index: scene.idx,
            type: scene.type ?? "actor",
            ...((scene.type ?? "actor") === "actor"
                ? { actorKind: scene.actor_kind ?? "other" }
                : {}),
            speakerName: scene.speaker_name,
            ...(scene.speaker_image_url ? { speakerImageUrl: scene.speaker_image_url } : {}),
            ...(scene.background_image_url ? { backgroundImageUrl: scene.background_image_url } : {}),
            text: scene.text,
        })),
    };
}

export async function setChapterProgress(
    userId: string,
    chapterId: number,
    progress: ChapterProgressState
): Promise<void> {
    const row = await findChapterById(chapterId);
    if (!row) {
        throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);
    }

    await upsertChapterProgress(userId, chapterId, progress);
}

export async function getVideoClips(): Promise<VideoClipsCollection> {
    const rows = await listVideoClipsDocs();
    return {
        badge: "ดาวแห่งการเรียนรู้",
        clips: rows.map((row) => ({
            id: row.id,
            caption: row.caption,
            sourceUrl: row.source_url,
            ...(row.thumbnail_url ? { thumbnailUrl: row.thumbnail_url } : {}),
        })),
    };
}

export async function getEBooks() {
    const rows = await listEBooksDocs();
    return {
        badge: "E-book",
        chapters: rows.map((row) => ({
            id: row.id,
            title: row.title,
            pdfUrl: row.pdf_url,
        })),
    };
}
