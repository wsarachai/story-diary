"use client";

import Link from "next/link";
import { useGetMonthlyHabitsQuery } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import type { HabitGridCell } from "@/types/habit";
import { gridDotState } from "@/lib/utils/habitStatus";
import { localDateStr, localMonthStr } from "@/lib/utils/date";
import IconRail from "@/components/IconRail";
import { DateMonthYear } from "@/components/DateBadge";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import PageSpinner from "@/components/PageSpinner";
import { TrackerError, TrackerEmpty } from "../TrackerStates";

function mDotClass(cell: HabitGridCell, todayStr: string): string {
  const state = gridDotState(cell, todayStr);
  if (state === "off") return styles.mDotOff;
  let cls = styles.mDot;
  if (state === "done") cls += ` ${styles.done}`;
  else if (state === "skipped") cls += ` ${styles.skip}`;
  else if (state === "partial") cls += ` ${styles.partial}`;
  else if (state === "missed") cls += ` ${styles.missed}`;
  if (cell.date === todayStr) cls += ` ${styles.todayRing}`;
  return cls;
}

const DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function HabitMonthlyPage() {
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const month = localMonthStr(me?.timezone);
  const { data, isLoading, isError, refetch } = useGetMonthlyHabitsQuery(month);
  const rows = data ? Object.values(data.rowsByActivity) : [];
  const summary = data?.summary;

  const left = (
    <div className={styles.habitTrackerContainer} aria-label="ตาราง monthly tracker">
      <div className={styles.habitTrackerHeader}>
        <div>
          <h1 className={styles.trackerSectionTitle}>Monthly Tracker</h1>
          <DateMonthYear className={styles.dateLabel} />
        </div>
        <Link href="/habit/add?from=/habit/monthly" className={styles.addBtn} aria-label="เพิ่มกิจกรรม">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
      </div>

      <div className={styles.trackerTabRow}>
        <Link href="/habit/checklist" className={styles.trackerTab}>รายการ</Link>
        <Link href="/habit/today" className={styles.trackerTab}>สรุป</Link>
        <Link href="/habit/weekly" className={styles.trackerTab}>weekly habits</Link>
        <span className={`${styles.trackerTab} ${styles.isActive}`} aria-current="page">monthly habits</span>
      </div>

      <div className={styles.monthlyContent}>
        {isLoading && (
          <PageSpinner variant="inline" height="12rem" label="กำลังโหลดข้อมูล…" />
        )}
        {!isLoading && isError && <TrackerError onRetry={refetch} />}
        {!isLoading && !isError && rows.length === 0 && <TrackerEmpty addFrom="/habit/monthly" />}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div className={styles.monthlyGridWrap} role="table" aria-label="ตารางรายเดือน">
              <div className={styles.monthlyColHeader} role="row">
                <span>กิจกรรม</span>
                {DAY_NUMBERS.map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className={styles.monthlyBody}>
                {rows.map((row) => (
                  <div key={row.activityName} className={styles.monthlyRow} role="row">
                    <span className={styles.monthlyRowLabel}>{row.activityName}</span>
                    {row.cells.map((cell) => (
                      <div key={cell.date} className={styles.monthlyCell}>
                        <div className={mDotClass(cell, todayStr)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.monthlySummaryColumn} aria-label="สรุปรายเดือน">
              <div className={styles.monthlySummaryCard}>
                <h3>ทำได้แล้ว</h3>
                <span className={styles.monthlySummaryBadge}>{summary?.done ?? 0}</span>
              </div>
              <div className={styles.monthlySummaryCard}>
                <h3>เป้าหมายเดือน</h3>
                <span className={styles.monthlySummaryBadge}>{summary?.target ?? 0}</span>
              </div>
              <div className={styles.monthlyLegend}>
                <div className={styles.monthlyLegendRow}>
                  <div className={`${styles.monthlyLegendDot} ${styles.done}`} />
                  <span className={styles.monthlyLegendLabel}>ทำเสร็จ</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div className={`${styles.monthlyLegendDot} ${styles.partial}`} />
                  <span className={styles.monthlyLegendLabel}>กำลังทำ</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div className={`${styles.monthlyLegendDot} ${styles.skip}`} />
                  <span className={styles.monthlyLegendLabel}>ข้ามไป</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div className={`${styles.monthlyLegendDot} ${styles.missed}`} />
                  <span className={styles.monthlyLegendLabel}>ไม่ได้ทำ</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div className={styles.monthlyLegendDot} />
                  <span className={styles.monthlyLegendLabel}>ยังไม่ถึง</span>
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
