"use client";

import { useState, useEffect } from "react";

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
const DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse "YYYY-MM-DD" or use current date. */
function parseDate(iso?: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Last date of a month given "YYYY-MM" or a Date. */
function lastOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
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
export function DateFull({ style }: BadgeProps) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatFull(new Date()));
  }, []);
  if (!label) return null;
  return (
    <time
      dateTime={new Date().toISOString().slice(0, 10)}
      style={{
        display: "inline-block",
        fontSize: "0.78em",
        fontWeight: 500,
        color: "var(--panel-blue-deep)",
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {label}
    </time>
  );
}

/** "29 พ.ค. 2568" — compact badge for checkin pages. */
export function DateShort({ style }: BadgeProps) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatShort(new Date()));
  }, []);
  if (!label) return null;
  return (
    <time
      dateTime={new Date().toISOString().slice(0, 10)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.28em",
        fontSize: "0.72em",
        fontWeight: 600,
        color: "rgba(13,18,23,0.45)",
        background: "rgba(88,216,222,0.13)",
        border: "1px solid rgba(88,216,222,0.35)",
        borderRadius: "999px",
        padding: "0.18em 0.7em",
        letterSpacing: "0.01em",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ width: "0.95em", height: "0.95em", flexShrink: 0, opacity: 0.7 }}
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
export function DateMonthYear({ style }: BadgeProps) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(formatMonthYear(new Date()));
  }, []);
  if (!label) return null;
  return (
    <time
      dateTime={new Date().toISOString().slice(0, 7)}
      style={{
        fontSize: "0.72em",
        fontWeight: 600,
        color: "var(--panel-blue-deep)",
        opacity: 0.75,
        letterSpacing: "0.03em",
        ...style,
      }}
    >
      {label}
    </time>
  );
}

/** "26 พ.ค. – 1 มิ.ย. 2568" — for the weekly tracker header. */
export function DateWeekRange({ weekStart, style }: BadgeProps & { weekStart?: string }) {
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
      style={{
        fontSize: "0.72em",
        fontWeight: 600,
        color: "var(--panel-blue-deep)",
        opacity: 0.75,
        letterSpacing: "0.03em",
        ...style,
      }}
    >
      {label}
    </time>
  );
}
