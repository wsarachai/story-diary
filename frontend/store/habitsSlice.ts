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

// ── API response shapes ──────────────────────────────────────────────────

interface WeeklyRowApi {
  activityId: string;
  activityName: string;
  category: string;
  occurrences: HabitOccurrence[];
  dates: string[];
}

interface WeeklyApiResponse {
  weekStartDate: string;
  rowsByActivity: WeeklyRowApi[];
  summary: PeriodSummary;
}

interface MonthlyRowApi {
  activityId: string;
  activityName: string;
  category: string;
  occurrences: HabitOccurrence[];
  dates: string[];
}

interface MonthlyApiResponse {
  month: string;
  rowsByActivity: MonthlyRowApi[];
  summary: PeriodSummary;
}

// ── Thunks ───────────────────────────────────────────────────────────────

export const fetchToday = createAsyncThunk(
  "habits/fetchToday",
  async () => {
    const res = await fetch(`/api/habits/today?date=${today}`, { credentials: "include" });
    if (!res.ok) throw new Error("FETCH_TODAY_FAILED");
    const data = await res.json() as { entries: TodayHabitEntry[] };

    // Reshape into what the slice state expects
    const activities: Record<string, HabitActivity> = {};
    const todayByActivity: Record<string, HabitOccurrence> = {};
    for (const entry of data.entries) {
      activities[entry.activity.id] = entry.activity;
      todayByActivity[entry.activity.id] = entry.occurrence;
    }
    return { activities, todayByActivity };
  }
);

export const fetchWeekly = createAsyncThunk<
  { weekStartDate: string; rowsByActivity: Record<string, HabitOccurrenceStatus[]>; summary: PeriodSummary }
>("habits/fetchWeekly", async () => {
  const res = await fetch("/api/habits/weekly", { credentials: "include" });
  if (!res.ok) throw new Error("FETCH_WEEKLY_FAILED");
  const data = await res.json() as WeeklyApiResponse;

  // Convert array of WeeklyRowApi to Record<activityId, HabitOccurrenceStatus[]>
  const rowsByActivity: Record<string, HabitOccurrenceStatus[]> = {};
  for (const row of data.rowsByActivity) {
    rowsByActivity[row.activityId] = row.occurrences.map((o) => o.status);
  }

  return {
    weekStartDate: data.weekStartDate,
    rowsByActivity,
    summary: data.summary,
  };
});

export const fetchMonthly = createAsyncThunk<
  { month: string; rowsByActivity: Record<string, HabitOccurrenceStatus[]>; summary: PeriodSummary }
>("habits/fetchMonthly", async () => {
  const month = today.slice(0, 7);
  const res = await fetch(`/api/habits/monthly?month=${month}`, { credentials: "include" });
  if (!res.ok) throw new Error("FETCH_MONTHLY_FAILED");
  const data = await res.json() as MonthlyApiResponse;

  const rowsByActivity: Record<string, HabitOccurrenceStatus[]> = {};
  for (const row of data.rowsByActivity) {
    rowsByActivity[row.activityId] = row.occurrences.map((o) => o.status);
  }

  return {
    month: data.month,
    rowsByActivity,
    summary: data.summary,
  };
});

export const fetchMonthlySummary = createAsyncThunk(
  "habits/fetchMonthlySummary",
  async () => {
    const month = today.slice(0, 7);
    const res = await fetch(`/api/habits/monthly-summary?month=${month}`, { credentials: "include" });
    if (!res.ok) throw new Error("FETCH_SUMMARY_FAILED");
    const data = await res.json() as { goals: MonthlyGoal[]; results: MonthlyResults };
    return data;
  }
);

export const toggleOccurrence = createAsyncThunk(
  "habits/toggleOccurrence",
  async (
    { occurrenceId, activityId }: { occurrenceId: string; activityId: string },
    { getState }
  ) => {
    const state = getState() as HabitsRootState;
    const occ = state.habits.todayByActivity[activityId];
    // The optimistic update (pending action) already flipped the status;
    // getState() here returns the post-flip state — use it as the target.
    const newStatus: HabitOccurrenceStatus = occ?.status ?? "pending";
    const res = await fetch(`/api/habits/occurrences/${occurrenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error("TOGGLE_FAILED");
    const data = await res.json() as { occurrence: HabitOccurrence };
    return { occurrenceId, activityId, occurrence: data.occurrence };
  }
);

export const createActivity = createAsyncThunk(
  "habits/createActivity",
  async (
    activity: Omit<HabitActivity, "id" | "createdAt" | "updatedAt">,
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch("/api/habits/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(activity),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        return rejectWithValue("SAVE_FAILED");
      }
      return (data as { activity: HabitActivity }).activity;
    } catch {
      return rejectWithValue("SAVE_FAILED");
    }
  }
);

export const saveMedicineCheckin = createAsyncThunk(
  "habits/saveMedicineCheckin",
  async (checkin: MedicineCheckin, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/habits/checkin/medicine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(checkin),
      });
      if (!res.ok) return rejectWithValue("CHECKIN_FAILED");
      return checkin.occurrenceId;
    } catch {
      return rejectWithValue("CHECKIN_FAILED");
    }
  }
);

export const saveNutritionCheckin = createAsyncThunk(
  "habits/saveNutritionCheckin",
  async (checkin: NutritionCheckin, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/habits/checkin/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(checkin),
      });
      if (!res.ok) return rejectWithValue("CHECKIN_FAILED");
      return checkin.occurrenceId;
    } catch {
      return rejectWithValue("CHECKIN_FAILED");
    }
  }
);

export const saveSymptomsCheckin = createAsyncThunk(
  "habits/saveSymptomsCheckin",
  async (checkin: UnusualSymptomsCheckin, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/habits/checkins/symptoms/${checkin.occurrenceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(checkin),
      });
      if (!res.ok) return rejectWithValue("CHECKIN_FAILED");
      return checkin.occurrenceId;
    } catch {
      return rejectWithValue("CHECKIN_FAILED");
    }
  }
);

export const saveMoodCheckin = createAsyncThunk(
  "habits/saveMoodCheckin",
  async (checkin: MoodCheckin, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/habits/checkins/mood/${checkin.occurrenceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(checkin),
      });
      if (!res.ok) return rejectWithValue("CHECKIN_FAILED");
      return checkin.occurrenceId;
    } catch {
      return rejectWithValue("CHECKIN_FAILED");
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────

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
      // Optimistic toggle: flip before the request, revert on failure
      .addCase(toggleOccurrence.pending, (state, action) => {
        const { occurrenceId, activityId } = action.meta.arg;
        state.pendingToggles[occurrenceId] = true;
        const occ = state.todayByActivity[activityId];
        if (occ) {
          occ.status = occ.status === "done" ? "pending" : "done";
        }
      })
      .addCase(toggleOccurrence.fulfilled, (state, action) => {
        const { occurrenceId, activityId, occurrence } = action.payload;
        delete state.pendingToggles[occurrenceId];
        // Sync with server-confirmed status
        if (state.todayByActivity[activityId]) {
          state.todayByActivity[activityId] = occurrence;
        }
      })
      .addCase(toggleOccurrence.rejected, (state, action) => {
        const { occurrenceId, activityId } = action.meta.arg;
        delete state.pendingToggles[occurrenceId];
        state.toggleErrors[occurrenceId] = "บันทึกไม่สำเร็จ";
        // Revert optimistic update
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
  if (activity.category === "medicine") return "#57a8db";
  if (activity.category === "nutrition") return "#2eb563";
  const pc = activity.physicalCategory;
  if (pc === "symptoms" || pc === "emotion-management") return "#e76f51";
  return "#ee8a4a";
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
