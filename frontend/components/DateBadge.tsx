"use client";

import { useState, useEffect } from "react";
import styles from "./DateBadge.module.css";

/** Thai month abbreviations (0-indexed). */
const MONTH_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const MONTH_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const DAY_FULL = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ",
  "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์",
];
/** Parse "YYYY-MM-DD" or use current date. */
function parseDate(iso?: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ────────────────────────────────────────────────────────────────────────────
// Formatters
// ────────────────────────────────────────────────────────────────────────────

/** "วันพุธ · 29 พฤษภาคม 2568" (home / full) */
export function formatFull(d: Date): string {
  const day = DAY_FULL[d.getDay()];
  const month = MONTH_FULL[d.getMonth()];
  return `${day} · ${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** "29 พ.ค. 2568" (checkin pages) */
export function formatShort(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "พฤษภาคม 2568" (monthly tracker) */
export function formatMonthYear(d: Date): string {
  return `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * "26 พ.ค. – 1 มิ.ย. 2568" (weekly tracker).
 * Accepts the ISO weekStart string as returned by the API.
 */
export function formatWeekRange(weekStart: string): string {
  const start = parseDate(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMo = MONTH_SHORT[start.getMonth()];
  const endMo = MONTH_SHORT[end.getMonth()];
  const endYr = end.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startDay}–${endDay} ${endMo} ${endYr}`;
  }
  return `${startDay} ${startMo} – ${endDay} ${endMo} ${endYr}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Component variants
// ────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Today's full day + date — for the Home dashboard. */
export function DateFull({ className, style }: BadgeProps) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatFull(new Date()));
  }, []);
  if (!label) return null;
  return (
    <time
      dateTime={new Date().toISOString().slice(0, 10)}
      className={`${styles.dateFull}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {label}
    </time>
  );
}

/** "29 พ.ค. 2568" — compact badge for checkin pages. */
export function DateShort({ className, style }: BadgeProps) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatShort(new Date()));
  }, []);
  if (!label) return null;
  return (
    <time
      dateTime={new Date().toISOString().slice(0, 10)}
      className={`${styles.dateShort}${className ? ` ${className}` : ""}`}
      style={style}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={styles.dateShortIcon}
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {label}
    </time>
  );
}

/** "พฤษภาคม 2568" — for the monthly tracker header. */
export function DateMonthYear({ className, style }: BadgeProps) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatMonthYear(new Date()));
  }, []);
  if (!label) return null;
  return (
    <time
      dateTime={new Date().toISOString().slice(0, 7)}
      className={`${styles.dateMonthYear}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {label}
    </time>
  );
}

/** "26 พ.ค. – 1 มิ.ย. 2568" — for the weekly tracker header. */
export function DateWeekRange({ weekStart, className, style }: BadgeProps & { weekStart?: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (weekStart) {
      setLabel(formatWeekRange(weekStart));
    } else {
      // compute current week Mon–Sun
      const today = new Date();
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((day + 6) % 7));
      setLabel(formatWeekRange(mon.toISOString().slice(0, 10)));
    }
  }, [weekStart]);
  if (!label) return null;
  return (
    <time
      className={`${styles.dateWeekRange}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {label}
    </time>
  );
}
