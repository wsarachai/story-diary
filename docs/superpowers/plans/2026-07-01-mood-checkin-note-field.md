# Mood Check-in Note Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For `stress_relief` and `sleep_rest` habit presets, replace the emoji mood picker in the check-in flow with a text/number input question, saving the answer as a `note` field instead of mood + sliderValue.

**Architecture:** Add an optional `note: string | null` field and make `mood`/`sliderValue` nullable across the data stack (type → schema → DB doc → service). The explore emotion page reads a new `preset` URL param (passed by checklist) and conditionally renders either the existing emoji picker or the new question input.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), RTK Query, Zod, MongoDB Atlas (via `lib/db.ts`), Vitest.

---

## File Map

| File | Change |
|------|--------|
| `frontend/types/habit.ts` | Make `mood`/`sliderValue` nullable; add `note?: string \| null` to `MoodCheckin` |
| `frontend/lib/schemas.ts` | Make `mood`/`sliderValue` nullable in `MoodCheckinSchema`; add optional `note` |
| `frontend/lib/db.ts` | Add `note?: string \| null` to `MoodCheckinDoc` |
| `frontend/lib/services/habitService.ts` | Pass/read `note` in `saveMoodCheckin`/`getMoodCheckin` |
| `frontend/app/(authed)/habit/checklist/page.tsx` | Append `&preset=<physicalPreset>` to explore-emotion URL in `handleEntryTap` |
| `frontend/app/(authed)/habit/checkin/physical/emotion/explore/page.tsx` | Read `preset` param; conditionally render text/number input; save with null mood |
| `frontend/tests/fixtures.ts` | Add `note: null` to `MOOD_CHECKIN` fixture |
| `frontend/tests/unit/services/habitService.test.ts` | Add tests for note-based save/load |
| `frontend/tests/integration/habitsApi.test.ts` | Update body assertion to include `note` |

---

### Task 1: Update `MoodCheckin` type and Zod schema

**Files:**
- Modify: `frontend/types/habit.ts` (around line 254)
- Modify: `frontend/lib/schemas.ts` (around line 170)

- [ ] **Step 1: Update `MoodCheckin` interface in `types/habit.ts`**

Replace the block starting at line 254:

```typescript
export interface MoodCheckin {
    occurrenceId: string;
    mood: MoodLevel | null;
    sliderValue: number | null;
    note?: string | null;
}
```

- [ ] **Step 2: Update `MoodCheckinSchema` in `lib/schemas.ts`**

Replace lines 170–174:

```typescript
export const MoodCheckinSchema = z.object({
  occurrenceId: z.string().min(1),
  mood: z.enum(["very-bad", "bad", "neutral", "good", "very-good"]).nullable(),
  sliderValue: z.number().int().min(-100).max(100).nullable(),
  note: z.string().nullable().optional(),
});
```

- [ ] **Step 3: Run TypeScript to catch type errors from the nullable change**

```bash
cd frontend && pnpm tsc --noEmit 2>&1 | head -60
```

Expected: errors only in files we will fix in later tasks (service, explore page). Fix any unexpected errors before continuing.

- [ ] **Step 4: Commit**

```bash
git add frontend/types/habit.ts frontend/lib/schemas.ts
git commit -m "feat(habit): make MoodCheckin mood/sliderValue nullable, add note field"
```

---

### Task 2: Update DB doc and service layer

**Files:**
- Modify: `frontend/lib/db.ts` (around line 136)
- Modify: `frontend/lib/services/habitService.ts` (around lines 482–578)

- [ ] **Step 1: Add `note` to `MoodCheckinDoc` in `lib/db.ts`**

Replace lines 136–142:

```typescript
export interface MoodCheckinDoc {
  id: string;
  occurrence_id: string;
  mood: string | null;
  slider_value: number | null;
  note?: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Update `getMoodCheckin` in `lib/services/habitService.ts`**

Replace lines 486–490 (the return block inside `getMoodCheckin`):

```typescript
    return {
        occurrenceId: doc.occurrence_id,
        mood: (doc.mood ?? null) as MoodLevel | null,
        sliderValue: doc.slider_value ?? null,
        note: doc.note ?? null,
    };
```

- [ ] **Step 3: Update `saveMoodCheckin` in `lib/services/habitService.ts`**

Replace lines 570–576 (the `replaceMoodCheckin` call):

```typescript
    await replaceMoodCheckin({
        id: uuidv4(),
        occurrence_id: data.occurrenceId,
        mood: data.mood ?? null,
        slider_value: data.sliderValue ?? null,
        note: data.note ?? null,
        created_at: now,
    });
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd frontend && pnpm tsc --noEmit 2>&1 | head -60
```

Expected: no errors in `lib/db.ts` or `lib/services/habitService.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/db.ts frontend/lib/services/habitService.ts
git commit -m "feat(habit): persist note field in mood checkin DB doc and service"
```

---

### Task 3: Update service unit tests

**Files:**
- Modify: `frontend/tests/unit/services/habitService.test.ts` (around line 664)

- [ ] **Step 1: Update existing mood tests for nullable mood/sliderValue**

The existing tests pass `{ mood: "good", sliderValue: 40 }` — these are still valid since the type now allows non-null values. But assertions reading `loaded!.mood` and `loaded!.sliderValue` still hold. No existing test code needs to change for the happy path.

Check the "accepts all 5 mood levels" test at line 682 passes `sliderValue: 0` — still valid.

- [ ] **Step 2: Add note-based save/load tests after line 741**

Add after the closing `});` of `describe("getMoodCheckin", ...)`:

```typescript
describe("saveMoodCheckin with note", () => {
  it("saves note with null mood/sliderValue and marks occurrence done", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: null, sliderValue: null, note: "went for a walk" });

    const after = await getTodayEntries(USER, TODAY);
    expect(after[0].occurrence.status).toBe("done");
  });

  it("returns saved note after saveMoodCheckin with note", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: null, sliderValue: null, note: "went for a walk" });

    const loaded = await getMoodCheckin(USER, occ.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.mood).toBeNull();
    expect(loaded!.sliderValue).toBeNull();
    expect(loaded!.note).toBe("went for a walk");
  });

  it("overwrites previous note on second save", async () => {
    await createActivity(USER, PHYSICAL_EMOTION);
    const [entry] = await getTodayEntries(USER, TODAY);
    const occ = entry.occurrence;

    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: null, sliderValue: null, note: "first" });
    await saveMoodCheckin(USER, { occurrenceId: occ.id, mood: null, sliderValue: null, note: "second" });

    const loaded = await getMoodCheckin(USER, occ.id);
    expect(loaded!.note).toBe("second");
  });
});
```

- [ ] **Step 3: Run unit tests**

```bash
cd frontend && pnpm vitest run tests/unit/services/habitService.test.ts 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/unit/services/habitService.test.ts
git commit -m "test(habit): add unit tests for note-based mood checkin"
```

---

### Task 4: Update fixtures and integration tests

**Files:**
- Modify: `frontend/tests/fixtures.ts` (around line 199)
- Modify: `frontend/tests/integration/habitsApi.test.ts` (around lines 750–854)

- [ ] **Step 1: Update `MOOD_CHECKIN` fixture in `tests/fixtures.ts`**

Replace lines 199–203:

```typescript
export const MOOD_CHECKIN: MoodCheckin = {
  occurrenceId: OCC_EMOTION.id,
  mood: "good",
  sliderValue: 40,
  note: null,
};
```

- [ ] **Step 2: Update `getMoodCheckin` integration test body assertions**

The test at line 750 asserts `result!.mood` and `result!.sliderValue` — these still pass because the fixture has non-null values. No change needed there.

The test "sends mood and sliderValue in the body" at line 834 asserts `capturedBody.mood` and `capturedBody.sliderValue`. Add a `note` assertion after it:

```typescript
    expect((capturedBody as any).mood).toBe(MOOD_CHECKIN.mood);
    expect((capturedBody as any).sliderValue).toBe(MOOD_CHECKIN.sliderValue);
    expect((capturedBody as any).note).toBeNull();
```

- [ ] **Step 3: Add integration test for note-based save**

After the closing `});` of `describe("saveMoodCheckin", ...)` at around line 855, add:

```typescript
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
```

- [ ] **Step 4: Run integration tests**

```bash
cd frontend && pnpm vitest run tests/integration/habitsApi.test.ts 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/fixtures.ts frontend/tests/integration/habitsApi.test.ts
git commit -m "test(habit): update mood checkin fixtures and integration tests for note field"
```

---

### Task 5: Update checklist routing

**Files:**
- Modify: `frontend/app/(authed)/habit/checklist/page.tsx` (around line 265)

- [ ] **Step 1: Update `handleEntryTap` to pass `preset` param**

Replace lines 265–273 (`handleEntryTap` function body):

```typescript
  function handleEntryTap(activity: HabitActivity, occurrenceId: string) {
    const base = `/habit/checkin`;
    const qs = `occ=${occurrenceId}&actId=${activity.id}`;
    if (activity.physicalCategory === "symptoms") {
      router.push(`${base}/physical/symptoms?${qs}`);
    } else if (usesExploreEmotionCheckin(activity)) {
      const preset = activity.physicalPreset ?? "";
      router.push(`${base}/physical/emotion/explore?${qs}&preset=${preset}`);
    }
  }
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && pnpm tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `checklist/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(authed\)/habit/checklist/page.tsx
git commit -m "feat(habit): pass physicalPreset to explore emotion checkin URL"
```

---

### Task 6: Update explore emotion page with conditional UI

**Files:**
- Modify: `frontend/app/(authed)/habit/checkin/physical/emotion/explore/page.tsx`

This is the largest change. The page currently only shows mood picker. We add a branch: if `preset` is `stress_relief` or `sleep_rest`, show a question + text/number input instead.

- [ ] **Step 1: Replace the entire file content**

```typescript
"use client";
import { Annoyed, Check, Frown, Laugh, LoaderCircle, Meh, Smile, X } from "lucide-react";
import { Suspense, useReducer, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useSaveMoodCheckinMutation, useGetMoodCheckinQuery } from "@/store/habitsApi";
import type { MoodLevel } from "@/types/habit";
import styles from "../../../../add/HabitAdd.module.css";
import checkinStyles from "../../../HabitCheckin.module.css";

const MOOD_LEVELS: { level: MoodLevel; Face: typeof Smile; color: string; label: string; value: number }[] = [
  { level: "very-bad", Face: Frown, color: "#d63a3a", label: "แย่มาก", value: -100 },
  { level: "bad", Face: Annoyed, color: "#e8a000", label: "แย่", value: -50 },
  { level: "neutral", Face: Meh, color: "#888888", label: "เฉยๆ", value: 0 },
  { level: "good", Face: Smile, color: "#2a9d8f", label: "ดี", value: 50 },
  { level: "very-good", Face: Laugh, color: "#3aab3a", label: "ดีมาก", value: 100 },
];

const NOTE_PRESETS: Record<string, { question: string; inputType: "text" | "number" }> = {
  stress_relief: { question: "วันนี้ทำอะไรไปนะ?", inputType: "text" },
  sleep_rest:    { question: "นอนไปกี่ชั่วโมง",   inputType: "number" },
};

function sliderValueForMood(mood: MoodLevel): number {
  return MOOD_LEVELS.find((m) => m.level === mood)?.value ?? 0;
}

interface State {
  mood: MoodLevel;
  note: string;
  dirty: boolean;
}

type Action =
  | { type: "SET_MOOD"; mood: MoodLevel }
  | { type: "SET_NOTE"; note: string }
  | { type: "RESET"; mood: MoodLevel; note: string };

function reducer(state: State, action: Action): State {
  if (action.type === "SET_MOOD") return { ...state, mood: action.mood, dirty: true };
  if (action.type === "SET_NOTE") return { ...state, note: action.note, dirty: true };
  if (action.type === "RESET") return { mood: action.mood, note: action.note, dirty: false };
  return state;
}

function ExploreEmotionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/habit/checklist";
  const [saveMood, { isLoading: saving }] = useSaveMoodCheckinMutation();
  const discardRef = useRef<HTMLDialogElement>(null);

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";
  const preset = searchParams.get("preset") ?? "";
  const notePreset = NOTE_PRESETS[preset] ?? null;

  const { data: existingCheckin } = useGetMoodCheckinQuery(occId, { skip: !occId });

  const [state, dispatchLocal] = useReducer(reducer, { mood: "neutral", note: "", dirty: false });

  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  useEffect(() => {
    if (existingCheckin) {
      dispatchLocal({
        type: "RESET",
        mood: existingCheckin.mood ?? "neutral",
        note: existingCheckin.note ?? "",
      });
    }
  }, [existingCheckin]);

  const today = new Date().toISOString().split("T")[0];

  async function handleSave() {
    if (saving || !occId) return;
    try {
      if (notePreset) {
        await saveMood({
          occurrenceId: occId,
          activityId,
          mood: null,
          sliderValue: null,
          note: state.note || null,
          date: today,
        }).unwrap();
      } else {
        await saveMood({
          occurrenceId: occId,
          activityId,
          mood: state.mood,
          sliderValue: sliderValueForMood(state.mood),
          note: null,
          date: today,
        }).unwrap();
      }
      router.replace(from);
    } catch {
      // ignore
    }
  }

  if (!occId) return null;

  function handleCancel() {
    if (state.dirty) { discardRef.current?.showModal(); }
    else { router.back(); }
  }

  const leftPage = (
    <div className={styles.authoringPage} aria-label={notePreset ? "บันทึกกิจกรรม" : "สำรวจอารมณ์ตนเอง"}>
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="checkin-title">
        <header className={styles.createHeader}>
          <button className={styles.actionBtn} aria-label="ยกเลิก" onClick={handleCancel}>
            <X />
          </button>
          <h2 className={styles.createTitle} id="checkin-title">
            {notePreset ? "บันทึกกิจกรรม" : "สำรวจอารมณ์ตนเอง"}
          </h2>
          <button
            className={`${styles.actionBtn} ${saving ? styles.saving : ""}`}
            aria-label="บันทึก"
            onClick={handleSave}
            disabled={saving}
            style={{ borderColor: "#08c65a" }}
          >
            {saving
              ? <LoaderCircle style={{ stroke: "#08c65a" }} />
              : <Check style={{ stroke: "#08c65a" }} />
            }
          </button>
        </header>

        <div style={{ padding: "0.8rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {notePreset ? (
            <>
              <p style={{ margin: 0, fontSize: "2.1em", fontWeight: 600, color: "#555", textAlign: "center" }}>
                {notePreset.question}
              </p>
              {notePreset.inputType === "number" ? (
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={state.note}
                  aria-label={notePreset.question}
                  onChange={(e) => dispatchLocal({ type: "SET_NOTE", note: e.target.value })}
                  style={{
                    fontSize: "2em",
                    textAlign: "center",
                    border: "2px solid #d1d5db",
                    borderRadius: "0.5rem",
                    padding: "0.5rem",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <textarea
                  value={state.note}
                  aria-label={notePreset.question}
                  rows={4}
                  onChange={(e) => dispatchLocal({ type: "SET_NOTE", note: e.target.value })}
                  style={{
                    fontSize: "1.4em",
                    border: "2px solid #d1d5db",
                    borderRadius: "0.5rem",
                    padding: "0.5rem",
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
              )}
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: "2.1em", fontWeight: 600, color: "#555", textAlign: "center" }}>วันนี้คุณรู้สึกอย่างไร?</p>
              <div className={checkinStyles.ciMoodRow} role="radiogroup" aria-label="ระดับอารมณ์">
                {MOOD_LEVELS.map(({ level, Face, color, label }) => (
                  <button
                    key={level}
                    className={`${checkinStyles.ciMoodBtn} ${state.mood === level ? checkinStyles.isSelected : ""}`}
                    role="radio"
                    aria-checked={state.mood === level}
                    aria-label={label}
                    onClick={() => dispatchLocal({ type: "SET_MOOD", mood: level })}
                  >
                    <span className={checkinStyles.ciMoodEmoji} aria-hidden="true">
                      <Face color={color} />
                    </span>
                    <span className={checkinStyles.ciMoodLabel}>{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <BookShellLayout
        tight
        fitViewport
        centerMobile
        rail={<IconRail />}
        mergedOnly
        merged={leftPage}
      />
      <dialog ref={discardRef} className={styles.discardDialog} aria-modal="true">
        <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div className={styles.discardDialogBtns}>
          <button className={styles.discardBtnCancel} onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
          <button className={styles.discardBtnLeave} onClick={() => { discardRef.current?.close(); router.back(); }}>ละทิ้ง</button>
        </div>
      </dialog>
    </>
  );
}

export default function ExploreEmotionPage() {
  return (
    <Suspense>
      <ExploreEmotionInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && pnpm tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(authed)/habit/checkin/physical/emotion/explore/page.tsx"
git commit -m "feat(habit): show text/number input for stress_relief and sleep_rest check-ins"
```

---

### Task 7: Full test suite and lint

- [ ] **Step 1: Run all tests**

```bash
cd frontend && pnpm vitest run 2>&1 | tail -40
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

```bash
cd frontend && pnpm lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: TypeScript full check**

```bash
cd frontend && pnpm tsc --noEmit 2>&1
```

Expected: no errors.
