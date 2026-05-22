"use client";
import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useSaveMoodCheckinMutation } from "@/store/habitsApi";
import type { MoodLevel } from "@/types/habit";

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
      router.replace("/habit/today");
    } catch {
      // ignore
    }
  }

  function handleCancel() {
    if (state.dirty) { discardRef.current?.showModal(); }
    else { router.push("/habit/add/physical/emotion"); }
  }

  const sliderPct = (state.sliderValue + 100) / 2;
  const sliderColor = state.sliderValue >= 0
    ? `hsl(${120 * (sliderPct / 100)}, 70%, 50%)`
    : `hsl(${360 - 40 * ((100 - sliderPct) / 100)}, 70%, 50%)`;

  return (
    <main className="screen" aria-label="Story Diary Explore Emotion">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="สำรวจอารมณ์ตนเอง">
          <div className="create-card checkin-card mood-card" role="dialog" aria-modal="true" aria-labelledby="mood-title">
            <header className="create-header">
              <button className="action-btn" aria-label="ยกเลิก" onClick={handleCancel}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 className="create-title" id="mood-title">สำรวจอารมณ์ตนเอง</h2>
              <button
                className={`action-btn${saving ? " saving" : ""}`}
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

            <div className="mood-body">
              <p className="mood-prompt">วันนี้คุณรู้สึกอย่างไร?</p>
              <div className="mood-emoji-row" role="radiogroup" aria-label="ระดับอารมณ์">
                {MOOD_LEVELS.map(({ level, emoji, label }) => (
                  <button
                    key={level}
                    className={`mood-emoji${state.mood === level ? " is-selected" : ""}`}
                    role="radio"
                    aria-checked={state.mood === level}
                    aria-label={label}
                    onClick={() => dispatchLocal({ type: "SET_MOOD", mood: level })}
                  >
                    <span className="mood-emoji-face">{emoji}</span>
                    <span className="mood-emoji-label">{label}</span>
                  </button>
                ))}
              </div>

              <div className="mood-slider-wrap">
                <span className="mood-slider-sign mood-slider-neg">−</span>
                <input
                  type="range"
                  className="mood-slider"
                  min="-100"
                  max="100"
                  value={state.sliderValue}
                  aria-label="ระดับอารมณ์ละเอียด"
                  style={{ ["--slider-color" as string]: sliderColor }}
                  onChange={(e) => dispatchLocal({ type: "SET_SLIDER", value: Number(e.target.value) })}
                />
                <span className="mood-slider-sign mood-slider-pos">+</span>
              </div>
            </div>
          </div>
        </section>
        <IconRail />
      </section>
      <dialog ref={discardRef} className="discard-dialog" aria-modal="true">
        <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div className="discard-dialog-btns">
          <button className="discard-btn-cancel" onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
          <button className="discard-btn-leave" onClick={() => { discardRef.current?.close(); router.push("/habit/add/physical/emotion"); }}>ละทิ้ง</button>
        </div>
      </dialog>
    </main>
  );
}
