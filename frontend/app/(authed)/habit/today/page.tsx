"use client";

import { useState } from "react";
import Link from "next/link";
import { useGetTodayHabitsQuery } from "@/store/habitsApi";
import { useGetMeQuery } from "@/store/authApi";
import IconRail from "@/components/IconRail";
import { DateFull } from "@/components/DateBadge";
import { localDateStr } from "@/lib/utils/date";
import styles from "../habit.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import PageSpinner from "@/components/PageSpinner";
import { TrackerError, TrackerEmpty } from "../TrackerStates";
import HabitTrackerHeader from "@/components/HabitTrackerHeader";

export default function HabitTodayPage() {
  const { data: me } = useGetMeQuery();
  const todayStr = localDateStr(me?.timezone);
  const { data, isLoading, isError, refetch } =
    useGetTodayHabitsQuery(todayStr);

  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const occurrences = data ? Object.values(data.todayByActivity) : [];
  const done = occurrences.filter((o) => o.status === "done").length;
  const partial = occurrences.filter((o) => o.status === "partial").length;
  const skipped = occurrences.filter((o) => o.status === "skipped").length;
  const pending = occurrences.filter((o) => o.status === "pending").length;
  const total = occurrences.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Donut chart calculations
  const C = 2 * Math.PI * 40; // ~251.327
  let accumulatedPercent = 0;

  const chartSegments = [
    { key: "done", value: done, color: "#08c65a" },
    { key: "partial", value: partial, color: "#7ed957" },
    { key: "skipped", value: skipped, color: "#f4a261" },
    { key: "pending", value: pending, color: "#59d6dc" },
  ].map((s) => {
    const percent = total > 0 ? (s.value / total) * 100 : 0;
    const strokeDashoffset = C - (percent / 100) * C;
    const rotation = -90 + (accumulatedPercent / 100) * 360;
    accumulatedPercent += percent;
    return {
      ...s,
      percent,
      strokeDashoffset,
      rotation,
    };
  });

  const isHoveredActive = hoveredStatus !== null;

  const left = (
    <HabitTrackerHeader
      containerLabel="สรุปกิจกรรมวันนี้"
      title="สรุปเช็กอินวันนี้"
      date={<DateFull className={styles.dateLabel} />}
      activeTab="summary"
      addHref="/habit/add?from=/habit/today"
      addLabel="เพิ่มกิจกรรม"
    >
      {isLoading ? (
        <PageSpinner variant="inline" height="12rem" label="กำลังโหลด…" />
      ) : isError ? (
        <TrackerError onRetry={refetch} />
      ) : total === 0 ? (
        <TrackerEmpty addFrom="/habit/today" />
      ) : (
        <div className={styles.dailySummaryContent}>
          <div className={styles.dailySummaryLayout}>
            {/* Donut Chart (Left Side) */}
            <div className={styles.dailySummaryChartSide}>
              <div className={styles.donutChartContainer}>
                <svg viewBox="0 0 100 100" className={styles.donutChartSvg}>
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e9f7f8"
                    strokeWidth="10"
                  />
                  {chartSegments.map((seg) => {
                    if (seg.value === 0) return null;
                    const isDimmed = isHoveredActive && seg.key !== hoveredStatus;
                    const isHighlighted = isHoveredActive && seg.key === hoveredStatus;

                    return (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray={C}
                        strokeDashoffset={seg.strokeDashoffset}
                        transform={`rotate(${seg.rotation} 50 50)`}
                        className={`${styles.donutSegment} ${
                          isDimmed ? styles.dimmed : ""
                        } ${isHighlighted ? styles.highlighted : ""}`}
                        onMouseEnter={() => setHoveredStatus(seg.key)}
                        onMouseLeave={() => setHoveredStatus(null)}
                      />
                    );
                  })}
                </svg>
                {/* Center text showing percentage */}
                <div className={styles.donutCenterText}>
                  <span className={styles.donutPct}>{pct}%</span>
                  <span className={styles.donutLabel}>ความสำเร็จ</span>
                </div>
              </div>
            </div>

            {/* Detailed Cards and Progress (Right Side) */}
            <div className={styles.dailySummaryDataSide}>
              {/* Count cards */}
              <div className={styles.dailySummaryCards}>
                {[
                  { key: "done", count: done, label: "ทำเสร็จ", cardStyle: styles.dailySummaryCardDone },
                  { key: "partial", count: partial, label: "กำลังทำ", cardStyle: styles.dailySummaryCardPartial },
                  { key: "skipped", count: skipped, label: "ข้ามไป", cardStyle: styles.dailySummaryCardSkip },
                  { key: "pending", count: pending, label: "ยังไม่ทำ", cardStyle: styles.dailySummaryCardPend },
                ].map((card) => {
                  const isDimmed = isHoveredActive && card.key !== hoveredStatus;
                  const isHighlighted = isHoveredActive && card.key === hoveredStatus;

                  return (
                    <div
                      key={card.key}
                      className={`${styles.dailySummaryCard} ${card.cardStyle} ${
                        isDimmed ? styles.dimmed : ""
                      } ${isHighlighted ? styles.highlighted : ""}`}
                      onMouseEnter={() => setHoveredStatus(card.key)}
                      onMouseLeave={() => setHoveredStatus(null)}
                    >
                      <span className={styles.dailySummaryBadge}>{card.count}</span>
                      <h3>{card.label}</h3>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className={styles.dailyProgressWrap}>
                <div className={styles.dailyProgressMeta}>
                  <span>ความคืบหน้าวันนี้</span>
                  <span>
                    {done} / {total} ({pct}%)
                  </span>
                </div>
                <div
                  className={styles.dailyProgressBar}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={styles.dailyProgressFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <Link href="/habit/checklist" className={styles.dailyCTA}>
                ไปเช็กอิน
              </Link>
            </div>
          </div>
        </div>
      )}
    </HabitTrackerHeader>
  );

  return <BookShellLayout tight rail={<IconRail />} mergedOnly merged={left} />;
}

