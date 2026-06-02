"use client";
import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useSaveSymptomsCheckinMutation } from "@/store/habitsApi";
import type { SymptomCheck } from "@/types/habit";
import styles from "../../HabitAdd.module.css";
import checkinStyles from "../../../checkin/HabitCheckin.module.css";

const INITIAL_SYMPTOMS: SymptomCheck[] = [
  { id: "sym1", label: "อาการ 1 : ปวดศีรษะ", checked: false },
  { id: "sym2", label: "อาการ 2 : คลื่นไส้", checked: false },
  { id: "sym3", label: "อาการ 3 : ใจสั่น", checked: false },
  { id: "sym4", label: "อาการ 4 : เวียนหัว", checked: false },
  { id: "sym5", label: "อาการ 5 : อ่อนเพลีย", checked: false },
];

interface State {
  items: SymptomCheck[];
}

type Action = { type: "TOGGLE"; id: string };

function reducer(state: State, action: Action): State {
  if (action.type === "TOGGLE") {
    return { items: state.items.map((s) => s.id === action.id ? { ...s, checked: !s.checked } : s) };
  }
  return state;
}

export default function SymptomsCheckinPage() {
  const router = useRouter();
  const [saveSymptoms, { isLoading: saving }] = useSaveSymptomsCheckinMutation();
  const discardRef = useRef<HTMLDialogElement>(null);
  const [state, dispatchLocal] = useReducer(reducer, { items: INITIAL_SYMPTOMS });

  const dirty = state.items.some((s) => s.checked);
  const today = new Date().toISOString().split("T")[0];

  async function handleSave() {
    if (saving) return;
    try {
      await saveSymptoms({
        occurrenceId: "sym-occ-1",
        items: state.items,
        date: today
      }).unwrap();
      router.replace("/habit/today");
    } catch {
      // ignore
    }
  }

  function handleCancel() {
    if (dirty) { discardRef.current?.showModal(); }
    else { router.push("/habit/add/physical"); }
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
        left={leftPage}
        right={<div />}
        rail={<IconRail />}
        ariaLabel="Story Diary Unusual Symptoms Checkin"
      />
      <dialog ref={discardRef} className={styles.discardDialog} aria-modal="true">
        <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div className={styles.discardDialogBtns}>
          <button className={styles.discardBtnCancel} onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
          <button className={styles.discardBtnLeave} onClick={() => { discardRef.current?.close(); router.push("/habit/add/physical"); }}>ละทิ้ง</button>
        </div>
      </dialog>
    </>
  );
}
