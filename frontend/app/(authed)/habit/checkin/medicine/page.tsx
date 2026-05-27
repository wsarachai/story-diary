"use client";
import { Suspense, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useSaveMedicineCheckinMutation, useGetTodayHabitsQuery } from "@/store/habitsApi";
import type { SymptomCheck, MealSlot } from "@/types/habit";

const MOCK_SIDE_EFFECTS: SymptomCheck[] = [
  { id: "se1", label: "คลื่นไส้", checked: false },
  { id: "se2", label: "ปวดท้อง", checked: false },
  { id: "se3", label: "ผื่นคัน", checked: false },
];

interface State { sideEffects: SymptomCheck[] }
type Action = { type: "TOGGLE"; id: string };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return { sideEffects: state.sideEffects.map(s => s.id === action.id ? { ...s, checked: !s.checked } : s) };
  }
  return state;
}

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "เช้า",
  lunch: "กลางวัน",
  dinner: "เย็น",
  "before-bed": "ก่อนนอน",
};

function MedicineCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveMedicine, { isLoading: saving }] = useSaveMedicineCheckinMutation();

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [state, dispatchLocal] = useReducer(reducer, { sideEffects: MOCK_SIDE_EFFECTS });

  if (!occId) {
    router.replace("/habit/today");
    return null;
  }

  async function handleSave() {
    if (saving) return;
    try {
      await saveMedicine({
        occurrenceId: occId,
        medicineName: activity?.name ?? "ยา",
        mealRelation: activity?.mealRelation ?? "after",
        mealSlots: activity?.mealSlots ?? [],
        sideEffects: state.sideEffects,
        date: today,
      }).unwrap();
      router.replace("/habit/today");
    } catch {
      // ignore
    }
  }

  const mealRelationLabel = activity?.mealRelation === "before" ? "ก่อนอาหาร" : "หลังอาหาร";
  const mealSlots = activity?.mealSlots ?? [];

  return (
    <main className="screen" aria-label="Story Diary Medicine Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="บันทึกการกินยา">
          <div className="med-checkin-card" role="dialog" aria-modal="true" aria-labelledby="med-checkin-title">

            {/* ── Header ── */}
            <header className="med-checkin-header">
              <button
                className="med-action-btn"
                aria-label="กลับ"
                onClick={() => router.push("/habit/today")}
              >
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="med-checkin-title" id="med-checkin-title">บันทึกการกินยา</h2>
              <button
                className="med-action-btn med-action-btn--save"
                aria-label="บันทึก"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a", animation: "spin 0.9s linear infinite" }}><circle cx="12" cy="12" r="9" strokeDasharray="20 40" fill="none"/></svg>
                  : <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><polyline points="20 6 9 17 4 12"/></svg>
                }
              </button>
            </header>

            {/* ── Medicine info ── */}
            <section className="med-info-section" aria-label="ข้อมูลยา">
              <div className="med-info-name-row">
                <div className="med-info-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="1" width="6" height="4" rx="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/>
                    <line x1="12" y1="9" x2="12" y2="15"/>
                  </svg>
                </div>
                <span className="med-name-pill">{activity?.name ?? "ยา"}</span>
              </div>

              <div className="med-timing-chips">
                <span className="med-chip med-chip--timing">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"/>
                    <polyline points="12 7 12 12 15 15"/>
                  </svg>
                  {mealRelationLabel}
                </span>
                {mealSlots.map(slot => (
                  <span key={slot} className="med-chip med-chip--slot">
                    {SLOT_LABEL[slot]}
                  </span>
                ))}
              </div>
            </section>

            <div className="med-divider" aria-hidden="true" />

            {/* ── Side effects ── */}
            <section className="med-side-effects-section" aria-label="ผลข้างเคียง">
              <h3 className="med-side-effects-title">
                <svg viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                ผลข้างเคียง
              </h3>

              <div className="med-se-list" role="group" aria-label="รายการผลข้างเคียง">
                {state.sideEffects.map(se => (
                  <label
                    key={se.id}
                    className={`med-se-row${se.checked ? " med-se-row--checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={se.checked}
                      aria-label={se.label}
                      onChange={() => dispatchLocal({ type: "TOGGLE", id: se.id })}
                      style={{ display: "none" }}
                    />
                    <span className="med-se-circle" aria-hidden="true">
                      {se.checked && (
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </span>
                    <span className="med-se-label">{se.label}</span>
                  </label>
                ))}
              </div>
            </section>

          </div>
        </section>
        <IconRail />
      </section>
    </main>
  );
}

export default function MedicineCheckinPage() {
  return (
    <Suspense>
      <MedicineCheckinInner />
    </Suspense>
  );
}
