"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Pill,
  Apple,
  PersonStanding,
  SmilePlus,
  Pencil,
  ChevronsRight,
  ChevronDown,
  Check,
  Minus,
} from "lucide-react";
import {
  useGetTodayHabitsQuery,
  useToggleOccurrenceMutation,
  useDeleteActivityMutation,
  useSaveMedicineCheckinMutation,
  useSaveNutritionCheckinMutation,
} from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import IconRail from "@/components/IconRail";
import { DateFull } from "@/components/DateBadge";
import { localDateStr } from "@/lib/utils/date";
import type {
  HabitActivity,
  HabitFrequency,
  HabitOccurrence,
  MealSlot,
  SymptomCheck,
} from "@/types/habit";
import { NUTRITION_PRESETS } from "@/types/habit";
import { MEDICINES, isMedicineKey } from "@/types/medicines";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import PageSpinner from "@/components/PageSpinner";
import { TrackerError, TrackerEmpty } from "../TrackerStates";
import HabitTrackerHeader from "@/components/HabitTrackerHeader";

const GROUPS: { key: HabitFrequency; label: string }[] = [
  { key: "daily",   label: "รายวัน" },
  { key: "weekly",  label: "รายสัปดาห์" },
  { key: "monthly", label: "รายเดือน" },
  { key: "todo",    label: "ต้องทำ" },
];

function getAccent(activity: HabitActivity): string {
  if (activity.category === "medicine") return "#57a8db";
  if (activity.category === "nutrition") return "#2eb563";
  const pc = activity.physicalCategory;
  if (pc === "symptoms" || pc === "emotion-management") return "#e76f51";
  return "#ee8a4a";
}

function usesExploreEmotionCheckin(activity: HabitActivity): boolean {
  return activity.physicalCategory === "emotion-management";
}

function hasDetailedCheckin(activity: HabitActivity): boolean {
  return (
    activity.physicalCategory === "symptoms" ||
    usesExploreEmotionCheckin(activity)
  );
}

function getSubline(activity: HabitActivity): string {
  const { schedule, mealRelation, mealSlots } = activity;
  if (
    activity.category === "medicine" &&
    mealRelation &&
    mealSlots &&
    mealSlots.length > 0
  ) {
    const relation = mealRelation === "after" ? "หลัง" : "ก่อน";
    const slots = mealSlots
      .map((s) => {
        if (s === "breakfast") return "อาหารเช้า";
        if (s === "lunch") return "อาหารกลางวัน";
        if (s === "dinner") return "อาหารเย็น";
        return "ก่อนนอน";
      })
      .join("-");
    return `${relation}${slots}`;
  }
  if (schedule.frequency === "daily") return "ทุกวัน";
  return "ทั่วไป";
}

function getCategoryClass(accent: string): string {
  if (accent === "#57a8db") return styles.entryMed;
  if (accent === "#2eb563") return styles.entryFood;
  if (accent === "#e76f51") return styles.entryMood;
  return styles.entryBody;
}

function getActivityDisplayName(activity: HabitActivity): string {
  if (activity.category === "nutrition" && activity.nutritionPreset && activity.nutritionPreset in NUTRITION_PRESETS) {
    return NUTRITION_PRESETS[activity.nutritionPreset];
  }
  return activity.name;
}

function CategoryIcon({ accent }: { accent: string }) {
  if (accent === "#57a8db") return <Pill color={accent} />;
  if (accent === "#2eb563") return <Apple color={accent} />;
  if (accent === "#e76f51") return <SmilePlus color={accent} />;
  return <PersonStanding color="#ee8a4a" />;
}

interface DeleteConfirmProps {
  activityName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  activityName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  return (
    <div className={styles.deleteConfirmOverlay} onClick={onCancel}>
      <div
        className={styles.deleteConfirmCard}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.deleteConfirmTitle}>ลบกิจกรรม?</p>
        <p className={styles.deleteConfirmBody}>
          <strong>&quot;{activityName}&quot;</strong> และประวัติ check-in
          ทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้
        </p>
        <div className={styles.deleteConfirmActions}>
          <button
            className={styles.deleteConfirmCancel}
            onClick={onCancel}
            disabled={isDeleting}
          >
            ยกเลิก
          </button>
          <button
            className={styles.deleteConfirmOk}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "กำลังลบ…" : "ลบกิจกรรม"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EntryActionMenuProps {
  activityName: string;
  onUndo: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

function EntryActionMenu({
  activityName,
  onUndo,
  onDelete,
  onCancel,
}: EntryActionMenuProps) {
  return (
    <div className={styles.deleteConfirmOverlay} onClick={onCancel}>
      <div
        className={styles.deleteConfirmCard}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.deleteConfirmTitle}>{activityName}</p>
        <div className={styles.entryMenuActions}>
          <button className={styles.entryMenuUndo} onClick={onUndo}>
            ย้อนกลับ (วันนี้)
          </button>
          <button className={styles.entryMenuDelete} onClick={onDelete}>
            ลบกิจกรรม
          </button>
        </div>
        <button className={styles.deleteConfirmCancel} onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

/** Doses are filled in this fixed order so the recorded slots stay meaningful. */
const CANONICAL_MEAL_ORDER: MealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "before-bed",
];

/** Medicine accent fill (taken) and the card's resting tint (remaining). */
const DOSE_FILL = "#bfe2f2";
const DOSE_BASE = "#edf9fa";

/** Nutrition meal slots (hardcoded order). */
const NUTRITION_MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];
/** Nutrition accent fill (taken) and the card's resting tint (remaining). */
const NUTRITION_FILL = "#cdebd6";
const NUTRITION_BASE = "#eef9f1";

/** Baseline (all-unchecked) side-effect list for a known medicine, else []. */
function defaultSideEffects(activity: HabitActivity): SymptomCheck[] {
  if (activity.medicineKey && isMedicineKey(activity.medicineKey)) {
    return MEDICINES[activity.medicineKey].sideEffects.map((se) => ({
      ...se,
      checked: false,
    }));
  }
  return [];
}

export default function HabitChecklistPage() {
  const router = useRouter();
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } =
    useGetTodayHabitsQuery(todayStr);
  const [toggle] = useToggleOccurrenceMutation();
  const [saveMedicine] = useSaveMedicineCheckinMutation();
  const [saveNutrition] = useSaveNutritionCheckinMutation();
  const [deleteActivity, { isLoading: isDeleting }] =
    useDeleteActivityMutation();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<HabitFrequency>>(
    new Set<HabitFrequency>(["daily", "weekly", "monthly", "todo"])
  );

  const entries = data
    ? Object.values(data.activities).map((activity) => ({
        activity,
        occurrence: data.todayByActivity[activity.id],
        subline: getSubline(activity),
        accent: getAccent(activity),
      }))
    : [];

  const grouped = Object.fromEntries(
    GROUPS.map(({ key }) => [
      key,
      entries
        .filter((e) => e.activity.schedule.frequency === key),
    ])
  ) as Record<HabitFrequency, typeof entries>;

  function toggleSection(key: HabitFrequency) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleEntryTap(activity: HabitActivity, occurrenceId: string) {
    const base = `/habit/checkin`;
    const qs = `occ=${occurrenceId}&actId=${activity.id}`;
    if (activity.physicalCategory === "symptoms") {
      router.push(`${base}/physical/symptoms?${qs}`);
    } else if (activity.physicalCategory === "exercise" || activity.physicalPreset === "exercise") {
      router.push(`${base}/physical/exercise?${qs}`);
    } else if (usesExploreEmotionCheckin(activity)) {
      const preset = activity.physicalPreset ?? "";
      router.push(`${base}/physical/emotion/explore?${qs}&preset=${preset}`);
    }
  }

  function openMedicineForm(activity: HabitActivity, occurrenceId: string) {
    router.push(`/habit/checkin/medicine?occ=${occurrenceId}&actId=${activity.id}`);
  }

  /**
   * One tap on a medicine's check circle. Each tap records the next meal dose
   * (canonical order); reaching the last dose opens the side-effect form. A med
   * with no configured meals goes straight to the form. Tapping a completed med
   * reopens the form so the user can edit its side effects. (Clearing progress
   * lives on the trash button's Undo option, not here.)
   */
  async function handleMedicineDose(
    activity: HabitActivity,
    occurrence: HabitOccurrence,
  ) {
    const configSlots = CANONICAL_MEAL_ORDER.filter((slot) =>
      (activity.mealSlots ?? []).includes(slot),
    );
    const total = configSlots.length;

    // N = 0 → no per-dose tracking, open the form directly.
    if (total === 0) {
      openMedicineForm(activity, occurrence.id);
      return;
    }

    const taken =
      occurrence.doseProgress?.taken ??
      (occurrence.status === "done" ? total : 0);

    // Already complete → reopen the form to edit side effects.
    if (taken >= total) {
      openMedicineForm(activity, occurrence.id);
      return;
    }

    const nextTaken = taken + 1;
    try {
      await saveMedicine({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        medicineName: activity.name,
        mealRelation: activity.mealRelation ?? ("after" as const),
        sideEffects: defaultSideEffects(activity),
        date: todayStr,
        mealSlots: configSlots.slice(0, nextTaken),
      }).unwrap();
    } catch {
      return;
    }

    // Final dose taken → open the side-effect form.
    if (nextTaken >= total) {
      openMedicineForm(activity, occurrence.id);
    }
  }

  /**
   * One tap on a nutrition card's check circle.
   *
   * nutrition_5_groups: 3-tap counter (breakfast → lunch → dinner); on the
   * third tap navigates to the detail form. Re-tap when done re-opens the form.
   *
   * Other presets: single tap records all 3 slots (binary done/not-done) and
   * completes silently. Re-tap when done toggles back to pending.
   */
  async function handleNutritionMeal(
    activity: HabitActivity,
    occurrence: HabitOccurrence,
  ) {
    if (activity.nutritionPreset !== "nutrition_5_groups") {
      if (occurrence.status === "done") {
        await toggle({
          occurrenceId: occurrence.id,
          activityId: activity.id,
          status: "pending",
          date: todayStr,
        });
      } else {
        try {
          await saveNutrition({
            occurrenceId: occurrence.id,
            activityId: activity.id,
            activityName: activity.name,
            breakfast: "",
            lunch: "",
            dinner: "",
            mealSlots: NUTRITION_MEAL_SLOTS,
            date: todayStr,
          }).unwrap();
        } catch {
          return;
        }
      }
      return;
    }

    // nutrition_5_groups: 3-tap counter.
    const total = 3;
    const taken =
      occurrence.doseProgress?.taken ??
      (occurrence.status === "done" ? total : 0);

    if (taken >= total) {
      router.push(
        `/habit/checkin/nutrition?occ=${occurrence.id}&actId=${activity.id}`
      );
      return;
    }

    const nextTaken = taken + 1;
    try {
      await saveNutrition({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        activityName: activity.name,
        breakfast: "",
        lunch: "",
        dinner: "",
        mealSlots: NUTRITION_MEAL_SLOTS.slice(0, nextTaken),
        date: todayStr,
      }).unwrap();
    } catch {
      return;
    }

    if (nextTaken >= total) {
      router.push(
        `/habit/checkin/nutrition?occ=${occurrence.id}&actId=${activity.id}`
      );
    }
  }

  /**
   * Trash-button "ย้อนกลับ (วันนี้)": reset today's occurrence to pending.
   * Medicine with configured meals must clear its recorded doses (otherwise the
   * server recomputes the fill from the saved slots); everything else — and
   * meal-less medicine — just un-completes via the toggle.
   */
  async function handleUndoToday(
    activity: HabitActivity,
    occurrence: HabitOccurrence,
  ) {
    setMenuId(null);
    const medicineSlots =
      activity.category === "medicine" ? activity.mealSlots ?? [] : [];
    if (activity.category === "medicine" && medicineSlots.length > 0) {
      await saveMedicine({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        medicineName: activity.name,
        mealRelation: activity.mealRelation ?? ("after" as const),
        sideEffects: defaultSideEffects(activity),
        date: todayStr,
        mealSlots: [],
      });
      return;
    }
    if (activity.category === "nutrition" && (occurrence.doseProgress?.taken ?? 0) > 0) {
      await saveNutrition({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        activityName: activity.name,
        breakfast: "",
        lunch: "",
        dinner: "",
        mealSlots: [],
        date: todayStr,
      });
      return;
    }
    if (occurrence.status !== "pending") {
      await toggle({
        occurrenceId: occurrence.id,
        activityId: activity.id,
        status: "pending",
        date: todayStr,
      });
    }
  }

  const confirmActivity = confirmId ? data?.activities[confirmId] : null;
  const confirmActivityName = confirmActivity ? getActivityDisplayName(confirmActivity) : "";

  const menuActivity = menuId ? data?.activities[menuId] : null;
  const menuOccurrence = menuId ? data?.todayByActivity[menuId] : null;
  const menuActivityName = menuActivity ? getActivityDisplayName(menuActivity) : "";

  async function handleDeleteConfirm() {
    if (!confirmId) return;
    await deleteActivity(confirmId);
    setConfirmId(null);
  }

  const left = (
    <HabitTrackerHeader
      containerLabel="รายการเช็คอินวันนี้"
      title="รายการเช็กอินวันนี้"
      date={<DateFull className={styles.dateLabel} />}
      activeTab="list"
      addHref="/habit/add?from=/habit/checklist"
      addLabel="เพิ่มกิจกรรม"
    >
      <div className={styles.checklistContent}>
        {isLoading && (
          <PageSpinner variant="inline" height="12rem" label="กำลังโหลดกิจกรรม…" />
        )}
        {!isLoading && isError && <TrackerError onRetry={refetch} />}
        {!isLoading && !isError && entries.length === 0 && (
          <TrackerEmpty addFrom="/habit/checklist" />
        )}
        {!isLoading && !isError && entries.length > 0 && (
          <div className={styles.accordionList}>
            {GROUPS.map(({ key, label }) => {
              const groupEntries = grouped[key];
              if (!groupEntries || groupEntries.length === 0) return null;
              const isOpen = openSections.has(key);
              const doneCount = groupEntries.filter(
                (e) => e.occurrence.status === "done"
              ).length;
              return (
                <div key={key} className={styles.accordionSection}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleSection(key)}
                    aria-expanded={isOpen}
                  >
                    <span className={styles.accordionTitle}>{label}</span>
                    <span className={styles.accordionCount}>
                      {doneCount}/{groupEntries.length}
                    </span>
                    <ChevronDown
                      className={`${styles.accordionChevron}${isOpen ? ` ${styles.accordionChevronOpen}` : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className={styles.accordionBody}>
                      {groupEntries.map((entry) => {
                        const { activity, occurrence } = entry;
                        const isMedicine = activity.category === "medicine";
                        const isNutrition = activity.category === "nutrition";
                        // nutrition_5_groups uses a 3-tap meal counter; other
                        // nutrition presets are single-tap (simple check circle).
                        const isNutritionCounter =
                          isNutrition && activity.nutritionPreset === "nutrition_5_groups";
                        // All interaction is on the check circle; card body is never tappable.
                        const doseTotal = occurrence.doseProgress?.total ?? 0;
                        const doseTaken =
                          occurrence.doseProgress?.taken ??
                          ((isMedicine || isNutritionCounter) && occurrence.status === "done" ? doseTotal : 0);
                        const showDoseFill = (isMedicine || isNutritionCounter) && doseTotal > 0;
                        const fillColor = isNutrition ? NUTRITION_FILL : DOSE_FILL;
                        const baseColor = isNutrition ? NUTRITION_BASE : DOSE_BASE;
                        const fillPct = showDoseFill
                          ? Math.round((doseTaken / doseTotal) * 100)
                          : 0;
                        return (
                          <div
                            key={activity.id}
                            className={`${styles.habitEntry} ${getCategoryClass(entry.accent)}`}
                            role="article"
                            aria-label={getActivityDisplayName(activity)}
                            style={
                              showDoseFill
                                ? {
                                    background: `linear-gradient(90deg, ${fillColor} 0 ${fillPct}%, ${baseColor} ${fillPct}% 100%)`,
                                  }
                                : undefined
                            }
                          >
                            <div className={styles.habitEntryIcon}>
                              <CategoryIcon accent={entry.accent} />
                            </div>
                            <div className={styles.habitEntryBody}>
                              <p className={styles.habitEntryName}>{getActivityDisplayName(entry.activity)}</p>
                              <p className={styles.habitEntrySub}>{entry.subline}</p>
                            </div>
                            <button
                              className={styles.habitDeleteBtn}
                              aria-label={`จัดการ ${activity.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuId(activity.id);
                              }}
                            >
                              <Pencil />
                            </button>
                            {(entry.occurrence.status === "pending" ||
                              entry.occurrence.status === "partial") && (
                              <button
                                className={styles.habitSkipBtn}
                                aria-label={`ข้าม ${entry.activity.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggle({
                                    occurrenceId: entry.occurrence.id,
                                    activityId: entry.activity.id,
                                    status: "skipped",
                                    date: todayStr,
                                  });
                                }}
                              >
                                <ChevronsRight />
                              </button>
                            )}
                            {(isMedicine || isNutritionCounter) ? (
                              <button
                                className={`${styles.habitCheck}${
                                  occurrence.status === "done"
                                    ? ` ${styles.done}`
                                    : occurrence.status === "skipped"
                                      ? ` ${styles.skip}`
                                      : ""
                                }`}
                                aria-label={
                                  occurrence.status === "done"
                                    ? isMedicine ? "กินยาครบแล้ว – แตะเพื่อล้าง" : "บันทึกครบแล้ว – แตะเพื่อล้าง"
                                    : occurrence.status === "skipped"
                                      ? "ข้ามไปแล้ว"
                                      : doseTotal > 0
                                        ? `บันทึกแล้ว ${doseTaken} จาก ${doseTotal} มื้อ – แตะเพื่อบันทึกมื้อถัดไป`
                                        : isMedicine ? "แตะเพื่อบันทึกการกินยา" : "แตะเพื่อบันทึก"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMedicine) handleMedicineDose(activity, occurrence);
                                  else handleNutritionMeal(activity, occurrence);
                                }}
                              >
                                {occurrence.status === "done" ? (
                                  <Check color="#fff" strokeWidth={3} />
                                ) : occurrence.status === "skipped" ? (
                                  <Minus color="#fff" strokeWidth={3} />
                                ) : doseTotal > 0 ? (
                                  <span className={styles.habitCheckCount}>
                                    {doseTaken}/{doseTotal}
                                  </span>
                                ) : null}
                              </button>
                            ) : isNutrition ? (
                              <button
                                className={`${styles.habitCheck}${
                                  occurrence.status === "done"
                                    ? ` ${styles.done}`
                                    : occurrence.status === "skipped"
                                      ? ` ${styles.skip}`
                                      : ""
                                }`}
                                aria-label={
                                  occurrence.status === "done"
                                    ? "บันทึกครบแล้ว – แตะเพื่อล้าง"
                                    : occurrence.status === "skipped"
                                      ? "ข้ามไปแล้ว"
                                      : "แตะเพื่อบันทึก"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNutritionMeal(activity, occurrence);
                                }}
                              >
                                {occurrence.status === "done" ? (
                                  <Check color="#fff" strokeWidth={3} />
                                ) : occurrence.status === "skipped" ? (
                                  <Minus color="#fff" strokeWidth={3} />
                                ) : null}
                              </button>
                            ) : (
                              <button
                                className={`${styles.habitCheck}${
                                  occurrence.status === "done"
                                    ? ` ${styles.done}`
                                    : occurrence.status === "skipped"
                                      ? ` ${styles.skip}`
                                      : occurrence.status === "partial"
                                        ? ` ${styles.partial}`
                                        : ""
                                }`}
                                aria-label={
                                  occurrence.status === "done"
                                    ? "ทำเสร็จแล้ว – แตะเพื่อยกเลิก"
                                    : occurrence.status === "skipped"
                                      ? "ข้ามไปแล้ว – แตะเพื่อทำเสร็จ"
                                      : occurrence.status === "partial"
                                        ? "กำลังทำ – แตะเพื่อทำเสร็จ"
                                        : "ยังไม่ทำ – แตะเพื่อทำเสร็จ"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activity.physicalCategory === "exercise" || activity.physicalPreset === "exercise") {
                                    handleEntryTap(activity, occurrence.id);
                                  } else if (occurrence.status === "done") {
                                    toggle({
                                      occurrenceId: occurrence.id,
                                      activityId: activity.id,
                                      status: "pending",
                                      date: todayStr,
                                    });
                                  } else {
                                    toggle({
                                      occurrenceId: occurrence.id,
                                      activityId: activity.id,
                                      status: "done",
                                      date: todayStr,
                                    });
                                    if (hasDetailedCheckin(activity)) {
                                      handleEntryTap(activity, occurrence.id);
                                    }
                                  }
                                }}
                              >
                                {occurrence.status === "done" && (
                                  <Check color="#fff" strokeWidth={3} />
                                )}
                                {occurrence.status === "skipped" && (
                                  <Minus color="#fff" strokeWidth={3} />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </HabitTrackerHeader>
  );

  return (
    <BookShellLayout tight rail={<IconRail />} mergedOnly merged={left}>
      {menuActivity && menuOccurrence && (
        <EntryActionMenu
          activityName={menuActivityName}
          onUndo={() => handleUndoToday(menuActivity, menuOccurrence)}
          onDelete={() => {
            setConfirmId(menuActivity.id);
            setMenuId(null);
          }}
          onCancel={() => setMenuId(null)}
        />
      )}
      {confirmActivity && (
        <DeleteConfirmDialog
          activityName={confirmActivityName}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </BookShellLayout>
  );
}
