# Spec: Habit Activity Authoring and Check-in

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Add-activity hub, medicine/nutrition/physical activity forms, and check-in forms for medicine, nutrition, symptoms, and emotion.

---

## Summary

Users can create habit activities in three categories: medicine, nutrition, and physical. The add hub presents category tiles; selecting a category opens a modal-style form card where the user configures a name, schedule frequency (daily, weekly, monthly, to-do), and category-specific fields. Physical activities have a sub-menu with eight preset types. Activity creation calls `POST /api/habits/activities` and redirects to the daily view. Check-in forms are reached by tapping a tappable entry in the daily view and record supplementary data (side effects, meal details, symptom items, mood) for the corresponding occurrence.

---

## Routes

### Add activity

| Route | Page file | Description |
|-------|-----------|-------------|
| `/habit/add` | `frontend/app/(authed)/habit/add/page.tsx` | Category selector hub (medicine, nutrition, physical) |
| `/habit/add/medicine` | `frontend/app/(authed)/habit/add/medicine/page.tsx` | Medicine form: name, icon color, meal relation, meal slots, frequency, weekdays; also handles nutrition preset via `?type=` query param |
| `/habit/add/nutrition` | `frontend/app/(authed)/habit/add/nutrition/page.tsx` | Nutrition preset selection list |
| `/habit/add/physical` | `frontend/app/(authed)/habit/add/physical/page.tsx` | Physical sub-category menu (8 types) |
| `/habit/add/physical/emotion` | `frontend/app/(authed)/habit/add/physical/emotion/page.tsx` | Emotion management sub-menu |
| `/habit/add/physical/emotion/explore` | `frontend/app/(authed)/habit/add/physical/emotion/explore/page.tsx` | Emotion explore sub-category |
| `/habit/add/physical/form` | `frontend/app/(authed)/habit/add/physical/form/page.tsx` | Generic physical activity form (prefilled name via `?name=`) |
| `/habit/add/physical/infection` | `frontend/app/(authed)/habit/add/physical/infection/page.tsx` | Infection prevention activity form |
| `/habit/add/physical/sunlight` | `frontend/app/(authed)/habit/add/physical/sunlight/page.tsx` | Sunlight exposure activity form |
| `/habit/add/physical/symptoms` | `frontend/app/(authed)/habit/add/physical/symptoms/page.tsx` | Unusual symptoms tracking activity form |

### Check-in

| Route | Page file | Description |
|-------|-----------|-------------|
| `/habit/checkin/medicine` | `frontend/app/(authed)/habit/checkin/medicine/page.tsx` | Medicine check-in: records side effects for an occurrence |
| `/habit/checkin/nutrition` | `frontend/app/(authed)/habit/checkin/nutrition/page.tsx` | Nutrition check-in: records breakfast, lunch, dinner meal details |
| `/habit/checkin/symptom` | `frontend/app/(authed)/habit/checkin/symptom/page.tsx` | Symptom check-in: records unusual symptoms checklist |
| `/habit/checkin/emotion` | `frontend/app/(authed)/habit/checkin/emotion/page.tsx` | Emotion check-in: records mood with slider |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `POST` | `/api/habits/activities` | `frontend/app/api/habits/activities/route.ts` | Create a new activity |
| `DELETE` | `/api/habits/activities/[id]` | `frontend/app/api/habits/activities/[id]/route.ts` | Archive/delete activity |
| `POST` | `/api/habits/checkin/medicine` | `frontend/app/api/habits/checkin/medicine/route.ts` | Save medicine check-in |
| `POST` | `/api/habits/checkin/nutrition` | `frontend/app/api/habits/checkin/nutrition/route.ts` | Save nutrition check-in |
| `PUT` | `/api/habits/checkins/symptoms/[occurrenceId]` | `frontend/app/api/habits/checkins/symptoms/[occurrenceId]/route.ts` | Save symptoms check-in |
| `PUT` | `/api/habits/checkins/mood/[occurrenceId]` | `frontend/app/api/habits/checkins/mood/[occurrenceId]/route.ts` | Save mood/emotion check-in |
| `GET` | `/api/habits/checkins/medicine/[occurrenceId]` | `frontend/app/api/habits/checkins/medicine/[occurrenceId]/route.ts` | Load existing medicine check-in |
| `GET` | `/api/habits/checkins/nutrition/[occurrenceId]` | `frontend/app/api/habits/checkins/nutrition/[occurrenceId]/route.ts` | Load existing nutrition check-in |
| `GET` | `/api/habits/checkins/symptoms/[occurrenceId]` | `frontend/app/api/habits/checkins/symptoms/[occurrenceId]/route.ts` | Load existing symptoms check-in |
| `GET` | `/api/habits/checkins/mood/[occurrenceId]` | `frontend/app/api/habits/checkins/mood/[occurrenceId]/route.ts` | Load existing mood check-in |

---

## Key Components

- `AddActivityPage` — `frontend/app/(authed)/habit/add/page.tsx` — three category tab links with SVG icons
- `MedicinePage` — `frontend/app/(authed)/habit/add/medicine/page.tsx` — shared form component used for both medicine (with meal relation/slots) and nutrition presets (via `?type=` param); supports daily/weekly/monthly/to-do frequency; icon color picker dialog; discard confirmation dialog on unsaved changes
- `AddPhysicalPage` — `frontend/app/(authed)/habit/add/physical/page.tsx` — menu list of 8 physical sub-categories; some link to further sub-menus, others go directly to the generic form
- `MedicineCheckinPage` — `frontend/app/(authed)/habit/checkin/medicine/page.tsx` — two-page layout; left shows medicine name, timing chips, date; right shows side-effect checkboxes; loads existing check-in via `occurrenceId` query param
- `NutritionCheckinPage` — `frontend/app/(authed)/habit/checkin/nutrition/page.tsx` — records meal details per slot
- `SymptomCheckinPage` — `frontend/app/(authed)/habit/checkin/symptom/page.tsx` — records unusual symptoms checklist
- `EmotionCheckinPage` — `frontend/app/(authed)/habit/checkin/emotion/page.tsx` — records mood with slider

---

## State

Redux slice: `frontend/store/habitsApi.ts` — `createActivity`, `deleteActivity`, `saveMedicineCheckin`, `saveNutritionCheckin`, `saveSymptomsCheckin`, `saveMoodCheckin` mutations; `getMedicineCheckin`, `getNutritionCheckin`, `getSymptomsCheckin`, `getMoodCheckin` queries for pre-populating check-in forms from existing data. All mutations invalidate the `Habits` tag to refresh tracker views.

Activity form state is managed locally with `useReducer` inside each form page.
