import { apiSlice } from "./apiSlice";
import type { Quiz, QuizScore, QuizAnswer } from "@/types/minigame";

export const quizApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuiz: builder.query<Quiz, void>({
      query: () => "/minigame/quiz",
      providesTags: ["Quiz"],
    }),
    submitQuizAttempt: builder.mutation<
      QuizScore,
      { quizId: string; answers: Record<string, QuizAnswer> }
    >({
      query: (body) => ({
        url: "/minigame/quiz/attempts",
        method: "POST",
        body,
      }),
      transformResponse: (response: { score: QuizScore }) => response.score,
    }),
  }),
});

export const { useGetQuizQuery, useSubmitQuizAttemptMutation } = quizApi;
