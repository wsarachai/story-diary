import { apiSlice } from "./apiSlice";
import type { Chapter, ChapterSummary, ChapterLockState } from "@/types/chapters";
import type { EBookChapter } from "@/types/ebook";
import type { QuizQuestion, AnswerLetter } from "@/types/minigame";

// ── Chapter admin payloads ──────────────────────────────────────────────────

export interface CreateChapterRequest {
  title: string;
  introTitle: string;
  lockState: ChapterLockState;
  backgroundImageUrl?: string;
}

export type UpdateChapterRequest = Partial<CreateChapterRequest>;

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
  }),
});

export const {
  useGetAdminChaptersQuery,
  useCreateChapterMutation,
  useUpdateChapterMutation,
  useDeleteChapterMutation,
  useGetAdminEBooksQuery,
  useCreateEBookMutation,
  useUpdateEBookMutation,
  useDeleteEBookMutation,
  useGetAdminQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} = adminApi;
