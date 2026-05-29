/**
 * Default MSW request handlers.
 *
 * These are the "always-on" baseline mocks.  Individual tests can override
 * any handler with server.use(...) for the duration of that test.
 *
 * Sections: AUTH · USER · HABITS-TODAY · HABITS-WEEKLY · HABITS-MONTHLY ·
 *           HABITS-ACTIVITIES · HABITS-OCCURRENCES · HABITS-CHECKINS
 */

import { http, HttpResponse } from "msw";
import {
  MOCK_USER,
  MOCK_TOKEN,
  TODAY_ENTRIES_RESPONSE,
  WEEKLY_RESPONSE,
  MONTHLY_RESPONSE,
  SUMMARY_RESPONSE,
  ACTIVITY_MEDICINE,
  OCC_MEDICINE,
  MEDICINE_CHECKIN,
  NUTRITION_CHECKIN,
  SYMPTOMS_CHECKIN,
  MOOD_CHECKIN,
  OCC_NUTRITION,
  OCC_SYMPTOMS,
  OCC_EMOTION,
} from "../fixtures";

export const handlers = [

  // ── AUTH ───────────────────────────────────────────────────────────────────

  http.get("/api/auth/me", () =>
    HttpResponse.json({ user: null }, { status: 401 })
  ),

  http.post("/api/auth/login", () =>
    HttpResponse.json({ user: MOCK_USER, token: MOCK_TOKEN })
  ),

  http.post("/api/auth/register", () =>
    HttpResponse.json({ user: MOCK_USER, token: MOCK_TOKEN }, { status: 201 })
  ),

  http.post("/api/auth/logout", () =>
    HttpResponse.json({})
  ),

  // ── USER ───────────────────────────────────────────────────────────────────

  http.patch("/api/users/me", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ user: { ...MOCK_USER, ...body } });
  }),

  // ── HABITS · today ─────────────────────────────────────────────────────────

  http.get("/api/habits/today", () =>
    HttpResponse.json(TODAY_ENTRIES_RESPONSE)
  ),

  // ── HABITS · weekly ────────────────────────────────────────────────────────

  http.get("/api/habits/weekly", () =>
    HttpResponse.json(WEEKLY_RESPONSE)
  ),

  // ── HABITS · monthly ───────────────────────────────────────────────────────

  http.get("/api/habits/monthly", () =>
    HttpResponse.json(MONTHLY_RESPONSE)
  ),

  http.get("/api/habits/monthly-summary", () =>
    HttpResponse.json(SUMMARY_RESPONSE)
  ),

  // ── HABITS · activities ────────────────────────────────────────────────────

  http.get("/api/habits/activities", () =>
    HttpResponse.json({ activities: [ACTIVITY_MEDICINE] })
  ),

  http.post("/api/habits/activities", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      activity: {
        id: "act-new-001",
        userId: MOCK_USER.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body,
      },
    }, { status: 201 });
  }),

  // ── HABITS · occurrences ────────────────────────────────────────────────────

  http.patch("/api/habits/occurrences/:id", async ({ request, params }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({
      occurrence: { ...OCC_MEDICINE, id: params.id as string, status: body.status },
    });
  }),

  // ── HABITS · checkin · medicine ────────────────────────────────────────────

  http.get("/api/habits/checkins/medicine/:occurrenceId", ({ params }) => {
    if (params.occurrenceId === OCC_MEDICINE.id) {
      return HttpResponse.json({ checkin: MEDICINE_CHECKIN });
    }
    return HttpResponse.json({ checkin: null });
  }),

  http.put("/api/habits/checkins/medicine/:occurrenceId", () =>
    HttpResponse.json({ ok: true })
  ),

  http.post("/api/habits/checkin/medicine", () =>
    HttpResponse.json({ ok: true })
  ),

  // ── HABITS · checkin · nutrition ───────────────────────────────────────────

  http.get("/api/habits/checkins/nutrition/:occurrenceId", ({ params }) => {
    if (params.occurrenceId === OCC_NUTRITION.id) {
      return HttpResponse.json({ checkin: NUTRITION_CHECKIN });
    }
    return HttpResponse.json({ checkin: null });
  }),

  http.put("/api/habits/checkins/nutrition/:occurrenceId", () =>
    HttpResponse.json({ ok: true })
  ),

  http.post("/api/habits/checkin/nutrition", () =>
    HttpResponse.json({ ok: true })
  ),

  // ── HABITS · checkin · symptoms ────────────────────────────────────────────

  http.get("/api/habits/checkins/symptoms/:occurrenceId", ({ params }) => {
    if (params.occurrenceId === OCC_SYMPTOMS.id) {
      return HttpResponse.json({ checkin: SYMPTOMS_CHECKIN });
    }
    return HttpResponse.json({ checkin: null });
  }),

  http.put("/api/habits/checkins/symptoms/:occurrenceId", () =>
    HttpResponse.json({ ok: true })
  ),

  // ── HABITS · checkin · mood ────────────────────────────────────────────────

  http.get("/api/habits/checkins/mood/:occurrenceId", ({ params }) => {
    if (params.occurrenceId === OCC_EMOTION.id) {
      return HttpResponse.json({ checkin: MOOD_CHECKIN });
    }
    return HttpResponse.json({ checkin: null });
  }),

  http.put("/api/habits/checkins/mood/:occurrenceId", () =>
    HttpResponse.json({ ok: true })
  ),
];
