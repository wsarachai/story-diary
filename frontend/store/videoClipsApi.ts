import { apiSlice } from "./apiSlice";
import type { VideoClipsCollection } from "@/types/chapters";

export const videoClipsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getVideoClips: builder.query<VideoClipsCollection, void>({
      query: () => "/video-clips",
      providesTags: ["VideoClips"],
    }),
  }),
});

export const { useGetVideoClipsQuery } = videoClipsApi;
