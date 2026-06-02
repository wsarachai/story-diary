// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import {
  listChapters,
  getChapter,
  setChapterProgress,
  getVideoClips,
  getEBooks,
} from "@/lib/services/chapterService";

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
  it("returns a badge and exactly 5 clips", () => {
    const result = getVideoClips();
    expect(typeof result.badge).toBe("string");
    expect(result.clips).toHaveLength(5);
  });

  it("each clip has id, caption, and sourceUrl", () => {
    const result = getVideoClips();
    for (const clip of result.clips) {
      expect(clip.id).toBeDefined();
      expect(clip.caption).toBeDefined();
      expect(clip.sourceUrl).toBeDefined();
    }
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
