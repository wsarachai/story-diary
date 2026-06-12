"use client";
import { Activity, Check, ChevronLeft, LoaderCircle } from "lucide-react";
import { Suspense, useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { DateShort } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import { useSaveSymptomsCheckinMutation, useGetTodayHabitsQuery, useGetSymptomsCheckinQuery } from "@/store/habitsApi";
import type { SymptomCheck } from "@/types/habit";
import styles from "../HabitCheckin.module.css";

const MOCK_SYMPTOMS: SymptomCheck[] = [
  { id: "s1", label: "เหนื่อยง่าย / อ่อนเพลีย", checked: false },
  { id: "s2", label: "ปวดหัว", checked: false },
  { id: "s3", label: "คลื่นไส้ / อาเจียน", checked: false },
  { id: "s4", label: "ปวดตามข้อหรือกล้ามเนื้อ", checked: false },
  { id: "s5", label: "มีไข้ / หนาวสั่น", checked: false },
];

interface State { items: SymptomCheck[] }
type Action =
  | { type: "TOGGLE"; id: string }
  | { type: "RESET"; items: SymptomCheck[] };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return {
      items: state.items.map(s =>
        s.id === action.id ? { ...s, checked: !s.checked } : s
      ),
    };
  }
  if (action.type === "RESET") {
    return { items: action.items };
  }
  return state;
}

function SymptomCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveSymptoms, { isLoading: saving }] = useSaveSymptomsCheckinMutation();

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [state, dispatch] = useReducer(reducer, { items: MOCK_SYMPTOMS });
  const { data: existingCheckin, isLoading: checkinLoading } = useGetSymptomsCheckinQuery(occId, { skip: !occId });

  useEffect(() => {
    if (existingCheckin?.items) {
      dispatch({ type: "RESET", items: existingCheckin.items });
    }
  }, [existingCheckin]);

  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  if (!occId) return null;

  async function handleSave() {
    if (saving) return;
    try {
      await saveSymptoms({
        occurrenceId: occId,
        activityId,
        items: state.items,
        date: today,
      }).unwrap();
      router.replace("/habit/checklist");
    } catch { /* ignore */ }
  }

  const left = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }} aria-label="ข้อมูลอาการ">
      <div className={styles.ciPageHeader}>
        <button className={styles.ciBtn} aria-label="กลับ" onClick={() => router.push("/habit/checklist")}>
          <ChevronLeft />
        </button>
        <h2 className={styles.ciTitle}>บันทึกอาการ</h2>
      </div>

      <div className={styles.ciIdentity}>
        <div className={`${styles.ciIcon} ${styles.ciIconSymptom}`} aria-hidden="true">
          <Activity />
        </div>
        <span className={`${styles.ciNamePill} ${styles.ciNamePillSymptom}`}>
          {activity?.name ?? "อาการผิดปกติ"}
        </span>
      </div>

      <DateShort />
      {checkinLoading
        ? <PageSpinner variant="small" label="กำลังโหลดข้อมูล…" />
        : <p className={styles.ciHint}>ทำเครื่องหมายอาการที่พบในวันนี้<br />เพื่อติดตามสุขภาพของคุณ</p>
      }
    </div>
  );

  const right = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.9rem" }} aria-label="รายการอาการ">
      <div className={styles.ciSectionHeader}>
        <h3 className={styles.ciSectionLabel}>
          <Activity style={{ stroke: "#e76f51" }} />
          อาการวันนี้
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

      <div className={styles.ciCheckList} role="group" aria-label="รายการอาการ">
        {state.items.map(item => (
          <label
            key={item.id}
            className={`${styles.ciCheckRow}${item.checked ? ` ${styles.isChecked}` : ""}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              aria-label={item.label}
              onChange={() => dispatch({ type: "TOGGLE", id: item.id })}
              style={{ display: "none" }}
            />
            <span className={styles.ciCheckCircle} aria-hidden="true">
              {item.checked && (
                <Check />
              )}
            </span>
            <span className={styles.ciCheckLabel}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <BookShellLayout
      tight
      left={left}
      right={right}
      rail={<IconRail />}
    />
  );
}

export default function SymptomCheckinPage() {
  return (
    <Suspense>
      <SymptomCheckinInner />
    </Suspense>
  );
}
