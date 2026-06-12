"use client";
import { Check, ChevronLeft, LoaderCircle, Utensils } from "lucide-react";
import { Suspense, useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { DateShort } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import { useSaveNutritionCheckinMutation, useGetTodayHabitsQuery, useGetNutritionCheckinQuery } from "@/store/habitsApi";
import styles from "../HabitCheckin.module.css";

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
  { field: "breakfast", label: "อาหารเช้า", placeholder: "ข้าวต้ม, ไข่ดาว, นม…" },
  { field: "lunch", label: "อาหารกลางวัน", placeholder: "ข้าวราดแกง, ผัดผัก…" },
  { field: "dinner", label: "อาหารเย็น", placeholder: "ต้มยำ, ปลานึ่ง, สลัด…" },
];

function NutritionCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveNutrition, { isLoading: saving }] = useSaveNutritionCheckinMutation();

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [state, dispatch] = useReducer(reducer, { breakfast: "", lunch: "", dinner: "" });
  const { data: existingCheckin, isLoading: checkinLoading } = useGetNutritionCheckinQuery(occId, { skip: !occId });

  useEffect(() => {
    if (existingCheckin) {
      dispatch({ type: "RESET", breakfast: existingCheckin.breakfast, lunch: existingCheckin.lunch, dinner: existingCheckin.dinner });
    }
  }, [existingCheckin]);

  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  if (!occId) return null;

  async function handleSave() {
    if (saving) return;
    try {
      await saveNutrition({
        occurrenceId: occId,
        activityId,
        activityName: activity?.name ?? "โภชนาการ",
        breakfast: state.breakfast,
        lunch: state.lunch,
        dinner: state.dinner,
        date: today,
      }).unwrap();
      router.replace("/habit/checklist");
    } catch { /* ignore */ }
  }

  const leftPage = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }} aria-label="ข้อมูลโภชนาการ">
      <div className={styles.ciPageHeader}>
        <button className={styles.ciBtn} aria-label="กลับ" onClick={() => router.push("/habit/checklist")}>
          <ChevronLeft />
        </button>
        <h2 className={styles.ciTitle}>บันทึกโภชนาการ</h2>
      </div>

      <div className={styles.ciIdentity}>
        <div className={`${styles.ciIcon} ${styles.ciIconNutrition}`} aria-hidden="true">
          <Utensils />
        </div>
        <span className={`${styles.ciNamePill} ${styles.ciNamePillNutrition}`}>{activity?.name ?? "โภชนาการ"}</span>
      </div>

      <DateShort />
      {checkinLoading
        ? <PageSpinner variant="small" label="กำลังโหลดข้อมูล…" />
        : <p className={styles.ciHint}>บันทึกรายการอาหารที่รับประทานในแต่ละมื้อของวันนี้<br />เพื่อติดตามโภชนาการ</p>
      }
    </div>
  );

  const rightPage = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.9rem" }} aria-label="บันทึกมื้ออาหาร">
      <div className={styles.ciSectionHeader}>
        <h3 className={styles.ciSectionLabel}>
          <Utensils style={{ stroke: "#2eb563" }} />
          มื้ออาหาร
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

      <div className={styles.ciMealList} role="group" aria-label="บันทึกอาหาร">
        {MEALS.map(({ field, label, placeholder }) => (
          <div key={field} className={styles.ciMealCard}>
            <label className={styles.ciMealLabel} htmlFor={`${field}-field`}>{label}</label>
            <input
              id={`${field}-field`}
              className={styles.ciMealInput}
              style={{ fontSize: "1.2em" }}
              type="text"
              placeholder={placeholder}
              value={state[field]}
              onChange={e => dispatch({ type: "SET", field, value: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <BookShellLayout
      left={leftPage}
      right={rightPage}
      rail={<IconRail />}
      ariaLabel="Story Diary Nutrition Check-in"
    />
  );
}

export default function NutritionCheckinPage() {
  return (
    <Suspense>
      <NutritionCheckinInner />
    </Suspense>
  );
}
