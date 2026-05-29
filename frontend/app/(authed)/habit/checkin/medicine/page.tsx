"use client";
import { Suspense, useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { DateShort } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import { useSaveMedicineCheckinMutation, useGetTodayHabitsQuery, useGetMedicineCheckinQuery } from "@/store/habitsApi";
import type { SymptomCheck, MealSlot } from "@/types/habit";

const MOCK_SIDE_EFFECTS: SymptomCheck[] = [
  { id: "se1", label: "คลื่นไส้", checked: false },
  { id: "se2", label: "ปวดท้อง", checked: false },
  { id: "se3", label: "ผื่นคัน", checked: false },
];

interface State { sideEffects: SymptomCheck[] }
type Action =
  | { type: "TOGGLE"; id: string }
  | { type: "RESET"; sideEffects: SymptomCheck[] };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return {
      sideEffects: state.sideEffects.map(s =>
        s.id === action.id ? { ...s, checked: !s.checked } : s
      ),
    };
  }
  if (action.type === "RESET") {
    return { sideEffects: action.sideEffects };
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

  const occId      = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [state, dispatch] = useReducer(reducer, { sideEffects: MOCK_SIDE_EFFECTS });
  const { data: existingCheckin, isLoading: checkinLoading } = useGetMedicineCheckinQuery(occId, { skip: !occId });

  useEffect(() => {
    if (existingCheckin?.sideEffects) {
      dispatch({ type: "RESET", sideEffects: existingCheckin.sideEffects });
    }
  }, [existingCheckin]);

  if (!occId) { router.replace("/habit/today"); return null; }

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
    } catch { /* ignore */ }
  }

  const mealRelationLabel = activity?.mealRelation === "before" ? "ก่อนอาหาร" : "หลังอาหาร";
  const mealSlots = activity?.mealSlots ?? [];

  return (
    <main className="screen" aria-label="Story Diary Medicine Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>

        {/* ── Left page: medicine identity ── */}
        <section
          className="page page-left page-seam-right"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "1.1rem", overflow: "hidden" }}
          aria-label="ข้อมูลยา"
        >
          {/* Header */}
          <div className="ci-page-header">
            <button className="ci-btn" aria-label="กลับ" onClick={() => router.push("/habit/today")}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="ci-title">บันทึกการกินยา</h2>
          </div>

          {/* Medicine identity */}
          <div className="ci-identity">
            <div className="ci-icon ci-icon--med" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M9 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="1" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="12" y1="9" x2="12" y2="15"/>
              </svg>
            </div>
            <span className="ci-name-pill ci-name-pill--med">{activity?.name ?? "ยา"}</span>
          </div>

          {/* Timing chips */}
          {(mealSlots.length > 0 || true) && (
            <div className="ci-chips">
              <span className="ci-chip ci-chip--timing">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/>
                  <polyline points="12 7 12 12 15 15"/>
                </svg>
                {mealRelationLabel}
              </span>
              {mealSlots.map(slot => (
                <span key={slot} className="ci-chip ci-chip--slot">{SLOT_LABEL[slot]}</span>
              ))}
            </div>
          )}

          <DateShort />
          {checkinLoading
            ? <PageSpinner variant="small" label="กำลังโหลดข้อมูล…" />
            : <p className="ci-hint">กรุณาตรวจสอบและทำเครื่องหมายหากมีผลข้างเคียง<br/>หลังรับประทานยา</p>
          }
        </section>

        {/* ── Right page: side effects ── */}
        <section
          className="page"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "0.9rem", overflow: "hidden" }}
          aria-label="ผลข้างเคียง"
        >
          {/* Section header */}
          <div className="ci-section-header">
            <h3 className="ci-section-label">
              <svg viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              ผลข้างเคียง
            </h3>
            <button
              className="ci-btn ci-btn--save"
              aria-label="บันทึก"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <svg viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite" }}><circle cx="12" cy="12" r="9" strokeDasharray="20 40" fill="none"/></svg>
                : <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              }
            </button>
          </div>

          {/* Checklist */}
          <div className="ci-check-list" role="group" aria-label="รายการผลข้างเคียง">
            {state.sideEffects.map(se => (
              <label
                key={se.id}
                className={`ci-check-row${se.checked ? " is-checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={se.checked}
                  aria-label={se.label}
                  onChange={() => dispatch({ type: "TOGGLE", id: se.id })}
                  style={{ display: "none" }}
                />
                <span className="ci-check-circle" aria-hidden="true">
                  {se.checked && (
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </span>
                <span className="ci-check-label">{se.label}</span>
              </label>
            ))}
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
