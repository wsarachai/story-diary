"use client";

import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";

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
        <div style={{ padding: "6% 7%", display: "flex", flexDirection: "column", height: "100%" }}>
          <h1 className="tracker-title">Habit tracker</h1>
          <div className="section-label-row">
            <div className="section-label">daily habits</div>
            <Link href="/habit/today" className="edit-icon-btn" aria-label="แก้ไขกิจกรรมวันนี้">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
          </div>
          <div className="daily-card" aria-label="Daily habit checklist">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="habit-item">
                <div className="habit-checkbox" />
                <div className="habit-line" />
              </div>
            ))}
          </div>
        </div>
      }
      right={
        <div style={{ padding: "6% 7%", display: "grid", gridTemplateRows: "1fr 1fr", gap: "2rem", height: "100%" }}>
          {/* Weekly habits */}
          <Link href="/habit/weekly" className="weekly-section" aria-label="ไปหน้า weekly habits" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="weekly-card" aria-label="Weekly habit log">
              {DAYS.map((d) => (
                <div key={d} className="weekly-day">
                  <span className="weekly-day-name">{d}</span>
                  <div className="weekly-day-line" />
                </div>
              ))}
            </div>
            <div className="weekly-label" aria-label="Weekly habits">weekly<br />habits</div>
          </Link>

          {/* Monthly habits */}
          <Link href="/habit/monthly" className="monthly-section" aria-label="ไปหน้า monthly habits" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="monthly-label" aria-label="Monthly habits">monthly<br />habits</div>
            <div className="monthly-calendar" aria-label="Monthly calendar">
              <div className="cal-header" aria-hidden="true">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="cal-body" aria-hidden="true">
                {calCells.map((d, i) => (
                  <div key={i} className={`cal-cell${d === null ? " empty" : ""}`}>{d ?? "-"}</div>
                ))}
              </div>
            </div>
          </Link>
        </div>
      }
    />
  );
}
