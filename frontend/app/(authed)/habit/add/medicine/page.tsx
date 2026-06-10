"use client";
import { useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { useClientSearchParams } from "@/lib/hooks";
import { useCreateActivityMutation } from "@/store/habitsApi";
import type {
  HabitFrequency,
  HabitImportance,
  MealRelation,
  MealSlot,
  WeekdayIndex,
  NutritionPresetKey,
} from "@/types/habit";
import { NUTRITION_PRESETS } from "@/types/habit";
import styles from "../HabitAdd.module.css";

const NUTRITION_PRESET_KEYS: NutritionPresetKey[] = [
  "nutrition_5_groups",
  "nutrition_clean_cooked",
  "nutrition_mild_taste",
  "nutrition_order_low_seasoning",
];

interface FormState {
  name: string;
  iconColor: string;
  mealRelation: MealRelation;
  mealSlots: MealSlot[];
  frequency: HabitFrequency;
  weekdays: WeekdayIndex[];
  daysPerWeek: number;
  daysPerMonth: number;
  importance: HabitImportance;
  errors: Record<string, string | undefined>;
  dirty: boolean;
}

type FormAction =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_ICON_COLOR"; value: string }
  | { type: "SET_MEAL_RELATION"; value: MealRelation }
  | { type: "TOGGLE_MEAL_SLOT"; slot: MealSlot }
  | { type: "SET_FREQUENCY"; value: HabitFrequency }
  | { type: "TOGGLE_WEEKDAY"; day: WeekdayIndex }
  | { type: "SET_DAYS_PER_WEEK"; value: number }
  | { type: "SET_DAYS_PER_MONTH"; value: number }
  | { type: "SET_IMPORTANCE"; value: HabitImportance }
  | { type: "SET_ERRORS"; errors: Record<string, string | undefined> }
  | { type: "CLEAR_ERRORS" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_NAME": return { ...state, name: action.value, dirty: true };
    case "SET_ICON_COLOR": return { ...state, iconColor: action.value, dirty: true };
    case "SET_MEAL_RELATION": return { ...state, mealRelation: action.value, dirty: true };
    case "TOGGLE_MEAL_SLOT": {
      const slots = state.mealSlots.includes(action.slot)
        ? state.mealSlots.filter((s) => s !== action.slot)
        : [...state.mealSlots, action.slot];
      return { ...state, mealSlots: slots, dirty: true };
    }
    case "SET_FREQUENCY": return {
      ...state,
      frequency: action.value,
      // Auto-select all days when switching to "daily"
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
    case "SET_ERRORS": return { ...state, errors: action.errors };
    case "CLEAR_ERRORS": return { ...state, errors: {} };
    default: return state;
  }
}

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MEAL_SLOTS: { slot: MealSlot; label: string }[] = [
  { slot: "breakfast", label: "เช้า" },
  { slot: "lunch", label: "กลางวัน" },
  { slot: "dinner", label: "เย็น" },
  { slot: "before-bed", label: "ก่อนนอน" },
];

function MedicineFormInner() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const [createActivity, { isLoading: saving }] = useCreateActivityMutation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const discardRef = useRef<HTMLDialogElement>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const source = searchParams.get("source");
  const typeKey = searchParams.get("type") as NutritionPresetKey | null;
  const from = searchParams.get("from") ?? "/habit/checklist";

  const isNutrition = typeKey !== null && NUTRITION_PRESET_KEYS.includes(typeKey);
  const prefillName = typeKey && isNutrition ? (NUTRITION_PRESETS[typeKey] ?? "") : "";

  const [form, dispatchForm] = useReducer(formReducer, {
    name: prefillName,
    iconColor: "#aa85e5",
    mealRelation: "after",
    mealSlots: [],
    frequency: "daily",
    weekdays: [0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[],
    daysPerWeek: 3,
    daysPerMonth: 3,
    importance: "general",
    errors: {},
    dirty: false,
  } satisfies FormState);

  function validate(): boolean {
    const errors: Record<string, string | undefined> = {};
    if (!form.name.trim()) errors.name = "กรุณาระบุชื่อ";
    else if (form.name.trim().length > 120) errors.name = "ชื่อยาวเกินไป";
    if (form.frequency === "daily" && form.weekdays.length === 0) {
      errors.weekdays = "กรุณาเลือกอย่างน้อย 1 วัน";
    }
    if (form.frequency === "weekly" && (form.daysPerWeek < 1 || form.daysPerWeek > 7)) {
      errors.daysPerWeek = "กรุณาระบุ 1-7";
    }
    if (form.frequency === "monthly" && (form.daysPerMonth < 1 || form.daysPerMonth > 31)) {
      errors.daysPerMonth = "กรุณาระบุ 1-31";
    }
    if (form.frequency === "todo" && !form.importance) {
      errors.importance = "กรุณาเลือกความสำคัญ";
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
        category: isNutrition ? "nutrition" : "medicine",
        name: form.name.trim(),
        iconColor: form.iconColor as `#${string}`,
        schedule,
        ...(isNutrition ? {} : { mealRelation: form.mealRelation, mealSlots: form.mealSlots }),
      }).unwrap();
      router.replace(from);
    } catch (err: unknown) {
      const raw = (err as { data?: { error?: unknown } })?.data?.error;
      const msg = typeof raw === "string" ? raw : undefined;
      setSaveError(msg ?? "ไม่สามารถบันทึกได้ กรุณาลองใหม่");
    }
  }

  function handleCancel() {
    if (form.dirty) {
      discardRef.current?.showModal();
    } else {
      const target = isNutrition ? `/habit/add/nutrition?from=${from}` : `/habit/add?from=${from}`;
      router.push(target);
    }
  }

  function handleDiscard() {
    discardRef.current?.close();
    const target = isNutrition ? `/habit/add/nutrition?from=${from}` : `/habit/add?from=${from}`;
    router.push(target);
  }

  void source;

  return (
    <>
      <BookShellLayout
        mergedOnly
        merged={
          <div className={styles.authoringPage} aria-label="สร้างกิจกรรม">
            <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="create-title">
              <header className={styles.createHeader}>
                <button
                  className={styles.actionBtn}
                  aria-label="ยกเลิก"
                  onClick={handleCancel}
                >
                  <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <h2 className={styles.createTitle} id="create-title">เพิ่มกิจกรรม</h2>
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

              {saveError && <p className={styles.fieldError} role="alert" style={{ margin: "0 0 0.5em", textAlign: "center" }}>{saveError}</p>}
              <div className={styles.formPanel}>
                {/* Name + icon-color */}
                <div className={styles.nameRow}>
                  <input
                    className={`${styles.nameField}${isNutrition ? ` ${styles.nutritionFlavor}` : ""}${form.errors.name ? ` ${styles.error}` : ""}`}
                    type="text"
                    aria-label={isNutrition ? "ชื่อโภชนาการ" : "ชื่อยา"}
                    placeholder={isNutrition ? "ชื่อโภชนาการ :" : "ชื่อยา :"}
                    value={form.name}
                    onChange={(e) => dispatchForm({ type: "SET_NAME", value: e.target.value })}
                  />
                  <button
                    className={styles.nameIcon}
                    type="button"
                    aria-label="เปลี่ยนสีไอคอน"
                    onClick={() => dialogRef.current?.showModal()}
                    style={{ ["--name-icon-stroke" as string]: form.iconColor }}
                  >
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
                  </button>
                </div>
                {form.errors.name && <p className={styles.fieldError} role="alert">{form.errors.name}</p>}

                {/* Meal relation (medicine only) */}
                {!isNutrition && (
                  <div className={styles.chipLine}>
                    <div className={styles.chipTrack} style={{ maxWidth: "18rem" }} role="radiogroup" aria-label="เวลาก่อน/หลังอาหาร">
                      {(["before", "after"] as MealRelation[]).map((r) => (
                        <button
                          key={r}
                          className={`${styles.chip}${form.mealRelation === r ? ` ${styles.isSelected}` : ""}`}
                          role="radio"
                          aria-checked={form.mealRelation === r}
                          onClick={() => dispatchForm({ type: "SET_MEAL_RELATION", value: r })}
                        >
                          {r === "before" ? "ก่อน" : "หลัง"}
                        </button>
                      ))}
                    </div>
                    <span className={styles.chipPlain}>อาหาร</span>
                  </div>
                )}

                {/* Meal slots (medicine only) */}
                {!isNutrition && (
                  <div className={styles.chipLine}>
                    <div className={styles.chipLabel}>มื้อ</div>
                    <div className={styles.chipTrack} role="group" aria-label="มื้ออาหาร">
                      {MEAL_SLOTS.map(({ slot, label }) => (
                        <button
                          key={slot}
                          className={`${styles.chip}${form.mealSlots.includes(slot) ? ` ${styles.isSelected}` : ""}`}
                          aria-pressed={form.mealSlots.includes(slot)}
                          onClick={() => dispatchForm({ type: "TOGGLE_MEAL_SLOT", slot })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

                {/* Frequency sub-panels */}
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
                  <div>
                    <div className={styles.countRow} aria-label="จำนวนวันต่อสัปดาห์">
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
                    {form.errors.daysPerWeek && <p className={styles.fieldError} role="alert">{form.errors.daysPerWeek}</p>}
                  </div>
                )}
                {form.frequency === "monthly" && (
                  <div>
                    <div className={styles.countRow} aria-label="จำนวนวันต่อเดือน">
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
                    {form.errors.daysPerMonth && <p className={styles.fieldError} role="alert">{form.errors.daysPerMonth}</p>}
                  </div>
                )}
                {form.frequency === "todo" && (
                  <div className={styles.importanceLine}>
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
          </div>
        }
        rail={<IconRail />}
        tight
      />

      {/* Icon-color dialog */}
      <dialog ref={dialogRef} className={styles.colorDialog} aria-label="เลือกสีไอคอน">
        <p className={styles.colorDialogTitle}>เลือกสีไอคอน</p>
        <div className={styles.swatchRow}>
          {["#ffffff", "#111111", "#ff6b6b", "#f4a261", "#2a9d8f", "#4d8dff"].map((color) => (
            <button
              key={color}
              className={styles.swatch}
              type="button"
              style={{ background: color }}
              aria-label={`สี ${color}`}
              onClick={() => dispatchForm({ type: "SET_ICON_COLOR", value: color })}
            />
          ))}
        </div>
        <div className={styles.colorCustomRow}>
          <label htmlFor="custom-icon-color">สีอื่น:</label>
          <input
            className={styles.colorCustom}
            id="custom-icon-color"
            type="color"
            value={form.iconColor}
            onChange={(e) => dispatchForm({ type: "SET_ICON_COLOR", value: e.target.value })}
          />
        </div>
        <div className={styles.colorActions}>
          <button className={`${styles.dialogBtn} ${styles.dialogBtnSecondary}`} type="button" onClick={() => dialogRef.current?.close()}>ปิด</button>
          <button className={`${styles.dialogBtn} ${styles.dialogBtnPrimary}`} type="button" onClick={() => dialogRef.current?.close()}>ใช้สี</button>
        </div>
      </dialog>

      {/* DS-4 discard dialog */}
      <dialog ref={discardRef} className={styles.discardDialog} aria-modal="true">
        <h2>ละทิ้งการเปลี่ยนแปลง?</h2>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div className={styles.discardDialogBtns}>
          <button className={styles.discardBtnCancel} onClick={() => discardRef.current?.close()}>กลับไปแก้ไข</button>
          <button className={styles.discardBtnLeave} onClick={handleDiscard}>ละทิ้ง</button>
        </div>
      </dialog>
    </>
  );
}

export default function MedicinePage() {
  return <MedicineFormInner />;
}
