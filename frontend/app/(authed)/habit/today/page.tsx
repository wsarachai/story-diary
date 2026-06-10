"use client";

import Link from "next/link";
import { useGetTodayHabitsQuery } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import IconRail from "@/components/IconRail";
import { DateFull } from "@/components/DateBadge";
import { localDateStr } from "@/lib/utils/date";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import PageSpinner from "@/components/PageSpinner";
import { TrackerError, TrackerEmpty } from "../TrackerStates";

export default function HabitTodayPage() {
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } = useGetTodayHabitsQuery(todayStr);

  const occurrences = data ? Object.values(data.todayByActivity) : [];
  const done    = occurrences.filter(o => o.status === "done").length;
  const partial = occurrences.filter(o => o.status === "partial").length;
  const skipped = occurrences.filter(o => o.status === "skipped").length;
  const pending = occurrences.filter(o => o.status === "pending").length;
  const total   = occurrences.length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  const left = (
    <div className={styles.habitTrackerContainer} aria-label="สรุปกิจกรรมวันนี้">
      <div className={styles.habitTrackerHeader}>
        <div>
          <h1 className={styles.trackerSectionTitle}>Daily Tracker</h1>
          <DateFull className={styles.dateLabel} />
        </div>
        <Link href="/habit/add?from=/habit/today" className={styles.addBtn} aria-label="เพิ่มกิจกรรม">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
      </div>

      <div className={styles.trackerTabRow}>
        <Link href="/habit/checklist" className={styles.trackerTab}>รายการ</Link>
        <span className={`${styles.trackerTab} ${styles.isActive}`} aria-current="page">สรุป</span>
        <Link href="/habit/weekly" className={styles.trackerTab}>weekly habits</Link>
        <Link href="/habit/monthly" className={styles.trackerTab}>monthly habits</Link>
      </div>

      {isLoading ? (
        <PageSpinner variant="inline" height="12rem" label="กำลังโหลด…" />
      ) : isError ? (
        <TrackerError onRetry={refetch} />
      ) : total === 0 ? (
        <TrackerEmpty addFrom="/habit/today" />
      ) : (
        <div className={styles.dailySummaryContent}>
          {/* Count cards */}
          <div className={styles.dailySummaryCards}>
            <div className={`${styles.dailySummaryCard} ${styles.dailySummaryCardDone}`}>
              <span className={styles.dailySummaryBadge}>{done}</span>
              <h3>ทำเสร็จ</h3>
            </div>
            <div className={`${styles.dailySummaryCard} ${styles.dailySummaryCardPartial}`}>
              <span className={styles.dailySummaryBadge}>{partial}</span>
              <h3>กำลังทำ</h3>
            </div>
            <div className={`${styles.dailySummaryCard} ${styles.dailySummaryCardSkip}`}>
              <span className={styles.dailySummaryBadge}>{skipped}</span>
              <h3>ข้ามไป</h3>
            </div>
            <div className={`${styles.dailySummaryCard} ${styles.dailySummaryCardPend}`}>
              <span className={styles.dailySummaryBadge}>{pending}</span>
              <h3>ยังไม่ทำ</h3>
            </div>
          </div>

          {/* Progress bar */}
          <div className={styles.dailyProgressWrap}>
            <div className={styles.dailyProgressMeta}>
              <span>ความคืบหน้าวันนี้</span>
              <span>{done} / {total} ({pct}%)</span>
            </div>
            <div className={styles.dailyProgressBar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.dailyProgressFill} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* CTA */}
          <Link href="/habit/checklist" className={styles.dailyCTA}>
            เช็คอินกิจกรรม
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      mergedOnly
      merged={left}
    />
  );
}
