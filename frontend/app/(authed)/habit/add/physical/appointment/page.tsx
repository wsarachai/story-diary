"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useClientSearchParams } from "@/lib/hooks";
import { useCreateActivityMutation } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import { localDateStr } from "@/lib/utils/date";
import styles from "../../HabitAdd.module.css";

const APPOINTMENT_NAME = "ตรวจตามนัดแพทย์";
const APPOINTMENT_COLOR = "#6c8ee3";

function AppointmentFormInner() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const { data: me } = useGetMeQuery();
  const [createActivity, { isLoading: saving }] = useCreateActivityMutation();
  const discardRef = useRef<HTMLDialogElement>(null);

  const from = searchParams.get("from") ?? "/habit/checklist";
  const todayStr = localDateStr(me?.timezone);

  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const dirty = date !== "" || note !== "";

  async function handleSave() {
    if (saving) return;
    if (!date) {
      setError("กรุณาเลือกวันที่แพทย์นัด");
      return;
    }
    if (todayStr && date < todayStr) {
      setError("วันที่นัดต้องเป็นวันนี้หรือหลังจากนี้");
      return;
    }
    try {
      await createActivity({
        category: "physical",
        physicalCategory: "doctor-visit",
        physicalPreset: "doctor_visit",
        name: APPOINTMENT_NAME,
        iconColor: APPOINTMENT_COLOR,
        schedule: { frequency: "todo", importance: "general" },
        appointmentDate: date,
        ...(note.trim() ? { appointmentNote: note.trim() } : {}),
      }).unwrap();
      router.replace(from);
    } catch {
      setError("ไม่สามารถบันทึกได้ กรุณาลองใหม่");
    }
  }

  function handleCancel() {
    if (dirty) discardRef.current?.showModal();
    else router.back();
  }

  return (
    <BookShellLayout
      tight
      fitViewport
      centerMobile
      rail={<IconRail />}
      mergedOnly
      merged={
        <div className={styles.authoringPage} aria-label="เพิ่มการนัดตรวจตามแพทย์">
          <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="appointment-form-title">
            <header className={styles.createHeader}>
              <button className={styles.actionBtn} aria-label="ยกเลิก" onClick={handleCancel}>
                <X />
              </button>
              <h2 className={styles.createTitle} id="appointment-form-title">ตรวจตามนัดแพทย์</h2>
              <button
                className={`${styles.actionBtn}${saving ? ` ${styles.saving}` : ""}`}
                aria-label="บันทึก"
                onClick={handleSave}
                disabled={saving}
                style={{ borderColor: "#08c65a" }}
              >
                {saving
                  ? <LoaderCircle style={{ stroke: "#08c65a" }} />
                  : <Check style={{ stroke: "#08c65a" }} />
                }
              </button>
            </header>

            <div className={styles.formPanel}>
              <div className={styles.apptField}>
                <label className={styles.apptLabel} htmlFor="appointment-date">
                  วันที่แพทย์นัด
                </label>
                <input
                  id="appointment-date"
                  className={`${styles.apptDateInput}${error && !date ? ` ${styles.error}` : ""}`}
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setError(undefined);
                  }}
                />
              </div>

              <div className={styles.apptField}>
                <label className={styles.apptLabel} htmlFor="appointment-note">
                  โน๊ตสิ่งที่ต้องเตรียมไปพบแพทย์ (ถ้ามี)
                </label>
                <textarea
                  id="appointment-note"
                  className={styles.apptNoteInput}
                  rows={4}
                  maxLength={1000}
                  placeholder="เช่น เตรียมผลเลือด, รายการยาที่ใช้อยู่"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {error && <p className={styles.fieldError} role="alert">{error}</p>}
            </div>
          </div>

          <dialog ref={discardRef} className={styles.discardDialog} aria-modal="true">
            <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
            <p>ข้อมูลที่กรอกไว้จะหายไป</p>
            <div className={styles.discardDialogBtns}>
              <button className={styles.discardBtnCancel} onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
              <button className={styles.discardBtnLeave} onClick={() => { discardRef.current?.close(); router.back(); }}>ละทิ้ง</button>
            </div>
          </dialog>
        </div>
      }
    />
  );
}

export default function AppointmentFormPage() {
  return <AppointmentFormInner />;
}
