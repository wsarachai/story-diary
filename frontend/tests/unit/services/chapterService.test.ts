// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData, deleteChapterDoc } from "@/lib/db";
import {
  listChapters,
  getChapter,
  setChapterProgress,
  getVideoClips,
  getEBooks,
} from "@/lib/services/chapterService";
import { adminUpdateChapter, adminUpdateScene } from "@/lib/services/adminService";

const USER = "user-chapter-test";

beforeEach(() => {
  clearTestData();
});

describe("listChapters", () => {
  it("returns all 5 seeded chapters sorted by order", async () => {
    const chapters = await listChapters(USER);
    expect(chapters).toHaveLength(5);
    expect(chapters[0].id).toBe(1);
    expect(chapters[4].id).toBe(5);
  });

  it("defaults progress to not-started for a new user", async () => {
    const chapters = await listChapters(USER);
    for (const c of chapters) {
      expect(c.progress).toBe("not-started");
    }
  });

  it("reflects progress updated via setChapterProgress", async () => {
    await setChapterProgress(USER, 1, "in-progress");
    const chapters = await listChapters(USER);
    expect(chapters[0].progress).toBe("in-progress");
    expect(chapters[1].progress).toBe("not-started");
  });

  it("is isolated per user", async () => {
    await setChapterProgress(USER, 1, "completed");
    const other = await listChapters("other-user");
    expect(other[0].progress).toBe("not-started");
  });

  it("chapter 2 is unlocked in list after user completes chapter 1", async () => {
    await setChapterProgress(USER, 1, "completed");
    const chapters = await listChapters(USER);
    expect(chapters[1].lockState).toBe("unlocked");
  });

  it("unlock derivation is gap-tolerant for legacy sort_order gaps", async () => {
    // Simulate legacy data with a gap (db-level delete skips resequencing):
    // remaining sort orders are 1, 2, 4, 5. Completing the chapter before the
    // gap must still unlock the chapter after it — the old sort_order-1
    // lookup left it permanently locked.
    await deleteChapterDoc(3);
    await setChapterProgress(USER, 2, "completed");
    const chapters = await listChapters(USER);
    expect(chapters.find((c) => c.id === 4)?.lockState).toBe("unlocked");
    expect(chapters.find((c) => c.id === 5)?.lockState).toBe("locked");
  });
});

describe("getChapter", () => {
  it("returns chapter with all scenes", async () => {
    const chapter = await getChapter(USER, 1);
    expect(chapter.id).toBe(1);
    expect(chapter.scenes.length).toBeGreaterThan(0);
    expect(chapter.scenes[0].index).toBe(0);
  });

  it("scenes are sorted by index", async () => {
    const chapter = await getChapter(USER, 1);
    const indices = chapter.scenes.map((s) => s.index);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("exposes scene type and actorKind", async () => {
    const chapter = await getChapter(USER, 1);
    const main = chapter.scenes.find((s) => s.actorKind === "main");
    expect(main?.type).toBe("actor");
    expect(main?.speakerName).toBe("ผู้กล้า");
    expect(main?.speakerImageUrl).toBeUndefined();
    const system = chapter.scenes.find((s) => s.type === "system");
    expect(system?.speakerName).toBe("");
    expect(system?.speakerImageUrl).toBeUndefined();
  });

  it("exposes a scene's own background for the reader to override the chapter's", async () => {
    const before = await getChapter(USER, 1);
    const target = before.scenes[1];
    const bg = "/images/backgrounds/bg-09-forest-mist-1920x1080.webp";
    await adminUpdateScene(target.id, { type: "system", idx: target.index, speakerName: "", text: target.text, backgroundImageUrl: bg });
    const after = await getChapter(USER, 1);
    expect(after.scenes.find((s) => s.id === target.id)?.backgroundImageUrl).toBe(bg);
    expect(after.scenes.find((s) => s.id !== target.id && s.backgroundImageUrl)).toBeUndefined();
  });

  it("exposes chapter music and per-scene music/effect to the reader", async () => {
    await adminUpdateChapter(1, { backgroundMusicUrl: "/sounds/bgm/village-calm.mp3" });
    const before = await getChapter(USER, 1);
    const target = before.scenes[2];
    await adminUpdateScene(target.id, {
      type: "system",
      idx: target.index,
      speakerName: "",
      text: target.text,
      backgroundMusicUrl: "/sounds/bgm/castle-tension.mp3",
      soundEffectUrl: "/sounds/sfx/rumble.mp3",
    });
    const after = await getChapter(USER, 1);
    expect(after.backgroundMusicUrl).toBe("/sounds/bgm/village-calm.mp3");
    const scene = after.scenes.find((s) => s.id === target.id)!;
    expect(scene.backgroundMusicUrl).toBe("/sounds/bgm/castle-tension.mp3");
    expect(scene.soundEffectUrl).toBe("/sounds/sfx/rumble.mp3");
  });

  it("throws CHAPTER_NOT_FOUND for unknown chapter id", async () => {
    await expect(getChapter(USER, 999)).rejects.toMatchObject({
      code: "CHAPTER_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("reflects progress in the returned chapter", async () => {
    await setChapterProgress(USER, 2, "completed");
    const chapter = await getChapter(USER, 2);
    expect(chapter.progress).toBe("completed");
  });
});

describe("setChapterProgress", () => {
  it("persists not-started, in-progress, completed states", async () => {
    for (const state of ["not-started", "in-progress", "completed"] as const) {
      await setChapterProgress(USER, 1, state);
      const chapter = await getChapter(USER, 1);
      expect(chapter.progress).toBe(state);
    }
  });

  it("overwrites previous progress on repeated calls", async () => {
    await setChapterProgress(USER, 1, "in-progress");
    await setChapterProgress(USER, 1, "completed");
    const chapter = await getChapter(USER, 1);
    expect(chapter.progress).toBe("completed");
  });

  it("throws CHAPTER_NOT_FOUND for nonexistent chapter", async () => {
    await expect(setChapterProgress(USER, 999, "completed")).rejects.toMatchObject({
      code: "CHAPTER_NOT_FOUND",
    });
  });

  // ── Next-chapter unlock behaviour ────────────────────────────────────────

  it("completing chapter 1 unlocks chapter 2", async () => {
    const before = await listChapters(USER);
    expect(before[1].lockState).toBe("locked");

    await setChapterProgress(USER, 1, "completed");

    const after = await listChapters(USER);
    expect(after[1].lockState).toBe("unlocked");
  });

  it("completing chapter 2 unlocks chapter 3", async () => {
    await setChapterProgress(USER, 2, "completed");
    const chapters = await listChapters(USER);
    expect(chapters[2].lockState).toBe("unlocked");
  });

  it("setting in-progress does NOT unlock the next chapter", async () => {
    await setChapterProgress(USER, 1, "in-progress");
    const chapters = await listChapters(USER);
    expect(chapters[1].lockState).toBe("locked");
  });

  it("completing the last chapter does not throw", async () => {
    await expect(setChapterProgress(USER, 5, "completed")).resolves.toBeUndefined();
  });

  it("completing a chapter does not change the completed chapter's own lockState", async () => {
    const before = await listChapters(USER);
    const originalLock = before[0].lockState;
    await setChapterProgress(USER, 1, "completed");
    const after = await listChapters(USER);
    expect(after[0].lockState).toBe(originalLock);
  });

  it("completing chapter 1 does not unlock chapters beyond 2", async () => {
    await setChapterProgress(USER, 1, "completed");
    const chapters = await listChapters(USER);
    expect(chapters[2].lockState).toBe("locked");
    expect(chapters[3].lockState).toBe("locked");
    expect(chapters[4].lockState).toBe("locked");
  });
});

describe("getVideoClips", () => {
  it("returns a badge and exactly 5 clips", async () => {
    const result = await getVideoClips();
    expect(typeof result.badge).toBe("string");
    expect(result.clips).toHaveLength(5);
  });

  it("each clip has id, caption, and sourceUrl", async () => {
    const result = await getVideoClips();
    for (const clip of result.clips) {
      expect(clip.id).toBeDefined();
      expect(clip.caption).toBeDefined();
      expect(clip.sourceUrl).toBeDefined();
    }
  });

  it("clips are returned in sort_order sequence", async () => {
    const result = await getVideoClips();
    const ids = result.clips.map((c) => c.id);
    expect(ids).toEqual(["clip-1", "clip-2", "clip-3", "clip-4", "clip-5"]);
  });
});

describe("getEBooks", () => {
  it("returns a badge and 5 e-book chapters", async () => {
    const result = await getEBooks();
    expect(typeof result.badge).toBe("string");
    expect(result.chapters).toHaveLength(5);
  });

  it("each e-book chapter has id, title, and pdfUrl", async () => {
    const result = await getEBooks();
    for (const ch of result.chapters) {
      expect(ch.id).toBeDefined();
      expect(ch.title).toBeDefined();
      expect(ch.pdfUrl).toBeDefined();
    }
  });
});
