"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetTodayHabitsQuery, useToggleOccurrenceMutation, useDeleteActivityMutation } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import IconRail from "@/components/IconRail";
import { DateFull } from "@/components/DateBadge";
import { localDateStr } from "@/lib/utils/date";
import type { HabitActivity } from "@/types/habit";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import PageSpinner from "@/components/PageSpinner";
import { TrackerError, TrackerEmpty } from "../TrackerStates";

function getAccent(activity: HabitActivity): string {
  if (activity.category === "medicine") return "#57a8db";
  if (activity.category === "nutrition") return "#2eb563";
  const pc = activity.physicalCategory;
  if (pc === "symptoms" || pc === "emotion-management") return "#e76f51";
  return "#ee8a4a";
}

function hasDetailedCheckin(activity: HabitActivity): boolean {
  return (
    activity.category === "medicine" ||
    activity.category === "nutrition" ||
    activity.physicalCategory === "symptoms" ||
    activity.physicalCategory === "emotion-management"
  );
}

function getSubline(activity: HabitActivity): string {
  const { schedule, mealRelation, mealSlots } = activity;
  if (activity.category === "medicine" && mealRelation && mealSlots && mealSlots.length > 0) {
    const relation = mealRelation === "after" ? "หลัง" : "ก่อน";
    const slots = mealSlots.map(s => {
      if (s === "breakfast") return "อาหารเช้า";
      if (s === "lunch") return "อาหารกลางวัน";
      if (s === "dinner") return "อาหารเย็น";
      return "ก่อนนอน";
    }).join("-");
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

function CategoryIcon({ accent }: { accent: string }) {
  if (accent === "#57a8db") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#57a8db" strokeWidth="2">
        <path d="M9 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="1" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="12" y1="9" x2="12" y2="15"/>
      </svg>
    );
  }
  if (accent === "#2eb563") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#2eb563" strokeWidth="2">
        <path d="M3 2v7c0 1.66 1.34 3 3 3h1v9a1 1 0 0 0 2 0V5"/>
        <path d="M18 2v20M15 2v6a3 3 0 0 0 6 0V2"/>
      </svg>
    );
  }
  if (accent === "#e76f51") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#e76f51" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ee8a4a" strokeWidth="2">
      <circle cx="12" cy="5" r="2"/>
      <path d="M6 11h12M12 7v4M9 21l3-7 3 7"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="5 6 12 12 5 18"/>
      <polyline points="13 6 20 12 13 18"/>
    </svg>
  );
}

interface DeleteConfirmProps {
  activityName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({ activityName, isDeleting, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div className={styles.deleteConfirmOverlay} onClick={onCancel}>
      <div className={styles.deleteConfirmCard} onClick={(e) => e.stopPropagation()}>
        <p className={styles.deleteConfirmTitle}>ลบกิจกรรม?</p>
        <p className={styles.deleteConfirmBody}>
          <strong>&quot;{activityName}&quot;</strong> และประวัติ check-in ทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้
        </p>
        <div className={styles.deleteConfirmActions}>
          <button className={styles.deleteConfirmCancel} onClick={onCancel} disabled={isDeleting}>
            ยกเลิก
          </button>
          <button className={styles.deleteConfirmOk} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "กำลังลบ…" : "ลบกิจกรรม"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HabitChecklistPage() {
  const router = useRouter();
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } = useGetTodayHabitsQuery(todayStr);
  const [toggle] = useToggleOccurrenceMutation();
  const [deleteActivity, { isLoading: isDeleting }] = useDeleteActivityMutation();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const entries = data ? Object.values(data.activities).map(activity => ({
    activity,
    occurrence: data.todayByActivity[activity.id],
    subline: getSubline(activity),
    accent: getAccent(activity)
  })) : [];

  function handleEntryTap(activity: HabitActivity, occurrenceId: string) {
    const base = `/habit/checkin`;
    const qs   = `occ=${occurrenceId}&actId=${activity.id}`;
    if (activity.category === "medicine") {
      router.push(`${base}/medicine?${qs}`);
    } else if (activity.category === "nutrition") {
      router.push(`${base}/nutrition?${qs}`);
    } else if (activity.physicalCategory === "symptoms") {
      router.push(`${base}/symptom?${qs}`);
    } else if (activity.physicalCategory === "emotion-management") {
      router.push(`${base}/emotion?${qs}`);
    }
  }

  const confirmActivity = confirmId ? data?.activities[confirmId] : null;

  async function handleDeleteConfirm() {
    if (!confirmId) return;
    await deleteActivity(confirmId);
    setConfirmId(null);
  }

  const left = (
    <div className={styles.habitTrackerContainer} aria-label="รายการเช็คอินวันนี้">
      <div className={styles.habitTrackerHeader}>
        <div>
          <h1 className={styles.trackerSectionTitle}>Daily Tracker</h1>
          <DateFull className={styles.dateLabel} />
        </div>
        <Link href="/habit/add?from=/habit/checklist" className={styles.addBtn} aria-label="เพิ่มกิจกรรม">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
      </div>

      <div className={styles.trackerTabRow}>
        <span className={`${styles.trackerTab} ${styles.isActive}`} aria-current="page">รายการ</span>
        <Link href="/habit/today" className={styles.trackerTab}>สรุป</Link>
        <Link href="/habit/weekly" className={styles.trackerTab}>weekly habits</Link>
        <Link href="/habit/monthly" className={styles.trackerTab}>monthly habits</Link>
      </div>

      <div className={styles.habitEntries}>
        {isLoading && (
          <PageSpinner variant="inline" height="12rem" label="กำลังโหลดกิจกรรม…" />
        )}
        {!isLoading && isError && <TrackerError onRetry={refetch} />}
        {!isLoading && !isError && entries.length === 0 && <TrackerEmpty addFrom="/habit/checklist" />}
        {!isLoading && !isError && entries.map((entry) => {
          const tappable = hasDetailedCheckin(entry.activity);
          return (
            <div
              key={entry.activity.id}
              className={`${styles.habitEntry} ${getCategoryClass(entry.accent)}${tappable ? ` ${styles.hasLog}` : ""}`}
              role="article"
              aria-label={entry.activity.name}
              onClick={() => tappable && handleEntryTap(entry.activity, entry.occurrence.id)}
            >
              <div className={styles.habitEntryIcon}>
                <CategoryIcon accent={entry.accent} />
              </div>
              <div className={styles.habitEntryBody}>
                <p className={styles.habitEntryName}>{entry.activity.name}</p>
                <p className={styles.habitEntrySub}>{entry.subline}</p>
              </div>
              {tappable && (
                <span className={styles.habitEntryLogArrow} aria-hidden="true">
                  <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
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
                <TrashIcon />
              </button>
              {(entry.occurrence.status === "pending" || entry.occurrence.status === "partial") && (
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
                  <SkipIcon />
                </button>
              )}
              <button
                className={`${styles.habitCheck}${
                  entry.occurrence.status === "done" ? ` ${styles.done}` :
                  entry.occurrence.status === "skipped" ? ` ${styles.skip}` :
                  entry.occurrence.status === "partial" ? ` ${styles.partial}` : ""
                }`}
                aria-label={
                  entry.occurrence.status === "done" ? "ทำเสร็จแล้ว" :
                  entry.occurrence.status === "skipped" ? "ข้ามไปแล้ว – แตะเพื่อทำเสร็จ" :
                  entry.occurrence.status === "partial" ? "กำลังทำ – แตะเพื่อทำเสร็จ" : "ยังไม่ทำ"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  // done undoes back to pending; everything else completes.
                  const next = entry.occurrence.status === "done" ? "pending" : "done";
                  toggle({
                    occurrenceId: entry.occurrence.id,
                    activityId: entry.activity.id,
                    status: next,
                    date: todayStr,
                  });
                }}
              >
                {entry.occurrence.status === "done" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {entry.occurrence.status === "skipped" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      mergedOnly
      merged={left}
    >
      {confirmActivity && (
        <DeleteConfirmDialog
          activityName={confirmActivity.name}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </BookShellLayout>
  );
}
