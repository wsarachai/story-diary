/**
 * habitsApi integration tests — Story Diary
 *
 * Verifies RTK Query ↔ MSW contract for every habits endpoint:
 *
 *   getTodayHabits      – transformResponse, tag provision
 *   toggleOccurrence    – optimistic update, rollback on failure
 *   createActivity      – POST, cache invalidation
 *   getWeeklyHabits     – transformResponse (arrays → keyed maps)
 *   getMonthlyHabits    – transformResponse
 *   getMonthlySummary   – passthrough query
 *   saveMedicineCheckin – POST, invalidatesTags
 *   getMedicineCheckin  – GET, transformResponse (unwrap { checkin })
 *   saveNutritionCheckin – POST, invalidatesTags
 *   getNutritionCheckin – GET, transformResponse
 *   saveSymptomsCheckin – PUT with occurrenceId in URL, invalidatesTags
 *   getSymptomsCheckin  – GET, transformResponse
 *   saveMoodCheckin     – PUT with occurrenceId in URL, invalidatesTags
 *   getMoodCheckin      – GET, transformResponse
 *
 * All test data comes from tests/fixtures.ts — never inline.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "@/store/apiSlice";
import { habitsApi } from "@/store/habitsApi";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";

import {
  MOCK_TOKEN,
  TODAY,
  WEEK_START,
  MONTH,
  ACTIVITY_MEDICINE,
  ACTIVITY_NUTRITION,
  ACTIVITY_EMOTION,
  ACTIVITY_EXERCISE,
  ACTIVITY_MONTHLY,
  OCC_MEDICINE,
  OCC_NUTRITION,
  OCC_SYMPTOMS,
  OCC_EMOTION,
  MEDICINE_CHECKIN,
  NUTRITION_CHECKIN,
  SYMPTOMS_CHECKIN,
  MOOD_CHECKIN,
  TODAY_ENTRIES_RESPONSE,
  WEEKLY_RESPONSE,
  MONTHLY_RESPONSE,
  SUMMARY_RESPONSE,
} from "../fixtures";

// ─── helpers ──────────────────────────────────────────────────────────────────

function createStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        apiSlice.middleware
      ),
  });
}

beforeEach(() => {
  localStorage.setItem("auth_token", MOCK_TOKEN);
});

// ─────────────────────────────────────────────────────────────────────────────
// getTodayHabits
// ─────────────────────────────────────────────────────────────────────────────

describe("getTodayHabits", () => {
  it("queries GET /habits/today?date=… with correct date parameter", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/habits/today", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(TODAY_ENTRIES_RESPONSE);
      })
    );

    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY)).unwrap();

    expect(capturedUrl).toContain(`date=${TODAY}`);
  });

  it("transformResponse builds activities map keyed by activity id", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY))
      .unwrap();

    expect(result.activities[ACTIVITY_MEDICINE.id]).toMatchObject({
      id: ACTIVITY_MEDICINE.id,
      name: ACTIVITY_MEDICINE.name,
      category: "medicine",
    });
    expect(result.activities[ACTIVITY_NUTRITION.id]).toMatchObject({
      id: ACTIVITY_NUTRITION.id,
      name: ACTIVITY_NUTRITION.name,
    });
  });

  it("transformResponse builds todayByActivity map keyed by activity id", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY))
      .unwrap();

    expect(result.todayByActivity[ACTIVITY_MEDICINE.id]).toMatchObject({
      id: OCC_MEDICINE.id,
      status: "pending",
    });
    expect(result.todayByActivity[ACTIVITY_EMOTION.id]).toMatchObject({
      id: OCC_EMOTION.id,
    });
  });

  it("returns all 4 entries from the fixture", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY))
      .unwrap();

    expect(Object.keys(result.activities)).toHaveLength(
      TODAY_ENTRIES_RESPONSE.entries.length
    );
  });

  it("returns empty maps when entries array is empty", async () => {
    server.use(
      http.get("/api/habits/today", () =>
        HttpResponse.json({ entries: [] })
      )
    );

    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY))
      .unwrap();

    expect(Object.keys(result.activities)).toHaveLength(0);
    expect(Object.keys(result.todayByActivity)).toHaveLength(0);
  });

  it("rejects when server returns 401", async () => {
    server.use(
      http.get("/api/habits/today", () =>
        HttpResponse.json({ error: { code: "UNAUTHENTICATED", message: "unauthorized" } }, { status: 401 })
      )
    );

    const store = createStore();
    await expect(
      store.dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY)).unwrap()
    ).rejects.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleOccurrence – optimistic update
// ─────────────────────────────────────────────────────────────────────────────

describe("toggleOccurrence", () => {
  it("sends PATCH /habits/occurrences/:id with the new status", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/habits/occurrences/:id", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ occurrence: { ...OCC_MEDICINE, status: "done" } });
      })
    );

    const store = createStore();
    await store
      .dispatch(
        habitsApi.endpoints.toggleOccurrence.initiate({
          occurrenceId: OCC_MEDICINE.id,
          activityId: ACTIVITY_MEDICINE.id,
          status: "done",
          date: TODAY,
        })
      )
      .unwrap();

    expect(capturedBody).toEqual({ status: "done" });
  });

  it("optimistically updates todayByActivity before the server confirms", async () => {
    // Pre-populate the getTodayHabits cache (medicine occ starts as "pending")
    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY)).unwrap();

    // Dispatch toggle — onQueryStarted synchronously applies the optimistic patch
    const togglePromise = store.dispatch(
      habitsApi.endpoints.toggleOccurrence.initiate({
        occurrenceId: OCC_MEDICINE.id,
        activityId: ACTIVITY_MEDICINE.id,
        status: "done",
        date: TODAY,
      })
    );

    // The optimistic update (dispatch inside onQueryStarted) runs before the
    // network response — waitFor until the synchronous patch is visible.
    await vi.waitFor(() => {
      const cached = habitsApi.endpoints.getTodayHabits.select(TODAY)(store.getState() as never);
      expect(cached.data?.todayByActivity[ACTIVITY_MEDICINE.id]?.status).toBe("done");
    });

    await togglePromise;
  });

  it("rolls back the optimistic update when the server returns an error", async () => {
    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY)).unwrap();

    server.use(
      http.patch("/api/habits/occurrences/:id", () =>
        HttpResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
      )
    );

    await store
      .dispatch(
        habitsApi.endpoints.toggleOccurrence.initiate({
          occurrenceId: OCC_MEDICINE.id,
          activityId: ACTIVITY_MEDICINE.id,
          status: "done",
          date: TODAY,
        })
      )
      .catch(() => {});

    await vi.waitFor(() => {
      const cached = habitsApi.endpoints.getTodayHabits.select(TODAY)(store.getState() as never);
      // Should revert to original "pending" status
      expect(cached.data?.todayByActivity[ACTIVITY_MEDICINE.id]?.status).toBe("pending");
    });
  });

  it("the URL embeds the occurrence id", async () => {
    let capturedUrl = "";
    server.use(
      http.patch("/api/habits/occurrences/:id", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ occurrence: { ...OCC_MEDICINE, status: "skipped" } });
      })
    );

    const store = createStore();
    await store.dispatch(
      habitsApi.endpoints.toggleOccurrence.initiate({
        occurrenceId: OCC_MEDICINE.id,
        activityId: ACTIVITY_MEDICINE.id,
        status: "skipped",
        date: TODAY,
      })
    ).unwrap();

    expect(capturedUrl).toContain(OCC_MEDICINE.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createActivity
// ─────────────────────────────────────────────────────────────────────────────

describe("createActivity", () => {
  it("sends POST /habits/activities with the activity payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/habits/activities", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ activity: { ...ACTIVITY_MEDICINE, id: "new-id" } }, { status: 201 });
      })
    );

    const store = createStore();
    const { userId: _omit, id: _id, createdAt: _c, updatedAt: _u, ...payload } = ACTIVITY_MEDICINE;
    await store.dispatch(habitsApi.endpoints.createActivity.initiate(payload as any)).unwrap();

    expect(capturedBody).toMatchObject({ name: ACTIVITY_MEDICINE.name, category: "medicine" });
  });

  it("returns the created activity", async () => {
    const store = createStore();
    const { userId: _omit, id: _id, createdAt: _c, updatedAt: _u, ...payload } = ACTIVITY_MEDICINE;
    const result = await store
      .dispatch(habitsApi.endpoints.createActivity.initiate(payload as any))
      .unwrap();

    expect(result.name).toBe(ACTIVITY_MEDICINE.name);
    expect(result.id).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getWeeklyHabits
// ─────────────────────────────────────────────────────────────────────────────

describe("getWeeklyHabits", () => {
  it("queries GET /habits/weekly", async () => {
    let hit = false;
    server.use(
      http.get("/api/habits/weekly", () => {
        hit = true;
        return HttpResponse.json(WEEKLY_RESPONSE);
      })
    );

    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getWeeklyHabits.initiate()).unwrap();
    expect(hit).toBe(true);
  });

  it("transformResponse converts rowsByActivity array to keyed map", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getWeeklyHabits.initiate())
      .unwrap();

    const row = result.rowsByActivity[ACTIVITY_EXERCISE.id ?? "act-exe-001"];
    expect(row).toBeDefined();
    expect(row.activityName).toBe(WEEKLY_RESPONSE.rowsByActivity[0].activityName);
  });

  it("transformResponse keeps the per-date grid cells", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getWeeklyHabits.initiate())
      .unwrap();

    const cells = result.rowsByActivity[ACTIVITY_EXERCISE.id ?? "act-exe-001"]?.cells;
    expect(cells).toHaveLength(7);
    expect(cells[0]).toMatchObject({ status: "done", scheduled: true });
    expect(cells[1].status).toBe("done");
    expect(cells[2].status).toBe("pending");
  });

  it("exposes per-row done and target", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getWeeklyHabits.initiate())
      .unwrap();

    const row = result.rowsByActivity[ACTIVITY_EXERCISE.id ?? "act-exe-001"];
    expect(row.done).toBe(2);
    expect(row.target).toBe(7);
  });

  it("exposes weekStartDate from the response", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getWeeklyHabits.initiate())
      .unwrap();

    expect(result.weekStartDate).toBe(WEEK_START);
  });

  it("exposes summary with done and target counts", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getWeeklyHabits.initiate())
      .unwrap();

    expect(result.summary.done).toBe(2);
    expect(result.summary.target).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMonthlyHabits
// ─────────────────────────────────────────────────────────────────────────────

describe("getMonthlyHabits", () => {
  it("queries GET /habits/monthly?month=…", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/habits/monthly", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(MONTHLY_RESPONSE);
      })
    );

    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getMonthlyHabits.initiate(MONTH)).unwrap();

    expect(capturedUrl).toContain(`month=${MONTH}`);
  });

  it("transformResponse converts rowsByActivity array to keyed map", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMonthlyHabits.initiate(MONTH))
      .unwrap();

    const row = result.rowsByActivity[ACTIVITY_MONTHLY.id ?? "act-mon-001"];
    expect(row).toBeDefined();
    expect(row.cells).toHaveLength(31);
  });

  it("cells reflect done/pending status from occurrences", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMonthlyHabits.initiate(MONTH))
      .unwrap();

    const cells = result.rowsByActivity[ACTIVITY_MONTHLY.id ?? "act-mon-001"]?.cells;
    expect(cells[14].status).toBe("done");
    expect(cells[0].status).toBe("pending");
  });

  it("exposes summary", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMonthlyHabits.initiate(MONTH))
      .unwrap();

    expect(result.summary.done).toBe(1);
    expect(result.summary.target).toBe(31);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMonthlySummary
// ─────────────────────────────────────────────────────────────────────────────

describe("getMonthlySummary", () => {
  it("returns goals array and results object", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMonthlySummary.initiate(MONTH))
      .unwrap();

    expect(result.goals).toHaveLength(2);
    expect(result.goals[0].activityId).toBe(ACTIVITY_MEDICINE.id);
    expect(result.results.completionPercent).toBe(48);
  });

  it("queries /habits/monthly-summary?month=…", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/habits/monthly-summary", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(SUMMARY_RESPONSE);
      })
    );

    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getMonthlySummary.initiate(MONTH)).unwrap();
    expect(capturedUrl).toContain(`month=${MONTH}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMedicineCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("getMedicineCheckin", () => {
  it("returns the checkin data for a known occurrence", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMedicineCheckin.initiate(OCC_MEDICINE.id))
      .unwrap();

    expect(result).not.toBeNull();
    expect(result!.medicineName).toBe(MEDICINE_CHECKIN.medicineName);
    expect(result!.mealRelation).toBe("after");
    expect(result!.sideEffects[0]).toMatchObject({ id: "se1", checked: true });
  });

  it("returns null for an unknown occurrence id", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMedicineCheckin.initiate("unknown-id"))
      .unwrap();

    expect(result).toBeNull();
  });

  it("unwraps the { checkin } envelope via transformResponse", async () => {
    server.use(
      http.get("/api/habits/checkins/medicine/:occurrenceId", () =>
        HttpResponse.json({ checkin: MEDICINE_CHECKIN })
      )
    );

    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMedicineCheckin.initiate(OCC_MEDICINE.id))
      .unwrap();

    // Should be the MedicineCheckin object directly, not { checkin: ... }
    expect((result as unknown as Record<string, unknown>).checkin).toBeUndefined();
    expect(result!.occurrenceId).toBe(OCC_MEDICINE.id);
  });

  it("passes the occurrence id in the URL path", async () => {
    let capturedPath = "";
    server.use(
      http.get("/api/habits/checkins/medicine/:occurrenceId", ({ params }) => {
        capturedPath = params.occurrenceId as string;
        return HttpResponse.json({ checkin: null });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.getMedicineCheckin.initiate(OCC_MEDICINE.id))
      .unwrap();

    expect(capturedPath).toBe(OCC_MEDICINE.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveMedicineCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("saveMedicineCheckin", () => {
  it("sends POST /habits/checkin/medicine with the full payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/habits/checkin/medicine", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveMedicineCheckin.initiate({
        ...MEDICINE_CHECKIN,
        activityId: OCC_MEDICINE.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect(capturedBody).toMatchObject({
      occurrenceId: OCC_MEDICINE.id,
      medicineName: MEDICINE_CHECKIN.medicineName,
      sideEffects: expect.arrayContaining([
        expect.objectContaining({ id: "se1", checked: true }),
      ]),
    });
  });

  it("rejects when server returns 422", async () => {
    server.use(
      http.post("/api/habits/checkin/medicine", () =>
        HttpResponse.json({ error: { code: "VALIDATION_ERROR", message: "bad" } }, { status: 422 })
      )
    );

    const store = createStore();
    await expect(
      store.dispatch(
        habitsApi.endpoints.saveMedicineCheckin.initiate({
          ...MEDICINE_CHECKIN,
          activityId: OCC_MEDICINE.activityId,
          date: TODAY,
        })
      ).unwrap()
    ).rejects.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getNutritionCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("getNutritionCheckin", () => {
  it("returns saved meal data for a known occurrence", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getNutritionCheckin.initiate(OCC_NUTRITION.id))
      .unwrap();

    expect(result).not.toBeNull();
    expect(result!.breakfast).toBe(NUTRITION_CHECKIN.breakfast);
    expect(result!.lunch).toBe(NUTRITION_CHECKIN.lunch);
    expect(result!.dinner).toBe(NUTRITION_CHECKIN.dinner);
  });

  it("returns null when no checkin exists", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getNutritionCheckin.initiate("no-data-id"))
      .unwrap();

    expect(result).toBeNull();
  });

  it("unwraps the { checkin } envelope", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getNutritionCheckin.initiate(OCC_NUTRITION.id))
      .unwrap();

    expect((result as unknown as Record<string, unknown>).checkin).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveNutritionCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("saveNutritionCheckin", () => {
  it("sends POST /habits/checkin/nutrition with meal fields", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/habits/checkin/nutrition", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveNutritionCheckin.initiate({
        ...NUTRITION_CHECKIN,
        activityId: OCC_NUTRITION.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect(capturedBody).toMatchObject({
      breakfast: NUTRITION_CHECKIN.breakfast,
      lunch: NUTRITION_CHECKIN.lunch,
      dinner: NUTRITION_CHECKIN.dinner,
    });
  });

  it("accepts empty meal strings without throwing", async () => {
    const store = createStore();
    await expect(
      store.dispatch(
        habitsApi.endpoints.saveNutritionCheckin.initiate({
          occurrenceId: OCC_NUTRITION.id,
          activityId: OCC_NUTRITION.activityId,
          activityName: "X",
          breakfast: "",
          lunch: "",
          dinner: "",
          date: TODAY,
        })
      ).unwrap()
    ).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSymptomsCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("getSymptomsCheckin", () => {
  it("returns the saved items array for a known occurrence", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getSymptomsCheckin.initiate(OCC_SYMPTOMS.id))
      .unwrap();

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(SYMPTOMS_CHECKIN.items.length);
    expect(result!.items[0]).toMatchObject({ id: "s1", checked: true });
    expect(result!.items[1]).toMatchObject({ id: "s2", checked: false });
  });

  it("preserves checked=false items — not just truthy ones", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getSymptomsCheckin.initiate(OCC_SYMPTOMS.id))
      .unwrap();

    const unchecked = result!.items.filter((i) => !i.checked);
    expect(unchecked.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown occurrence", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getSymptomsCheckin.initiate("unknown"))
      .unwrap();

    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveSymptomsCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("saveSymptomsCheckin", () => {
  it("sends PUT /habits/checkins/symptoms/:occurrenceId (not POST)", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("/api/habits/checkins/symptoms/:occurrenceId", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveSymptomsCheckin.initiate({
        ...SYMPTOMS_CHECKIN,
        activityId: OCC_SYMPTOMS.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain(OCC_SYMPTOMS.id);
  });

  it("sends the items array in the body", async () => {
    let capturedBody: unknown;
    server.use(
      http.put("/api/habits/checkins/symptoms/:occurrenceId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveSymptomsCheckin.initiate({
        ...SYMPTOMS_CHECKIN,
        activityId: OCC_SYMPTOMS.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect((capturedBody as any).items).toHaveLength(SYMPTOMS_CHECKIN.items.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMoodCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("getMoodCheckin", () => {
  it("returns mood and sliderValue for a known occurrence", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMoodCheckin.initiate(OCC_EMOTION.id))
      .unwrap();

    expect(result).not.toBeNull();
    expect(result!.mood).toBe(MOOD_CHECKIN.mood);
    expect(result!.sliderValue).toBe(MOOD_CHECKIN.sliderValue);
  });

  it("returns null for unknown occurrence", async () => {
    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMoodCheckin.initiate("unknown"))
      .unwrap();

    expect(result).toBeNull();
  });

  it("handles negative sliderValue correctly", async () => {
    server.use(
      http.get("/api/habits/checkins/mood/:occurrenceId", () =>
        HttpResponse.json({ checkin: { ...MOOD_CHECKIN, mood: "very-bad", sliderValue: -100 } })
      )
    );

    const store = createStore();
    const result = await store
      .dispatch(habitsApi.endpoints.getMoodCheckin.initiate(OCC_EMOTION.id))
      .unwrap();

    expect(result!.mood).toBe("very-bad");
    expect(result!.sliderValue).toBe(-100);
  });

  it("handles all 5 mood levels", async () => {
    const levels = ["very-bad", "bad", "neutral", "good", "very-good"] as const;
    for (const mood of levels) {
      server.use(
        http.get("/api/habits/checkins/mood/:occurrenceId", () =>
          HttpResponse.json({ checkin: { ...MOOD_CHECKIN, mood } })
        )
      );

      const store = createStore();
      const result = await store
        .dispatch(habitsApi.endpoints.getMoodCheckin.initiate(OCC_EMOTION.id))
        .unwrap();

      expect(result!.mood).toBe(mood);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// saveMoodCheckin
// ─────────────────────────────────────────────────────────────────────────────

describe("saveMoodCheckin", () => {
  it("sends PUT /habits/checkins/mood/:occurrenceId (not POST)", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.put("/api/habits/checkins/mood/:occurrenceId", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveMoodCheckin.initiate({
        ...MOOD_CHECKIN,
        activityId: OCC_EMOTION.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect(capturedMethod).toBe("PUT");
    expect(capturedUrl).toContain(OCC_EMOTION.id);
  });

  it("sends mood and sliderValue in the body", async () => {
    let capturedBody: unknown;
    server.use(
      http.put("/api/habits/checkins/mood/:occurrenceId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveMoodCheckin.initiate({
        ...MOOD_CHECKIN,
        activityId: OCC_EMOTION.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect((capturedBody as any).mood).toBe(MOOD_CHECKIN.mood);
    expect((capturedBody as any).sliderValue).toBe(MOOD_CHECKIN.sliderValue);
    expect((capturedBody as any).note).toBeNull();
  });
});

describe("saveMoodCheckin with note", () => {
  it("sends note in the body with null mood and sliderValue", async () => {
    let capturedBody: unknown;
    server.use(
      http.put("/api/habits/checkins/mood/:occurrenceId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveMoodCheckin.initiate({
        occurrenceId: OCC_EMOTION.id,
        mood: null,
        sliderValue: null,
        note: "went for a walk",
        activityId: OCC_EMOTION.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect((capturedBody as any).mood).toBeNull();
    expect((capturedBody as any).sliderValue).toBeNull();
    expect((capturedBody as any).note).toBe("went for a walk");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authorization header injection (cross-cutting)
// ─────────────────────────────────────────────────────────────────────────────

describe("Authorization header injection", () => {
  it("sends Bearer token on getTodayHabits", async () => {
    let capturedAuth = "";
    server.use(
      http.get("/api/habits/today", ({ request }) => {
        capturedAuth = request.headers.get("Authorization") ?? "";
        return HttpResponse.json(TODAY_ENTRIES_RESPONSE);
      })
    );

    localStorage.setItem("auth_token", "my-special-token");
    const store = createStore();
    await store.dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY)).unwrap();

    expect(capturedAuth).toBe("Bearer my-special-token");
  });

  it("sends Bearer token on saveMedicineCheckin", async () => {
    let capturedAuth = "";
    server.use(
      http.post("/api/habits/checkin/medicine", ({ request }) => {
        capturedAuth = request.headers.get("Authorization") ?? "";
        return HttpResponse.json({ ok: true });
      })
    );

    localStorage.setItem("auth_token", "checkin-token");
    const store = createStore();
    await store
      .dispatch(habitsApi.endpoints.saveMedicineCheckin.initiate({
        ...MEDICINE_CHECKIN,
        activityId: OCC_MEDICINE.activityId,
        date: TODAY,
      }))
      .unwrap();

    expect(capturedAuth).toBe("Bearer checkin-token");
  });
});

