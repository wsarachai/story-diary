/**
 * Optimistic-update and cache-granularity behaviour added by the
 * data-centric refactor:
 *
 *  - mutations patch the relevant cache synchronously and undo on failure
 *  - medicine check-in mirrors the server's meal-slot status rule
 *  - admin mutations cross-invalidate the user-facing caches
 *  - failed mutations enqueue the global failure toast (auth excluded)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { apiSlice } from "@/store/apiSlice";
import { habitsApi } from "@/store/habitsApi";
import { chaptersApi } from "@/store/chaptersApi";
import { adminApi } from "@/store/adminApi";
import { authApi } from "@/store/authApi";
import { toastReducer } from "@/store/toastSlice";
import { mutationErrorToastMiddleware } from "@/store/toastMiddleware";
import { server } from "../mocks/server";
import {
  MOCK_TOKEN,
  TODAY,
  ACTIVITY_MEDICINE,
  OCC_MEDICINE,
  MEDICINE_CHECKIN,
  TODAY_ENTRIES_RESPONSE,
} from "../fixtures";

function createStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      toast: toastReducer,
    },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        apiSlice.middleware,
        mutationErrorToastMiddleware
      ),
  });
}

type Store = ReturnType<typeof createStore>;

async function loadToday(store: Store) {
  await store.dispatch(habitsApi.endpoints.getTodayHabits.initiate(TODAY)).unwrap();
}

function todayStatus(store: Store, activityId: string) {
  const cache = habitsApi.endpoints.getTodayHabits.select(TODAY)(store.getState());
  return cache.data?.todayByActivity[activityId]?.status;
}

beforeEach(() => {
  localStorage.setItem("auth_token", MOCK_TOKEN);
});

describe("toggleOccurrence optimistic patch", () => {
  it("applies the new status synchronously", async () => {
    const store = createStore();
    await loadToday(store);
    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("pending");

    const promise = store.dispatch(
      habitsApi.endpoints.toggleOccurrence.initiate({
        occurrenceId: OCC_MEDICINE.id,
        activityId: ACTIVITY_MEDICINE.id,
        status: "done",
        date: TODAY,
      })
    );

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("done");
    await promise.unwrap();
  });

  it("rolls back on server failure", async () => {
    server.use(
      http.patch("/api/habits/occurrences/:id", () =>
        HttpResponse.json({ error: { code: "X", message: "boom" } }, { status: 500 })
      )
    );

    const store = createStore();
    await loadToday(store);

    await expect(
      store.dispatch(
        habitsApi.endpoints.toggleOccurrence.initiate({
          occurrenceId: OCC_MEDICINE.id,
          activityId: ACTIVITY_MEDICINE.id,
          status: "done",
          date: TODAY,
        })
      ).unwrap()
    ).rejects.toBeDefined();

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("pending");
  });
});

describe("saveMedicineCheckin status mirror", () => {
  it("marks done when all configured slots are checked", async () => {
    const store = createStore();
    await loadToday(store);

    // ACTIVITY_MEDICINE is configured with mealSlots: ["breakfast"].
    const promise = store.dispatch(
      habitsApi.endpoints.saveMedicineCheckin.initiate({
        ...MEDICINE_CHECKIN,
        activityId: ACTIVITY_MEDICINE.id,
        mealSlots: ["breakfast"],
        date: TODAY,
      })
    );

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("done");
    await promise.unwrap();
  });

  it("marks partial when only some configured slots are checked", async () => {
    server.use(
      http.get("/api/habits/today", () =>
        HttpResponse.json({
          entries: [
            {
              ...TODAY_ENTRIES_RESPONSE.entries[0],
              activity: { ...ACTIVITY_MEDICINE, mealSlots: ["breakfast", "dinner"] },
            },
          ],
        })
      )
    );

    const store = createStore();
    await loadToday(store);

    const promise = store.dispatch(
      habitsApi.endpoints.saveMedicineCheckin.initiate({
        ...MEDICINE_CHECKIN,
        activityId: ACTIVITY_MEDICINE.id,
        mealSlots: ["breakfast"],
        date: TODAY,
      })
    );

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("partial");
    await promise.unwrap();
  });

  it("marks pending when no configured slot is checked", async () => {
    const store = createStore();
    await loadToday(store);

    const promise = store.dispatch(
      habitsApi.endpoints.saveMedicineCheckin.initiate({
        ...MEDICINE_CHECKIN,
        activityId: ACTIVITY_MEDICINE.id,
        mealSlots: [],
        date: TODAY,
      })
    );

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("pending");
    await promise.unwrap();
  });
});

describe("deleteActivity optimistic removal", () => {
  it("removes the entry synchronously and keeps it removed on success", async () => {
    server.use(
      http.delete("/api/habits/activities/:id", () => HttpResponse.json({}))
    );

    const store = createStore();
    await loadToday(store);

    const promise = store.dispatch(
      habitsApi.endpoints.deleteActivity.initiate(ACTIVITY_MEDICINE.id)
    );

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBeUndefined();
    await promise.unwrap();
  });

  it("restores the entry when the server rejects", async () => {
    server.use(
      http.delete("/api/habits/activities/:id", () =>
        HttpResponse.json({ error: { code: "X", message: "boom" } }, { status: 500 })
      )
    );

    const store = createStore();
    await loadToday(store);

    await expect(
      store.dispatch(habitsApi.endpoints.deleteActivity.initiate(ACTIVITY_MEDICINE.id)).unwrap()
    ).rejects.toBeDefined();

    expect(todayStatus(store, ACTIVITY_MEDICINE.id)).toBe("pending");
  });
});

describe("admin cross-invalidation", () => {
  it("updateChapter refetches the user-facing chapter list", async () => {
    let chapterListCalls = 0;
    server.use(
      http.get("/api/chapters", () => {
        chapterListCalls += 1;
        return HttpResponse.json({ chapters: [] });
      }),
      http.patch("/api/admin/chapters/:id", () => HttpResponse.json({}))
    );

    const store = createStore();
    const subscription = store.dispatch(chaptersApi.endpoints.getChapterSummaries.initiate());
    await subscription.unwrap();
    expect(chapterListCalls).toBe(1);

    await store
      .dispatch(adminApi.endpoints.updateChapter.initiate({ id: 1, body: { title: "ใหม่" } }))
      .unwrap();

    await vi.waitFor(() => expect(chapterListCalls).toBe(2));
    subscription.unsubscribe();
  });
});

describe("failure toast middleware", () => {
  it("enqueues a toast when a mutation fails", async () => {
    server.use(
      http.patch("/api/habits/occurrences/:id", () =>
        HttpResponse.json({ error: { code: "X", message: "boom" } }, { status: 500 })
      )
    );

    const store = createStore();
    await loadToday(store);

    await store
      .dispatch(
        habitsApi.endpoints.toggleOccurrence.initiate({
          occurrenceId: OCC_MEDICINE.id,
          activityId: ACTIVITY_MEDICINE.id,
          status: "done",
          date: TODAY,
        })
      )
      .unwrap()
      .catch(() => undefined);

    const { toasts } = store.getState().toast;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
  });

  it("stays silent for auth endpoints and failed queries", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ error: { code: "AUTH", message: "no" } }, { status: 401 })
      ),
      http.get("/api/habits/weekly", () =>
        HttpResponse.json({ error: { code: "X", message: "boom" } }, { status: 500 })
      )
    );

    const store = createStore();
    await store
      .dispatch(authApi.endpoints.login.initiate({ username: "0812345678", password: "x" }))
      .unwrap()
      .catch(() => undefined);
    await store
      .dispatch(habitsApi.endpoints.getWeeklyHabits.initiate())
      .unwrap()
      .catch(() => undefined);

    expect(store.getState().toast.toasts).toHaveLength(0);
  });
});
