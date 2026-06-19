"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Pill,
  Apple,
  PersonStanding,
  SmilePlus,
  Trash2,
  ChevronsRight,
  ChevronRight,
  ChevronDown,
  Check,
  Minus,
} from "lucide-react";
import {
  useGetTodayHabitsQuery,
  useToggleOccurrenceMutation,
  useDeleteActivityMutation,
} from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import IconRail from "@/components/IconRail";
import { DateFull } from "@/components/DateBadge";
import { localDateStr } from "@/lib/utils/date";
import type { HabitActivity, HabitFrequency } from "@/types/habit";
import { NUTRITION_PRESETS } from "@/types/habit";
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
    activity.category === "medicine" ||
    activity.category === "nutrition" ||
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

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  partial: 1,
  skipped: 2,
  done: 3,
};

export default function HabitChecklistPage() {
  const router = useRouter();
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } =
    useGetTodayHabitsQuery(todayStr);
  const [toggle] = useToggleOccurrenceMutation();
  const [deleteActivity, { isLoading: isDeleting }] =
    useDeleteActivityMutation();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<HabitFrequency>>(
    new Set<HabitFrequency>(["daily", "weekly", "monthly", "todo"])
  );

  const entries = data
    ? Object.values(data.activities).map((activity, index) => ({
        activity,
        occurrence: data.todayByActivity[activity.id],
        subline: getSubline(activity),
        accent: getAccent(activity),
        index,
      }))
    : [];

  const grouped = Object.fromEntries(
    GROUPS.map(({ key }) => [
      key,
      entries
        .filter((e) => e.activity.schedule.frequency === key)
        .sort((a, b) => {
          const orderA = STATUS_ORDER[a.occurrence.status] ?? 0;
          const orderB = STATUS_ORDER[b.occurrence.status] ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.index - b.index;
        }),
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
    if (activity.category === "medicine") {
      router.push(`${base}/medicine?${qs}`);
    } else if (activity.category === "nutrition") {
      router.push(`${base}/nutrition?${qs}`);
    } else if (activity.physicalCategory === "symptoms") {
      router.push(`${base}/physical/symptoms?${qs}`);
    } else if (usesExploreEmotionCheckin(activity)) {
      router.push(`${base}/physical/emotion/explore?${qs}`);
    }
  }

  const confirmActivity = confirmId ? data?.activities[confirmId] : null;
  const confirmActivityName = confirmActivity ? getActivityDisplayName(confirmActivity) : "";

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
                        const tappable = hasDetailedCheckin(entry.activity);
                        return (
                          <div
                            key={entry.activity.id}
                            className={`${styles.habitEntry} ${getCategoryClass(entry.accent)}${tappable ? ` ${styles.hasLog}` : ""}`}
                            role="article"
                            aria-label={getActivityDisplayName(entry.activity)}
                            onClick={() =>
                              tappable &&
                              handleEntryTap(entry.activity, entry.occurrence.id)
                            }
                          >
                            <div className={styles.habitEntryIcon}>
                              <CategoryIcon accent={entry.accent} />
                            </div>
                            <div className={styles.habitEntryBody}>
                              <p className={styles.habitEntryName}>{getActivityDisplayName(entry.activity)}</p>
                              <p className={styles.habitEntrySub}>{entry.subline}</p>
                            </div>
                            {tappable && (
                              <span className={styles.habitEntryLogArrow} aria-hidden="true">
                                <ChevronRight />
                              </span>
                            )}
                            <button
                              className={styles.habitDeleteBtn}
                              aria-label={`ลบ ${entry.activity.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmId(entry.activity.id);
                              }}
                            >
                              <Trash2 />
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
                            <button
                              className={`${styles.habitCheck}${
                                entry.occurrence.status === "done"
                                  ? ` ${styles.done}`
                                  : entry.occurrence.status === "skipped"
                                    ? ` ${styles.skip}`
                                    : entry.occurrence.status === "partial"
                                      ? ` ${styles.partial}`
                                      : ""
                              }`}
                              aria-label={
                                entry.occurrence.status === "done"
                                  ? "ทำเสร็จแล้ว"
                                  : entry.occurrence.status === "skipped"
                                    ? "ข้ามไปแล้ว – แตะเพื่อทำเสร็จ"
                                    : entry.occurrence.status === "partial"
                                      ? "กำลังทำ – แตะเพื่อทำเสร็จ"
                                      : "ยังไม่ทำ"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                const next =
                                  entry.occurrence.status === "done" ? "pending" : "done";
                                toggle({
                                  occurrenceId: entry.occurrence.id,
                                  activityId: entry.activity.id,
                                  status: next,
                                  date: todayStr,
                                });
                              }}
                            >
                              {entry.occurrence.status === "done" && (
                                <Check color="#fff" strokeWidth={3} />
                              )}
                              {entry.occurrence.status === "skipped" && (
                                <Minus color="#fff" strokeWidth={3} />
                              )}
                            </button>
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
