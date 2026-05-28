"use client";
import { Suspense, useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useSaveNutritionCheckinMutation, useGetTodayHabitsQuery, useGetNutritionCheckinQuery } from "@/store/habitsApi";

interface State {
  breakfast: string;
  lunch: string;
  dinner: string;
}
type Field = keyof State;
type Action =
  | { type: "SET"; field: Field; value: string }
  | { type: "RESET"; breakfast: string; lunch: string; dinner: string };

function reducer(state: State, action: Action): State {
  if (action.type === "SET") {
    return { ...state, [action.field]: action.value };
  }
  if (action.type === "RESET") {
    return { breakfast: action.breakfast, lunch: action.lunch, dinner: action.dinner };
  }
  return state;
}

const MEALS: { field: Field; label: string; placeholder: string }[] = [
  { field: "breakfast", label: "อาหารเช้า",      placeholder: "ข้าวต้ม, ไข่ดาว, นม…" },
  { field: "lunch",     label: "อาหารกลางวัน",   placeholder: "ข้าวราดแกง, ผัดผัก…"  },
  { field: "dinner",    label: "อาหารเย็น",      placeholder: "ต้มยำ, ปลานึ่ง, สลัด…" },
];

function NutritionCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveNutrition, { isLoading: saving }] = useSaveNutritionCheckinMutation();

  const occId      = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [state, dispatch] = useReducer(reducer, { breakfast: "", lunch: "", dinner: "" });
  const { data: existingCheckin } = useGetNutritionCheckinQuery(occId, { skip: !occId });

  useEffect(() => {
    if (existingCheckin) {
      dispatch({ type: "RESET", breakfast: existingCheckin.breakfast, lunch: existingCheckin.lunch, dinner: existingCheckin.dinner });
    }
  }, [existingCheckin]);

  if (!occId) { router.replace("/habit/today"); return null; }

  async function handleSave() {
    if (saving) return;
    try {
      await saveNutrition({
        occurrenceId: occId,
        activityName: activity?.name ?? "โภชนาการ",
        breakfast: state.breakfast,
        lunch: state.lunch,
        dinner: state.dinner,
        date: today,
      }).unwrap();
      router.replace("/habit/today");
    } catch { /* ignore */ }
  }

  return (
    <main className="screen" aria-label="Story Diary Nutrition Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>

        {/* ── Left page: nutrition identity ── */}
        <section
          className="page page-left page-seam-right"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "1.1rem", overflow: "hidden" }}
          aria-label="ข้อมูลโภชนาการ"
        >
          {/* Header */}
          <div className="ci-page-header">
            <button className="ci-btn" aria-label="กลับ" onClick={() => router.push("/habit/today")}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="ci-title">บันทึกโภชนาการ</h2>
          </div>

          {/* Nutrition identity */}
          <div className="ci-identity">
            <div className="ci-icon ci-icon--nutrition" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M3 2v7c0 1.66 1.34 3 3 3h1v9a1 1 0 0 0 2 0V5"/>
                <path d="M18 2v20M15 2v6a3 3 0 0 0 6 0V2"/>
              </svg>
            </div>
            <span className="ci-name-pill ci-name-pill--nutrition">{activity?.name ?? "โภชนาการ"}</span>
          </div>

          <p className="ci-hint">บันทึกรายการอาหารที่รับประทานในแต่ละมื้อของวันนี้<br/>เพื่อติดตามโภชนาการ</p>
        </section>

        {/* ── Right page: meal log ── */}
        <section
          className="page"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "0.9rem", overflow: "hidden" }}
          aria-label="บันทึกมื้ออาหาร"
        >
          {/* Section header */}
          <div className="ci-section-header">
            <h3 className="ci-section-label">
              <svg viewBox="0 0 24 24" style={{ stroke: "#2eb563" }}>
                <path d="M3 2v7c0 1.66 1.34 3 3 3h1v9a1 1 0 0 0 2 0V5"/>
                <path d="M18 2v20M15 2v6a3 3 0 0 0 6 0V2"/>
              </svg>
              มื้ออาหาร
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

          {/* Meal cards */}
          <div className="ci-meal-list" role="group" aria-label="บันทึกอาหาร">
            {MEALS.map(({ field, label, placeholder }) => (
              <div key={field} className="ci-meal-card">
                <label className="ci-meal-label" htmlFor={`${field}-field`}>{label}</label>
                <input
                  id={`${field}-field`}
                  className="ci-meal-input"
                  type="text"
                  placeholder={placeholder}
                  value={state[field]}
                  onChange={e => dispatch({ type: "SET", field, value: e.target.value })}
                />
              </div>
            ))}
          </div>
        </section>

        <IconRail />
      </section>
    </main>
  );
}

export default function NutritionCheckinPage() {
  return (
    <Suspense>
      <NutritionCheckinInner />
    </Suspense>
  );
}
