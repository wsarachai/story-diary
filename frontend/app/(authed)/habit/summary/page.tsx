"use client";

import { useEffect } from "react";
import { useGetMonthlySummaryQuery } from "@/store/habitsApi";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";

function ringDashOffset(percent: number): number {
  const circumference = 157;
  return circumference - (percent / 100) * circumference;
}

export default function HabitSummaryPage() {
  const month = new Date().toISOString().slice(0, 7);
  const { data, isLoading: loading } = useGetMonthlySummaryQuery(month);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div style={{ padding: "7% 6% 6% 7%", display: "grid", gridTemplateRows: "auto auto 1fr", gap: "2rem", height: "100%" }}>
          <h1 className="tracker-section-title">เป้าหมาย</h1>
          <div className="section-rule" aria-hidden="true" />

          <div className="goals-list">
            {loading && (
              <div style={{ display: "grid", placeItems: "center", height: "10rem" }}>
                <div className="chapter-spinner" />
              </div>
            )}
            {!loading && (data?.goals ?? []).map((goal) => (
              <div key={goal.activityId} className="goal-card">
                <div>
                  <p className="goal-card-name">{goal.name}</p>
                  <p className="goal-card-sub">{goal.subline}</p>
                </div>
                <svg
                  className="goal-progress-ring"
                  viewBox="0 0 60 60"
                  aria-label={`${goal.progressPercent}%`}
                >
                  <circle className="ring-bg" cx="30" cy="30" r="25" />
                  <circle
                    className="ring-fill"
                    cx="30"
                    cy="30"
                    r="25"
                    transform="rotate(-90 30 30)"
                    style={{ strokeDashoffset: ringDashOffset(goal.progressPercent) }}
                  />
                  <text className="ring-label" x="30" y="31">{goal.progressPercent}%</text>
                </svg>
              </div>
            ))}
          </div>
        </div>
      }
      right={
        <div style={{ padding: "7% 7% 6% 6%", display: "grid", gridTemplateRows: "auto 1fr", gap: "2rem", height: "100%" }}>
          <h2 className="results-title">ผลลัพธ์</h2>

          <div className="results-grid">
            {loading && (
              <div style={{ display: "grid", placeItems: "center", gridColumn: "1/-1" }}>
                <div className="chapter-spinner" />
              </div>
            )}
            {!loading && data && (
              <>
                <div className="result-stat highlight">
                  <p className="result-stat-label">ทำได้ทั้งหมด</p>
                  <p className="result-stat-value">
                    {data.results.totalDone}{" "}
                    <span className="result-stat-unit">ครั้ง</span>
                  </p>
                  <div className="result-bar-wrap">
                    <div className="result-bar" style={{ width: `${data.results.completionPercent}%` }} />
                  </div>
                </div>
                <div className="result-stat">
                  <p className="result-stat-label">เป้าหมาย</p>
                  <p className="result-stat-value">
                    {data.results.target}{" "}
                    <span className="result-stat-unit">ครั้ง</span>
                  </p>
                </div>
                <div className="result-stat">
                  <p className="result-stat-label">ข้ามไป</p>
                  <p className="result-stat-value">
                    {data.results.skipped}{" "}
                    <span className="result-stat-unit">ครั้ง</span>
                  </p>
                </div>
                <div className="result-stat">
                  <p className="result-stat-label">วันที่ทำครบ</p>
                  <p className="result-stat-value">
                    {data.results.fullDays}{" "}
                    <span className="result-stat-unit">วัน</span>
                  </p>
                </div>
                <div className="result-stat">
                  <p className="result-stat-label">Streak สูงสุด</p>
                  <p className="result-stat-value">
                    {data.results.longestStreak}{" "}
                    <span className="result-stat-unit">วัน</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      }
    />
  );
}
