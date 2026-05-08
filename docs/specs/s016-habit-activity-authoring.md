# Spec: Habit Tracker — Activity Authoring & Check-in (s016, s020–s030)

**Status:** Draft
**Owner:** Architect (handoff to frontend implementer + tester)
**Last updated:** 2026-05-01
**Scope:** UI architecture for the wizard that lets a user create new
habit activities (3 categories: medicine, nutrition, physical) and
perform per-occurrence check-ins (medicine, nutrition, symptoms,
emotion). Covers s016 and s020 through s030 (eleven wireframes).

---

## Summary

From the today list (s012) the user opens an "Add Activity" wizard
(s016) that branches by category into one of three sub-flows:

- **Medicine** → `s020-create-activity` (single form).
- **Nutrition** → `s021-create-nutrition` picklist → reuses `s020` with
  the chosen preset prefilled.
- **Physical activity** → `s024-create-physical-activity-menu` with 8
  sub-categories that fan out into 5 leaf forms (`s029`) and 4
  intermediate sub-menus (`s025`, `s026`, `s027`, `s030`), plus two
  bespoke check-in screens (`s027`, `s028`).

Two row-tap-to-check-in surfaces (`s022` medicine, `s023` nutrition)
sit alongside the create flow and are entered from existing today-list
rows on s012. They share visual chrome (black-bordered Cancel / Save
buttons, rounded "card" containers) but are distinct from the create
forms.

The whole feature is a routed wizard that always saves back to
`/habit/today` on the green save button and back-navigates per the
local cancel rule — usually to the previous menu, occasionally to
`/habit/today` directly.

---

## Source Wireframes

### Picker / menu screens

| Screen ID                                          | File                                                                | Role                                              |
| -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `s016-habit-add-activity`                          | `docz/wireframes/s016-habit-add-activity.html`                      | Entry: 3 category tabs (ยา / โภชนาการ / กิจกรรมทางกาย). |
| `s021-create-nutrition`                            | `docz/wireframes/s021-create-nutrition.html`                        | 4-item nutrition preset picklist.                 |
| `s024-create-physical-activity-menu`               | `docz/wireframes/s024-create-physical-activity-menu.html`           | 8-item physical sub-category menu.                |
| `s025-create-physical-activity-emotion-menu`       | `docz/wireframes/s025-create-physical-activity-emotion-menu.html`   | 3-item emotion-management sub-menu.               |
| `s026-create-physical-activity-psunlight-menu`     | `docz/wireframes/s026-create-physical-activity-psunlight-menu.html` | 3-item sunlight-protection sub-menu.              |
| `s030-create-physical-activity-pinfection-menu`    | `docz/wireframes/s030-create-physical-activity-pinfection-menu.html`| 4-item infection-prevention sub-menu.             |

### Create forms

| Screen ID                              | File                                                  | Role                                                                                              |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `s020-create-activity`                 | `docz/wireframes/s020-create-activity.html`           | Medicine / nutrition shared form (icon-color picker, ก่อน/หลัง chips, มื้อ multi-select, frequency tabs, weekday/count/importance sub-panels). |
| `s029-create-physical-activity`        | `docz/wireframes/s029-create-physical-activity.html`  | Physical activity form (read-only badge name, goal chips, frequency, importance).                |

### Check-in screens

| Screen ID                                              | File                                                                       | Role                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `s022-medecine-checkin`                                | `docz/wireframes/s022-medecine-checkin.html`                               | Medicine check-in + side-effect checklist.            |
| `s023-nutrition-checkin`                               | `docz/wireframes/s023-nutrition-checkin.html`                              | Nutrition check-in: 3 meal text fields.               |
| `s027-create-physical-activity-usymptoms-menu`         | `docz/wireframes/s027-create-physical-activity-usymptoms-menu.html`        | Unusual-symptoms 5-item checklist.                    |
| `s028-create-physical-activity-explore-emotion-menu`   | `docz/wireframes/s028-create-physical-activity-explore-emotion-menu.html`  | Emotion check-in: 5 emoji buttons + −/+ gradient slider. |

### Page-specific JS vs shared `common.js`

- **s016** uses only `data-navigate` on its 3 category buttons; no
  page-specific JS.
- **s020** ships a non-trivial page script that:
  - reads `?source=` and `?type=` query params and prefills the
    `.name-field` from a hard-coded `typeToName` map (the canonical
    nutrition preset → display-name lookup);
  - implements an icon-colour `<dialog>` (modal) with swatches +
    custom colour input;
  - toggles a sub-panel based on the selected `.frequency-chip`
    (`daily / weekly / monthly / todo`);
  - implements single-select / multi-select chip tracks via
    `data-single-select` / `data-multi-select` attributes;
  - toggles individual weekday selections in `.weekday-row`.
- **s021** uses `data-navigate` with `?type=…` query params pointing
  to s020 — so s020 picks up the preset name from the URL.
- **s022** has a page script that toggles `is-selected` on
  `.check-item-btn` (side-effect checklist).
- **s024–s030** use `data-navigate` exclusively; only s029 has page
  scripting (mirrors s020's chip-track logic + a goal-chip toggle).
- **s028** uses native `<input type="range">` for the gradient slider;
  no extra JS.
- **s027** has a small page script wrapping `aria-label` into the
  checklist buttons.

The React port replicates all of this declaratively via Redux + React
form state — see **Interaction Mapping**.

### Gaps not covered by predefined wireframes

1. **Form validation.** None of the wireframes show error states, but
   activity name + at least one frequency-related rule must be
   required. **DS-1.**
2. **Save-in-flight.** All save buttons are static green checkmarks
   that hard-navigate; no "saving…" state. **DS-2.**
3. **Conflict / duplicate-name handling.** Wireframes silently allow
   creating two activities with the same name. Spec defines a server-
   side `409 ACTIVITY_NAME_TAKEN` flow as a per-field error on the
   name input. **DS-3.**
4. **Edit existing activity.** All wireframes are create-only. Spec
   adds an "edit" mode to `<ActivityForm>` (same surface, prefilled
   from existing activity). Reachable via a future "edit activity"
   icon (out of scope here; the form component is ready).
5. **Cancel discard confirmation.** Tapping the red Cancel ("ยกเลิก")
   button on any form silently discards. With non-trivial edits a
   confirmation prompt is needed. **DS-4.**
6. **Wizard back behaviour.** The wireframe Cancel buttons on s027,
   s028 navigate back to their parent menu (s024/s025), but s022/s023
   navigate to `/habit/today`. The spec keeps each existing
   destination but documents a generalised rule (see Interaction
   Mapping).

---

## Derived Screens and States

| ID    | Name                                               | Type                  | Inherits from                                       |
| ----- | -------------------------------------------------- | --------------------- | --------------------------------------------------- |
| DS-1  | Form validation errors                             | Inline UI state       | s020 / s029 (per-field red copy below the input)    |
| DS-2  | Save-in-flight                                     | Inline UI state       | save button disabled + spinner inside the green ring |
| DS-3  | Duplicate-name conflict                            | Inline server error   | DS-1 styling on the name field                      |
| DS-4  | Discard-changes confirmation                       | Modal dialog          | s020 `.color-dialog` styling reused                 |

DS-4 specifics: when Cancel is pressed and the form is `dirty`, render a
small dialog with copy "ละทิ้งการเปลี่ยนแปลง?" and two buttons "ละทิ้ง" /
"กลับไปแก้ไข". Reuse `.dialog-btn` styling from s020. When the form is
clean, navigate immediately.

---

## User Flow

```
                           ┌────────────────────────┐
                           │ /habit/today (s012)    │
                           └────┬───────────────┬───┘
              row tap (medicine)│               │ + button
                                ▼               ▼
              /habit/checkin/medicine  /habit/add (s016 — 3 tabs)
                  (s022)                          │
                                                  ├── ยา → /habit/add/medicine (s020)
                                                  │       ?source=medicine
                                                  ├── โภชนาการ → /habit/add/nutrition (s021)
                                                  │       ↓ pick preset
                                                  │       /habit/add/medicine?type={preset}
                                                  │       (reuses s020 with prefill)
                                                  └── กิจกรรมทางกาย → /habit/add/physical (s024)
                                                          │
                ┌─────────┬─────────┬─────────┬───────────┼────────────────────────┐
                ▼         ▼         ▼         ▼           ▼                        ▼
          /habit/add/    /habit/add/  /habit/add/  /habit/add/    /habit/add/          /habit/add/
          physical/      physical/    physical/    physical/       physical/            physical/
          form           emotion      sunlight     symptoms        infection            form?name=…
          (s029,         (s025)       (s026)       (s027 chk)      (s030)              (leaf shortcuts:
          ออกกำลังกาย,     │            │           │                 │                  สังเกต*, ตรวจตามนัด,
          ตรวจตามนัดฯ,     │            │           │                 │                  วางแผน*, อื่นๆ)
          ตามนัด, อื่นๆ)    ▼            ▼           ▼                 ▼
                       /…/emotion/    /…/physical  /habit/today       /…/physical
                       explore        /form?name=… (save)              /form?name=…
                       (s028 chk)
                       │
                       ▼
                       /habit/today (save)

              /habit/checkin/nutrition (s023) ← row tap (nutrition) on /habit/today
```

Save-button on every "create" form (`s020`, `s029`) and every check-in
(`s022`, `s023`, `s027`, `s028`) ends at `/habit/today`. Cancel-button
behaviour is route-specific (see Interaction Mapping).

---

## Component Tree

```
app/(authed)/habit/
├── add/
│   ├── page.tsx                   ← s016  ("/habit/add")
│   │   └── <AddActivityCategoryScreen>
│   │       └── <CategoryTab kind="medicine" | "nutrition" | "physical" />
│   │
│   ├── medicine/page.tsx          ← s020  ("/habit/add/medicine")
│   │   └── <ActivityForm flavour="medicine" prefill={fromQuery}>
│   │       ├── <ActivityNameField />        (purple bg pill)
│   │       ├── <IconColorPickerButton />    (opens <IconColorDialog>)
│   │       ├── <MealRelationChips />        (ก่อน / หลัง — single-select)
│   │       ├── <MealSlotChips />            (เช้า/กลางวัน/เย็น/ก่อนนอน — multi)
│   │       ├── <FrequencyChips />           (ทุกวัน/สัปดาห์/เดือน/To-do)
│   │       ├── <FrequencySubpanel kind={...} />
│   │       │   ├── <WeekdayRow />               (daily)
│   │       │   ├── <CountInput unit="วัน/สัปดาห์"/> (weekly)
│   │       │   ├── <CountInput unit="วัน/เดือน"/>  (monthly)
│   │       │   └── <ImportanceChips />          (todo)
│   │       └── <FormChrome cancel save />    (action-btn round buttons)
│   │
│   ├── nutrition/page.tsx         ← s021  ("/habit/add/nutrition")
│   │   └── <NutritionPresetList>
│   │       └── <NutritionPresetItem key="nutrition_5_groups" .../>  ×4
│   │
│   ├── physical/
│   │   ├── page.tsx               ← s024  ("/habit/add/physical")
│   │   │   └── <PhysicalCategoryMenu>
│   │   │       └── <PhysicalCategoryItem href={…}/>  ×8
│   │   │
│   │   ├── emotion/page.tsx       ← s025
│   │   │   ├── <PhysicalSubMenu items={EMOTION_ITEMS}/>
│   │   │   └── explore/page.tsx   ← s028  ("/habit/add/physical/emotion/explore")
│   │   │       └── <EmotionCheckinForm>
│   │   │           ├── <MoodEmojiRow />        (5 colour discs)
│   │   │           └── <MoodSlider />          (gradient)
│   │   │
│   │   ├── sunlight/page.tsx      ← s026
│   │   │   └── <PhysicalSubMenu items={SUNLIGHT_ITEMS}/>
│   │   │
│   │   ├── infection/page.tsx     ← s030
│   │   │   └── <PhysicalSubMenu items={INFECTION_ITEMS}/>
│   │   │
│   │   ├── symptoms/page.tsx      ← s027
│   │   │   └── <UnusualSymptomsCheckinForm>
│   │   │       └── <SymptomCheckRow />  ×5
│   │   │
│   │   └── form/page.tsx          ← s029  ("/habit/add/physical/form")
│   │       └── <PhysicalActivityForm prefill={fromQuery}>
│   │           ├── <ActivityBadge readOnly={true} value={name}/>
│   │           ├── <GoalChips />          (ครั้งเดียว / นับจำนวนครั้ง + count)
│   │           ├── <FrequencyChips />
│   │           ├── <FrequencySubpanel />  (shared with s020)
│   │           ├── <ImportanceChips />    (only when freq = todo)
│   │           └── <FormChrome cancel save />
│
└── checkin/
    ├── medicine/page.tsx          ← s022  ("/habit/checkin/medicine")
    │   └── <MedicineCheckinForm occurrenceId>
    │       ├── <MedicineNamePill />
    │       ├── <DetailLines mealRelation mealSlots/>
    │       └── <SideEffectChecklist items={…}/>
    │
    └── nutrition/page.tsx         ← s023  ("/habit/checkin/nutrition")
        └── <NutritionCheckinForm occurrenceId>
            ├── <NutritionNamePill />
            └── <MealEntries breakfast lunch dinner/>
```

### Reusable component contracts (the major ones)

```ts
import type {
    HabitActivity,
    HabitFrequency,
    HabitImportance,
    HabitSchedule,
    MealRelation,
    MealSlot,
    MoodLevel,
    NutritionPresetKey,
    PhysicalCategory,
    SymptomCheck,
    WeekdayIndex,
} from "@/types/habit";

interface ActivityFormProps {
    flavour: "medicine" | "nutrition";       // controls labels
    prefill?: Partial<HabitActivity> & { presetKey?: NutritionPresetKey };
    /** When set, the form is in "edit" mode and Save dispatches updateActivity. */
    activityId?: string;
}

interface PhysicalActivityFormProps {
    name: string;                             // from ?name=… query
    physicalCategory: PhysicalCategory;
}

interface CategoryTabProps {
    kind: "medicine" | "nutrition" | "physical";
    label: string;                            // localized
    href: AppRoute;
    iconAccent: `#${string}`;                 // #57a8db | #2eb563 | #ee8a4a
}

interface PhysicalCategoryItemProps {
    label: string;                            // wireframe Thai copy
    href: AppRoute;                           // points to a sub-menu OR /…/form?name=
    /** When `name` is present, label is sent as the prefilled activity name. */
    name?: string;
    small?: boolean;                          // last item "อื่น ๆ"
}

interface FrequencyChipsProps {
    value: HabitFrequency;
    onChange: (next: HabitFrequency) => void;
}

interface FrequencySubpanelProps {
    schedule: HabitSchedule;
    onChange: (next: HabitSchedule) => void;
}

interface IconColorDialogProps {
    open: boolean;
    initialColor: string;
    onApply: (color: string) => void;
    onClose: () => void;
}

interface CheckinFormChromeProps {
    title: string;
    onCancel: () => void;                     // dispatches DS-4 if dirty
    onSave: () => void;                       // dispatches save thunk + DS-2
    saving?: boolean;
}
```

---

## Redux State Design

Authoring & check-in extends the existing `habitsSlice` from
`s006-habit-tracker-views.md`. Add the following:

```ts
interface HabitsState {
    // … (everything from s006 spec)

    /** Save status of an in-flight activity create/edit. */
    activitySaveStatus: "idle" | "saving" | "saved" | "error";
    /** Field-level errors keyed by the form input `name` attribute. */
    activitySaveErrors: Record<string, string | undefined>;

    /** Save status of an in-flight check-in. */
    checkinSaveStatus: "idle" | "saving" | "saved" | "error";
    checkinSaveErrors: Record<string, string | undefined>;

    /** Last server-acknowledged activity id from a successful create. */
    lastCreatedActivityId: string | null;
}
```

### Local-only form state

The forms themselves are **NOT** in Redux. Each `<ActivityForm>` /
`<PhysicalActivityForm>` / check-in form holds its own state via
`useReducer` so transient typing does not flood the store. Only the
final committed payload is dispatched on Save.

### Actions / thunks

| Action                                  | Effect                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `habits/createActivity`                 | POST `/api/habits/activities`. On fulfilled, prepend to `state.activities`.     |
| `habits/createActivity/rejected`        | Maps `ApiError.details` onto `activitySaveErrors`. Maps `409 ACTIVITY_NAME_TAKEN` (DS-3) onto `activitySaveErrors.name`. |
| `habits/updateActivity(id, patch)`      | PATCH `/api/habits/activities/:id`. Same error mapping.                         |
| `habits/saveMedicineCheckin`            | PUT `/api/habits/checkins/medicine/:occurrenceId`.                              |
| `habits/saveNutritionCheckin`           | PUT `/api/habits/checkins/nutrition/:occurrenceId`.                             |
| `habits/saveSymptomsCheckin`            | PUT `/api/habits/checkins/symptoms/:occurrenceId`.                              |
| `habits/saveMoodCheckin`                | PUT `/api/habits/checkins/mood/:occurrenceId`.                                  |
| `habits/clearSaveStatus`                | Reset `activitySaveStatus` / `checkinSaveStatus` after navigation.              |

All save-success thunks `router.replace("/habit/today")` after dispatch
to match the wireframe's data-navigate target. DS-4 is rendered only
when the user presses Cancel; it does not affect Redux.

### Selectors

```ts
selectActivitySaveStatus(state): "idle" | "saving" | "saved" | "error"
selectActivityFieldError(state, field): string | undefined
selectCheckinSaveStatus(state): "idle" | "saving" | "saved" | "error"
selectActivityById(state, id): HabitActivity | undefined
```

---

## Interaction Mapping

### s016 Add Activity (category picker)

| Element                                                            | Wireframe behaviour     | React/Redux mapping                                                                                                        |
| ------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.cat-tab.cat-med[data-navigate="s020-create-activity.html?source=medicine"]` | common.js navigate      | `<Link href="/habit/add/medicine?source=medicine">` — `source=medicine` keeps the field empty (per s020 page script).      |
| `.cat-tab.cat-food[data-navigate="s021-create-nutrition.html"]`    | common.js               | `<Link href="/habit/add/nutrition">`.                                                                                      |
| `.cat-tab.cat-body[data-navigate="s024-create-physical-activity-menu.html"]` | common.js               | `<Link href="/habit/add/physical">`.                                                                                       |
| `.form-btn-cancel` / `.form-btn-save` (`display:none` in CSS)      | hidden                  | DO NOT render in React port — they are wireframe scaffolding only.                                                         |

### s020 Create Activity form (medicine + nutrition)

The page-specific JS encodes the canonical UI logic. Here is the React
mapping:

| Wireframe behaviour                                                                                       | React/Redux mapping                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read `?source=medicine` → leave name empty.                                                              | `useSearchParams()` in the page; pass `prefill={{}}` to `<ActivityForm>`.                                                                                                                                            |
| Read `?type=<NutritionPresetKey>` → set name from `NUTRITION_PRESETS[key]`.                              | Page resolves the preset name from `@/types/habit#NUTRITION_PRESETS` and passes it as `prefill.name`.                                                                                                                |
| Frequency-chip click toggles `is-selected` + shows matching `.option-panel`.                             | Single Redux-free `useReducer({frequency, schedule})`. `<FrequencyChips>` calls `setFrequency(...)`; `<FrequencySubpanel>` re-renders the right sub-panel.                                                            |
| `chip-track[data-single-select=true]` (ก่อน/หลัง, ความสำคัญ) → only one `is-selected`.                  | `<MealRelationChips>` / `<ImportanceChips>` — controlled radio-style.                                                                                                                                                |
| `chip-track[data-multi-select=true]` (มื้อ) → toggles `is-selected`.                                    | `<MealSlotChips value={MealSlot[]} onChange=…>`. State stays an array; toggling adds/removes.                                                                                                                        |
| `.weekday-row` (daily panel) toggles each day independently.                                             | `<WeekdayRow value={WeekdayIndex[]} onChange=…>`.                                                                                                                                                                    |
| Icon-color dialog: `showModal()`, swatch click stages `pendingIconColor`, custom input updates it, "ใช้สี" applies via `--name-icon-stroke`. | `<IconColorDialog>` — uses `<dialog>` element via `useRef` + `dialogRef.current?.showModal()`. Final `apply` calls `onApply(color)` which sets the form state's `iconColor`. The CSS variable is set on the host node. |
| Cancel `data-navigate=s016`                                                                              | `<FormChrome onCancel>` — if dirty, open DS-4; else `router.push("/habit/add")`.                                                                                                                                     |
| Save `data-navigate=s012`                                                                                | `<FormChrome onSave>` → `dispatch(createActivity(payload))`. On fulfilled, `router.replace("/habit/today")`. DS-2 while pending; DS-3 on `409`.                                                                       |

Validation (DS-1) — client-side, before dispatch:

- name: required, 1..120 chars after trim → `REQUIRED` / `TOO_LONG`.
- mealSlots: required when `flavour === "medicine"` and `frequency
  === "daily"` → `REQUIRED`.
- weekdays: required when `frequency === "daily"` (≥ 1 selected) →
  `REQUIRED`.
- daysPerWeek: integer 1..7 when `frequency === "weekly"` →
  `INVALID_FORMAT`.
- daysPerMonth: integer 1..31 when `frequency === "monthly"` →
  `INVALID_FORMAT`.
- importance: required when `frequency === "todo"` → `REQUIRED`.

### s021 Create Nutrition (preset picklist)

| Element                                            | Wireframe behaviour                       | React/Redux mapping                                              |
| -------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| 4× `.nutrition-item[data-navigate="s020.html?type=…"]` | common.js                              | `<Link href="/habit/add/medicine?type={presetKey}">` — re-uses the `<ActivityForm>` with `flavour="nutrition"` and prefilled name. **Action: the s020 page must accept `flavour` from the route, NOT from the query — see Route Mapping.** |

### s024 Physical-activity menu

8 entries split between 4 sub-menu links and 4 leaf-form shortcuts:

| Wireframe label                          | data-navigate                                           | React route                                                |
| ---------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| การจัดการอารมณ์                          | s025                                                    | `/habit/add/physical/emotion`                              |
| ออกกำลังกาย                              | s029?name=ออกกำลังกาย                                   | `/habit/add/physical/form?name=ออกกำลังกาย`               |
| การป้องกันแสงแดด                         | s026                                                    | `/habit/add/physical/sunlight`                             |
| การป้องกันการติดเชื้อ                    | s030                                                    | `/habit/add/physical/infection`                            |
| สังเกตอาการผิดปกติ                       | s029?name=สังเกตอาการผิดปกติ                            | `/habit/add/physical/form?name=สังเกตอาการผิดปกติ`        |
| ตรวจตามนัดแพทย์                          | s029?name=ตรวจตามนัดแพทย์                                | `/habit/add/physical/form?name=ตรวจตามนัดแพทย์`           |
| วางแผนการตั้งครรภ์/การคุมกำเนิด          | s029?name=…                                             | `/habit/add/physical/form?name=…`                          |
| อื่น ๆ                                   | s029?name=other                                         | `/habit/add/physical/form?name=other` (treated as "free-form" — clear name field on mount) |

The `?name=other` value is the only special-case: render an empty,
editable `<ActivityBadge>` instead of a read-only one. All other names
arrive as readonly badges per the wireframe.

### s025 / s026 / s030 sub-menus

All three follow the same pattern as s021. Each item navigates with
`?name=<Thai label>` to `s029` (`/habit/add/physical/form`).

### s022 Medicine check-in

| Element                                                       | Wireframe behaviour      | React/Redux mapping                                                                  |
| ------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `.action-btn[aria-label=ยกเลิก][data-navigate=s012]`          | common.js                | `onCancel`: if dirty → DS-4, else `router.push("/habit/today")`.                     |
| `.action-btn[aria-label=บันทึก][data-navigate=s012]`          | common.js                | `dispatch(saveMedicineCheckin(payload))` → on fulfilled `router.replace("/habit/today")`. |
| `.check-item-btn` toggles `is-selected`                       | page script              | Controlled by local form state; calls `setItem(i, !checked)`.                        |
| `.medicine-name`, `.detail-line`                              | static                   | Bound to `state.habits.activities[id]` (medicine) so name/relation/slots match.      |

### s023 Nutrition check-in

| Element                                                       | Wireframe behaviour | React/Redux mapping                                                                  |
| ------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `.meal-field` × 3                                             | uncontrolled inputs | Controlled local state `{breakfast, lunch, dinner}`.                                 |
| Cancel / Save buttons                                         | as s022             | Same handlers as s022.                                                               |

### s027 Unusual-symptoms check-in

| Element                                                  | Wireframe behaviour                          | React/Redux mapping                              |
| -------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Cancel `data-navigate=s024`                              | back to physical menu                        | `router.push("/habit/add/physical")` (no DS-4 — page is single-step). |
| Save `data-navigate=s012`                                | save & go to today                           | `dispatch(saveSymptomsCheckin(payload))`.        |
| 5× `.check-item-btn`                                     | toggle `is-selected`                         | Local state `Record<symptomId, boolean>`.        |
| Page script attaching `aria-label`                       | accessibility shim                           | Replaced by `aria-pressed` on each button.       |

### s028 Emotion check-in (mood + slider)

| Element                                                  | Wireframe behaviour     | React/Redux mapping                                                                       |
| -------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Cancel `data-navigate=s025`                              | back to emotion menu    | `router.push("/habit/add/physical/emotion")`.                                             |
| Save `data-navigate=s012`                                | save & go to today      | `dispatch(saveMoodCheckin({mood, sliderValue}))`.                                         |
| 5× `.mood-emoji`                                         | discrete colour buttons | `<MoodEmojiRow value={MoodLevel} onChange=…>`. Multi-tap is exclusive (single-select).     |
| `.mood-slider` (`<input type="range">`)                  | native gradient slider  | Controlled `<input type="range" min={-100} max={100}/>`. Sign labels (`−`/`+`) are static. |

### s029 Physical-activity form

Mirrors s020 but simpler:

| Element                                                              | Wireframe behaviour                                                | React/Redux mapping                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `.activity-badge` readonly                                           | shows `?name=…`; for `name=other` the wireframe shows "กิจกรรม XXX" | `<ActivityBadge readOnly={name !== "other"} value={resolvedName}>`.                  |
| Goal chips ("ครั้งเดียว / นับจำนวนครั้ง")                            | toggle within `[data-group=goal]`                                  | Single-select; when "นับจำนวนครั้ง" selected, show `<input type="number">` for count.|
| Frequency chips                                                      | as s020                                                            | Reuse `<FrequencyChips>` + `<FrequencySubpanel>`.                                    |
| Importance chips visible only when freq = todo                       | DOM toggling                                                       | Conditional `{frequency === "todo" && <ImportanceChips/>}`.                          |

---

## Route Mapping

| Wireframe filename                                          | Next.js route                                  | Auth      | Notes                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `s016-habit-add-activity.html`                              | `/habit/add`                                   | Protected | Category picker. No query.                                                                        |
| `s020-create-activity.html?source=medicine`                 | `/habit/add/medicine?source=medicine`          | Protected | Medicine flavour; `<ActivityForm flavour="medicine">`.                                            |
| `s020-create-activity.html?type=<NutritionPresetKey>`       | `/habit/add/medicine?type=<key>`               | Protected | The page reads the preset key and resolves the name from `NUTRITION_PRESETS`. Flavour is `"nutrition"`. **Implementer note:** the form file lives under `/habit/add/medicine/` for parity with the wireframe filename, but its `flavour` is decided from `?source` / presence of `?type`. If clearer routing is preferred, split into `/habit/add/medicine` and `/habit/add/nutrition/[preset]` — the resulting payload is identical. |
| `s021-create-nutrition.html`                                | `/habit/add/nutrition`                         | Protected | Picklist; navigates to medicine route with `?type=…`.                                             |
| `s022-medecine-checkin.html`                                | `/habit/checkin/medicine?occ={occurrenceId}`   | Protected | `occ` query is mandatory; missing → redirect `/habit/today`.                                      |
| `s023-nutrition-checkin.html`                               | `/habit/checkin/nutrition?occ={occurrenceId}`  | Protected | Same.                                                                                             |
| `s024-create-physical-activity-menu.html`                   | `/habit/add/physical`                          | Protected | Sub-category menu.                                                                                |
| `s025-create-physical-activity-emotion-menu.html`           | `/habit/add/physical/emotion`                  | Protected | 3 items.                                                                                          |
| `s026-create-physical-activity-psunlight-menu.html`         | `/habit/add/physical/sunlight`                 | Protected |                                                                                                   |
| `s027-create-physical-activity-usymptoms-menu.html`         | `/habit/add/physical/symptoms`                 | Protected | This is a check-in surface (5-item checklist), not a sub-menu — name retained for filename parity. |
| `s028-create-physical-activity-explore-emotion-menu.html`   | `/habit/add/physical/emotion/explore`          | Protected | Mood + slider check-in.                                                                           |
| `s029-create-physical-activity.html?name=…`                 | `/habit/add/physical/form?name=…`              | Protected | Generic physical-activity create form; `name` query is required.                                  |
| `s030-create-physical-activity-pinfection-menu.html`        | `/habit/add/physical/infection`                | Protected |                                                                                                   |

---

## TypeScript Contracts

UI props are listed in **Component Tree**. Domain shapes used by this
spec (all already declared in `src/types/habit.ts`):

- `HabitCategory`, `PhysicalCategory`, `HabitFrequency`,
  `HabitImportance`, `HabitSchedule`, `MealRelation`, `MealSlot`,
  `WeekdayIndex`, `HabitActivity`, `HabitOccurrence`,
  `MedicineCheckin`, `NutritionCheckin`, `UnusualSymptomsCheckin`,
  `MoodCheckin`, `MoodLevel`, `SymptomCheck`, `NutritionPresetKey`,
  `NUTRITION_PRESETS`.

API endpoints — see `docs/specs/backend-architecture.md` for the full spec:

```ts
// POST /api/habits/activities                              → { activity: HabitActivity }
// PATCH /api/habits/activities/:id                          → { activity: HabitActivity }
// PUT /api/habits/checkins/medicine/:occurrenceId           → { occurrence }
// PUT /api/habits/checkins/nutrition/:occurrenceId          → { occurrence }
// PUT /api/habits/checkins/symptoms/:occurrenceId           → { occurrence }
// PUT /api/habits/checkins/mood/:occurrenceId               → { occurrence }
```

Add `ACTIVITY_NAME_TAKEN` to `src/types/error.ts#ApiErrorCode` so DS-3
is typed.

---

## Styling Notes

- **Add-activity card chrome (s016)**: 36 px radius, 3 px `#59d6dc`
  border, white bg, drop-shadow. Reuse for s020/s021/s022/s023/s029
  (same chrome, different content).
- **Round action buttons (s022/s023/s027/s028/s029)**: 6 rem circle,
  6 px black border, white bg. Cancel = X icon, Save = check icon. They
  are NOT the same component as `<FormChrome>` on s020 (which uses
  `display:none` square buttons in the wireframe). Standardise on the
  6-rem circle pattern across ALL forms in the React port — do not
  carry the s020 hidden buttons forward.
- **Purple bg for medicine name pill** (`#aa85e5`): match exactly.
- **Orange bg for nutrition name pill** (`#f26f5a` on s023; `#cfcac3`
  preset row on s021): match exactly.
- **Chip track** (grey rail with selected purple chip): single
  `<ChipTrack>` component reused across forms, configurable via
  `selectionMode: "single" | "multi"`.
- **Weekday row** chips: 1.4 rem corners, 5.2 rem min-height,
  background `#b4b7bc` default, `#a785e6` selected with `inset 0 0 0
  4px #2f233f` ring.
- **Number inputs** (`.count-num` / `.count-input` / `.freq-count-input`):
  remove native spin buttons (already done in CSS); border `#a785e6`.
- **Icon-color dialog (s020)**: native `<dialog>` element. Backdrop
  `rgba(0,0,0,.25)`. Six swatches + custom-color input + Apply / Close.
  Apply sets `--name-icon-stroke` on the closest form root, NOT on
  `:root`, so subsequent forms do not inherit a stale colour.
- **Mood-emoji buttons (s028)**: 5 colour discs in a row with the same
  width; border-radius 50 %; tapping toggles `is-selected` ring on the
  active emoji. Slider uses a native `<input type="range">` with a
  CSS gradient track.
- **Active rail accent**: `#6a24f2` purple, shared with s006/s012/s013.

**Responsive note:** The form cards on s020/s029 are dense; on `<
1280 px` allow the chip-line to wrap (already handled by flex-wrap on
`.tracker-tab-row`). The sub-menus (s024/s025/s026/s030) are single-
column lists at any width; collapse to 1 column unconditionally.

---

## Accessibility Notes

- Every Cancel / Save action is a `<button>` with the wireframe's
  Thai `aria-label` (e.g. "ยกเลิก", "บันทึก"). Preserve verbatim.
- `<dialog role="dialog" aria-modal="true">` on every check-in / form
  card — wireframe already declares this.
- Icon-color dialog uses native `<dialog>` so backdrop click + ESC are
  free. Re-bind focus to the trigger button on close.
- Chip groups: wrap in `role="radiogroup"` (single-select) or
  `role="group"` (multi-select). Each chip is `<button>` with
  `aria-pressed`. Avoid `role="tab"` — these are not tabs.
- Mood emoji row: `role="radiogroup" aria-label="เลือกอารมณ์"`. Each
  emoji is `<button role="radio" aria-checked>`.
- Slider: native `<input type="range" aria-label="ระดับอารมณ์"
  aria-valuemin aria-valuemax aria-valuenow>`. Min/max labels (−/+) are
  decorative siblings.
- Symptoms checklist: each item is a `<button aria-pressed
  aria-label="เลือกอาการ {label}">` (the wireframe page-script applies
  this — port it as JSX, not as a runtime mutation).
- DS-1 / DS-3 inline errors: `role="alert"` `aria-live="polite"`.
- DS-4 confirmation dialog: native `<dialog>` with focus trapped
  inside; ESC closes & treats as "กลับไปแก้ไข" (no destructive default).

---

## Edge Cases

1. **Save while offline** → DS-2 stays for up to 30 s, then surface
   "ไม่สามารถบันทึกได้ ตรวจสอบการเชื่อมต่อ"; payload is queued in
   localStorage and re-sent on reconnect.
2. **Submitting from DS-2 (double-click)** → idempotent thunk; second
   call is a no-op while status === "saving".
3. **Server `409 ACTIVITY_NAME_TAKEN`** → DS-3 on the name field; user
   adjusts and resubmits.
4. **Server `422` with unknown `details[].field`** → render a top-of-
   form generic error and log the unknown field.
5. **Cancel from a clean form** → navigate immediately (no DS-4).
6. **`?name=other` on s029** → render an empty editable
   `<ActivityBadge>` instead of readonly.
7. **`?type=<unknown>` on s020** → ignore the query, render an empty
   medicine form.
8. **`?occ=<unknown>` on s022/s023** → redirect to `/habit/today`.
9. **Frequency=todo with importance unselected** → block save,
   highlight the importance row.
10. **Frequency=daily with zero weekdays selected** → block save,
    highlight the weekday row.
11. **User submits and immediately taps the back button before the
    save resolves** → `router.replace` cancels the pending nav; on
    fulfilled, do not navigate again (status already "saved").
12. **Mood slider untouched** → default to 0 (centre of the gradient).

---

## Implementation Plan

1. Land/extend `src/types/habit.ts` (already done) and refresh
   `src/types/navigation.ts`.
2. `<FormChrome>` shared component (cancel + save circle buttons +
   DS-2 spinner) and `<DiscardConfirmDialog>` (DS-4).
3. `<ChipTrack>` + `<FrequencyChips>` + `<FrequencySubpanel>`
   primitives. Storybook them.
4. `<IconColorDialog>` using native `<dialog>`; verify swatches +
   custom colour application in isolation.
5. s016 page (`/habit/add`) — minimal, only routes to sub-flows.
6. s021 (`/habit/add/nutrition`) preset list.
7. `<ActivityForm>` + s020 page (`/habit/add/medicine`); covers BOTH
   medicine and nutrition flavours via the `?source` / `?type`
   conventions.
8. `createActivity` thunk + DS-1/DS-2/DS-3 wiring.
9. s024 menu → s025 / s026 / s030 sub-menus (all share `<PhysicalSubMenu>`).
10. `<PhysicalActivityForm>` + s029 (`/habit/add/physical/form`).
11. s022 medicine check-in + `saveMedicineCheckin` thunk.
12. s023 nutrition check-in.
13. s027 symptoms check-in.
14. s028 mood check-in (emoji + slider).
15. End-to-end pass through every leaf flow.

Dependencies: 2 unblocks 3,4,11-14; 7 must precede 8; 10 must precede
9-leaf navigations.

---

## Acceptance Criteria

1. From `/habit/today`, tapping `+` navigates to `/habit/add` showing
   the 3 category cards.
2. Tapping "ยา" navigates to `/habit/add/medicine?source=medicine` and
   renders an empty `<ActivityForm flavour="medicine">`.
3. Tapping "โภชนาการ" navigates to `/habit/add/nutrition` showing 4
   preset rows; tapping any row navigates to `/habit/add/medicine?type=
   <preset>` with the name field prefilled from `NUTRITION_PRESETS`.
4. Tapping "กิจกรรมทางกาย" navigates to `/habit/add/physical` showing 8
   menu rows. The 4 leaf rows go directly to
   `/habit/add/physical/form?name=...` with a readonly badge; the 4
   sub-menu rows go to their respective sub-pages.
5. On any form, leaving the name empty + tapping Save shows a DS-1
   error inline. Tapping Save with valid input dispatches the create
   thunk, shows DS-2 in the save button, and on fulfilled
   `router.replace`s to `/habit/today`.
6. Submitting a duplicate name surfaces DS-3 as an inline error on the
   name field. The save button re-enables.
7. Tapping Cancel after editing the form shows DS-4; tapping
   "ละทิ้ง" navigates to the previous menu, tapping "กลับไปแก้ไข"
   keeps the form open.
8. The icon-color dialog opens, swatches stage a colour, "ใช้สี"
   applies, "ปิด" closes without applying.
9. Frequency chips swap the visible sub-panel (weekday row, count
   input, importance chips) without unmounting the rest of the form.
10. From `/habit/today`, tapping the medicine row routes to
    `/habit/checkin/medicine?occ=<id>`; saving returns to
    `/habit/today` and updates the check toggle.
11. Same flow works for nutrition (`s023`), symptoms (`s027`), and
    mood (`s028`).
12. All Thai copy preserved verbatim from the wireframes — including
    the chip labels, sub-menu items, and check-in placeholders.
13. The icon rail accent stays `#6a24f2` (purple) throughout this
    cluster.

---

## Shared Type Files

| File                         | Exports used / added                                                                                                                                                                                                                                                                            | Notes                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/types/habit.ts`         | All shapes referenced by this spec are already declared (see preceding spec).                                                                                                                                                                                                                  | No new exports needed for this commit.                                             |
| `src/types/navigation.ts`    | Adds `/habit/add/...`, `/habit/checkin/...`, `/habit/add/physical/...` routes and the matching ScreenIds.                                                                                                                                                                                      | Updated in this commit.                                                            |
| `src/types/error.ts`         | `ACTIVITY_NAME_TAKEN`                                                                                                                                                                                                                                                                           | Already defined and in use — `habitService.ts` throws this on name conflict. See `docs/specs/backend-architecture.md`. |
