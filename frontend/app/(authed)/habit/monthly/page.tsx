"use client";

import Link from "next/link";
import { useGetMonthlyHabitsQuery } from "@/store/habitsApi";
import type { HabitOccurrenceStatus } from "@/types/habit";
import IconRail from "@/components/IconRail";

const TODAY_DAY = new Date().getDate();

function mDotClass(status: HabitOccurrenceStatus, dayIndex: number): string {
  const isToday = dayIndex + 1 === TODAY_DAY;
  const base = isToday ? "m-dot today" : "m-dot";
  if (status === "done") return `${base} done`;
  if (status === "skipped") return `${base} skip`;
  return base;
}

const DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function HabitMonthlyPage() {
  const month = new Date().toISOString().slice(0, 7);
  const { data, isLoading } = useGetMonthlyHabitsQuery(month);
  const rows = data ? Object.values(data.rowsByActivity) : [];
  const summary = data?.summary;

  return (
    <main className="screen" aria-label="Story Diary Monthly Tracker">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section
          className="page page-left page-seam-right"
          style={{ gridColumn: "1 / 3", padding: "4% 5% 4%", display: "grid", gridTemplateRows: "auto auto 1fr", gap: "0.9rem", overflow: "hidden" }}
          aria-label="ตาราง monthly tracker"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 className="tracker-section-title" style={{ margin: 0 }}>Monthly Tracker</h1>
            <Link href="/habit/add" className="add-btn" aria-label="เพิ่มกิจกรรม">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
          </div>

          <div className="tracker-tab-row">
            <Link href="/habit/today" className="tracker-tab">daily habits</Link>
            <Link href="/habit/weekly" className="tracker-tab">weekly habits</Link>
            <span className="tracker-tab is-active" aria-current="page">monthly habits</span>
          </div>

          <div className="monthly-content">
            {isLoading && (
              <div style={{ display: "grid", placeItems: "center" }}>
                <div className="chapter-spinner" />
              </div>
            )}
            {!isLoading && (
              <>
                <div className="monthly-grid-wrap" role="table" aria-label="ตารางรายเดือน">
                  <div className="monthly-col-header" role="row">
                    <span>กิจกรรม</span>
                    {DAY_NUMBERS.map((d) => <span key={d}>{d}</span>)}
                  </div>
                  <div className="monthly-body">
                    {rows.map((row) => (
                      <div key={row.activityName} className="monthly-row" role="row">
                        <span className="monthly-row-label">{row.activityName}</span>
                        {row.cells.map((st, i) => (
                          <div key={i} className="monthly-cell">
                            <div className={mDotClass(st, i)} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="monthly-summary-column" aria-label="สรุปรายเดือน">
                  <div className="monthly-summary-card">
                    <h3>ทำได้แล้ว</h3>
                    <span className="monthly-summary-badge">{summary?.done ?? 0}</span>
                  </div>
                  <div className="monthly-summary-card">
                    <h3>เป้าหมายเดือน</h3>
                    <span className="monthly-summary-badge">{summary?.target ?? 0}</span>
                  </div>
                  <div className="monthly-legend">
                    <div className="monthly-legend-row">
                      <div className="monthly-legend-dot" style={{ background: "#08c65a" }} />
                      <span className="monthly-legend-label">ทำเสร็จ</span>
                    </div>
                    <div className="monthly-legend-row">
                      <div className="monthly-legend-dot" style={{ background: "#f4a261" }} />
                      <span className="monthly-legend-label">ข้ามไป</span>
                    </div>
                    <div className="monthly-legend-row">
                      <div className="monthly-legend-dot" style={{ background: "#fff", border: "3px solid #59d6dc" }} />
                      <span className="monthly-legend-label">ยังไม่ถึง</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <IconRail />
      </section>
    </main>
  );
}
