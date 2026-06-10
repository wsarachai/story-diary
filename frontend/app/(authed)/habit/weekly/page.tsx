"use client";

import Link from "next/link";
import { useGetWeeklyHabitsQuery } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import type { HabitGridCell } from "@/types/habit";
import { gridDotState } from "@/lib/utils/habitStatus";
import { localDateStr } from "@/lib/utils/date";
import IconRail from "@/components/IconRail";
import { DateWeekRange } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import { TrackerError, TrackerEmpty } from "../TrackerStates";

const DAY_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function dotClass(cell: HabitGridCell, todayStr: string): string {
  const state = gridDotState(cell, todayStr);
  if (state === "off") return styles.weeklyDotOff;
  let cls = styles.weeklyDot;
  if (state === "done") cls += ` ${styles.done}`;
  else if (state === "skipped") cls += ` ${styles.skip}`;
  else if (state === "partial") cls += ` ${styles.partial}`;
  else if (state === "missed") cls += ` ${styles.missed}`;
  if (cell.date === todayStr) cls += ` ${styles.todayRing}`;
  return cls;
}

export default function HabitWeeklyPage() {
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } = useGetWeeklyHabitsQuery();
  const summary = data?.summary;
  const rows = data ? Object.values(data.rowsByActivity) : [];

  const left = (
    <div className={styles.habitTrackerContainer} aria-label="ตาราง weekly tracker">
      <div className={styles.habitTrackerHeader}>
        <div>
          <h1 className={styles.trackerSectionTitle}>Weekly Tracker</h1>
          <DateWeekRange weekStart={data?.weekStartDate} className={styles.dateLabel} />
        </div>
        <Link href="/habit/add?from=/habit/weekly" className={styles.addBtn} aria-label="เพิ่มกิจกรรม">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
      </div>

      <div className={styles.trackerTabRow}>
        <Link href="/habit/checklist" className={styles.trackerTab}>รายการ</Link>
        <Link href="/habit/today" className={styles.trackerTab}>สรุป</Link>
        <span className={`${styles.trackerTab} ${styles.isActive}`} aria-current="page">weekly habits</span>
        <Link href="/habit/monthly" className={styles.trackerTab}>monthly habits</Link>
      </div>

      <div className={styles.weeklyContent}>
        {isLoading && <PageSpinner variant="inline" height="12rem" label="กำลังโหลดข้อมูล…" />}
        {!isLoading && isError && <TrackerError onRetry={refetch} />}
        {!isLoading && !isError && rows.length === 0 && <TrackerEmpty addFrom="/habit/weekly" />}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div className={styles.weeklyGrid} role="table" aria-label="ตารางกิจกรรมรายสัปดาห์">
              <div className={styles.weeklyDayHeader} role="row">
                <span>กิจกรรม</span>
                {DAY_LABELS.map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className={styles.weeklyRows}>
                {rows.map((row) => (
                  <div key={row.activityName} className={styles.weeklyRow} role="row">
                    <span className={styles.weeklyRowLabel}>{row.activityName}</span>
                    {row.cells.map((cell) => (
                      <div key={cell.date} className={styles.weeklyCell}>
                        <div className={dotClass(cell, todayStr)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.weeklySummaryColumn} aria-label="สรุปสัปดาห์">
              <div className={styles.weeklySummaryCard}>
                <h3>ทำได้แล้ว</h3>
                <span className={styles.weeklySummaryBadge}>{summary?.done ?? 0}</span>
              </div>
              <div className={styles.weeklySummaryCard}>
                <h3>เป้าหมายสัปดาห์</h3>
                <span className={styles.weeklySummaryBadge}>{summary?.target ?? 0}</span>
              </div>
              <div className={styles.weeklyLegend}>
                <div className={styles.legendRow}>
                  <div className={`${styles.legendDot} ${styles.done}`} />
                  <span className={styles.legendLabel}>ทำเสร็จ</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={`${styles.legendDot} ${styles.partial}`} />
                  <span className={styles.legendLabel}>กำลังทำ</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={`${styles.legendDot} ${styles.skip}`} />
                  <span className={styles.legendLabel}>ข้ามไป</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={`${styles.legendDot} ${styles.missed}`} />
                  <span className={styles.legendLabel}>ไม่ได้ทำ</span>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendDot} />
                  <span className={styles.legendLabel}>ยังไม่ถึง</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
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
