"use client";

import { useEffect, useRef, useState } from "react";
import { useGetMonthlyHabitsQuery } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import type { HabitGridCell } from "@/types/habit";
import { gridDotState } from "@/lib/utils/habitStatus";
import { localDateStr, localMonthStr } from "@/lib/utils/date";
import IconRail from "@/components/IconRail";
import { formatMonthYear } from "@/components/DateBadge";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import PageSpinner from "@/components/PageSpinner";
import { TrackerError, TrackerEmpty } from "../TrackerStates";
import HabitTrackerHeader from "@/components/HabitTrackerHeader";

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

function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return formatMonthYear(new Date(y, m - 1, 1));
}

function monthsDiff(fromMonth: string, toMonth: string): number {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export default function HabitMonthlyPage() {
  const { data: me } = useGetMeQuery();
  const currentMonth = localMonthStr(me?.timezone);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const userTouchedGridRef = useRef(false);
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } =
    useGetMonthlyHabitsQuery(selectedMonth);
  const rows = data ? Object.values(data.rowsByActivity) : [];
  const summary = data?.summary;
  const scrollKey = `habit-monthly-scroll:${selectedMonth}`;
  const hintHiddenKey = `habit-monthly-scroll-hint-hidden:${selectedMonth}`;
  const disableNextMonth = selectedMonth >= currentMonth;
  const disablePrevMonth = monthsDiff(selectedMonth, currentMonth) >= 12;
  const monthAnnouncement = `แสดงข้อมูลเดือน ${monthLabel(selectedMonth)}`;

  const toggleLabel = (name: string) => {
    setExpandedLabel((prev) => (prev === name ? null : name));
  };

  useEffect(() => {
    const hidden = sessionStorage.getItem(hintHiddenKey) === "1";
    setShowScrollHint(!hidden);
  }, [hintHiddenKey]);

  useEffect(() => {
    setExpandedLabel(null);
  }, [selectedMonth]);

  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(scrollKey);
    if (saved) {
      const left = Number(saved);
      if (!Number.isFinite(left)) return;
      el.scrollLeft = Math.max(0, left);
      return;
    }

    const day = Number(todayStr.slice(-2));
    if (!Number.isInteger(day) || day < 1 || day > 31) return;
    const clampedDay = Math.min(day, daysInMonth(selectedMonth));

    const dayCell = el.querySelector(
      `.${styles.monthlyColHeader} span:nth-child(${clampedDay + 1})`,
    ) as HTMLElement | null;
    if (!dayCell) return;

    const target = Math.max(0, dayCell.offsetLeft - el.clientWidth * 0.42);
    el.scrollLeft = target;
  }, [scrollKey, rows.length, todayStr, selectedMonth]);

  const handleGridScroll = () => {
    const el = gridWrapRef.current;
    if (!el) return;

    if (userTouchedGridRef.current && el.scrollLeft > 0 && expandedLabel) {
      setExpandedLabel(null);
    }

    sessionStorage.setItem(scrollKey, String(el.scrollLeft));

    if (userTouchedGridRef.current && el.scrollLeft > 0 && showScrollHint) {
      setShowScrollHint(false);
      sessionStorage.setItem(hintHiddenKey, "1");
    }
  };

  const left = (
    <HabitTrackerHeader
      containerLabel="ตารางรายเดือน"
      title="สรุปรายเดือน"
      date={
        <div>
          <div className={styles.monthNavRow}>
            <button
              type="button"
              className={styles.monthNavBtn}
              aria-label="เดือนก่อนหน้า"
              disabled={disablePrevMonth}
              onClick={() => setSelectedMonth((prev) => addMonths(prev, -1))}
            >
              ‹
            </button>
            <span className={styles.dateLabel}>
              {monthLabel(selectedMonth)}
            </span>
            <button
              type="button"
              className={styles.monthNavBtn}
              aria-label="เดือนถัดไป"
              disabled={disableNextMonth}
              onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
            >
              ›
            </button>
          </div>
          {disablePrevMonth && (
            <p className={styles.monthNavLimitHint}>
              ดูย้อนหลังได้สูงสุด 12 เดือน
            </p>
          )}
        </div>
      }
      activeTab="monthly"
      addHref="/habit/add?from=/habit/monthly"
      addLabel="เพิ่มกิจกรรม"
    >
      <div className={styles.monthlyContent}>
        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {monthAnnouncement}
        </p>
        {isLoading && (
          <PageSpinner
            variant="inline"
            height="12rem"
            label="กำลังโหลดข้อมูล…"
          />
        )}
        {!isLoading && isError && <TrackerError onRetry={refetch} />}
        {!isLoading && !isError && rows.length === 0 && (
          <TrackerEmpty addFrom="/habit/monthly" />
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            {showScrollHint && (
              <p className={styles.monthlyScrollHint}>
                เลื่อนซ้าย/ขวา เพื่อดูวันที่ 1-31
              </p>
            )}
            <div
              ref={gridWrapRef}
              className={styles.monthlyGridWrap}
              role="table"
              aria-label="ตารางรายเดือน"
              onScroll={handleGridScroll}
              onTouchStart={() => {
                userTouchedGridRef.current = true;
              }}
              onMouseDown={() => {
                userTouchedGridRef.current = true;
              }}
              onWheel={() => {
                userTouchedGridRef.current = true;
              }}
            >
              <div className={styles.monthlyColHeader} role="row">
                <span>กิจกรรม</span>
                {DAY_NUMBERS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className={styles.monthlyBody}>
                {rows.map((row) => (
                  <div
                    key={row.activityName}
                    className={styles.monthlyRow}
                    role="row"
                    style={{ borderLeft: `3px solid ${row.accent}` }}
                  >
                    <button
                      type="button"
                      className={`${styles.monthlyRowLabel} ${expandedLabel === row.activityName ? styles.monthlyRowLabelExpanded : ""}`}
                      onClick={() => toggleLabel(row.activityName)}
                      title={row.activityName}
                      aria-label={`ชื่อกิจกรรม: ${row.activityName}`}
                      aria-expanded={
                        expandedLabel === row.activityName ? "true" : "false"
                      }
                    >
                      {row.activityName}
                    </button>
                    {row.cells.map((cell) => (
                      <div key={cell.date} className={styles.monthlyCell}>
                        <div className={mDotClass(cell, todayStr)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div
              className={styles.monthlySummaryColumn}
              aria-label="สรุปรายเดือน"
            >
              <div className={styles.monthlySummaryCard}>
                <h3>ทำได้แล้ว</h3>
                <span className={styles.monthlySummaryBadge}>
                  {summary?.done ?? 0}
                </span>
              </div>
              <div className={styles.monthlySummaryCard}>
                <h3>เป้าหมายเดือนนี้</h3>
                <span className={styles.monthlySummaryBadge}>
                  {summary?.target ?? 0}
                </span>
              </div>
              <div className={styles.monthlyLegend}>
                <div className={styles.monthlyLegendRow}>
                  <div
                    className={`${styles.monthlyLegendDot} ${styles.done}`}
                  />
                  <span className={styles.monthlyLegendLabel}>ทำเสร็จ</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div
                    className={`${styles.monthlyLegendDot} ${styles.partial}`}
                  />
                  <span className={styles.monthlyLegendLabel}>กำลังทำ</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div
                    className={`${styles.monthlyLegendDot} ${styles.skip}`}
                  />
                  <span className={styles.monthlyLegendLabel}>ข้ามไป</span>
                </div>
                <div className={styles.monthlyLegendRow}>
                  <div
                    className={`${styles.monthlyLegendDot} ${styles.missed}`}
                  />
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
    </HabitTrackerHeader>
  );

  return <BookShellLayout tight rail={<IconRail />} mergedOnly merged={left} />;
}
