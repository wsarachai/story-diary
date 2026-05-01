import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
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

interface HabitsState {
  activities: Record<string, HabitActivity>;
  todayByActivity: Record<string, HabitOccurrence | undefined>;
  pendingToggles: Record<string, true>;
  toggleErrors: Record<string, string | undefined>;
  weekly: {
    weekStartDate: string;
    rowsByActivity: Record<string, HabitOccurrenceStatus[]>;
    summary: PeriodSummary;
  } | null;
  monthly: {
    month: string;
    rowsByActivity: Record<string, HabitOccurrenceStatus[]>;
    summary: PeriodSummary;
  } | null;
  monthlySummary: { goals: MonthlyGoal[]; results: MonthlyResults } | null;
  fetchStatus: {
    today: "idle" | "loading" | "ready" | "error";
    weekly: "idle" | "loading" | "ready" | "error";
    monthly: "idle" | "loading" | "ready" | "error";
    summary: "idle" | "loading" | "ready" | "error";
  };
  activitySaveStatus: "idle" | "saving" | "saved" | "error";
  activitySaveErrors: Record<string, string | undefined>;
  checkinSaveStatus: "idle" | "saving" | "saved" | "error";
  checkinSaveErrors: Record<string, string | undefined>;
  lastCreatedActivityId: string | null;
}

const today = new Date().toISOString().split("T")[0]!;

const MOCK_ACTIVITIES: Record<string, HabitActivity> = {
  "act-1": {
    id: "act-1",
    category: "medicine",
    name: "กินยา xxx",
    schedule: { frequency: "daily", weekdays: [1, 2, 3, 4, 5] },
    mealRelation: "after",
    mealSlots: ["breakfast", "dinner"],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  "act-2": {
    id: "act-2",
    category: "nutrition",
    name: "รับประทานอาหารครบ 5 หมู่",
    schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  "act-3": {
    id: "act-3",
    category: "physical",
    physicalCategory: "exercise",
    name: "ท่าออกกำลังกาย",
    schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  "act-4": {
    id: "act-4",
    category: "physical",
    physicalCategory: "symptoms",
    name: "สังเกตอาการผิดปกติ",
    schedule: { frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
};

const MOCK_TODAY_OCCURRENCES: Record<string, HabitOccurrence> = {
  "act-1": { id: "occ-1", activityId: "act-1", date: today, status: "done" },
  "act-2": { id: "occ-2", activityId: "act-2", date: today, status: "pending" },
  "act-3": { id: "occ-3", activityId: "act-3", date: today, status: "pending" },
  "act-4": { id: "occ-4", activityId: "act-4", date: today, status: "pending" },
};

const D: HabitOccurrenceStatus = "done";
const P: HabitOccurrenceStatus = "pending";
const S: HabitOccurrenceStatus = "skipped";

const MOCK_WEEKLY = {
  weekStartDate: today,
  rowsByActivity: {
    "act-1": [D, D, D, S, D, P, P] as HabitOccurrenceStatus[],
    "act-2": [D, D, P, D, D, P, P] as HabitOccurrenceStatus[],
    "act-3": [D, P, D, P, D, P, P] as HabitOccurrenceStatus[],
    "act-4": [D, D, D, D, D, P, P] as HabitOccurrenceStatus[],
  },
  summary: { done: 17, target: 35 },
};

const MOCK_MONTHLY = {
  month: today.slice(0, 7),
  rowsByActivity: {
    "act-1": Array.from({ length: 31 }, (_, i) =>
      i < 14 ? (i % 4 === 3 ? S : D) : i === 14 ? P : P
    ) as HabitOccurrenceStatus[],
    "act-2": Array.from({ length: 31 }, (_, i) =>
      i < 14 ? (i % 7 === 6 ? S : D) : i === 14 ? P : P
    ) as HabitOccurrenceStatus[],
    "act-3": Array.from({ length: 31 }, (_, i) =>
      i < 14 ? (i % 2 === 0 ? D : P) : i === 14 ? P : P
    ) as HabitOccurrenceStatus[],
    "act-4": Array.from({ length: 31 }, (_, i) =>
      i < 14 ? D : i === 14 ? P : P
    ) as HabitOccurrenceStatus[],
  },
  summary: { done: 74, target: 120 },
};

const MOCK_SUMMARY = {
  goals: [
    { activityId: "act-1", name: "กินยา xxx", subline: "กิจกรรม · ทุกวัน · สำคัญมาก", progressPercent: 90 },
    { activityId: "act-2", name: "รับประทานอาหาร 5 หมู่", subline: "โภชนาการ · ทุกวัน · ทั่วไป", progressPercent: 70 },
    { activityId: "act-3", name: "ท่าออกกำลังกาย", subline: "กิจกรรมทางกาย · ทุกวัน · ทั่วไป", progressPercent: 50 },
  ],
  results: {
    totalDone: 127,
    target: 155,
    skipped: 8,
    fullDays: 11,
    longestStreak: 9,
    completionPercent: 72,
  },
};

const initialState: HabitsState = {
  activities: {},
  todayByActivity: {},
  pendingToggles: {},
  toggleErrors: {},
  weekly: null,
  monthly: null,
  monthlySummary: null,
  fetchStatus: {
    today: "idle",
    weekly: "idle",
    monthly: "idle",
    summary: "idle",
  },
  activitySaveStatus: "idle",
  activitySaveErrors: {},
  checkinSaveStatus: "idle",
  checkinSaveErrors: {},
  lastCreatedActivityId: null,
};

export const fetchToday = createAsyncThunk("habits/fetchToday", async () => {
  await new Promise((r) => setTimeout(r, 200));
  return { activities: MOCK_ACTIVITIES, todayByActivity: MOCK_TODAY_OCCURRENCES };
});

export const fetchWeekly = createAsyncThunk("habits/fetchWeekly", async () => {
  await new Promise((r) => setTimeout(r, 200));
  return MOCK_WEEKLY;
});

export const fetchMonthly = createAsyncThunk("habits/fetchMonthly", async () => {
  await new Promise((r) => setTimeout(r, 200));
  return MOCK_MONTHLY;
});

export const fetchMonthlySummary = createAsyncThunk(
  "habits/fetchMonthlySummary",
  async () => {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_SUMMARY;
  }
);

export const toggleOccurrence = createAsyncThunk(
  "habits/toggleOccurrence",
  async ({ occurrenceId, activityId }: { occurrenceId: string; activityId: string }) => {
    await new Promise((r) => setTimeout(r, 300));
    return { occurrenceId, activityId };
  }
);

export const createActivity = createAsyncThunk(
  "habits/createActivity",
  async (activity: Omit<HabitActivity, "id" | "createdAt" | "updatedAt">, { rejectWithValue }) => {
    await new Promise((r) => setTimeout(r, 400));
    const newActivity: HabitActivity = {
      ...activity,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newActivity;
    void rejectWithValue; // unused in mock
  }
);

export const saveMedicineCheckin = createAsyncThunk(
  "habits/saveMedicineCheckin",
  async (checkin: MedicineCheckin) => {
    await new Promise((r) => setTimeout(r, 300));
    return checkin.occurrenceId;
  }
);

export const saveNutritionCheckin = createAsyncThunk(
  "habits/saveNutritionCheckin",
  async (checkin: NutritionCheckin) => {
    await new Promise((r) => setTimeout(r, 300));
    return checkin.occurrenceId;
  }
);

export const saveSymptomsCheckin = createAsyncThunk(
  "habits/saveSymptomsCheckin",
  async (checkin: UnusualSymptomsCheckin) => {
    await new Promise((r) => setTimeout(r, 300));
    return checkin.occurrenceId;
  }
);

export const saveMoodCheckin = createAsyncThunk(
  "habits/saveMoodCheckin",
  async (checkin: MoodCheckin) => {
    await new Promise((r) => setTimeout(r, 300));
    return checkin.occurrenceId;
  }
);

const habitsSlice = createSlice({
  name: "habits",
  initialState,
  reducers: {
    clearToggleError(state, action: PayloadAction<string>) {
      delete state.toggleErrors[action.payload];
    },
    clearSaveStatus(state) {
      state.activitySaveStatus = "idle";
      state.activitySaveErrors = {};
      state.checkinSaveStatus = "idle";
      state.checkinSaveErrors = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchToday.pending, (state) => {
        state.fetchStatus.today = "loading";
      })
      .addCase(fetchToday.fulfilled, (state, action) => {
        state.fetchStatus.today = "ready";
        state.activities = action.payload.activities;
        state.todayByActivity = action.payload.todayByActivity;
      })
      .addCase(fetchToday.rejected, (state) => {
        state.fetchStatus.today = "error";
      })
      .addCase(fetchWeekly.pending, (state) => {
        state.fetchStatus.weekly = "loading";
      })
      .addCase(fetchWeekly.fulfilled, (state, action) => {
        state.fetchStatus.weekly = "ready";
        state.weekly = action.payload;
      })
      .addCase(fetchWeekly.rejected, (state) => {
        state.fetchStatus.weekly = "error";
      })
      .addCase(fetchMonthly.pending, (state) => {
        state.fetchStatus.monthly = "loading";
      })
      .addCase(fetchMonthly.fulfilled, (state, action) => {
        state.fetchStatus.monthly = "ready";
        state.monthly = action.payload;
      })
      .addCase(fetchMonthly.rejected, (state) => {
        state.fetchStatus.monthly = "error";
      })
      .addCase(fetchMonthlySummary.pending, (state) => {
        state.fetchStatus.summary = "loading";
      })
      .addCase(fetchMonthlySummary.fulfilled, (state, action) => {
        state.fetchStatus.summary = "ready";
        state.monthlySummary = action.payload;
      })
      .addCase(fetchMonthlySummary.rejected, (state) => {
        state.fetchStatus.summary = "error";
      })
      .addCase(toggleOccurrence.pending, (state, action) => {
        const { occurrenceId, activityId } = action.meta.arg;
        state.pendingToggles[occurrenceId] = true;
        const occ = state.todayByActivity[activityId];
        if (occ) {
          occ.status = occ.status === "done" ? "pending" : "done";
        }
      })
      .addCase(toggleOccurrence.fulfilled, (state, action) => {
        const { occurrenceId } = action.payload;
        delete state.pendingToggles[occurrenceId];
      })
      .addCase(toggleOccurrence.rejected, (state, action) => {
        const { occurrenceId, activityId } = action.meta.arg;
        delete state.pendingToggles[occurrenceId];
        state.toggleErrors[occurrenceId] = "บันทึกไม่สำเร็จ";
        const occ = state.todayByActivity[activityId];
        if (occ) {
          occ.status = occ.status === "done" ? "pending" : "done";
        }
      })
      .addCase(createActivity.pending, (state) => {
        state.activitySaveStatus = "saving";
        state.activitySaveErrors = {};
      })
      .addCase(createActivity.fulfilled, (state, action) => {
        state.activitySaveStatus = "saved";
        state.lastCreatedActivityId = action.payload.id;
        state.activities[action.payload.id] = action.payload;
      })
      .addCase(createActivity.rejected, (state) => {
        state.activitySaveStatus = "error";
        state.activitySaveErrors.name = "เกิดข้อผิดพลาดในการบันทึก";
      })
      .addCase(saveMedicineCheckin.pending, (state) => {
        state.checkinSaveStatus = "saving";
      })
      .addCase(saveMedicineCheckin.fulfilled, (state, action) => {
        state.checkinSaveStatus = "saved";
        const occ = Object.values(state.todayByActivity).find(
          (o) => o?.id === action.payload
        );
        if (occ) occ.status = "done";
      })
      .addCase(saveMedicineCheckin.rejected, (state) => {
        state.checkinSaveStatus = "error";
      })
      .addCase(saveNutritionCheckin.pending, (state) => {
        state.checkinSaveStatus = "saving";
      })
      .addCase(saveNutritionCheckin.fulfilled, (state, action) => {
        state.checkinSaveStatus = "saved";
        const occ = Object.values(state.todayByActivity).find(
          (o) => o?.id === action.payload
        );
        if (occ) occ.status = "done";
      })
      .addCase(saveNutritionCheckin.rejected, (state) => {
        state.checkinSaveStatus = "error";
      })
      .addCase(saveSymptomsCheckin.pending, (state) => {
        state.checkinSaveStatus = "saving";
      })
      .addCase(saveSymptomsCheckin.fulfilled, (state, action) => {
        state.checkinSaveStatus = "saved";
        const occ = Object.values(state.todayByActivity).find(
          (o) => o?.id === action.payload
        );
        if (occ) occ.status = "done";
      })
      .addCase(saveSymptomsCheckin.rejected, (state) => {
        state.checkinSaveStatus = "error";
      })
      .addCase(saveMoodCheckin.pending, (state) => {
        state.checkinSaveStatus = "saving";
      })
      .addCase(saveMoodCheckin.fulfilled, (state, action) => {
        state.checkinSaveStatus = "saved";
        const occ = Object.values(state.todayByActivity).find(
          (o) => o?.id === action.payload
        );
        if (occ) occ.status = "done";
      })
      .addCase(saveMoodCheckin.rejected, (state) => {
        state.checkinSaveStatus = "error";
      });
  },
});

export const { clearToggleError, clearSaveStatus } = habitsSlice.actions;
export default habitsSlice.reducer;

type HabitsRootState = { habits: HabitsState };

function getAccent(activity: HabitActivity): `#${string}` {
  if (activity.category === "medicine") return "#9b5de5";
  if (activity.category === "nutrition") return "#f4a261";
  const pc = activity.physicalCategory;
  if (pc === "symptoms" || pc === "emotion-management") return "#e76f51";
  return "#2a9d8f";
}

function getSubline(activity: HabitActivity): string {
  const { schedule, mealRelation, mealSlots } = activity;
  if (
    activity.category === "medicine" &&
    mealRelation &&
    mealSlots &&
    mealSlots.length > 0
  ) {
    const relation = mealRelation === "after" ? "หลัง" : "ก่อน";
    const slots = mealSlots
      .map((s) => {
        if (s === "breakfast") return "อาหารเช้า";
        if (s === "lunch") return "อาหารกลางวัน";
        if (s === "dinner") return "อาหารเย็น";
        return "ก่อนนอน";
      })
      .join("-");
    return `${relation}${slots}`;
  }
  if (schedule.frequency === "daily") return "ทุกวัน";
  if (schedule.frequency === "weekly") return `${(schedule as { daysPerWeek: number }).daysPerWeek} วัน/สัปดาห์`;
  if (schedule.frequency === "monthly") return `${(schedule as { daysPerMonth: number }).daysPerMonth} วัน/เดือน`;
  return "ทั่วไป";
}

export const selectTodayEntries = (state: HabitsRootState): TodayHabitEntry[] =>
  Object.values(state.habits.activities)
    .filter((a): a is HabitActivity => !!a)
    .map((activity) => ({
      activity,
      occurrence: state.habits.todayByActivity[activity.id] ?? {
        id: `temp-${activity.id}`,
        activityId: activity.id,
        date: today,
        status: "pending" as HabitOccurrenceStatus,
      },
      subline: getSubline(activity),
      accent: getAccent(activity),
    }));

export const selectTodayHasEntries = (state: HabitsRootState) =>
  Object.keys(state.habits.activities).length > 0;

export const selectWeeklyRows = (state: HabitsRootState) => {
  if (!state.habits.weekly) return [];
  const { rowsByActivity } = state.habits.weekly;
  return Object.entries(rowsByActivity).map(([activityId, cells]) => ({
    activityName: state.habits.activities[activityId]?.name ?? activityId,
    cells,
  }));
};

export const selectWeeklySummary = (state: HabitsRootState) =>
  state.habits.weekly?.summary ?? null;

export const selectMonthlyRows = (state: HabitsRootState) => {
  if (!state.habits.monthly) return [];
  const { rowsByActivity } = state.habits.monthly;
  return Object.entries(rowsByActivity).map(([activityId, cells]) => ({
    activityName: state.habits.activities[activityId]?.name ?? activityId,
    cells,
  }));
};

export const selectMonthlySummary = (state: HabitsRootState) =>
  state.habits.monthly?.summary ?? null;

export const selectMonthlyGoalsSummary = (state: HabitsRootState) =>
  state.habits.monthlySummary;

export const selectIsToggling = (state: HabitsRootState, occId: string) =>
  Boolean(state.habits.pendingToggles[occId]);

export const selectFetchStatus = (state: HabitsRootState) =>
  state.habits.fetchStatus;

export const selectActivitySaveStatus = (state: HabitsRootState) =>
  state.habits.activitySaveStatus;

export const selectActivityFieldError = (state: HabitsRootState, field: string) =>
  state.habits.activitySaveErrors[field];

export const selectCheckinSaveStatus = (state: HabitsRootState) =>
  state.habits.checkinSaveStatus;

export const selectActivityById = (state: HabitsRootState, id: string) =>
  state.habits.activities[id];
