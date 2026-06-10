"use client";

import { useGetMonthlySummaryQuery } from "@/store/habitsApi";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import PageSpinner from "@/components/PageSpinner";
import styles from "../habit.module.css";

function ringDashOffset(percent: number): number {
  const circumference = 157;
  return circumference - (percent / 100) * circumference;
}

export default function HabitSummaryPage() {
  const month = new Date().toISOString().slice(0, 7);
  const { data, isLoading: loading } = useGetMonthlySummaryQuery(month);

  const left = (
    <div className={styles.summaryLeft} aria-label="เป้าหมายประจำเดือน">
      <h1 className={styles.trackerSectionTitle}>เป้าหมายเดือนนี้</h1>
      <div className={styles.sectionRule} aria-hidden="true" />

      <div className={styles.goalsList}>
        {loading && (
          <PageSpinner
            variant="inline"
            height="12rem"
            label="กำลังโหลดเป้าหมาย…"
          />
        )}
        {!loading &&
          (data?.goals ?? []).map((goal) => (
            <div key={goal.activityId} className={styles.goalCard}>
              <div>
                <p className={styles.goalCardName}>{goal.name}</p>
                <p className={styles.goalCardSub}>{goal.subline}</p>
              </div>
              <svg
                className={styles.goalProgressRing}
                viewBox="0 0 60 60"
                aria-label={`${goal.progressPercent}%`}
              >
                <circle className={styles.ringBg} cx="30" cy="30" r="25" />
                <circle
                  className={styles.ringFill}
                  cx="30"
                  cy="30"
                  r="25"
                  transform="rotate(-90 30 30)"
                  style={{
                    strokeDashoffset: ringDashOffset(goal.progressPercent),
                  }}
                />
                <text className={styles.ringLabel} x="30" y="31">
                  {goal.progressPercent}%
                </text>
              </svg>
            </div>
          ))}
      </div>
    </div>
  );

  const right = (
    <div className={styles.summaryRight} aria-label="ผลลัพธ์ประจำเดือน">
      <h2 className={styles.resultsTitle}>ผลลัพธ์เดือนนี้</h2>

      <div className={styles.resultsGrid}>
        {loading && (
          <div className={styles.summaryLoading}>
            <PageSpinner
              variant="inline"
              height="12rem"
              label="กำลังโหลดผลลัพธ์…"
            />
          </div>
        )}
        {!loading && data && (
          <>
            <div className={`${styles.resultStat} ${styles.highlight}`}>
              <p className={styles.resultStatLabel}>ทำได้ทั้งหมด</p>
              <p className={styles.resultStatValue}>
                {data.results.totalDone}{" "}
                <span className={styles.resultStatUnit}>ครั้ง</span>
              </p>
              <div className={styles.resultBarWrap}>
                <div
                  className={styles.resultBar}
                  style={{ width: `${data.results.completionPercent}%` }}
                />
              </div>
            </div>
            <div className={styles.resultStat}>
              <p className={styles.resultStatLabel}>เป้าหมาย</p>
              <p className={styles.resultStatValue}>
                {data.results.target}{" "}
                <span className={styles.resultStatUnit}>ครั้ง</span>
              </p>
            </div>
            <div className={styles.resultStat}>
              <p className={styles.resultStatLabel}>ข้ามไป</p>
              <p className={styles.resultStatValue}>
                {data.results.skipped}{" "}
                <span className={styles.resultStatUnit}>ครั้ง</span>
              </p>
            </div>
            <div className={styles.resultStat}>
              <p className={styles.resultStatLabel}>วันที่ทำครบ</p>
              <p className={styles.resultStatValue}>
                {data.results.fullDays}{" "}
                <span className={styles.resultStatUnit}>วัน</span>
              </p>
            </div>
            <div className={styles.resultStat}>
              <p className={styles.resultStatLabel}>สตรีกสูงสุด</p>
              <p className={styles.resultStatValue}>
                {data.results.longestStreak}{" "}
                <span className={styles.resultStatUnit}>วัน</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <BookShellLayout tight rail={<IconRail />} left={left} right={right} />
  );
}
