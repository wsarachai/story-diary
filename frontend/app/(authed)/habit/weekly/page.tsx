"use client";

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
import HabitTrackerHeader from "@/components/HabitTrackerHeader";
import { HABIT_TRACKER_LEGEND } from "../legendConfig";

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

function weeklyLegendDotClass(
  variant: "done" | "partial" | "skip" | "missed" | "future" | "off",
): string {
  let cls = styles.legendDot;
  if (variant === "off") return `${cls} ${styles.legendDotOff}`;
  if (variant !== "future") cls += ` ${styles[variant]}`;
  return cls;
}

export default function HabitWeeklyPage() {
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } = useGetWeeklyHabitsQuery();
  const summary = data?.summary;
  const rows = data ? Object.values(data.rowsByActivity) : [];

  const left = (
    <HabitTrackerHeader
      containerLabel="ตารางรายสัปดาห์"
      title="สรุปรายสัปดาห์"
      date={
        <DateWeekRange
          weekStart={data?.weekStartDate}
          className={styles.dateLabel}
        />
      }
      activeTab="weekly"
      addHref="/habit/add?from=/habit/weekly"
      addLabel="เพิ่มกิจกรรม"
    >
      <div className={styles.weeklyContent}>
        {isLoading && (
          <PageSpinner
            variant="inline"
            height="12rem"
            label="กำลังโหลดข้อมูล…"
          />
        )}
        {!isLoading && isError && <TrackerError onRetry={refetch} />}
        {!isLoading && !isError && rows.length === 0 && (
          <TrackerEmpty addFrom="/habit/weekly" />
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div
              className={styles.weeklyGrid}
              role="table"
              aria-label="ตารางกิจกรรมรายสัปดาห์"
            >
              <div className={styles.weeklyDayHeader} role="row">
                <span>กิจกรรม</span>
                {DAY_LABELS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className={styles.weeklyRows}>
                {rows.map((row) => (
                  <div
                    key={row.activityName}
                    className={styles.weeklyRow}
                    role="row"
                    style={{ borderLeft: `3px solid ${row.accent}` }}
                  >
                    <span className={styles.weeklyRowLabel}>
                      {row.activityName}
                    </span>
                    {row.cells.map((cell) => (
                      <div key={cell.date} className={styles.weeklyCell}>
                        <div className={dotClass(cell, todayStr)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div
              className={styles.weeklySummaryColumn}
              aria-label="สรุปสัปดาห์"
            >
              <div className={styles.weeklySummaryCard}>
                <h3>ทำได้แล้ว</h3>
                <span className={styles.weeklySummaryBadge}>
                  {summary?.done ?? 0}
                </span>
              </div>
              <div className={styles.weeklySummaryCard}>
                <h3>เป้าหมายสัปดาห์นี้</h3>
                <span className={styles.weeklySummaryBadge}>
                  {summary?.target ?? 0}
                </span>
              </div>
              <div className={styles.weeklyLegend}>
                {HABIT_TRACKER_LEGEND.map((item) =>
                  item.kind === "hint" ? (
                    <div key={item.key} className={styles.legendHintRow}>
                      <span className={styles.legendHintText}>
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <div key={item.key} className={styles.legendRow}>
                      <div
                        aria-hidden="true"
                        className={weeklyLegendDotClass(item.variant)}
                      />
                      <span className={styles.legendLabel}>{item.label}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </HabitTrackerHeader>
  );

  return <BookShellLayout tight rail={<IconRail />} mergedOnly merged={left} />;
}
