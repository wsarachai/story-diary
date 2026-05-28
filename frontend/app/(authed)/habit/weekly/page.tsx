"use client";

import Link from "next/link";
import { useGetWeeklyHabitsQuery } from "@/store/habitsApi";
import type { HabitOccurrenceStatus } from "@/types/habit";
import IconRail from "@/components/IconRail";

const DAY_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function dotClass(status: HabitOccurrenceStatus): string {
  if (status === "done") return "weekly-dot done";
  if (status === "skipped") return "weekly-dot skip";
  return "weekly-dot";
}

export default function HabitWeeklyPage() {
  const { data, isLoading } = useGetWeeklyHabitsQuery();
  const summary = data?.summary;
  const rows = data ? Object.values(data.rowsByActivity) : [];

  return (
    <main className="screen" aria-label="Story Diary Weekly Tracker">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section
          className="page page-left page-seam-right"
          style={{ gridColumn: "1 / 3", padding: "4% 5% 4%", display: "grid", gridTemplateRows: "auto auto 1fr", gap: "0.9rem" }}
          aria-label="ตาราง weekly tracker"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 className="tracker-section-title" style={{ margin: 0 }}>Weekly Tracker</h1>
            <Link href="/habit/add" className="add-btn" aria-label="เพิ่มกิจกรรม">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
          </div>

          <div className="tracker-tab-row">
            <Link href="/habit/today" className="tracker-tab">daily habits</Link>
            <span className="tracker-tab is-active" aria-current="page">weekly habits</span>
            <Link href="/habit/monthly" className="tracker-tab">monthly habits</Link>
          </div>

          <div className="weekly-content">
            {isLoading && (
              <div style={{ display: "grid", placeItems: "center" }}>
                <div className="chapter-spinner" />
              </div>
            )}
            {!isLoading && (
              <>
                <div className="weekly-grid" role="table" aria-label="ตารางกิจกรรมรายสัปดาห์">
                  <div className="weekly-day-header" role="row">
                    <span>กิจกรรม</span>
                    {DAY_LABELS.map((d) => <span key={d}>{d}</span>)}
                  </div>
                  <div className="weekly-rows">
                    {rows.map((row) => (
                      <div key={row.activityName} className="weekly-row" role="row">
                        <span className="weekly-row-label">{row.activityName}</span>
                        {row.cells.map((status, i) => (
                          <div key={i} className="weekly-cell">
                            <div className={dotClass(status)} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="weekly-summary-column" aria-label="สรุปสัปดาห์">
                  <div className="weekly-summary-card">
                    <h3>ทำได้แล้ว</h3>
                    <span className="weekly-summary-badge">{summary?.done ?? 0}</span>
                  </div>
                  <div className="weekly-summary-card">
                    <h3>เป้าหมายสัปดาห์</h3>
                    <span className="weekly-summary-badge">{summary?.target ?? 0}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem" }}>
                    <div className="legend-row">
                      <div className="legend-dot" style={{ background: "#08c65a" }} />
                      <span className="legend-label">ทำเสร็จ</span>
                    </div>
                    <div className="legend-row">
                      <div className="legend-dot" style={{ background: "#f4a261" }} />
                      <span className="legend-label">ข้ามไป</span>
                    </div>
                    <div className="legend-row">
                      <div className="legend-dot" style={{ background: "#fff", border: "3px solid #59d6dc" }} />
                      <span className="legend-label">ยังไม่ถึง</span>
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
