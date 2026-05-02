import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { VideoClipsCollection } from "@/types/chapters";

interface VideoClipsState {
  collection: VideoClipsCollection | null;
  status: "idle" | "loading" | "ready" | "error";
}

const MOCK_COLLECTION: VideoClipsCollection = {
  badge: "ดาวแห่งการเรียนรู้",
  clips: [
    {
      id: "clip-1",
      caption: "คลิป 1",
      sourceUrl: "https://www.youtube.com/watch?v=Ktxam4bHrTo",
      thumbnailUrl: "https://img.youtube.com/vi/Ktxam4bHrTo/0.jpg",
    },
    {
      id: "clip-2",
      caption: "คลิป 2",
      sourceUrl: "https://www.youtube.com/watch?v=70-p4A-d_jM",
      thumbnailUrl: "https://img.youtube.com/vi/70-p4A-d_jM/0.jpg",
    },
    {
      id: "clip-3",
      caption: "คลิป 3",
      sourceUrl: "https://www.youtube.com/watch?v=hj7Kw3fDNaw",
      thumbnailUrl: "https://img.youtube.com/vi/hj7Kw3fDNaw/0.jpg",
    },
    {
      id: "clip-4",
      caption: "คลิป 4",
      sourceUrl: "https://www.youtube.com/watch?v=Wcs2PFz5C3I",
      thumbnailUrl: "https://img.youtube.com/vi/Wcs2PFz5C3I/0.jpg",
    },
    {
      id: "clip-5",
      caption: "คลิป 5",
      sourceUrl: "https://www.youtube.com/watch?v=R_4Q13-gcnA",
      thumbnailUrl: "https://img.youtube.com/vi/R_4Q13-gcnA/0.jpg",
    },
  ],
};

export const fetchCollection = createAsyncThunk(
  "videoClips/fetchCollection",
  async () => {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_COLLECTION;
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
