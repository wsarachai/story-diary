import { apiSlice } from "./apiSlice";
import type { Chapter, ChapterId, ChapterSummary } from "@/types/chapters";

export const chaptersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChapterSummaries: builder.query<ChapterSummary[], void>({
      query: () => "/chapters",
      transformResponse: (response: { chapters: ChapterSummary[] }) => response.chapters,
      providesTags: [{ type: "Chapters", id: "LIST" }],
    }),
    getChapter: builder.query<Chapter, ChapterId>({
      query: (id) => `/chapters/${id}`,
      providesTags: (result, error, id) => [{ type: "Chapters", id }],
    }),
    updateChapterProgress: builder.mutation<
      { id: ChapterId; progress: "not-started" | "in-progress" | "completed" },
      { id: ChapterId; progress: "not-started" | "in-progress" | "completed" }
    >({
      query: ({ id, progress }) => ({
        url: `/chapters/${id}/progress`,
        method: "POST",
        body: { progress },
      }),
      // Completing a chapter also unlocks the next one, so invalidate the
      // list plus both chapter details rather than the whole Chapters type.
      invalidatesTags: (result, error, { id }) => [
        { type: "Chapters", id: "LIST" },
        { type: "Chapters", id },
        { type: "Chapters", id: id + 1 },
      ],
      async onQueryStarted({ id, progress }, { dispatch, queryFulfilled }) {
        // Optimistic update for getChapterSummaries
        const patchResult = dispatch(
          chaptersApi.util.updateQueryData("getChapterSummaries", undefined, (draft) => {
            const summary = draft.find((s) => s.id === id);
            if (summary) {
              summary.progress = progress;
            }
            if (progress === "completed") {
              const nextSummary = draft.find((s) => s.id === id + 1);
              if (nextSummary) {
                nextSummary.lockState = "unlocked";
              }
            }
          })
        );
        // Optimistic update for getChapter
        const detailPatchResult = dispatch(
          chaptersApi.util.updateQueryData("getChapter", id, (draft) => {
            if (draft) {
              draft.progress = progress;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
          detailPatchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetChapterSummariesQuery,
  useGetChapterQuery,
  useUpdateChapterProgressMutation,
} = chaptersApi;
