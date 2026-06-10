"use client";
import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useSaveMoodCheckinMutation } from "@/store/habitsApi";
import { useClientSearchParams } from "@/lib/hooks";
import type { MoodLevel } from "@/types/habit";
import styles from "../../../HabitAdd.module.css";
import checkinStyles from "../../../../checkin/HabitCheckin.module.css";

const MOOD_LEVELS: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: "very-bad", emoji: "😞", label: "แย่มาก" },
  { level: "bad", emoji: "😕", label: "แย่" },
  { level: "neutral", emoji: "😐", label: "เฉยๆ" },
  { level: "good", emoji: "🙂", label: "ดี" },
  { level: "very-good", emoji: "😊", label: "ดีมาก" },
];

interface State {
  mood: MoodLevel;
  sliderValue: number;
  dirty: boolean;
}

type Action =
  | { type: "SET_MOOD"; mood: MoodLevel }
  | { type: "SET_SLIDER"; value: number };

function reducer(state: State, action: Action): State {
  if (action.type === "SET_MOOD") return { ...state, mood: action.mood, dirty: true };
  if (action.type === "SET_SLIDER") return { ...state, sliderValue: action.value, dirty: true };
  return state;
}

export default function ExploreEmotionPage() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const from = searchParams.get("from") ?? "/habit/checklist";
  const [saveMood, { isLoading: saving }] = useSaveMoodCheckinMutation();
  const discardRef = useRef<HTMLDialogElement>(null);
  const [state, dispatchLocal] = useReducer(reducer, { mood: "neutral", sliderValue: 0, dirty: false });

  const today = new Date().toISOString().split("T")[0];

  async function handleSave() {
    if (saving) return;
    try {
      await saveMood({
        occurrenceId: "mood-occ-1",
        mood: state.mood,
        sliderValue: state.sliderValue,
        date: today
      }).unwrap();
      router.replace(from);
    } catch {
      // ignore
    }
  }

  function handleCancel() {
    if (state.dirty) { discardRef.current?.showModal(); }
    else { router.back(); }
  }

  const sliderPct = (state.sliderValue + 100) / 2;
  const sliderColor = state.sliderValue >= 0
    ? `hsl(${120 * (sliderPct / 100)}, 70%, 50%)`
    : `hsl(${360 - 40 * ((100 - sliderPct) / 100)}, 70%, 50%)`;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="สำรวจอารมณ์ตนเอง">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="mood-title">
        <header className={styles.createHeader}>
          <button className={styles.actionBtn} aria-label="ยกเลิก" onClick={handleCancel}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2 className={styles.createTitle} id="mood-title">สำรวจอารมณ์ตนเอง</h2>
          <button
            className={`${styles.actionBtn} ${saving ? styles.saving : ""}`}
            aria-label="บันทึก"
            onClick={handleSave}
            disabled={saving}
            style={{ borderColor: "#08c65a" }}
          >
            {saving
              ? <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><circle cx="12" cy="12" r="9" strokeDasharray="20 40"/></svg>
              : <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><polyline points="20 6 9 17 4 12"/></svg>
            }
          </button>
        </header>

        <div style={{ padding: "0.8rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "2.1em", fontWeight: 600, color: "#555", textAlign: "center" }}>วันนี้คุณรู้สึกอย่างไร?</p>
          <div className={checkinStyles.ciMoodRow} role="radiogroup" aria-label="ระดับอารมณ์">
            {MOOD_LEVELS.map(({ level, emoji, label }) => (
              <button
                key={level}
                className={`${checkinStyles.ciMoodBtn} ${state.mood === level ? checkinStyles.isSelected : ""}`}
                role="radio"
                aria-checked={state.mood === level}
                aria-label={label}
                onClick={() => dispatchLocal({ type: "SET_MOOD", mood: level })}
              >
                <span className={checkinStyles.ciMoodEmoji}>{emoji}</span>
                <span className={checkinStyles.ciMoodLabel}>{label}</span>
              </button>
            ))}
          </div>

          <div className={checkinStyles.ciMoodSliderWrap}>
            <div className={checkinStyles.ciMoodSliderLabels} style={{ fontSize: "2em" }}>
              <span className={checkinStyles.ciMoodSliderSign}>−</span>
              <span className={checkinStyles.ciMoodSliderSign}>+</span>
            </div>
            <input
              type="range"
              className={checkinStyles.ciMoodSlider}
              min="-100"
              max="100"
              value={state.sliderValue}
              aria-label="ระดับอารมณ์ละเอียด"
              style={{ background: sliderColor }}
              onChange={(e) => dispatchLocal({ type: "SET_SLIDER", value: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <BookShellLayout
        tight
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
