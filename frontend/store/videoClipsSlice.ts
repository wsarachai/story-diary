import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { VideoClipsCollection } from "@/types/chapters";

interface VideoClipsState {
  collection: VideoClipsCollection | null;
  status: "idle" | "loading" | "ready" | "error";
}

export const fetchCollection = createAsyncThunk(
  "videoClips/fetchCollection",
  async () => {
    const res = await fetch("/api/video-clips", { credentials: "include" });
    if (!res.ok) throw new Error("FETCH_CLIPS_FAILED");
    const data = await res.json() as VideoClipsCollection;
    return data;
  }
);

const videoClipsSlice = createSlice({
  name: "videoClips",
  initialState: { collection: null, status: "idle" } as VideoClipsState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollection.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCollection.fulfilled, (state, action) => {
        state.status = "ready";
        state.collection = action.payload;
      })
      .addCase(fetchCollection.rejected, (state) => {
        state.status = "error";
      });
  },
});

export default videoClipsSlice.reducer;

export const selectVideoClipsCollection = (state: { videoClips: VideoClipsState }) =>
  state.videoClips.collection;
export const selectVideoClipsStatus = (state: { videoClips: VideoClipsState }) =>
  state.videoClips.status;
