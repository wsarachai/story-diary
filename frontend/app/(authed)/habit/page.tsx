"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import styles from "./habit.module.css";

const DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function buildCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  const startOffset = (firstDay + 6) % 7;
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function HabitPage() {
  const calCells = buildCalendar();

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className={styles.habitContainerLeft}>
          <h1 className={styles.trackerTitle}>Habit tracker</h1>
          <div className={styles.sectionLabelRow}>
            <div className={styles.sectionLabel}>daily habits</div>
          </div>
          <Link href="/habit/checklist" className={styles.dailyCard} aria-label="Daily habit checklist">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.habitItem}>
                <div className={styles.habitCheckbox} />
                <div className={styles.habitLine} />
              </div>
            ))}
          </Link>
        </div>
      }
      right={
        <div className={styles.habitContainerRight}>
          {/* Weekly habits */}
          <Link href="/habit/weekly" className={styles.weeklySection} aria-label="ไปหน้า weekly habits">
            <div className={styles.weeklyCard} aria-label="Weekly habit log">
              {DAYS.map((d) => (
                <div key={d} className={styles.weeklyDay}>
                  <span className={styles.weeklyDayName}>{d}</span>
                  <div className={styles.weeklyDayLine} />
                </div>
              ))}
            </div>
            <div className={styles.weeklyLabel} aria-label="Weekly habits">weekly<br />habits</div>
          </Link>

          {/* Monthly habits */}
          <Link href="/habit/monthly" className={styles.monthlySection} aria-label="ไปหน้า monthly habits">
            <div className={styles.monthlyLabel} aria-label="Monthly habits">monthly<br />habits</div>
            <div className={styles.monthlyCalendar} aria-label="Monthly calendar">
              <div className={styles.calHeader} aria-hidden="true">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className={styles.calBody} aria-hidden="true">
                {calCells.map((d, i) => (
                  <div key={i} className={`${styles.calCell}${d === null ? ` ${styles.calCellEmpty}` : ""}`}>{d ?? "-"}</div>
                ))}
              </div>
            </div>
          </Link>
        </div>
      }
    />
  );
}
