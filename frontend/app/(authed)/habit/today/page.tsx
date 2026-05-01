"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchToday,
  toggleOccurrence,
  selectTodayEntries,
  selectFetchStatus,
} from "@/store/habitsSlice";
import IconRail from "@/components/IconRail";

function getCategoryClass(accent: string): string {
  if (accent === "#9b5de5") return "entry-med";
  if (accent === "#f4a261") return "entry-food";
  if (accent === "#e76f51") return "entry-mood";
  return "entry-body";
}

function CategoryIcon({ accent }: { accent: string }) {
  if (accent === "#9b5de5") {
    return (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#9b5de5" strokeWidth="2">
        <path d="M9 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="1" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="12" y1="9" x2="12" y2="15"/>
      </svg>
    );
  }
  if (accent === "#f4a261") {
    return (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#f4a261" strokeWidth="2">
        <path d="M3 2v7c0 1.66 1.34 3 3 3h1v9a1 1 0 0 0 2 0V5"/>
        <path d="M18 2v20M15 2v6a3 3 0 0 0 6 0V2"/>
      </svg>
    );
  }
  if (accent === "#e76f51") {
    return (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#e76f51" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#2a9d8f" strokeWidth="2">
      <circle cx="12" cy="5" r="2"/>
      <path d="M6 11h12M12 7v4M9 21l3-7 3 7"/>
    </svg>
  );
}

export default function HabitTodayPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectTodayEntries);
  const { today: status } = useAppSelector(selectFetchStatus);

  useEffect(() => {
    if (status === "idle") dispatch(fetchToday());
  }, [dispatch, status]);

  function handleEntryTap(activity: { id: string; category: string }, occurrenceId: string) {
    if (activity.category === "medicine") {
      router.push(`/habit/checkin/medicine?occ=${occurrenceId}&actId=${activity.id}`);
    } else if (activity.category === "nutrition") {
      router.push(`/habit/checkin/nutrition?occ=${occurrenceId}&actId=${activity.id}`);
    }
  }

  return (
    <main className="screen" aria-label="Story Diary Habit Daily Today">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section
          className="page page-right"
          style={{ padding: "7% 6% 6% 7%", display: "grid", gridTemplateRows: "auto 1fr", gap: "2rem", gridColumn: "1 / 3", overflow: "hidden" }}
          aria-label="รายการกิจกรรมวันนี้"
        >
          <header className="today-header">
            <h1 className="today-header-title">กิจกรรมวันนี้</h1>
            <Link href="/habit/add" className="add-btn" aria-label="เพิ่มกิจกรรม">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
          </header>

          <div className="habit-entries">
            {status === "loading" && (
              <div style={{ display: "grid", placeItems: "center", height: "12rem" }}>
                <div className="chapter-spinner" />
              </div>
            )}
            {status !== "loading" && entries.map((entry) => (
              <div
                key={entry.activity.id}
                className={`habit-entry ${getCategoryClass(entry.accent)}`}
                role="article"
                aria-label={entry.activity.name}
                onClick={() => handleEntryTap(entry.activity, entry.occurrence.id)}
                style={{ cursor: (entry.activity.category === "medicine" || entry.activity.category === "nutrition") ? "pointer" : "default" }}
              >
                <div className="habit-entry-icon">
                  <CategoryIcon accent={entry.accent} />
                </div>
                <div className="habit-entry-body">
                  <p className="habit-entry-name">{entry.activity.name}</p>
                  <p className="habit-entry-sub">{entry.subline}</p>
                </div>
                <button
                  className={`habit-check${entry.occurrence.status === "done" ? " done" : ""}`}
                  aria-label={entry.occurrence.status === "done" ? "ทำเสร็จแล้ว" : "ยังไม่ทำ"}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(toggleOccurrence({ occurrenceId: entry.occurrence.id, activityId: entry.activity.id }));
                  }}
                >
                  {entry.occurrence.status === "done" && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        <IconRail />
      </section>
    </main>
  );
}
