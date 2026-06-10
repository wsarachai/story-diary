"use client";
import { useReducer, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useClientSearchParams } from "@/lib/hooks";
import { useCreateActivityMutation } from "@/store/habitsApi";
import styles from "../../HabitAdd.module.css";
import type {
  HabitFrequency,
  HabitImportance,
  WeekdayIndex,
  PhysicalPresetKey,
} from "@/types/habit";
import { PHYSICAL_PRESETS, PHYSICAL_PRESET_CATEGORY } from "@/types/habit";

interface FormState {
  name: string;
  goal: string;
  goalCount: number;
  goalUnit: string;
  frequency: HabitFrequency;
  weekdays: WeekdayIndex[];
  daysPerWeek: number;
  daysPerMonth: number;
  importance: HabitImportance;
  iconColor: string;
  errors: Record<string, string | undefined>;
  dirty: boolean;
}

type FormAction =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_NAME_CLEAN"; value: string }
  | { type: "SET_GOAL"; value: string }
  | { type: "SET_GOAL_COUNT"; value: number }
  | { type: "SET_GOAL_UNIT"; value: string }
  | { type: "SET_FREQUENCY"; value: HabitFrequency }
  | { type: "TOGGLE_WEEKDAY"; day: WeekdayIndex }
  | { type: "SET_DAYS_PER_WEEK"; value: number }
  | { type: "SET_DAYS_PER_MONTH"; value: number }
  | { type: "SET_IMPORTANCE"; value: HabitImportance }
  | { type: "SET_ICON_COLOR"; value: string }
  | { type: "SET_ERRORS"; errors: Record<string, string | undefined> };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_NAME": return { ...state, name: action.value, dirty: true };
    case "SET_NAME_CLEAN": return { ...state, name: action.value };
    case "SET_GOAL": return { ...state, goal: action.value, dirty: true };
    case "SET_GOAL_COUNT": return { ...state, goalCount: action.value, dirty: true };
    case "SET_GOAL_UNIT": return { ...state, goalUnit: action.value, dirty: true };
    case "SET_FREQUENCY": return {
      ...state,
      frequency: action.value,
      weekdays: action.value === "daily" ? ([0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[]) : state.weekdays,
      dirty: true,
    };
    case "TOGGLE_WEEKDAY": {
      const days = state.weekdays.includes(action.day)
        ? state.weekdays.filter((d) => d !== action.day)
        : [...state.weekdays, action.day];
      return { ...state, weekdays: days as WeekdayIndex[], dirty: true };
    }
    case "SET_DAYS_PER_WEEK": return { ...state, daysPerWeek: action.value, dirty: true };
    case "SET_DAYS_PER_MONTH": return { ...state, daysPerMonth: action.value, dirty: true };
    case "SET_IMPORTANCE": return { ...state, importance: action.value, dirty: true };
    case "SET_ICON_COLOR": return { ...state, iconColor: action.value, dirty: true };
    case "SET_ERRORS": return { ...state, errors: action.errors };
    default: return state;
  }
}

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const GOAL_PRESETS = ["ก้าว", "นาที", "กม.", "ครั้ง", "ชั่วโมง"];

function PhysicalFormInner() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const [createActivity, { isLoading: saving }] = useCreateActivityMutation();
  const discardRef = useRef<HTMLDialogElement>(null);
  const colorDialogRef = useRef<HTMLDialogElement>(null);

  const typeKey = searchParams.get("type") as PhysicalPresetKey | null;
  const rawName = searchParams.get("name") ?? "";
  const from = searchParams.get("from") ?? "/habit/checklist";
  
  let prefillName = "";
  if (typeKey && typeKey !== "other") {
    prefillName = PHYSICAL_PRESETS[typeKey] ?? "";
  } else if (rawName && rawName !== "other") {
    prefillName = decodeURIComponent(rawName);
  }

  const isOther = typeKey === "other" || rawName === "other" || (!typeKey && !rawName);

  const [form, dispatchForm] = useReducer(formReducer, {
    name: prefillName,
    goal: "",
    goalCount: 1,
    goalUnit: "ครั้ง",
    frequency: "daily" as HabitFrequency,
    weekdays: [0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[],
    daysPerWeek: 3,
    daysPerMonth: 3,
    importance: "general" as HabitImportance,
    iconColor: "#ee8a4a",
    errors: {},
    dirty: false,
  } satisfies FormState);

  useEffect(() => {
    if (prefillName) {
      dispatchForm({ type: "SET_NAME_CLEAN", value: prefillName });
    }
  }, [prefillName]);

  function validate(): boolean {
    const errors: Record<string, string | undefined> = {};
    if (!form.name.trim()) errors.name = "กรุณาระบุชื่อ";
    if (form.frequency === "daily" && form.weekdays.length === 0) {
      errors.weekdays = "กรุณาเลือกอย่างน้อย 1 วัน";
    }
    dispatchForm({ type: "SET_ERRORS", errors });
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate() || saving) return;
    const schedule = (() => {
      if (form.frequency === "daily") return { frequency: "daily" as const, weekdays: form.weekdays };
      if (form.frequency === "weekly") return { frequency: "weekly" as const, daysPerWeek: form.daysPerWeek };
      if (form.frequency === "monthly") return { frequency: "monthly" as const, daysPerMonth: form.daysPerMonth };
      return { frequency: "todo" as const, importance: form.importance };
    })();
    try {
      await createActivity({
        category: "physical",
        // Persist the preset so the checklist can route type-specific
        // check-ins (e.g. explore_emotion → mood form) later.
        ...(typeKey && typeKey in PHYSICAL_PRESET_CATEGORY
          ? { physicalPreset: typeKey, physicalCategory: PHYSICAL_PRESET_CATEGORY[typeKey] }
          : {}),
        name: form.name.trim(),
        iconColor: form.iconColor as `#${string}`,
        schedule,
      }).unwrap();
      router.replace(from);
    } catch {
      // ignore
    }
  }

  function handleCancel() {
    if (form.dirty) { discardRef.current?.showModal(); }
    else { router.back(); }
  }

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      mergedOnly
      merged={
        <div className={styles.authoringPage} aria-label="สร้างกิจกรรมทางกาย">
          <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="physical-form-title">
            <header className={styles.createHeader}>
              <button className={styles.actionBtn} aria-label="ยกเลิก" onClick={handleCancel}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <h2 className={styles.createTitle} id="physical-form-title">เพิ่มกิจกรรม</h2>
              <button
                className={`${styles.actionBtn}${saving ? ` ${styles.saving}` : ""}`}
                aria-label="บันทึก"
                onClick={handleSave}
                disabled={saving}
                style={{ borderColor: "#08c65a" }}
              >
                {saving
                  ? <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><circle cx="12" cy="12" r="9" strokeDasharray="20 40" /></svg>
                  : <svg viewBox="0 0 24 24" style={{ stroke: "#08c65a" }}><polyline points="20 6 9 17 4 12" /></svg>
                }
              </button>
            </header>

            <div className={styles.formPanel}>
              {/* Activity name */}
              <div className={styles.nameRow}>
                {isOther ? (
                  <input
                    className={`${styles.nameField}${form.errors.name ? ` ${styles.error}` : ""}`}
                    type="text"
                    aria-label="ชื่อกิจกรรม"
                    placeholder="ชื่อกิจกรรม :"
                    value={form.name}
                    onChange={(e) => dispatchForm({ type: "SET_NAME", value: e.target.value })}
                  />
                ) : (
                  <div className={styles.activityBadge}>
                    <span className={styles.activityBadgeDot} aria-hidden="true" style={{ background: form.iconColor }} />
                    <span className={styles.activityBadgeName}>{form.name}</span>
                  </div>
                )}
                <button
                  className={styles.nameIcon}
                  type="button"
                  aria-label="เปลี่ยนสีไอคอน"
                  onClick={() => colorDialogRef.current?.showModal()}
                  style={{ ["--name-icon-stroke" as string]: form.iconColor }}
                >
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
                </button>
              </div>
              {form.errors.name && <p className={styles.fieldError} role="alert">{form.errors.name}</p>}

              {/* Goal chips */}
              <div className={styles.chipLine}>
                <div className={styles.chipLabel}>เป้าหมาย</div>
                <div className={styles.chipTrack} role="radiogroup" aria-label="หน่วยเป้าหมาย">
                  {GOAL_PRESETS.map((unit) => (
                    <button
                      key={unit}
                      className={`${styles.chip}${form.goalUnit === unit ? ` ${styles.isSelected}` : ""}`}
                      role="radio"
                      aria-checked={form.goalUnit === unit}
                      onClick={() => dispatchForm({ type: "SET_GOAL_UNIT", value: unit })}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.countRow}>
                <input
                  className={styles.countNum}
                  type="number"
                  min="1"
                  value={form.goalCount}
                  aria-label="จำนวนเป้าหมาย"
                  onChange={(e) => dispatchForm({ type: "SET_GOAL_COUNT", value: Number(e.target.value) })}
                />
                <div className={styles.countUnit}>{form.goalUnit}</div>
              </div>

              {/* Frequency */}
              <div className={styles.chipLine}>
                <div className={styles.chipLabel}>ความถี่</div>
                <div className={styles.chipTrack} role="radiogroup" aria-label="ความถี่">
                  {(["daily", "weekly", "monthly", "todo"] as HabitFrequency[]).map((f) => (
                    <button
                      key={f}
                      className={`${styles.chip}${form.frequency === f ? ` ${styles.isSelected}` : ""}`}
                      role="radio"
                      aria-checked={form.frequency === f}
                      onClick={() => dispatchForm({ type: "SET_FREQUENCY", value: f })}
                    >
                      {f === "daily" ? "ทุกวัน" : f === "weekly" ? "สัปดาห์" : f === "monthly" ? "เดือน" : "To-do"}
                    </button>
                  ))}
                </div>
              </div>

              {form.frequency === "daily" && (
                <div>
                  <div className={styles.weekdayRow} role="group" aria-label="เลือกวัน">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        className={`${styles.weekday}${form.weekdays.includes(i as WeekdayIndex) ? ` ${styles.isSelected}` : ""}`}
                        aria-pressed={form.weekdays.includes(i as WeekdayIndex)}
                        onClick={() => dispatchForm({ type: "TOGGLE_WEEKDAY", day: i as WeekdayIndex })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {form.errors.weekdays && <p className={styles.fieldError} role="alert">{form.errors.weekdays}</p>}
                </div>
              )}
              {form.frequency === "weekly" && (
                <div className={styles.countRow}>
                  <input
                    className={styles.countNum}
                    type="number"
                    min="1"
                    max="7"
                    value={form.daysPerWeek}
                    aria-label="จำนวนวันต่อสัปดาห์"
                    onChange={(e) => dispatchForm({ type: "SET_DAYS_PER_WEEK", value: Number(e.target.value) })}
                  />
                  <div className={styles.countUnit}>วัน/สัปดาห์</div>
                </div>
              )}
              {form.frequency === "monthly" && (
                <div className={styles.countRow}>
                  <input
                    className={styles.countNum}
                    type="number"
                    min="1"
                    max="31"
                    value={form.daysPerMonth}
                    aria-label="จำนวนวันต่อเดือน"
                    onChange={(e) => dispatchForm({ type: "SET_DAYS_PER_MONTH", value: Number(e.target.value) })}
                  />
                  <div className={styles.countUnit}>วัน/เดือน</div>
                </div>
              )}
              {form.frequency === "todo" && (
                <div className={styles.chipLine}>
                  <div className={styles.chipLabel}>ความสำคัญ</div>
                  <div className={styles.chipTrack} role="radiogroup" aria-label="ความสำคัญ">
                    {(["general", "moderate", "high"] as HabitImportance[]).map((imp) => (
                      <button
                        key={imp}
                        className={`${styles.chip}${form.importance === imp ? ` ${styles.isSelected}` : ""}`}
                        role="radio"
                        aria-checked={form.importance === imp}
                        onClick={() => dispatchForm({ type: "SET_IMPORTANCE", value: imp })}
                      >
                        {imp === "general" ? "ทั่วไป" : imp === "moderate" ? "ปานกลาง" : "มาก"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color dialog */}
          <dialog ref={colorDialogRef} className={styles.colorDialog} aria-label="เลือกสีไอคอน">
            <p className={styles.colorDialogTitle}>เลือกสีไอคอน</p>
            <div className={styles.swatchRow}>
              {["#ee8a4a", "#ffffff", "#111111", "#ff6b6b", "#2a9d8f", "#4d8dff"].map((color) => (
                <button key={color} className={styles.swatch} type="button" style={{ background: color }}
                  aria-label={`สี ${color}`}
                  onClick={() => dispatchForm({ type: "SET_ICON_COLOR", value: color })} />
              ))}
            </div>
            <div className={styles.colorCustomRow}>
              <label htmlFor="custom-physical-color">สีอื่น:</label>
              <input className={styles.colorCustom} id="custom-physical-color" type="color"
                value={form.iconColor}
                onChange={(e) => dispatchForm({ type: "SET_ICON_COLOR", value: e.target.value })} />
            </div>
            <div className={styles.colorActions}>
              <button className={`${styles.dialogBtn} ${styles.dialogBtnSecondary}`} type="button" onClick={() => colorDialogRef.current?.close()}>ปิด</button>
              <button className={`${styles.dialogBtn} ${styles.dialogBtnPrimary}`} type="button" onClick={() => colorDialogRef.current?.close()}>ใช้สี</button>
            </div>
          </dialog>

          {/* DS-4 Discard dialog */}
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

export default function PhysicalFormPage() {
  return <PhysicalFormInner />;
}
