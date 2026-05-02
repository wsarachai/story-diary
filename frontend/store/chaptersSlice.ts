import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { Chapter, ChapterId, ChapterSummary } from "@/types/chapters";

interface ChaptersState {
  summaries: ChapterSummary[];
  byId: Record<string, Chapter | undefined>;
  summariesStatus: "idle" | "loading" | "ready" | "error";
  detailStatus: Record<string, "idle" | "loading" | "ready" | "error">;
  lockHintFor: ChapterId | null;
}

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
    const res = await fetch("/api/chapters", { credentials: "include" });
    if (!res.ok) throw new Error("FETCH_SUMMARIES_FAILED");
    const data = await res.json() as { chapters: ChapterSummary[] };
    return data.chapters;
  }
);

export const fetchChapter = createAsyncThunk(
  "chapters/fetchChapter",
  async (id: ChapterId) => {
    const res = await fetch(`/api/chapters/${id}`, { credentials: "include" });
    if (!res.ok) {
      if (res.status === 404) throw new Error("CHAPTER_NOT_FOUND");
      throw new Error("FETCH_CHAPTER_FAILED");
    }
    const chapter = await res.json() as Chapter;
    return chapter;
  }
);

export const persistChapterProgress = createAsyncThunk(
  "chapters/persistProgress",
  async ({ id, progress }: { id: ChapterId; progress: "not-started" | "in-progress" | "completed" }) => {
    await fetch(`/api/chapters/${id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ progress }),
    });
    return { id, progress };
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
