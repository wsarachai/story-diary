"use client";
import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { saveSymptomsCheckin, selectCheckinSaveStatus } from "@/store/habitsSlice";
import type { SymptomCheck } from "@/types/habit";

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
  const dispatch = useAppDispatch();
  const saveStatus = useAppSelector(selectCheckinSaveStatus);
  const discardRef = useRef<HTMLDialogElement>(null);
  const [state, dispatchLocal] = useReducer(reducer, { items: INITIAL_SYMPTOMS });

  const saving = saveStatus === "saving";
  const dirty = state.items.some((s) => s.checked);

  async function handleSave() {
    if (saving) return;
    await dispatch(saveSymptomsCheckin({ occurrenceId: "sym-occ-1", items: state.items }));
    router.replace("/habit/today");
  }

  function handleCancel() {
    if (dirty) { discardRef.current?.showModal(); }
    else { router.push("/habit/add/physical"); }
  }

  return (
    <main className="screen" aria-label="Story Diary Unusual Symptoms Checkin">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="อาการผิดปกติ">
          <div className="create-card checkin-card" role="dialog" aria-modal="true" aria-labelledby="symptoms-title">
            <header className="create-header">
              <button className="action-btn" aria-label="ยกเลิก" onClick={handleCancel}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2 className="create-title" id="symptoms-title">อาการผิดปกติ</h2>
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
            <div className="symptom-list" role="group" aria-label="รายการอาการ">
              {state.items.map((sym) => (
                <label key={sym.id} className={`symptom-row${sym.checked ? " is-checked" : ""}`}>
                  <input
                    type="checkbox"
                    className="symptom-check"
                    checked={sym.checked}
                    aria-label={sym.label}
                    onChange={() => dispatchLocal({ type: "TOGGLE", id: sym.id })}
                  />
                  <span className="symptom-label">{sym.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
        <IconRail />
      </section>
      <dialog ref={discardRef} className="discard-dialog" aria-modal="true">
        <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div className="discard-dialog-btns">
          <button className="discard-btn-cancel" onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
          <button className="discard-btn-leave" onClick={() => { discardRef.current?.close(); router.push("/habit/add/physical"); }}>ละทิ้ง</button>
        </div>
      </dialog>
    </main>
  );
}
