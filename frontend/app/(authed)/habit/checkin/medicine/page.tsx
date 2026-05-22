"use client";
import { Suspense, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useSaveMedicineCheckinMutation, useGetTodayHabitsQuery } from "@/store/habitsApi";
import type { SymptomCheck } from "@/types/habit";

const MOCK_SIDE_EFFECTS: SymptomCheck[] = [
  { id: "se1", label: "อาการ 1 : คลื่นไส้", checked: false },
  { id: "se2", label: "อาการ 2 : ปวดท้อง", checked: false },
  { id: "se3", label: "อาการ 3 : ผื่นคัน", checked: false },
];

interface State {
  sideEffects: SymptomCheck[];
}

type Action = { type: "TOGGLE"; id: string };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return { sideEffects: state.sideEffects.map((s) => s.id === action.id ? { ...s, checked: !s.checked } : s) };
  }
  return state;
}

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
        date: today
      }).unwrap();
      router.replace("/habit/today");
    } catch {
      // ignore
    }
  }

  const mealSlotLabel = (activity?.mealSlots ?? []).join(", ") || "—";
  const mealRelationLabel = activity?.mealRelation === "before" ? "ก่อนอาหาร" : "หลังอาหาร";

  return (
    <main className="screen" aria-label="Story Diary Medicine Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="บันทึกการกินยา">
          <div className="create-card checkin-card" role="dialog" aria-modal="true" aria-labelledby="med-checkin-title">
            <header className="create-header">
              <button className="action-btn" aria-label="กลับ" onClick={() => router.push("/habit/today")}>
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="create-title" id="med-checkin-title">บันทึกการกินยา</h2>
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

            <div className="checkin-body">
              <div className="med-name-badge" aria-label="ชื่อยา">
                <span className="med-name-label">ชื่อยา :</span>
                <span className="med-name-value">{activity?.name ?? "ยา"}</span>
              </div>
              <div className="med-detail-line">
                <span className="med-detail-key">เวลา :</span>
                <span className="med-detail-val">{mealRelationLabel}</span>
              </div>
              <div className="med-detail-line">
                <span className="med-detail-key">มื้อ :</span>
                <span className="med-detail-val">{mealSlotLabel}</span>
              </div>

              <div className="section-divider" aria-hidden="true" />

              <p className="symptom-section-title">ผลข้างเคียง</p>
              <div className="symptom-list" role="group" aria-label="รายการผลข้างเคียง">
                {state.sideEffects.map((se) => (
                  <label key={se.id} className={`symptom-row${se.checked ? " is-checked" : ""}`}>
                    <input
                      type="checkbox"
                      className="symptom-check"
                      checked={se.checked}
                      aria-label={se.label}
                      onChange={() => dispatchLocal({ type: "TOGGLE", id: se.id })}
                    />
                    <span className="symptom-label">{se.label}</span>
                  </label>
                ))}
              </div>
            </div>
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
