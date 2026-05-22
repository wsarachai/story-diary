import { apiSlice } from "./apiSlice";
import type { Quiz } from "@/types/minigame";

export const quizApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuiz: builder.query<Quiz, void>({
      query: () => "/minigame/quiz",
      providesTags: ["Quiz"],
    }),
  }),
});

export const { useGetQuizQuery } = quizApi;
