"use client";
import { Check, ChevronLeft, Clock, LoaderCircle, Pill, TriangleAlert } from "lucide-react";
import { Suspense, useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { DateShort } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import { useSaveMedicineCheckinMutation, useGetTodayHabitsQuery, useGetMedicineCheckinQuery } from "@/store/habitsApi";
import type { SymptomCheck, MealSlot } from "@/types/habit";
import styles from "../HabitCheckin.module.css";

const MOCK_SIDE_EFFECTS: SymptomCheck[] = [
  { id: "se1", label: "คลื่นไส้", checked: false },
  { id: "se2", label: "ปวดท้อง", checked: false },
  { id: "se3", label: "ผื่นคัน", checked: false },
];

interface State {
  sideEffects: SymptomCheck[];
  checkedMealSlots: MealSlot[];
}
type Action =
  | { type: "TOGGLE_SIDE_EFFECT"; id: string }
  | { type: "TOGGLE_MEAL_SLOT"; slot: MealSlot }
  | { type: "RESET"; sideEffects: SymptomCheck[]; mealSlots: MealSlot[] };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE_SIDE_EFFECT") {
    return {
      ...state,
      sideEffects: state.sideEffects.map(s =>
        s.id === action.id ? { ...s, checked: !s.checked } : s
      ),
    };
  }
  if (action.type === "TOGGLE_MEAL_SLOT") {
    const isChecked = state.checkedMealSlots.includes(action.slot);
    const checkedMealSlots = isChecked
      ? state.checkedMealSlots.filter(s => s !== action.slot)
      : [...state.checkedMealSlots, action.slot];
    return {
      ...state,
      checkedMealSlots,
    };
  }
  if (action.type === "RESET") {
    return {
      sideEffects: action.sideEffects,
      checkedMealSlots: action.mealSlots,
    };
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

  const [state, dispatch] = useReducer(reducer, { sideEffects: MOCK_SIDE_EFFECTS, checkedMealSlots: [] });
  const { data: existingCheckin, isLoading: checkinLoading } = useGetMedicineCheckinQuery(occId, { skip: !occId });

  useEffect(() => {
    if (existingCheckin) {
      dispatch({
        type: "RESET",
        sideEffects: existingCheckin.sideEffects ?? MOCK_SIDE_EFFECTS,
        mealSlots: existingCheckin.mealSlots ?? [],
      });
    }
  }, [existingCheckin]);

  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  if (!occId) return null;

  async function handleSave() {
    if (saving) return;
    try {
      await saveMedicine({
        occurrenceId: occId,
        activityId,
        medicineName: activity?.name ?? "ยา",
        mealRelation: activity?.mealRelation ?? "after",
        mealSlots: state.checkedMealSlots,
        sideEffects: state.sideEffects,
        date: today,
      }).unwrap();
      router.replace("/habit/checklist");
    } catch { /* ignore */ }
  }

  const mealRelationLabel = activity?.mealRelation === "before" ? "ก่อนอาหาร" : "หลังอาหาร";
  const mealSlots = activity?.mealSlots ?? [];

  const leftPage = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }} aria-label="ข้อมูลยา">
      <div className={styles.ciPageHeader}>
        <button className={styles.ciBtn} aria-label="กลับ" onClick={() => router.push("/habit/checklist")}>
          <ChevronLeft />
        </button>
        <h2 className={styles.ciTitle}>บันทึกการกินยา</h2>
      </div>

      <div className={styles.ciIdentity}>
        <div className={`${styles.ciIcon} ${styles.ciIconMed}`} aria-hidden="true">
          <Pill />
        </div>
        <span className={`${styles.ciNamePill} ${styles.ciNamePillMed}`}>{activity?.name ?? "ยา"}</span>
      </div>

      <div className={styles.ciChips}>
        <span className={`${styles.ciChip} ${styles.ciChipTiming}`} style={{ fontSize: "1.2em" }}>
          <Clock />
          {mealRelationLabel}
        </span>
        {mealSlots.map(slot => (
          <span key={slot} className={`${styles.ciChip} ${styles.ciChipSlot}`} style={{ fontSize: "1.2em" }}>{SLOT_LABEL[slot]}</span>
        ))}
      </div>

      <DateShort />
      {checkinLoading
        ? <PageSpinner variant="small" label="กำลังโหลดข้อมูล…" />
        : <p className={styles.ciHint}>กรุณาตรวจสอบและทำเครื่องหมายหากมีผลข้างเคียง<br />หลังรับประทานยา</p>
      }
    </div>
  );

  const rightPage = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.9rem" }} aria-label="ผลข้างเคียง">
      <div className={styles.ciSectionHeader}>
        <h3 className={styles.ciSectionLabel}>
          <TriangleAlert />
          ผลข้างเคียง
        </h3>
        <button
          className={`${styles.ciBtn} ${styles.ciBtnSave}`}
          aria-label="บันทึก"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? <LoaderCircle style={{ animation: "spin 0.9s linear infinite" }} />
            : <Check />
          }
        </button>
      </div>

      <div className={styles.ciCheckList} style={{ marginBottom: "1rem" }} role="group" aria-label="รายการผลข้างเคียง">
        {state.sideEffects.map(se => (
          <label
            key={se.id}
            className={`${styles.ciCheckRow} ${se.checked ? styles.isChecked : ""}`}
          >
            <input
              type="checkbox"
              checked={se.checked}
              aria-label={se.label}
              onChange={() => dispatch({ type: "TOGGLE_SIDE_EFFECT", id: se.id })}
              style={{ display: "none" }}
            />
            <span className={styles.ciCheckCircle} aria-hidden="true">
              {se.checked && (
                <Check />
              )}
            </span>
            <span className={styles.ciCheckLabel} style={{ fontSize: "1.25em" }}>{se.label}</span>
          </label>
        ))}
      </div>

      {mealSlots.length > 0 && (
        <>
          <div className={styles.ciSectionHeader} style={{ marginTop: "1rem" }}>
            <h3 className={styles.ciSectionLabel}>
              <Clock style={{ stroke: "#9b5de5" }} />
              มื้อยาที่รับประทาน
            </h3>
          </div>
          <div className={styles.ciCheckList} role="group" aria-label="รายการมื้อยาที่รับประทาน">
            {mealSlots.map(slot => {
              const isChecked = state.checkedMealSlots.includes(slot);
              return (
                <label
                  key={slot}
                  className={`${styles.ciCheckRow} ${isChecked ? styles.isChecked : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    aria-label={SLOT_LABEL[slot]}
                    onChange={() => dispatch({ type: "TOGGLE_MEAL_SLOT", slot })}
                    style={{ display: "none" }}
                  />
                  <span className={styles.ciCheckCircle} aria-hidden="true">
                    {isChecked && (
                      <Check />
                    )}
                  </span>
                  <span className={styles.ciCheckLabel} style={{ fontSize: "1.25em" }}>{SLOT_LABEL[slot]}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <BookShellLayout
      left={leftPage}
      right={rightPage}
      rail={<IconRail />}
      ariaLabel="Story Diary Medicine Check-in"
    />
  );
}

export default function MedicineCheckinPage() {
  return (
    <Suspense>
      <MedicineCheckinInner />
    </Suspense>
  );
}
