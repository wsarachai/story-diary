import { apiSlice } from "./apiSlice";
import type {
  HabitActivity,
  HabitOccurrence,
  HabitOccurrenceStatus,
  TodayHabitEntry,
  PeriodSummary,
  MonthlyGoal,
  MonthlyResults,
  MedicineCheckin,
  NutritionCheckin,
  UnusualSymptomsCheckin,
  MoodCheckin,
} from "@/types/habit";

export const habitsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTodayHabits: builder.query<{ activities: Record<string, HabitActivity>; todayByActivity: Record<string, HabitOccurrence> }, string>({
      query: (date) => `/habits/today?date=${date}`,
      transformResponse: (response: { entries: TodayHabitEntry[] }) => {
        const activities: Record<string, HabitActivity> = {};
        const todayByActivity: Record<string, HabitOccurrence> = {};
        for (const entry of response.entries) {
          activities[entry.activity.id] = entry.activity;
          todayByActivity[entry.activity.id] = entry.occurrence;
        }
        return { activities, todayByActivity };
      },
      providesTags: ["Habits"],
    }),
    getWeeklyHabits: builder.query<{
      weekStartDate: string;
      rowsByActivity: Record<string, { activityName: string; cells: HabitOccurrenceStatus[] }>;
      summary: PeriodSummary;
    }, void>({
      query: () => "/habits/weekly",
      transformResponse: (response: { weekStartDate: string; rowsByActivity: any[]; summary: PeriodSummary }) => {
        const rowsByActivity: Record<string, { activityName: string; cells: HabitOccurrenceStatus[] }> = {};
        for (const row of response.rowsByActivity) {
          rowsByActivity[row.activityId] = {
            activityName: row.activityName,
            cells: row.occurrences.map((o: any) => o.status),
          };
        }
        return {
          weekStartDate: response.weekStartDate,
          rowsByActivity,
          summary: response.summary,
        };
      },
      providesTags: ["Habits"],
    }),
    getMonthlyHabits: builder.query<{
      month: string;
      rowsByActivity: Record<string, { activityName: string; cells: HabitOccurrenceStatus[] }>;
      summary: PeriodSummary;
    }, string>({
      query: (month) => `/habits/monthly?month=${month}`,
      transformResponse: (response: { month: string; rowsByActivity: any[]; summary: PeriodSummary }) => {
        const rowsByActivity: Record<string, { activityName: string; cells: HabitOccurrenceStatus[] }> = {};
        for (const row of response.rowsByActivity) {
          rowsByActivity[row.activityId] = {
            activityName: row.activityName,
            cells: row.occurrences.map((o: any) => o.status),
          };
        }
        return {
          month: response.month,
          rowsByActivity,
          summary: response.summary,
        };
      },
      providesTags: ["Habits"],
    }),
    getMonthlySummary: builder.query<{ goals: MonthlyGoal[]; results: MonthlyResults }, string>({
      query: (month) => `/habits/monthly-summary?month=${month}`,
      providesTags: ["Habits"],
    }),
    toggleOccurrence: builder.mutation<HabitOccurrence, { occurrenceId: string; activityId: string; status: HabitOccurrenceStatus; date: string }>({
      query: ({ occurrenceId, status }) => ({
        url: `/habits/occurrences/${occurrenceId}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Habits"],
      async onQueryStarted({ activityId, status, date }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
            const occ = draft.todayByActivity[activityId];
            if (occ) {
              occ.status = status;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    createActivity: builder.mutation<HabitActivity, Omit<HabitActivity, "id" | "createdAt" | "updatedAt">>({
      query: (activity) => ({
        url: "/habits/activities",
        method: "POST",
        body: activity,
      }),
      invalidatesTags: ["Habits"],
    }),
    saveMedicineCheckin: builder.mutation<void, MedicineCheckin & { date: string }>({
      query: (checkin) => ({
        url: "/habits/checkin/medicine",
        method: "POST",
        body: checkin,
      }),
      invalidatesTags: ["Habits"],
    }),
    saveNutritionCheckin: builder.mutation<void, NutritionCheckin & { date: string }>({
      query: (checkin) => ({
        url: "/habits/checkin/nutrition",
        method: "POST",
        body: checkin,
      }),
      invalidatesTags: ["Habits"],
    }),
    saveSymptomsCheckin: builder.mutation<void, UnusualSymptomsCheckin & { date: string }>({
      query: (checkin) => ({
        url: `/habits/checkins/symptoms/${checkin.occurrenceId}`,
        method: "PUT",
        body: checkin,
      }),
      invalidatesTags: ["Habits"],
    }),
    saveMoodCheckin: builder.mutation<void, MoodCheckin & { date: string }>({
      query: (checkin) => ({
        url: `/habits/checkins/mood/${checkin.occurrenceId}`,
        method: "PUT",
        body: checkin,
      }),
      invalidatesTags: ["Habits"],
    }),
  }),
});

export const {
  useGetTodayHabitsQuery,
  useGetWeeklyHabitsQuery,
  useGetMonthlyHabitsQuery,
  useGetMonthlySummaryQuery,
  useToggleOccurrenceMutation,
  useCreateActivityMutation,
  useSaveMedicineCheckinMutation,
  useSaveNutritionCheckinMutation,
  useSaveSymptomsCheckinMutation,
  useSaveMoodCheckinMutation,
} = habitsApi;
