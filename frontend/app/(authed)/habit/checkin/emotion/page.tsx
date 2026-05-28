"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useSaveMoodCheckinMutation, useGetTodayHabitsQuery } from "@/store/habitsApi";
import type { MoodLevel } from "@/types/habit";

interface MoodOption {
  level: MoodLevel;
  emoji: string;
  label: string;
  sliderDefault: number;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { level: "very-bad",  emoji: "😢", label: "แย่มาก",  sliderDefault: -80, color: "#d63a3a" },
  { level: "bad",       emoji: "😟", label: "แย่",      sliderDefault: -40, color: "#e8a000" },
  { level: "neutral",   emoji: "😐", label: "เฉยๆ",    sliderDefault:   0, color: "#888"    },
  { level: "good",      emoji: "😊", label: "ดี",       sliderDefault:  40, color: "#2a9d8f" },
  { level: "very-good", emoji: "😄", label: "ดีมาก",   sliderDefault:  80, color: "#3aab3a" },
];

function EmotionCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveMood, { isLoading: saving }] = useSaveMoodCheckinMutation();

  const occId      = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [mood, setMood]               = useState<MoodLevel>("neutral");
  const [sliderValue, setSliderValue] = useState(0);

  if (!occId) { router.replace("/habit/today"); return null; }

  function selectMood(option: MoodOption) {
    setMood(option.level);
    setSliderValue(option.sliderDefault);
  }

  async function handleSave() {
    if (saving) return;
    try {
      await saveMood({ occurrenceId: occId, mood, sliderValue, date: today }).unwrap();
      router.replace("/habit/today");
    } catch { /* ignore */ }
  }

  const currentOption = MOOD_OPTIONS.find(o => o.level === mood);

  return (
    <main className="screen" aria-label="Story Diary Emotion Check-in">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>

        {/* ── Left page: activity identity ── */}
        <section
          className="page page-left page-seam-right"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "1.1rem", overflow: "hidden" }}
          aria-label="ข้อมูลอารมณ์"
        >
          <div className="ci-page-header">
            <button className="ci-btn" aria-label="กลับ" onClick={() => router.push("/habit/today")}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="ci-title">บันทึกอารมณ์</h2>
          </div>

          <div className="ci-identity">
            <div className="ci-icon ci-icon--emotion" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <span className="ci-name-pill ci-name-pill--emotion">
              {activity?.name ?? "จัดการอารมณ์"}
            </span>
          </div>

          {/* Current mood preview */}
          {currentOption && (
            <div style={{ textAlign: "center", padding: "0.6em 0" }}>
              <div style={{ fontSize: "3em", lineHeight: 1 }}>{currentOption.emoji}</div>
              <div style={{ fontSize: "0.82em", fontWeight: 700, color: currentOption.color, marginTop: "0.25em" }}>
                {currentOption.label}
              </div>
            </div>
          )}

          <p className="ci-hint">เลือกระดับอารมณ์ที่ตรงกับความรู้สึกของคุณในวันนี้</p>
        </section>

        {/* ── Right page: mood picker ── */}
        <section
          className="page"
          style={{ padding: "5% 6%", display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden" }}
          aria-label="เลือกระดับอารมณ์"
        >
          <div className="ci-section-header">
            <h3 className="ci-section-label" style={{ "--icon-color": "#ee8a4a" } as React.CSSProperties}>
              <svg viewBox="0 0 24 24" style={{ stroke: "#ee8a4a" }}>
                <circle cx="12" cy="12" r="9"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              อารมณ์วันนี้
            </h3>
            <button
              className="ci-btn ci-btn--save"
              aria-label="บันทึก"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <svg viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite" }}><circle cx="12" cy="12" r="9" strokeDasharray="20 40" fill="none"/></svg>
                : <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              }
            </button>
          </div>

          {/* Mood buttons */}
          <div className="ci-mood-row" role="group" aria-label="เลือกอารมณ์">
            {MOOD_OPTIONS.map(option => (
              <button
                key={option.level}
                className={`ci-mood-btn${mood === option.level ? " is-selected" : ""}`}
                aria-label={option.label}
                aria-pressed={mood === option.level}
                onClick={() => selectMood(option)}
              >
                <span className="ci-mood-emoji" aria-hidden="true">{option.emoji}</span>
                <span className="ci-mood-label">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="ci-mood-slider-wrap">
            <div className="ci-mood-slider-labels">
              <span>แย่มาก −</span>
              <span>+ ดีมาก</span>
            </div>
            <input
              type="range"
              className="ci-mood-slider"
              min={-100}
              max={100}
              step={5}
              value={sliderValue}
              aria-label="ระดับอารมณ์"
              onChange={e => {
                const v = Number(e.target.value);
                setSliderValue(v);
                // snap mood level from slider position
                if (v <= -60) setMood("very-bad");
                else if (v <= -20) setMood("bad");
                else if (v <= 20) setMood("neutral");
                else if (v <= 60) setMood("good");
                else setMood("very-good");
              }}
            />
            <div
              className="ci-mood-value-label"
              style={{ color: currentOption?.color ?? "#666" }}
            >
              {sliderValue > 0 ? `+${sliderValue}` : `${sliderValue}`}
            </div>
          </div>
        </section>

        <IconRail />
      </section>
    </main>
  );
}

export default function EmotionCheckinPage() {
  return (
    <Suspense>
      <EmotionCheckinInner />
    </Suspense>
  );
}
