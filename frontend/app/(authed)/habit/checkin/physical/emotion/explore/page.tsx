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
        if (!state.note.trim()) return;
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
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    const clamped = isNaN(raw) ? "" : String(Math.min(24, Math.max(0, raw)));
                    dispatchLocal({ type: "SET_NOTE", note: clamped });
                  }}
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
