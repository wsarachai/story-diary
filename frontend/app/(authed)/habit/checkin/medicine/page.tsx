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
import { MEDICINES, isMedicineKey } from "@/types/medicines";
import styles from "../HabitCheckin.module.css";

interface State {
  sideEffects: SymptomCheck[];
  note: string;
}
type Action =
  | { type: "TOGGLE_SIDE_EFFECT"; id: string }
  | { type: "SET_NOTE"; value: string }
  | { type: "RESET"; sideEffects: SymptomCheck[]; note: string };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE_SIDE_EFFECT") {
    return {
      ...state,
      sideEffects: state.sideEffects.map(s =>
        s.id === action.id ? { ...s, checked: !s.checked } : s
      ),
    };
  }
  if (action.type === "SET_NOTE") {
    return { ...state, note: action.value };
  }
  if (action.type === "RESET") {
    return { sideEffects: action.sideEffects, note: action.note };
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

  const medicineKey = activity?.medicineKey;
  const medInfo = medicineKey && isMedicineKey(medicineKey) ? MEDICINES[medicineKey] : null;

  const [state, dispatch] = useReducer(reducer, { sideEffects: [], note: "" });
  const { data: existingCheckin, isLoading: checkinLoading } = useGetMedicineCheckinQuery(occId, { skip: !occId });

  // Seed the side-effect checklist from the medicine catalogue, overlaying any
  // previously-checked items + free-text note from a saved check-in.
  useEffect(() => {
    if (!activity) return;
    const checkedIds = new Set(
      (existingCheckin?.sideEffects ?? []).filter(s => s.checked).map(s => s.id)
    );
    const sideEffects: SymptomCheck[] = medInfo
      ? medInfo.sideEffects.map(se => ({ id: se.id, label: se.label, checked: checkedIds.has(se.id) }))
      : [];
    dispatch({
      type: "RESET",
      sideEffects,
      note: existingCheckin?.sideEffectNote ?? "",
    });
  }, [activity, medInfo, existingCheckin]);

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
        // Meals were already recorded by the checklist taps; persist the full
        // configured set so the occurrence stays "done".
        mealSlots: activity?.mealSlots ?? [],
        sideEffects: medInfo ? state.sideEffects : [],
        ...(medInfo ? {} : { sideEffectNote: state.note.trim() || undefined }),
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
        : <p className={styles.ciHint}>กรุณาทำเครื่องหมายหากมีผลข้างเคียง<br />หลังรับประทานยา</p>
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

      {medInfo ? (
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
      ) : (
        <textarea
          className={styles.ciNoteField}
          aria-label="ระบุอาการข้างเคียง"
          placeholder="ระบุอาการข้างเคียง (ถ้ามี)"
          value={state.note}
          onChange={(e) => dispatch({ type: "SET_NOTE", value: e.target.value })}
          rows={6}
        />
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
