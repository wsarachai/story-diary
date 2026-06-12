import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: typeof window !== "undefined" && !process.env.VITEST ? "/api" : "http://localhost:3000/api",
    prepareHeaders: (headers) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: [
    "Auth",
    "Chapters",
    "EBooks",
    "Quiz",
    "VideoClips",
    "HabitToday",
    "HabitWeekly",
    "HabitMonthly",
    "HabitMonthlySummary",
    "HabitCheckin",
    "AdminChapters",
    "AdminScenes",
    "AdminEBooks",
    "AdminQuestions",
    "AdminUsers",
    "AdminVideoClips",
  ],
  endpoints: () => ({}),
});
