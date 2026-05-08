import {
    findChapterById,
    getChapterProgressDoc,
    listChapterScenesByChapterId,
    listChaptersDocs,
    upsertChapterProgress,
} from "../db";
import { Errors } from "../lib/errors";
import type { Chapter, ChapterSummary, ChapterProgressState, VideoClipsCollection } from "../../../src/types/chapters";

async function getProgress(userId: string, chapterId: number): Promise<ChapterProgressState> {
    const row = await getChapterProgressDoc(userId, chapterId);
    return row?.progress ?? "not-started";
}

export async function listChapters(userId: string): Promise<ChapterSummary[]> {
    const rows = await listChaptersDocs();

    return Promise.all(rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        lockState: row.lock_state,
        progress: await getProgress(userId, row.id),
    })));
}

export async function getChapter(userId: string, chapterId: number): Promise<Chapter> {
    const row = await findChapterById(chapterId);

    if (!row) {
        throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);
    }

    const scenes = await listChapterScenesByChapterId(chapterId);

    return {
        id: row.id,
        title: row.title,
        introTitle: row.intro_title,
        ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
        lockState: row.lock_state,
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

const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=Ktxam4bHrTo";

export function getVideoClips(): VideoClipsCollection {
    return {
        badge: "ดาวแห่งการเรียนรู้",
        clips: [1, 2, 3, 4, 5].map((n) => ({
            id: `clip-${n}`,
            caption: `คลิป ${n}`,
            sourceUrl: TEST_VIDEO_URL,
        })),
    };
}
