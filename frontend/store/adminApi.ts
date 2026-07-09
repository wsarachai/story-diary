import { apiSlice } from "./apiSlice";
import type { Chapter, ChapterSummary, ChapterLockState, ChapterScene } from "@/types/chapters";
import type { EBookChapter } from "@/types/ebook";
import type { QuizQuestion, AnswerLetter, QuestionGender } from "@/types/minigame";
import type { VideoClipModel, CreateVideoClipRequest, UpdateVideoClipRequest } from "@/lib/services/adminService";

export type { VideoClipModel, CreateVideoClipRequest, UpdateVideoClipRequest };

// ── Chapter admin payloads ──────────────────────────────────────────────────

export interface CreateChapterRequest {
  title: string;
  introTitle: string;
  lockState: ChapterLockState;
  backgroundImageUrl?: string;
}

export type UpdateChapterRequest = Partial<CreateChapterRequest>;

// ── Scene admin payloads ────────────────────────────────────────────────────

export interface CreateSceneRequest {
  idx: number;
  speakerName: string;
  speakerImageUrl?: string;
  text: string;
}

export type UpdateSceneRequest = Partial<CreateSceneRequest>;

// ── EBook admin payloads ────────────────────────────────────────────────────

export interface CreateEBookRequest {
  title: string;
  pdfUrl: string;
}

export type UpdateEBookRequest = Partial<CreateEBookRequest>;

// ── Minigame admin payloads ─────────────────────────────────────────────────

export interface CreateQuestionRequest {
  gender: QuestionGender;
  text: string;
  correctAnswer: AnswerLetter;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  explanation?: string;
}

/** Gender is immutable after creation, so it is not part of the update payload. */
export type UpdateQuestionRequest = Partial<Omit<CreateQuestionRequest, "gender">>;

/** Admin questions grouped by set. */
export type GroupedQuestions = Record<QuestionGender, QuizQuestion[]>;

// ── User management payloads ────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  name: string;
  tel: string;
  role: "user" | "admin" | "rootAdmin";
  createdAt: string;
}

// ── Admin API ───────────────────────────────────────────────────────────────
//
// Tagging scheme: each admin collection has its own tag type with a "LIST"
// id (plus per-entity ids where a detail query exists). Mutations also
// invalidate the matching user-facing tag (Chapters/EBooks/Quiz/VideoClips)
// so admin edits refresh user views. Updates and deletes patch the cached
// admin lists optimistically and undo on failure; creates stay pessimistic
// because the server generates ids.

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Chapters
    getAdminChapters: builder.query<ChapterSummary[], void>({
      query: () => "/admin/chapters",
      transformResponse: (res: { chapters: ChapterSummary[] }) => res.chapters,
      providesTags: [{ type: "AdminChapters", id: "LIST" }],
    }),
    createChapter: builder.mutation<Chapter, CreateChapterRequest>({
      query: (body) => ({ url: "/admin/chapters", method: "POST", body }),
      invalidatesTags: [
        { type: "AdminChapters", id: "LIST" },
        { type: "Chapters", id: "LIST" },
      ],
    }),
    updateChapter: builder.mutation<Chapter, { id: number; body: UpdateChapterRequest }>({
      query: ({ id, body }) => ({ url: `/admin/chapters/${id}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { id }) => [
        { type: "AdminChapters", id: "LIST" },
        { type: "AdminChapters", id },
        { type: "Chapters", id: "LIST" },
        { type: "Chapters", id },
      ],
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        const listPatch = dispatch(
          adminApi.util.updateQueryData("getAdminChapters", undefined, (draft) => {
            const chapter = draft.find((c) => c.id === id);
            if (chapter) Object.assign(chapter, body);
          })
        );
        const detailPatch = dispatch(
          adminApi.util.updateQueryData("getAdminChapter", id, (draft) => {
            Object.assign(draft, body);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          listPatch.undo();
          detailPatch.undo();
        }
      },
    }),
    deleteChapter: builder.mutation<void, number>({
      query: (id) => ({ url: `/admin/chapters/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "AdminChapters", id: "LIST" },
        { type: "AdminChapters", id },
        { type: "Chapters", id: "LIST" },
        { type: "Chapters", id },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminChapters", undefined, (draft) =>
            draft.filter((c) => c.id !== id)
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    // Chapter detail + Scenes
    getAdminChapter: builder.query<Chapter, number>({
      query: (id) => `/admin/chapters/${id}`,
      providesTags: (result, error, id) => [{ type: "AdminChapters", id }],
    }),
    getAdminScenes: builder.query<ChapterScene[], number>({
      query: (chapterId) => `/admin/chapters/${chapterId}/scenes`,
      transformResponse: (res: { scenes: ChapterScene[] }) => res.scenes,
      providesTags: (result, error, chapterId) => [{ type: "AdminScenes", id: chapterId }],
    }),
    createScene: builder.mutation<ChapterScene, { chapterId: number; body: CreateSceneRequest }>({
      query: ({ chapterId, body }) => ({ url: `/admin/chapters/${chapterId}/scenes`, method: "POST", body }),
      invalidatesTags: (result, error, { chapterId }) => [
        { type: "AdminScenes", id: chapterId },
        { type: "Chapters", id: chapterId },
      ],
    }),
    updateScene: builder.mutation<ChapterScene, { sceneId: string; chapterId: number; body: UpdateSceneRequest }>({
      query: ({ sceneId, body }) => ({ url: `/admin/chapters/scenes/${sceneId}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { chapterId }) => [
        { type: "AdminScenes", id: chapterId },
        { type: "Chapters", id: chapterId },
      ],
      async onQueryStarted({ sceneId, chapterId, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminScenes", chapterId, (draft) => {
            const scene = draft.find((s) => s.id === sceneId);
            if (scene) Object.assign(scene, body);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    deleteScene: builder.mutation<void, { sceneId: string; chapterId: number }>({
      query: ({ sceneId }) => ({ url: `/admin/chapters/scenes/${sceneId}`, method: "DELETE" }),
      invalidatesTags: (result, error, { chapterId }) => [
        { type: "AdminScenes", id: chapterId },
        { type: "Chapters", id: chapterId },
      ],
      async onQueryStarted({ sceneId, chapterId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminScenes", chapterId, (draft) =>
            draft.filter((s) => s.id !== sceneId)
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    // EBooks
    getAdminEBooks: builder.query<EBookChapter[], void>({
      query: () => "/admin/e-books",
      transformResponse: (res: { chapters: EBookChapter[] }) => res.chapters,
      providesTags: [{ type: "AdminEBooks", id: "LIST" }],
    }),
    createEBook: builder.mutation<EBookChapter, CreateEBookRequest>({
      query: (body) => ({ url: "/admin/e-books", method: "POST", body }),
      invalidatesTags: [{ type: "AdminEBooks", id: "LIST" }, "EBooks"],
    }),
    updateEBook: builder.mutation<EBookChapter, { id: string; body: UpdateEBookRequest }>({
      query: ({ id, body }) => ({ url: `/admin/e-books/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "AdminEBooks", id: "LIST" }, "EBooks"],
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminEBooks", undefined, (draft) => {
            const ebook = draft.find((e) => e.id === id);
            if (ebook) Object.assign(ebook, body);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    deleteEBook: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/e-books/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "AdminEBooks", id: "LIST" }, "EBooks"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminEBooks", undefined, (draft) =>
            draft.filter((e) => e.id !== id)
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    // Minigame questions
    getAdminQuestions: builder.query<GroupedQuestions, void>({
      query: () => "/admin/minigame/questions",
      transformResponse: (res: Partial<GroupedQuestions>) => ({
        male: res.male ?? [],
        female: res.female ?? [],
      }),
      providesTags: [{ type: "AdminQuestions", id: "LIST" }],
    }),
    createQuestion: builder.mutation<QuizQuestion, CreateQuestionRequest>({
      query: (body) => ({ url: "/admin/minigame/questions", method: "POST", body }),
      invalidatesTags: [{ type: "AdminQuestions", id: "LIST" }, "Quiz"],
    }),
    updateQuestion: builder.mutation<QuizQuestion, { id: string; body: UpdateQuestionRequest }>({
      query: ({ id, body }) => ({ url: `/admin/minigame/questions/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "AdminQuestions", id: "LIST" }, "Quiz"],
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminQuestions", undefined, (draft) => {
            for (const set of [draft.male, draft.female]) {
              const question = set.find((q) => q.id === id);
              if (question) Object.assign(question, body);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    deleteQuestion: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/minigame/questions/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "AdminQuestions", id: "LIST" }, "Quiz"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminQuestions", undefined, (draft) => {
            draft.male = draft.male.filter((q) => q.id !== id);
            draft.female = draft.female.filter((q) => q.id !== id);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    // Users (rootAdmin only)
    getAdminUsers: builder.query<UserSummary[], void>({
      query: () => "/admin/users",
      transformResponse: (res: { users: UserSummary[] }) => res.users,
      providesTags: [{ type: "AdminUsers", id: "LIST" }],
    }),
    changeUserRole: builder.mutation<UserSummary, { id: string; role: "user" | "admin" }>({
      query: ({ id, role }) => ({ url: `/admin/users/${id}`, method: "PATCH", body: { role } }),
      invalidatesTags: [{ type: "AdminUsers", id: "LIST" }],
      async onQueryStarted({ id, role }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminUsers", undefined, (draft) => {
            const user = draft.find((u) => u.id === id);
            if (user) user.role = role;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    // Video Clips
    getAdminVideoClips: builder.query<VideoClipModel[], void>({
      query: () => "/admin/video-clips",
      transformResponse: (res: { clips: VideoClipModel[] }) => res.clips,
      providesTags: [{ type: "AdminVideoClips", id: "LIST" }],
    }),
    createVideoClip: builder.mutation<VideoClipModel, CreateVideoClipRequest>({
      query: (body) => ({ url: "/admin/video-clips", method: "POST", body }),
      invalidatesTags: [{ type: "AdminVideoClips", id: "LIST" }, "VideoClips"],
    }),
    updateVideoClip: builder.mutation<VideoClipModel, { id: string; body: UpdateVideoClipRequest }>({
      query: ({ id, body }) => ({ url: `/admin/video-clips/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "AdminVideoClips", id: "LIST" }, "VideoClips"],
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminVideoClips", undefined, (draft) => {
            const clip = draft.find((c) => c.id === id);
            if (clip) Object.assign(clip, body);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    deleteVideoClip: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/video-clips/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "AdminVideoClips", id: "LIST" }, "VideoClips"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminVideoClips", undefined, (draft) =>
            draft.filter((c) => c.id !== id)
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderVideoClips: builder.mutation<void, string[]>({
      query: (ids) => ({ url: "/admin/video-clips/reorder", method: "PUT", body: { ids } }),
      invalidatesTags: ["VideoClips"],
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminVideoClips", undefined, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderQuestions: builder.mutation<void, { gender: QuestionGender; ids: string[] }>({
      query: ({ gender, ids }) => ({ url: "/admin/minigame/questions/reorder", method: "PUT", body: { gender, ids } }),
      invalidatesTags: ["Quiz"],
      async onQueryStarted({ gender, ids }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminQuestions", undefined, (draft) => {
            draft[gender].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderChapters: builder.mutation<void, number[]>({
      query: (ids) => ({ url: "/admin/chapters/reorder", method: "PUT", body: { ids } }),
      invalidatesTags: [{ type: "Chapters", id: "LIST" }],
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminChapters", undefined, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderChapterScenes: builder.mutation<void, { chapterId: number; ids: string[] }>({
      query: ({ chapterId, ids }) => ({
        url: `/admin/chapters/${chapterId}/scenes/reorder`,
        method: "PUT",
        body: { ids },
      }),
      invalidatesTags: (result, error, { chapterId }) => [{ type: "Chapters", id: chapterId }],
      async onQueryStarted({ chapterId, ids }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminScenes", chapterId, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderEBooks: builder.mutation<void, string[]>({
      query: (ids) => ({ url: "/admin/e-books/reorder", method: "PUT", body: { ids } }),
      invalidatesTags: ["EBooks"],
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminEBooks", undefined, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetAdminChaptersQuery,
  useCreateChapterMutation,
  useUpdateChapterMutation,
  useDeleteChapterMutation,
  useGetAdminChapterQuery,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
  useGetAdminEBooksQuery,
  useCreateEBookMutation,
  useUpdateEBookMutation,
  useDeleteEBookMutation,
  useGetAdminQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useGetAdminUsersQuery,
  useChangeUserRoleMutation,
  useGetAdminVideoClipsQuery,
  useCreateVideoClipMutation,
  useUpdateVideoClipMutation,
  useDeleteVideoClipMutation,
  useReorderVideoClipsMutation,
  useReorderQuestionsMutation,
  useReorderChaptersMutation,
  useReorderChapterScenesMutation,
  useReorderEBooksMutation,
} = adminApi;
