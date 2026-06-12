"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
  summary: "สรุปผลรายวัน",
  weekly: "สรุปผลรายสัปดาห์",
  monthly: "สรุปผลรายเดือน",
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
          <Plus color="#fff" strokeWidth={3} />
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
