"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styles from "@/app/(authed)/habit/habit.module.css";

export type HabitTrackerTab = "list" | "summary" | "weekly" | "monthly";

interface HabitTrackerHeaderProps {
  title: string;
  date: ReactNode;
  activeTab: HabitTrackerTab;
  addHref: string;
  addLabel: string;
  containerLabel: string;
  children?: ReactNode;
}

const TAB_LABELS: Record<HabitTrackerTab, string> = {
  list: "รายการเช็กอิน",
  summary: "รายวัน",
  weekly: "รายสัปดาห์",
  monthly: "รายเดือน",
};

const TAB_HREFS: Record<Exclude<HabitTrackerTab, "summary">, string> = {
  list: "/habit/checklist",
  weekly: "/habit/weekly",
  monthly: "/habit/monthly",
};

export default function HabitTrackerHeader({
  title,
  date,
  activeTab,
  addHref,
  addLabel,
  containerLabel,
  children,
}: HabitTrackerHeaderProps) {
  return (
    <div className={styles.habitTrackerContainer} aria-label={containerLabel}>
      <div className={styles.habitTrackerHeader}>
        <div>
          <h1 className={styles.trackerSectionTitle}>{title}</h1>
          {date}
        </div>
        <Link href={addHref} className={styles.addBtn} aria-label={addLabel}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      <div className={styles.trackerTabRow}>
        {Object.entries(TAB_LABELS).map(([tab, label]) => {
          const key = tab as HabitTrackerTab;
          if (key === activeTab) {
            return (
              <span
                key={key}
                className={`${styles.trackerTab} ${styles.isActive}`}
                aria-current="page"
              >
                {label}
              </span>
            );
          }

          if (key === "summary") {
            return (
              <Link key={key} href="/habit/today" className={styles.trackerTab}>
                {label}
              </Link>
            );
          }

          return (
            <Link key={key} href={TAB_HREFS[key]} className={styles.trackerTab}>
              {label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
