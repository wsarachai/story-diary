"use client";
import { Suspense, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useSaveSymptomsCheckinMutation, useGetTodayHabitsQuery } from "@/store/habitsApi";
import type { SymptomCheck } from "@/types/habit";

const MOCK_SYMPTOMS: SymptomCheck[] = [
  { id: "s1", label: "เหนื่อยง่าย / อ่อนเพลีย", checked: false },
  { id: "s2", label: "ปวดหัว", checked: false },
  { id: "s3", label: "คลื่นไส้ / อาเจียน", checked: false },
  { id: "s4", label: "ปวดตามข้อหรือกล้ามเนื้อ", checked: false },
  { id: "s5", label: "มีไข้ / หนาวสั่น", checked: false },
];

interface State { items: SymptomCheck[] }
type Action = { type: "TOGGLE"; id: string };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return {
      items: state.items.map(s =>
        s.id === action.id ? { ...s, checked: !s.checked } : s
      ),
    };
  }
  return state;
}

function SymptomCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveSymptoms, { isLoading: saving }] = useSaveSymptomsCheckinMutation();

  const occId      = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [state, dispatch] = useReducer(reducer, { items: MOCK_SYMPTOMS });

  if (!occId) { router.replace("/habit/today"); return null; }

  async function handleSave() {
    if (saving) return;
    try {
      await saveSymptoms({
        occurrenceId: occId,
        items: state.items,
        date: today,
      }).unwrap();
      router.replace("/habit/today");
    } catch { /* ignore */ }
  }

  return (
    <main className="screen" aria-label="Story Diary Symptom Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>

        {/* ── Left page: activity identity ── */}
        <section
          className="page page-left page-seam-right"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "1.1rem", overflow: "hidden" }}
          aria-label="ข้อมูลอาการ"
        >
          <div className="ci-page-header">
            <button className="ci-btn" aria-label="กลับ" onClick={() => router.push("/habit/today")}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="ci-title">บันทึกอาการ</h2>
          </div>

          <div className="ci-identity">
            <div className="ci-icon ci-icon--symptom" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="ci-name-pill ci-name-pill--symptom">
              {activity?.name ?? "อาการผิดปกติ"}
            </span>
          </div>

          <p className="ci-hint">
            ทำเครื่องหมายอาการที่พบในวันนี้<br/>
            เพื่อติดตามสุขภาพของคุณ
          </p>
        </section>

        {/* ── Right page: symptom checklist ── */}
        <section
          className="page"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "0.9rem", overflow: "hidden" }}
          aria-label="รายการอาการ"
        >
          <div className="ci-section-header">
            <h3 className="ci-section-label">
              <svg viewBox="0 0 24 24" style={{ stroke: "#e76f51" }}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              อาการวันนี้
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

          <div className="ci-check-list" role="group" aria-label="รายการอาการ">
            {state.items.map(item => (
              <label
                key={item.id}
                className={`ci-check-row${item.checked ? " is-checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  aria-label={item.label}
                  onChange={() => dispatch({ type: "TOGGLE", id: item.id })}
                  style={{ display: "none" }}
                />
                <span className="ci-check-circle" aria-hidden="true">
                  {item.checked && (
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </span>
                <span className="ci-check-label">{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        <IconRail />
      </section>
    </main>
  );
}

export default function SymptomCheckinPage() {
  return (
    <Suspense>
      <SymptomCheckinInner />
    </Suspense>
  );
}
