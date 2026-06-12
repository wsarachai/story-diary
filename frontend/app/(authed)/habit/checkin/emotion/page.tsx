"use client";
import { Annoyed, Check, ChevronLeft, Frown, Laugh, LoaderCircle, Meh, Smile } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import { DateShort } from "@/components/DateBadge";
import PageSpinner from "@/components/PageSpinner";
import { useSaveMoodCheckinMutation, useGetTodayHabitsQuery, useGetMoodCheckinQuery } from "@/store/habitsApi";
import type { MoodLevel } from "@/types/habit";
import styles from "../HabitCheckin.module.css";

interface MoodOption {
  level: MoodLevel;
  Face: typeof Smile;
  label: string;
  sliderDefault: number;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { level: "very-bad", Face: Frown, label: "แย่มาก", sliderDefault: -80, color: "#d63a3a" },
  { level: "bad", Face: Annoyed, label: "แย่", sliderDefault: -40, color: "#e8a000" },
  { level: "neutral", Face: Meh, label: "เฉยๆ", sliderDefault: 0, color: "#888" },
  { level: "good", Face: Smile, label: "ดี", sliderDefault: 40, color: "#2a9d8f" },
  { level: "very-good", Face: Laugh, label: "ดีมาก", sliderDefault: 80, color: "#3aab3a" },
];

function EmotionCheckinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saveMood, { isLoading: saving }] = useSaveMoodCheckinMutation();

  const occId = searchParams.get("occ") ?? "";
  const activityId = searchParams.get("actId") ?? "";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayData } = useGetTodayHabitsQuery(today);
  const activity = todayData?.activities[activityId];

  const [draftMood, setDraftMood] = useState<MoodLevel | null>(null);
  const [draftSliderValue, setDraftSliderValue] = useState<number | null>(null);
  const { data: existingCheckin, isLoading: checkinLoading } = useGetMoodCheckinQuery(occId, { skip: !occId });

  const mood = draftMood ?? existingCheckin?.mood ?? "neutral";
  const sliderValue = draftSliderValue ?? existingCheckin?.sliderValue ?? 0;

  useEffect(() => {
    if (!occId) router.replace("/habit/checklist");
  }, [occId, router]);

  if (!occId) return null;

  function selectMood(option: MoodOption) {
    setDraftMood(option.level);
    setDraftSliderValue(option.sliderDefault);
  }

  async function handleSave() {
    if (saving) return;
    try {
      await saveMood({ occurrenceId: occId, activityId, mood, sliderValue, date: today }).unwrap();
      router.replace("/habit/checklist");
    } catch { /* ignore */ }
  }

  const currentOption = MOOD_OPTIONS.find(o => o.level === mood);

  const leftPage = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }} aria-label="ข้อมูลอารมณ์">
      <div className={styles.ciPageHeader}>
        <button className={styles.ciBtn} aria-label="กลับ" onClick={() => router.push("/habit/checklist")}>
          <ChevronLeft />
        </button>
        <h2 className={styles.ciTitle}>บันทึกอารมณ์</h2>
      </div>

      <div className={styles.ciIdentity}>
        <div className={`${styles.ciIcon} ${styles.ciIconEmotion}`} aria-hidden="true">
          <Smile />
        </div>
        <span className={`${styles.ciNamePill} ${styles.ciNamePillEmotion}`}>
          {activity?.name ?? "จัดการอารมณ์"}
        </span>
      </div>

      {currentOption && (
        <div style={{ textAlign: "center", padding: "0.6em 0" }}>
          <div style={{ lineHeight: 1 }}>
            <currentOption.Face size="3em" color={currentOption.color} aria-hidden="true" />
          </div>
          <div style={{ fontSize: "1.4em", fontWeight: 700, color: currentOption.color, marginTop: "0.25em" }}>
            {currentOption.label}
          </div>
        </div>
      )}

      <DateShort />
      {checkinLoading
        ? <PageSpinner variant="small" label="กำลังโหลดข้อมูล…" />
        : <p className={styles.ciHint}>เลือกระดับอารมณ์ที่ตรงกับความรู้สึกของคุณในวันนี้</p>
      }
    </div>
  );

  const rightPage = (
    <div style={{ padding: "1.2rem 1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }} aria-label="เลือกระดับอารมณ์">
      <div className={styles.ciSectionHeader}>
        <h3 className={styles.ciSectionLabel}>
          <Smile style={{ stroke: "#ee8a4a" }} />
          อารมณ์วันนี้
        </h3>
        <button
          className={`${styles.ciBtn} ${styles.ciBtnSave}`}
          aria-label="บันทึก"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? <LoaderCircle style={{ animation: "spin 0.9s linear infinite" }} />
            : <Check />
          }
        </button>
      </div>

      <div className={styles.ciMoodRow} role="group" aria-label="เลือกอารมณ์">
        {MOOD_OPTIONS.map(option => (
          <button
            key={option.level}
            className={`${styles.ciMoodBtn} ${mood === option.level ? styles.isSelected : ""}`}
            aria-label={option.label}
            aria-pressed={mood === option.level}
            onClick={() => selectMood(option)}
          >
            <span className={styles.ciMoodEmoji} aria-hidden="true">
              <option.Face color={option.color} />
            </span>
            <span className={styles.ciMoodLabel} style={{ fontSize: "1.2em" }}>{option.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.ciMoodSliderWrap}>
        <div className={styles.ciMoodSliderLabels} style={{ fontSize: "1.4em" }}>
          <span>แย่มาก −</span>
          <span>+ ดีมาก</span>
        </div>
        <input
          type="range"
          className={styles.ciMoodSlider}
          min={-100}
          max={100}
          step={5}
          value={sliderValue}
          aria-label="ระดับอารมณ์"
          onChange={e => {
            const v = Number(e.target.value);
            setDraftSliderValue(v);
            if (v <= -60) setDraftMood("very-bad");
            else if (v <= -20) setDraftMood("bad");
            else if (v <= 20) setDraftMood("neutral");
            else if (v <= 60) setDraftMood("good");
            else setDraftMood("very-good");
          }}
        />
        <div
          className={styles.ciMoodValueLabel}
          style={{ color: currentOption?.color ?? "#666", fontSize: "1.4em" }}
        >
          {sliderValue > 0 ? `+${sliderValue}` : `${sliderValue}`}
        </div>
      </div>
    </div>
  );

  return (
    <BookShellLayout
      left={leftPage}
      right={rightPage}
      rail={<IconRail />}
      ariaLabel="Story Diary Emotion Check-in"
    />
  );
}

export default function EmotionCheckinPage() {
  return (
    <Suspense>
      <EmotionCheckinInner />
    </Suspense>
  );
}
