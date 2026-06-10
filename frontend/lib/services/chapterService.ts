import {
    findChapterById,
    getChapterProgressDoc,
    listChapterScenesByChapterId,
    listChaptersDocs,
    upsertChapterProgress,
    unlockNextChapterBySortOrder,
    listEBooksDocs,
    listVideoClipsDocs,
} from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { Chapter, ChapterSummary, ChapterProgressState, VideoClipsCollection } from "@/types/chapters";

async function getProgress(userId: string, chapterId: number): Promise<ChapterProgressState> {
    const row = await getChapterProgressDoc(userId, chapterId);
    return row?.progress ?? "not-started";
}

export async function listChapters(userId: string): Promise<ChapterSummary[]> {
    const rows = await listChaptersDocs();

    return Promise.all(rows.map(async (row) => {
        let lockState = row.lock_state;
        if (row.sort_order > 1) {
            const prevRow = rows.find(r => r.sort_order === row.sort_order - 1);
            if (prevRow) {
                const prevProgress = await getProgress(userId, prevRow.id);
                if (prevProgress === "completed") {
                    lockState = "unlocked";
                } else {
                    lockState = "locked";
                }
            }
        }
        return {
            id: row.id,
            title: row.title,
            lockState,
            progress: await getProgress(userId, row.id),
        };
    }));
}

export async function getChapter(userId: string, chapterId: number): Promise<Chapter> {
    const row = await findChapterById(chapterId);

    if (!row) {
        throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);
    }

    const scenes = await listChapterScenesByChapterId(chapterId);

    let lockState = row.lock_state;
    if (row.sort_order > 1) {
        const rows = await listChaptersDocs();
        const prevRow = rows.find(r => r.sort_order === row.sort_order - 1);
        if (prevRow) {
            const prevProgress = await getProgress(userId, prevRow.id);
            if (prevProgress === "completed") {
                lockState = "unlocked";
            } else {
                lockState = "locked";
            }
        }
    }

    return {
        id: row.id,
        title: row.title,
        introTitle: row.intro_title,
        ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
        lockState,
        progress: await getProgress(userId, row.id),
        scenes: scenes.map((scene) => ({
            id: scene.id,
            index: scene.idx,
            speakerName: scene.speaker_name,
            ...(scene.speaker_image_url ? { speakerImageUrl: scene.speaker_image_url } : {}),
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
