import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { Chapter, ChapterId, ChapterSummary } from "@/types/chapters";

interface ChaptersState {
  summaries: ChapterSummary[];
  byId: Record<string, Chapter | undefined>;
  summariesStatus: "idle" | "loading" | "ready" | "error";
  detailStatus: Record<string, "idle" | "loading" | "ready" | "error">;
  lockHintFor: ChapterId | null;
}

const MOCK_SUMMARIES: ChapterSummary[] = [
  { id: 1, title: "บทที่ 1", lockState: "unlocked", progress: "not-started" },
  { id: 2, title: "บทที่ 2", lockState: "locked", progress: "not-started" },
  { id: 3, title: "บทที่ 3", lockState: "locked", progress: "not-started" },
  { id: 4, title: "บทที่ 4", lockState: "locked", progress: "not-started" },
  { id: 5, title: "บทที่ 5", lockState: "locked", progress: "not-started" },
];

const MOCK_CHAPTERS: Record<number, Chapter> = {
  1: {
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
  },
};

const initialState: ChaptersState = {
  summaries: [],
  byId: {},
  summariesStatus: "idle",
  detailStatus: {},
  lockHintFor: null,
};

export const fetchSummaries = createAsyncThunk(
  "chapters/fetchSummaries",
  async () => {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_SUMMARIES;
  }
);

export const fetchChapter = createAsyncThunk(
  "chapters/fetchChapter",
  async (id: ChapterId) => {
    await new Promise((r) => setTimeout(r, 200));
    const chapter = MOCK_CHAPTERS[id];
    if (!chapter) throw new Error("CHAPTER_NOT_FOUND");
    return chapter;
  }
);

const chaptersSlice = createSlice({
  name: "chapters",
  initialState,
  reducers: {
    showLockHint(state, action: PayloadAction<ChapterId>) {
      state.lockHintFor = action.payload;
    },
    clearLockHint(state) {
      state.lockHintFor = null;
    },
    markCompleted(state, action: PayloadAction<ChapterId>) {
      const id = action.payload;
      const chapter = state.byId[id];
      if (chapter) chapter.progress = "completed";
      const summary = state.summaries.find((s) => s.id === id);
      if (summary) summary.progress = "completed";
      const nextSummary = state.summaries.find((s) => s.id === id + 1);
      if (nextSummary) nextSummary.lockState = "unlocked";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSummaries.pending, (state) => {
        state.summariesStatus = "loading";
      })
      .addCase(fetchSummaries.fulfilled, (state, action) => {
        state.summariesStatus = "ready";
        state.summaries = action.payload;
      })
      .addCase(fetchSummaries.rejected, (state) => {
        state.summariesStatus = "error";
      })
      .addCase(fetchChapter.pending, (state, action) => {
        state.detailStatus[action.meta.arg] = "loading";
      })
      .addCase(fetchChapter.fulfilled, (state, action) => {
        const chapter = action.payload;
        state.detailStatus[chapter.id] = "ready";
        state.byId[chapter.id] = chapter;
      })
      .addCase(fetchChapter.rejected, (state, action) => {
        state.detailStatus[action.meta.arg] = "error";
      });
  },
});

export const { showLockHint, clearLockHint, markCompleted } = chaptersSlice.actions;
export default chaptersSlice.reducer;

export const selectChapterSummaries = (state: { chapters: ChaptersState }) =>
  state.chapters.summaries;
export const selectSummariesStatus = (state: { chapters: ChaptersState }) =>
  state.chapters.summariesStatus;
export const selectChapter = (state: { chapters: ChaptersState }, id: ChapterId) =>
  state.chapters.byId[id];
export const selectChapterDetailStatus = (
  state: { chapters: ChaptersState },
  id: ChapterId
) => state.chapters.detailStatus[id] ?? "idle";
export const selectLockHintFor = (state: { chapters: ChaptersState }) =>
  state.chapters.lockHintFor;
