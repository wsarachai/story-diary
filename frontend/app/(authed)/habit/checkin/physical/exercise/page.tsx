"use client";
import { Check, LoaderCircle, X } from "lucide-react";
import { Suspense, useReducer, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useSaveExerciseCheckinMutation, useGetExerciseCheckinQuery } from "@/store/habitsApi";
import styles from "../../../add/HabitAdd.module.css";

interface State {
  activityName: string;
  durationMinutes: string;
  dirty: boolean;
}

type Action =
  | { type: "SET_ACTIVITY_NAME"; value: string }
  | { type: "SET_DURATION"; value: string }
  | { type: "RESET"; activityName: string; durationMinutes: string };

function reducer(state: State, action: Action): State {
  if (action.type === "SET_ACTIVITY_NAME") return { ...state, activityName: action.value, dirty: true };
  if (action.type === "SET_DURATION") return { ...state, durationMinutes: action.value, dirty: true };
  if (action.type === "RESET") return { activityName: action.activityName, durationMinutes: action.durationMinutes, dirty: false };
  return state;
}

function ExerciseCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/habit/checklist";
  const [saveExercise, { isLoading: saving }] = useSaveExerciseCheckinMutation();
  const discardRef = useRef<HTMLDialogElement>(null);

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";
  const { data: existingCheckin } = useGetExerciseCheckinQuery(occId, { skip: !occId });

  const [state, dispatchLocal] = useReducer(reducer, { activityName: "", durationMinutes: "", dirty: false });

  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  useEffect(() => {
    if (existingCheckin) {
      dispatchLocal({
        type: "RESET",
        activityName: existingCheckin.activityName ?? "",
        durationMinutes: existingCheckin.durationMinutes != null ? String(existingCheckin.durationMinutes) : "",
      });
    }
  }, [existingCheckin]);

  const today = new Date().toISOString().split("T")[0];

  async function handleSave() {
    if (saving || !occId) return;
    const raw = parseFloat(state.durationMinutes);
    try {
      await saveExercise({
        occurrenceId: occId,
        activityId,
        activityName: state.activityName.trim() || null,
        durationMinutes: isNaN(raw) ? null : Math.min(1440, Math.max(0, raw)),
        date: today,
      }).unwrap();
      router.replace(from);
    } catch {
      // ignore
    }
  }

  if (!occId) return null;

  function handleCancel() {
    if (state.dirty) { discardRef.current?.showModal(); }
    else { router.back(); }
  }

  const leftPage = (
    <div className={styles.authoringPage} aria-label="บันทึกการออกกำลังกาย">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="exercise-title">
        <header className={styles.createHeader}>
          <button className={styles.actionBtn} aria-label="ยกเลิก" onClick={handleCancel}>
            <X />
          </button>
          <h2 className={styles.createTitle} id="exercise-title">บันทึกการออกกำลังกาย</h2>
          <button
            className={`${styles.actionBtn} ${saving ? styles.saving : ""}`}
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

        <div style={{ padding: "0.8rem 1rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <p style={{ margin: 0, fontSize: "2.1em", fontWeight: 600, color: "#555" }}>
              วันนี้ออกกำลังกายอะไรไปนะ?
            </p>
            <textarea
              value={state.activityName}
              aria-label="วันนี้ออกกำลังกายอะไรไปนะ?"
              rows={3}
              onChange={(e) => dispatchLocal({ type: "SET_ACTIVITY_NAME", value: e.target.value })}
              style={{
                fontSize: "1.4em",
                border: "2px solid #d1d5db",
                borderRadius: "0.5rem",
                padding: "0.5rem",
                width: "100%",
                boxSizing: "border-box",
                resize: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <p style={{ margin: 0, fontSize: "2.1em", fontWeight: 600, color: "#555" }}>
              ออกนานกี่นาที?
            </p>
            <input
              type="number"
              min={0}
              max={1440}
              step={1}
              value={state.durationMinutes}
              aria-label="ออกนานกี่นาที?"
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                const clamped = isNaN(raw) ? "" : String(Math.min(1440, Math.max(0, raw)));
                dispatchLocal({ type: "SET_DURATION", value: clamped });
              }}
              style={{
                fontSize: "2em",
                textAlign: "center",
                border: "2px solid #d1d5db",
                borderRadius: "0.5rem",
                padding: "0.5rem",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <BookShellLayout
        tight
        fitViewport
        centerMobile
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

export default function ExerciseCheckinPage() {
  return (
    <Suspense>
      <ExerciseCheckinInner />
    </Suspense>
  );
}
