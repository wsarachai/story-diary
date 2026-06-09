import { apiSlice } from "./apiSlice";
import type { Chapter, ChapterSummary, ChapterLockState, ChapterScene } from "@/types/chapters";
import type { EBookChapter } from "@/types/ebook";
import type { QuizQuestion, AnswerLetter } from "@/types/minigame";
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
  number: number;
  text: string;
  correctAnswer: AnswerLetter;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  explanation?: string;
}

export type UpdateQuestionRequest = Partial<CreateQuestionRequest>;

// ── User management payloads ────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  name: string;
  tel: string;
  role: "user" | "admin" | "rootAdmin";
  createdAt: string;
}

// ── Admin API ───────────────────────────────────────────────────────────────

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Chapters
    getAdminChapters: builder.query<ChapterSummary[], void>({
      query: () => "/admin/chapters",
      transformResponse: (res: { chapters: ChapterSummary[] }) => res.chapters,
      providesTags: ["Admin"],
    }),
    createChapter: builder.mutation<Chapter, CreateChapterRequest>({
      query: (body) => ({ url: "/admin/chapters", method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),
    updateChapter: builder.mutation<Chapter, { id: number; body: UpdateChapterRequest }>({
      query: ({ id, body }) => ({ url: `/admin/chapters/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteChapter: builder.mutation<void, number>({
      query: (id) => ({ url: `/admin/chapters/${id}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),

    // Chapter detail + Scenes
    getAdminChapter: builder.query<Chapter, number>({
      query: (id) => `/admin/chapters/${id}`,
      providesTags: ["Admin"],
    }),
    getAdminScenes: builder.query<ChapterScene[], number>({
      query: (chapterId) => `/admin/chapters/${chapterId}/scenes`,
      transformResponse: (res: { scenes: ChapterScene[] }) => res.scenes,
      providesTags: ["Admin"],
    }),
    createScene: builder.mutation<ChapterScene, { chapterId: number; body: CreateSceneRequest }>({
      query: ({ chapterId, body }) => ({ url: `/admin/chapters/${chapterId}/scenes`, method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),
    updateScene: builder.mutation<ChapterScene, { sceneId: string; body: UpdateSceneRequest }>({
      query: ({ sceneId, body }) => ({ url: `/admin/chapters/scenes/${sceneId}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteScene: builder.mutation<void, string>({
      query: (sceneId) => ({ url: `/admin/chapters/scenes/${sceneId}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),

    // EBooks
    getAdminEBooks: builder.query<EBookChapter[], void>({
      query: () => "/admin/e-books",
      transformResponse: (res: { chapters: EBookChapter[] }) => res.chapters,
      providesTags: ["Admin"],
    }),
    createEBook: builder.mutation<EBookChapter, CreateEBookRequest>({
      query: (body) => ({ url: "/admin/e-books", method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),
    updateEBook: builder.mutation<EBookChapter, { id: string; body: UpdateEBookRequest }>({
      query: ({ id, body }) => ({ url: `/admin/e-books/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteEBook: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/e-books/${id}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),

    // Minigame questions
    getAdminQuestions: builder.query<QuizQuestion[], void>({
      query: () => "/admin/minigame/questions",
      transformResponse: (res: { questions: QuizQuestion[] }) => res.questions,
      providesTags: ["Admin"],
    }),
    createQuestion: builder.mutation<QuizQuestion, CreateQuestionRequest>({
      query: (body) => ({ url: "/admin/minigame/questions", method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),
    updateQuestion: builder.mutation<QuizQuestion, { id: string; body: UpdateQuestionRequest }>({
      query: ({ id, body }) => ({ url: `/admin/minigame/questions/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteQuestion: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/minigame/questions/${id}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),

    // Users (rootAdmin only)
    getAdminUsers: builder.query<UserSummary[], void>({
      query: () => "/admin/users",
      transformResponse: (res: { users: UserSummary[] }) => res.users,
      providesTags: ["Admin"],
    }),
    changeUserRole: builder.mutation<UserSummary, { id: string; role: "user" | "admin" }>({
      query: ({ id, role }) => ({ url: `/admin/users/${id}`, method: "PATCH", body: { role } }),
      invalidatesTags: ["Admin"],
    }),

    // Video Clips
    getAdminVideoClips: builder.query<VideoClipModel[], void>({
      query: () => "/admin/video-clips",
      transformResponse: (res: { clips: VideoClipModel[] }) => res.clips,
      providesTags: ["Admin"],
    }),
    createVideoClip: builder.mutation<VideoClipModel, CreateVideoClipRequest>({
      query: (body) => ({ url: "/admin/video-clips", method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),
    updateVideoClip: builder.mutation<VideoClipModel, { id: string; body: UpdateVideoClipRequest }>({
      query: ({ id, body }) => ({ url: `/admin/video-clips/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteVideoClip: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/video-clips/${id}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),
    reorderVideoClips: builder.mutation<void, string[]>({
      query: (ids) => ({ url: "/admin/video-clips/reorder", method: "PUT", body: { ids } }),
      invalidatesTags: ["Admin"],
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
} = adminApi;
