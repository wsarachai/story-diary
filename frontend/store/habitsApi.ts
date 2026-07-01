import { apiSlice } from "./apiSlice";
import type {
  HabitActivity,
  HabitOccurrence,
  HabitOccurrenceStatus,
  HabitGridCell,
  HabitGridRow,
  TodayHabitEntry,
  PeriodSummary,
  MonthlyGoal,
  MonthlyResults,
  MedicineCheckin,
  NutritionCheckin,
  UnusualSymptomsCheckin,
  MoodCheckin,
  ExerciseCheckin,
  MealSlot,
} from "@/types/habit";

/** Grid row keyed for the tracker pages. */
export interface GridRowView {
  activityName: string;
  accent: string;
  cells: HabitGridCell[];
  done: number;
  target: number;
}

interface TodayHabitsView {
  activities: Record<string, HabitActivity>;
  todayByActivity: Record<string, HabitOccurrence>;
}

function rowAccent(row: HabitGridRow): string {
  if (row.category === "medicine") return "#57a8db";
  if (row.category === "nutrition") return "#2eb563";
  const pc = row.physicalCategory;
  if (pc === "symptoms" || pc === "emotion-management") return "#e76f51";
  return "#ee8a4a";
}

function keyRowsByActivity(rows: HabitGridRow[]): Record<string, GridRowView> {
  const rowsByActivity: Record<string, GridRowView> = {};
  for (const row of rows) {
    rowsByActivity[row.activityId] = {
      activityName: row.activityName,
      accent: rowAccent(row),
      cells: row.cells,
      done: row.done,
      target: row.target,
    };
  }
  return rowsByActivity;
}

/**
 * Every habit mutation changes the aggregate views (today list, weekly and
 * monthly grids, monthly summary), so they always reconcile with the server
 * after the optimistic patch. Per-occurrence check-in caches are tagged by
 * occurrence id and only invalidated by their own mutation.
 */
const HABIT_AGGREGATES = [
  "HabitToday",
  "HabitWeekly",
  "HabitMonthly",
  "HabitMonthlySummary",
] as const;

/**
 * Mirrors the server's meal-slot rule in habitService.saveMedicineCheckin:
 * all configured slots checked → done, some → partial, none → pending.
 * No configured slots → done. Reconciled by HabitToday invalidation.
 */
function medicineStatus(configSlots: MealSlot[] | undefined, checkedSlots: MealSlot[]): HabitOccurrenceStatus {
  if (!configSlots || configSlots.length === 0) return "done";
  const allChecked = configSlots.every((slot) => checkedSlots.includes(slot));
  const someChecked = configSlots.some((slot) => checkedSlots.includes(slot));
  return allChecked ? "done" : someChecked ? "partial" : "pending";
}

/**
 * Mirrors habitService.saveNutritionCheckin: slot count drives status.
 * 3 slots → done, 1–2 → partial, 0 → pending.
 */
function nutritionMealStatus(mealSlots: MealSlot[]): HabitOccurrenceStatus {
  return mealSlots.length === 3 ? "done" : mealSlots.length > 0 ? "partial" : "pending";
}

export const habitsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTodayHabits: builder.query<TodayHabitsView, string>({
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
      providesTags: ["HabitToday"],
    }),
    getWeeklyHabits: builder.query<{
      weekStartDate: string;
      rowsByActivity: Record<string, GridRowView>;
      summary: PeriodSummary;
    }, void>({
      query: () => "/habits/weekly",
      transformResponse: (response: { weekStartDate: string; rowsByActivity: HabitGridRow[]; summary: PeriodSummary }) => ({
        weekStartDate: response.weekStartDate,
        rowsByActivity: keyRowsByActivity(response.rowsByActivity),
        summary: response.summary,
      }),
      providesTags: ["HabitWeekly"],
    }),
    getMonthlyHabits: builder.query<{
      month: string;
      rowsByActivity: Record<string, GridRowView>;
      summary: PeriodSummary;
    }, string>({
      query: (month) => `/habits/monthly?month=${month}`,
      transformResponse: (response: { month: string; rowsByActivity: HabitGridRow[]; summary: PeriodSummary }) => ({
        month: response.month,
        rowsByActivity: keyRowsByActivity(response.rowsByActivity),
        summary: response.summary,
      }),
      providesTags: ["HabitMonthly"],
    }),
    getMonthlySummary: builder.query<{ goals: MonthlyGoal[]; results: MonthlyResults }, string>({
      query: (month) => `/habits/monthly-summary?month=${month}`,
      providesTags: ["HabitMonthlySummary"],
    }),
    toggleOccurrence: builder.mutation<HabitOccurrence, { occurrenceId: string; activityId: string; status: HabitOccurrenceStatus; date: string }>({
      query: ({ occurrenceId, status }) => ({
        url: `/habits/occurrences/${occurrenceId}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: [...HABIT_AGGREGATES],
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
      transformResponse: (response: { activity: HabitActivity }) => response.activity,
      // Pessimistic: the server generates the id and occurrence, and may
      // reject with ACTIVITY_NAME_TAKEN.
      invalidatesTags: [...HABIT_AGGREGATES],
    }),
    deleteActivity: builder.mutation<void, string>({
      query: (activityId) => ({
        url: `/habits/activities/${activityId}`,
        method: "DELETE",
      }),
      invalidatesTags: [...HABIT_AGGREGATES],
      async onQueryStarted(activityId, { dispatch, getState, queryFulfilled }) {
        // The delete arg carries no date, so remove the entry from every
        // cached today view.
        const dates = habitsApi.util.selectCachedArgsForQuery(getState(), "getTodayHabits");
        const patches = dates.map((date) =>
          dispatch(
            habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
              delete draft.activities[activityId];
              delete draft.todayByActivity[activityId];
            })
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
    saveMedicineCheckin: builder.mutation<void, MedicineCheckin & { date: string; activityId: string }>({
      query: ({ date: _date, activityId: _activityId, ...checkin }) => ({
        url: "/habits/checkin/medicine",
        method: "POST",
        body: { ...checkin, date: _date },
      }),
      invalidatesTags: (result, error, { occurrenceId }) => [
        ...HABIT_AGGREGATES,
        { type: "HabitCheckin", id: occurrenceId },
      ],
      async onQueryStarted({ date, activityId, ...checkin }, { dispatch, queryFulfilled }) {
        const todayPatch = dispatch(
          habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
            const occ = draft.todayByActivity[activityId];
            if (occ) {
              const configSlots = draft.activities[activityId]?.mealSlots;
              occ.status = medicineStatus(configSlots, checkin.mealSlots);
              if (configSlots && configSlots.length > 0) {
                occ.doseProgress = {
                  taken: configSlots.filter((slot) => checkin.mealSlots.includes(slot)).length,
                  total: configSlots.length,
                };
              }
            }
          })
        );
        const detailPatch = dispatch(
          habitsApi.util.updateQueryData("getMedicineCheckin", checkin.occurrenceId, () => checkin)
        );
        try {
          await queryFulfilled;
        } catch {
          todayPatch.undo();
          detailPatch.undo();
        }
      },
    }),
    saveNutritionCheckin: builder.mutation<void, NutritionCheckin & { date: string; activityId: string }>({
      query: ({ date: _date, activityId: _activityId, ...checkin }) => ({
        url: "/habits/checkin/nutrition",
        method: "POST",
        body: { ...checkin, date: _date },
      }),
      invalidatesTags: (result, error, { occurrenceId }) => [
        "HabitWeekly",
        "HabitMonthly",
        "HabitMonthlySummary",
        { type: "HabitCheckin", id: occurrenceId },
      ],
      async onQueryStarted({ date, activityId, ...checkin }, { dispatch, queryFulfilled }) {
        const todayPatch = dispatch(
          habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
            const occ = draft.todayByActivity[activityId];
            if (occ) {
              const slots = checkin.mealSlots ?? [];
              occ.status = nutritionMealStatus(slots);
              occ.doseProgress = { taken: slots.length, total: 3 };
            }
          })
        );
        const detailPatch = dispatch(
          habitsApi.util.updateQueryData("getNutritionCheckin", checkin.occurrenceId, () => checkin)
        );
        try {
          await queryFulfilled;
        } catch {
          todayPatch.undo();
          detailPatch.undo();
        }
      },
    }),
    saveSymptomsCheckin: builder.mutation<void, UnusualSymptomsCheckin & { date: string; activityId: string }>({
      query: ({ date: _date, activityId: _activityId, ...checkin }) => ({
        url: `/habits/checkins/symptoms/${checkin.occurrenceId}`,
        method: "PUT",
        body: { ...checkin, date: _date },
      }),
      invalidatesTags: (result, error, { occurrenceId }) => [
        ...HABIT_AGGREGATES,
        { type: "HabitCheckin", id: occurrenceId },
      ],
      async onQueryStarted({ date, activityId, ...checkin }, { dispatch, queryFulfilled }) {
        const todayPatch = dispatch(
          habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
            const occ = draft.todayByActivity[activityId];
            if (occ) {
              occ.status = "done";
            }
          })
        );
        const detailPatch = dispatch(
          habitsApi.util.updateQueryData("getSymptomsCheckin", checkin.occurrenceId, () => checkin)
        );
        try {
          await queryFulfilled;
        } catch {
          todayPatch.undo();
          detailPatch.undo();
        }
      },
    }),
    saveMoodCheckin: builder.mutation<void, MoodCheckin & { date: string; activityId: string }>({
      query: ({ date: _date, activityId: _activityId, ...checkin }) => ({
        url: `/habits/checkins/mood/${checkin.occurrenceId}`,
        method: "PUT",
        body: { ...checkin, date: _date },
      }),
      invalidatesTags: (result, error, { occurrenceId }) => [
        ...HABIT_AGGREGATES,
        { type: "HabitCheckin", id: occurrenceId },
      ],
      async onQueryStarted({ date, activityId, ...checkin }, { dispatch, queryFulfilled }) {
        const todayPatch = dispatch(
          habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
            const occ = draft.todayByActivity[activityId];
            if (occ) {
              occ.status = "done";
            }
          })
        );
        const detailPatch = dispatch(
          habitsApi.util.updateQueryData("getMoodCheckin", checkin.occurrenceId, () => checkin)
        );
        try {
          await queryFulfilled;
        } catch {
          todayPatch.undo();
          detailPatch.undo();
        }
      },
    }),
    getMedicineCheckin: builder.query<MedicineCheckin | null, string>({
      query: (occurrenceId) => `/habits/checkins/medicine/${occurrenceId}`,
      transformResponse: (response: { checkin: MedicineCheckin | null }) => response.checkin,
      providesTags: (result, error, occurrenceId) => [{ type: "HabitCheckin", id: occurrenceId }],
    }),
    getNutritionCheckin: builder.query<NutritionCheckin | null, string>({
      query: (occurrenceId) => `/habits/checkins/nutrition/${occurrenceId}`,
      transformResponse: (response: { checkin: NutritionCheckin | null }) => response.checkin,
      providesTags: (result, error, occurrenceId) => [{ type: "HabitCheckin", id: occurrenceId }],
    }),
    getSymptomsCheckin: builder.query<UnusualSymptomsCheckin | null, string>({
      query: (occurrenceId) => `/habits/checkins/symptoms/${occurrenceId}`,
      transformResponse: (response: { checkin: UnusualSymptomsCheckin | null }) => response.checkin,
      providesTags: (result, error, occurrenceId) => [{ type: "HabitCheckin", id: occurrenceId }],
    }),
    getMoodCheckin: builder.query<MoodCheckin | null, string>({
      query: (occurrenceId) => `/habits/checkins/mood/${occurrenceId}`,
      transformResponse: (response: { checkin: MoodCheckin | null }) => response.checkin,
      providesTags: (result, error, occurrenceId) => [{ type: "HabitCheckin", id: occurrenceId }],
    }),
    saveExerciseCheckin: builder.mutation<void, ExerciseCheckin & { date: string; activityId: string }>({
      query: ({ date: _date, activityId: _activityId, ...checkin }) => ({
        url: `/habits/checkins/exercise/${checkin.occurrenceId}`,
        method: "PUT",
        body: { ...checkin, date: _date },
      }),
      invalidatesTags: (result, error, { occurrenceId }) => [
        ...HABIT_AGGREGATES,
        { type: "HabitCheckin", id: occurrenceId },
      ],
      async onQueryStarted({ date, activityId, ...checkin }, { dispatch, queryFulfilled }) {
        const todayPatch = dispatch(
          habitsApi.util.updateQueryData("getTodayHabits", date, (draft) => {
            const occ = draft.todayByActivity[activityId];
            if (occ) {
              occ.status = "done";
            }
          })
        );
        const detailPatch = dispatch(
          habitsApi.util.updateQueryData("getExerciseCheckin", checkin.occurrenceId, () => checkin)
        );
        try {
          await queryFulfilled;
        } catch {
          todayPatch.undo();
          detailPatch.undo();
        }
      },
    }),
    getExerciseCheckin: builder.query<ExerciseCheckin | null, string>({
      query: (occurrenceId) => `/habits/checkins/exercise/${occurrenceId}`,
      transformResponse: (response: { checkin: ExerciseCheckin | null }) => response.checkin,
      providesTags: (result, error, occurrenceId) => [{ type: "HabitCheckin", id: occurrenceId }],
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
  useDeleteActivityMutation,
  useSaveMedicineCheckinMutation,
  useSaveNutritionCheckinMutation,
  useSaveSymptomsCheckinMutation,
  useSaveMoodCheckinMutation,
  useGetMedicineCheckinQuery,
  useGetNutritionCheckinQuery,
  useGetSymptomsCheckinQuery,
  useGetMoodCheckinQuery,
  useSaveExerciseCheckinMutation,
  useGetExerciseCheckinQuery,
} = habitsApi;
