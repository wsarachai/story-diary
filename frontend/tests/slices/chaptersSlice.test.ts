/**
 * chaptersSlice unit tests — Story Diary
 *
 * Source of truth:
 *   - docs/specs/s005-chapters-and-story.md  (DS-1 lock hint, DS-2 completed unlock)
 *   - src/types/chapters.ts                   (Chapter, ChapterSummary, lockState, progress)
 *
 * Key invariants tested:
 *   - showLockHint(id) / clearLockHint() control lockHintFor
 *   - markCompleted(id) marks chapter progress="completed" AND unlocks id+1 in summaries
 *   - fetchSummaries lifecycle: idle→loading→ready / error
 *   - fetchChapter lifecycle per-id: idle→loading→ready / error (unknown id → detailStatus error)
 *   - selectChapterDetailStatus falls back to "idle" when id not seen
 */

import reducer, {
  fetchSummaries,
  fetchChapter,
  showLockHint,
  clearLockHint,
  markCompleted,
  selectChapterSummaries,
  selectSummariesStatus,
  selectChapter,
  selectChapterDetailStatus,
  selectLockHintFor,
} from "@/store/chaptersSlice";
import type { Chapter, ChapterSummary } from "@/types/chapters";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARY_1: ChapterSummary = {
  id: 1,
  title: "บทที่ 1",
  lockState: "unlocked",
  progress: "not-started",
};
const SUMMARY_2: ChapterSummary = {
  id: 2,
  title: "บทที่ 2",
  lockState: "locked",
  progress: "not-started",
};
const SUMMARY_3: ChapterSummary = {
  id: 3,
  title: "บทที่ 3",
  lockState: "locked",
  progress: "not-started",
};

const MOCK_SUMMARIES: ChapterSummary[] = [SUMMARY_1, SUMMARY_2, SUMMARY_3];

const CHAPTER_1: Chapter = {
  id: 1,
  title: "บทที่ 1",
  introTitle: "บทบรรยาย",
  backgroundImageUrl: "/images/chapters-explain-bg-1920x1080.svg",
  lockState: "unlocked",
  progress: "not-started",
  scenes: [
    {
      id: "1-0",
      index: 0,
      speakerName: "ชื่อตัวละคร",
      speakerImageUrl: "/images/chapter-speaker-girl-transparent.png",
      text: "บทสนทนา",
    },
  ],
};

type ChaptersRoot = { chapters: ReturnType<typeof reducer> };
function root(s: ReturnType<typeof reducer>): ChaptersRoot {
  return { chapters: s };
}

// Build state with summaries already loaded
function stateWithSummaries(): ReturnType<typeof reducer> {
  return reducer(
    undefined,
    fetchSummaries.fulfilled(MOCK_SUMMARIES, "req")
  );
}

// Build state with summaries AND chapter 1 detail
function stateWithChapter1(): ReturnType<typeof reducer> {
  const s1 = stateWithSummaries();
  return reducer(s1, fetchChapter.fulfilled(CHAPTER_1, "req", 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — initial state", () => {
  it("starts empty with idle statuses and null lockHintFor", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.summaries).toEqual([]);
    expect(state.byId).toEqual({});
    expect(state.summariesStatus).toBe("idle");
    expect(state.detailStatus).toEqual({});
    expect(state.lockHintFor).toBeNull();
  });

  it("selectLockHintFor returns null initially", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectLockHintFor(root(state))).toBeNull();
  });

  it("selectChapterSummaries returns [] initially", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectChapterSummaries(root(state))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// showLockHint / clearLockHint (DS-1: locked chapter tap feedback)
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — showLockHint / clearLockHint (DS-1)", () => {
  it("showLockHint(2) sets lockHintFor = 2", () => {
    const state = reducer(undefined, showLockHint(2));
    expect(state.lockHintFor).toBe(2);
    expect(selectLockHintFor(root(state))).toBe(2);
  });

  it("showLockHint replaces previous value", () => {
    const s1 = reducer(undefined, showLockHint(2));
    const s2 = reducer(s1, showLockHint(3));
    expect(s2.lockHintFor).toBe(3);
  });

  it("clearLockHint resets lockHintFor to null", () => {
    const s1 = reducer(undefined, showLockHint(2));
    const s2 = reducer(s1, clearLockHint());
    expect(s2.lockHintFor).toBeNull();
    expect(selectLockHintFor(root(s2))).toBeNull();
  });

  it("clearLockHint on initial state is a no-op", () => {
    const state = reducer(undefined, clearLockHint());
    expect(state.lockHintFor).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markCompleted (DS-2: completing a chapter unlocks the next)
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — markCompleted (DS-2)", () => {
  it("marks target chapter summary progress='completed'", () => {
    const base = stateWithSummaries();
    const state = reducer(base, markCompleted(1));
    const summary = state.summaries.find((s) => s.id === 1);
    expect(summary?.progress).toBe("completed");
  });

  it("unlocks the next chapter summary (id+1)", () => {
    const base = stateWithSummaries();
    const state = reducer(base, markCompleted(1));
    const nextSummary = state.summaries.find((s) => s.id === 2);
    expect(nextSummary?.lockState).toBe("unlocked");
  });

  it("does not touch chapter id+2 or further", () => {
    const base = stateWithSummaries();
    const state = reducer(base, markCompleted(1));
    const summary3 = state.summaries.find((s) => s.id === 3);
    // Chapter 3 should remain locked
    expect(summary3?.lockState).toBe("locked");
  });

  it("also marks byId chapter progress='completed' when loaded", () => {
    const base = stateWithChapter1();
    expect(base.byId[1]?.progress).toBe("not-started");
    const state = reducer(base, markCompleted(1));
    expect(state.byId[1]?.progress).toBe("completed");
  });

  it("byId update is safe when chapter detail not loaded (no crash)", () => {
    // summaries loaded but chapter not in byId
    const base = stateWithSummaries();
    expect(() => reducer(base, markCompleted(1))).not.toThrow();
    const state = reducer(base, markCompleted(1));
    // byId[1] is still undefined (was never loaded)
    expect(state.byId[1]).toBeUndefined();
    // But summary is still updated
    expect(state.summaries.find((s) => s.id === 1)?.progress).toBe("completed");
  });

  it("markCompleted on last chapter — no crash when id+1 doesn't exist", () => {
    const base = stateWithSummaries();
    expect(() => reducer(base, markCompleted(3))).not.toThrow();
  });

  it("selectChapter returns updated chapter after markCompleted", () => {
    const base = stateWithChapter1();
    const state = reducer(base, markCompleted(1));
    const chapter = selectChapter(root(state), 1);
    expect(chapter?.progress).toBe("completed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchSummaries lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — fetchSummaries lifecycle", () => {
  it("pending → summariesStatus = 'loading'", () => {
    const state = reducer(undefined, fetchSummaries.pending("req"));
    expect(state.summariesStatus).toBe("loading");
    expect(selectSummariesStatus(root(state))).toBe("loading");
  });

  it("fulfilled → summariesStatus = 'ready', summaries populated", () => {
    const state = reducer(
      undefined,
      fetchSummaries.fulfilled(MOCK_SUMMARIES, "req")
    );
    expect(state.summariesStatus).toBe("ready");
    expect(state.summaries).toHaveLength(3);
    expect(state.summaries[0]).toEqual(SUMMARY_1);
    expect(selectChapterSummaries(root(state))).toEqual(MOCK_SUMMARIES);
  });

  it("rejected → summariesStatus = 'error'", () => {
    const state = reducer(
      undefined,
      fetchSummaries.rejected(new Error("net"), "req")
    );
    expect(state.summariesStatus).toBe("error");
    expect(selectSummariesStatus(root(state))).toBe("error");
  });

  it("summaries preserve lockState from payload (not all locked/unlocked)", () => {
    const state = stateWithSummaries();
    const summaries = selectChapterSummaries(root(state));
    expect(summaries[0]!.lockState).toBe("unlocked");
    expect(summaries[1]!.lockState).toBe("locked");
    expect(summaries[2]!.lockState).toBe("locked");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchChapter lifecycle (per-id detail status)
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — fetchChapter lifecycle", () => {
  it("pending → detailStatus[id] = 'loading'", () => {
    const state = reducer(undefined, fetchChapter.pending("req", 1));
    expect(state.detailStatus[1]).toBe("loading");
    expect(selectChapterDetailStatus(root(state), 1)).toBe("loading");
  });

  it("fulfilled → detailStatus[id] = 'ready', chapter stored in byId", () => {
    const state = reducer(
      undefined,
      fetchChapter.fulfilled(CHAPTER_1, "req", 1)
    );
    expect(state.detailStatus[1]).toBe("ready");
    expect(state.byId[1]).toEqual(CHAPTER_1);
    expect(selectChapter(root(state), 1)).toEqual(CHAPTER_1);
  });

  it("fulfilled chapter has scenes array with correct shape", () => {
    const state = reducer(
      undefined,
      fetchChapter.fulfilled(CHAPTER_1, "req", 1)
    );
    const chapter = selectChapter(root(state), 1)!;
    expect(Array.isArray(chapter.scenes)).toBe(true);
    expect(chapter.scenes.length).toBeGreaterThan(0);
    expect(chapter.scenes[0]).toMatchObject({
      id: expect.any(String),
      index: expect.any(Number),
      speakerName: expect.any(String),
      text: expect.any(String),
    });
  });

  it("rejected → detailStatus[id] = 'error'", () => {
    const state = reducer(
      undefined,
      fetchChapter.rejected(new Error("CHAPTER_NOT_FOUND"), "req", 2)
    );
    expect(state.detailStatus[2]).toBe("error");
    expect(selectChapterDetailStatus(root(state), 2)).toBe("error");
  });

  it("selectChapterDetailStatus returns 'idle' for unseen id", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectChapterDetailStatus(root(state), 99)).toBe("idle");
  });

  it("selectChapter returns undefined for unseen id", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(selectChapter(root(state), 99)).toBeUndefined();
  });

  it("loading multiple chapters tracks each id independently", () => {
    const s1 = reducer(undefined, fetchChapter.pending("req-1", 1));
    const s2 = reducer(s1, fetchChapter.pending("req-2", 2));
    expect(s2.detailStatus[1]).toBe("loading");
    expect(s2.detailStatus[2]).toBe("loading");

    const s3 = reducer(s2, fetchChapter.fulfilled(CHAPTER_1, "req-1", 1));
    // chapter 1 ready, chapter 2 still loading
    expect(s3.detailStatus[1]).toBe("ready");
    expect(s3.detailStatus[2]).toBe("loading");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: lock workflow (tap locked → show hint → dismiss)
// spec s005 DS-1: tapping locked chapter shows hint, not navigation
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — lock feedback workflow (spec s005 DS-1)", () => {
  it("locked chapter tap → showLockHint, then clearLockHint", () => {
    // User sees chapters, chapter 2 is locked
    const base = stateWithSummaries();
    const lockedChapterId = 2;

    // Tap chapter 2 → dispatch showLockHint
    const s1 = reducer(base, showLockHint(lockedChapterId));
    expect(s1.lockHintFor).toBe(lockedChapterId);

    // Dismiss hint → clearLockHint
    const s2 = reducer(s1, clearLockHint());
    expect(s2.lockHintFor).toBeNull();

    // Chapter 2 must still be locked (hint is UI only, not unlock)
    expect(s2.summaries.find((s) => s.id === 2)?.lockState).toBe("locked");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: chapter completion → unlock flow (spec s005 DS-2)
// ─────────────────────────────────────────────────────────────────────────────

describe("chaptersSlice — chapter completion unlock flow (spec s005 DS-2)", () => {
  it("full unlock chain: load chapter 1, complete it, chapter 2 unlocked", () => {
    // 1. Load summaries (5 chapters, only #1 unlocked)
    const s1 = stateWithSummaries();
    expect(s1.summaries.find((s) => s.id === 1)?.lockState).toBe("unlocked");
    expect(s1.summaries.find((s) => s.id === 2)?.lockState).toBe("locked");

    // 2. Load chapter 1 detail
    const s2 = reducer(s1, fetchChapter.fulfilled(CHAPTER_1, "req", 1));
    expect(s2.byId[1]).toBeDefined();

    // 3. Complete chapter 1
    const s3 = reducer(s2, markCompleted(1));
    expect(s3.summaries.find((s) => s.id === 1)?.progress).toBe("completed");
    expect(s3.summaries.find((s) => s.id === 2)?.lockState).toBe("unlocked");
    expect(s3.byId[1]?.progress).toBe("completed");
  });
});
