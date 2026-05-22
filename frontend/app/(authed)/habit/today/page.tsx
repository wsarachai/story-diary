"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetTodayHabitsQuery, useToggleOccurrenceMutation } from "@/store/habitsApi";
import IconRail from "@/components/IconRail";
import type { HabitActivity } from "@/types/habit";

function getAccent(activity: HabitActivity): string {
  if (activity.category === "medicine") return "#57a8db";
  if (activity.category === "nutrition") return "#2eb563";
  const pc = activity.physicalCategory;
  if (pc === "symptoms" || pc === "emotion-management") return "#e76f51";
  return "#ee8a4a";
}

function getSubline(activity: HabitActivity): string {
  const { schedule, mealRelation, mealSlots } = activity;
  if (activity.category === "medicine" && mealRelation && mealSlots && mealSlots.length > 0) {
    const relation = mealRelation === "after" ? "หลัง" : "ก่อน";
    const slots = mealSlots.map(s => {
      if (s === "breakfast") return "อาหารเช้า";
      if (s === "lunch") return "อาหารกลางวัน";
      if (s === "dinner") return "อาหารเย็น";
      return "ก่อนนอน";
    }).join("-");
    return `${relation}${slots}`;
  }
  if (schedule.frequency === "daily") return "ทุกวัน";
  return "ทั่วไป";
}

function getCategoryClass(accent: string): string {
  if (accent === "#57a8db") return "entry-med";
  if (accent === "#2eb563") return "entry-food";
  if (accent === "#e76f51") return "entry-mood";
  return "entry-body";
}

function CategoryIcon({ accent }: { accent: string }) {
  if (accent === "#57a8db") {
    return (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#57a8db" strokeWidth="2">
        <path d="M9 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="1" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="12" y1="9" x2="12" y2="15"/>
      </svg>
    );
  }
  if (accent === "#2eb563") {
    return (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#2eb563" strokeWidth="2">
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
    <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#ee8a4a" strokeWidth="2">
      <circle cx="12" cy="5" r="2"/>
      <path d="M6 11h12M12 7v4M9 21l3-7 3 7"/>
    </svg>
  );
}

export default function HabitTodayPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split("T")[0];
  const { data, isLoading } = useGetTodayHabitsQuery(todayStr);
  const [toggle] = useToggleOccurrenceMutation();

  const entries = data ? Object.values(data.activities).map(activity => ({
    activity,
    occurrence: data.todayByActivity[activity.id],
    subline: getSubline(activity),
    accent: getAccent(activity)
  })) : [];

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
            {isLoading && (
              <div style={{ display: "grid", placeItems: "center", height: "12rem" }}>
                <div className="chapter-spinner" />
              </div>
            )}
            {!isLoading && entries.map((entry) => (
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
                    toggle({
                      occurrenceId: entry.occurrence.id,
                      activityId: entry.activity.id,
                      status: entry.occurrence.status === "done" ? "pending" : "done",
                      date: todayStr
                    });
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
