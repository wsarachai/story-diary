"use client";
import { Suspense, useReducer, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useSaveSymptomsCheckinMutation, useGetSymptomsCheckinQuery } from "@/store/habitsApi";
import type { SymptomCheck } from "@/types/habit";
import styles from "../../../add/HabitAdd.module.css";
import checkinStyles from "../../HabitCheckin.module.css";

const INITIAL_SYMPTOMS: SymptomCheck[] = [
  { id: "sym1", label: "อาการ 1 : ปวดศีรษะ", checked: false },
  { id: "sym2", label: "อาการ 2 : คลื่นไส้", checked: false },
  { id: "sym3", label: "อาการ 3 : ใจสั่น", checked: false },
  { id: "sym4", label: "อาการ 4 : เวียนหัว", checked: false },
  { id: "sym5", label: "อาการ 5 : อ่อนเพลีย", checked: false },
];

interface State {
  items: SymptomCheck[];
  dirty: boolean;
}

type Action =
  | { type: "TOGGLE"; id: string }
  | { type: "RESET"; items: SymptomCheck[] };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return { items: state.items.map((s) => s.id === action.id ? { ...s, checked: !s.checked } : s), dirty: true };
  }
  if (action.type === "RESET") {
    return { items: action.items, dirty: false };
  }
  return state;
}

function SymptomsCheckinInner() {
  const router = useRouter();
  // Next's useSearchParams (not useClientSearchParams): params must be
  // correct on the very first render, or the missing-occ guard below
  // fires during the soft-navigation window before pushState lands.
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/habit/checklist";
  const [saveSymptoms, { isLoading: saving }] = useSaveSymptomsCheckinMutation();
  const discardRef = useRef<HTMLDialogElement>(null);
  const [state, dispatchLocal] = useReducer(reducer, { items: INITIAL_SYMPTOMS, dirty: false });

  const occId = searchParams.get("occ") ?? "";
  const { data: existingCheckin } = useGetSymptomsCheckinQuery(occId, { skip: !occId });

  // A check-in only makes sense for a concrete occurrence.
  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  useEffect(() => {
    if (existingCheckin?.items) {
      dispatchLocal({ type: "RESET", items: existingCheckin.items });
    }
  }, [existingCheckin]);

  const dirty = state.dirty;
  const today = new Date().toISOString().split("T")[0];

  async function handleSave() {
    if (saving || !occId) return;
    try {
      await saveSymptoms({
        occurrenceId: occId,
        items: state.items,
        date: today
      }).unwrap();
      router.replace(from);
    } catch {
      // ignore
    }
  }

  if (!occId) return null;

  function handleCancel() {
    if (dirty) { discardRef.current?.showModal(); }
    else { router.back(); }
  }

  const leftPage = (
    <div className={styles.authoringPage} aria-label="อาการผิดปกติ">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="symptoms-title">
        <header className={styles.createHeader}>
          <button className={styles.actionBtn} aria-label="ยกเลิก" onClick={handleCancel}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2 className={styles.createTitle} id="symptoms-title">อาการผิดปกติ</h2>
          <button
            className={`${styles.actionBtn} ${saving ? styles.saving : ""}`}
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
        <div className={checkinStyles.ciCheckList} role="group" aria-label="รายการอาการ" style={{ padding: "0.5rem 1rem" }}>
          {state.items.map((sym) => (
            <label key={sym.id} className={`${checkinStyles.ciCheckRow} ${sym.checked ? checkinStyles.isChecked : ""}`}>
              <input
                type="checkbox"
                style={{ display: "none" }}
                checked={sym.checked}
                aria-label={sym.label}
                onChange={() => dispatchLocal({ type: "TOGGLE", id: sym.id })}
              />
              <div className={checkinStyles.ciCheckCircle}>
                {sym.checked && <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span className={checkinStyles.ciCheckLabel} style={{ fontSize: "2em" }}>{sym.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <BookShellLayout
        tight
        rail={<IconRail />}
        mergedOnly
        merged={leftPage}
      />
      <dialog ref={discardRef} className={styles.discardDialog} aria-modal="true">
        <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div className={styles.discardDialogBtns}>
          <button className={styles.discardBtnCancel} onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
          <button className={styles.discardBtnLeave} onClick={() => { discardRef.current?.close(); router.back(); }}>ละทิ้ง</button>
        </div>
      </dialog>
    </>
  );
}

export default function SymptomsCheckinPage() {
  return (
    <Suspense>
      <SymptomsCheckinInner />
    </Suspense>
  );
}
