"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music, Pause, Play, Volume2 } from "lucide-react";
import styles from "@/components/Admin.module.css";

export interface SoundOption {
  /** Stored value ("" for the default/none choice). */
  value: string;
  label: string;
  /** Audio to audition; omitted for "none"/"inherit"/"silence" rows. */
  previewUrl?: string;
}

/** Auditions stop after this long so long loops don't drone on. */
const PREVIEW_SECONDS = 10;

/**
 * Collapsible sound selector for the chapter/scene editors: a one-line
 * summary that expands into a list of options, each auditionable with ▶.
 * Only one preview plays at a time, and it stops when the field collapses
 * or unmounts.
 */
export default function AdminSoundField({
  label,
  kind,
  value,
  options,
  onChange,
}: {
  label: string;
  kind: "music" | "effect";
  value: string;
  options: SoundOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<number | null>(null);

  function stopPreview() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (stopTimer.current !== null) window.clearTimeout(stopTimer.current);
    stopTimer.current = null;
    setPlaying(null);
  }

  function togglePreview(url: string) {
    if (playing === url) {
      stopPreview();
      return;
    }
    stopPreview();
    const el = new Audio(url);
    el.volume = kind === "music" ? 0.5 : 0.9;
    el.addEventListener("ended", () => setPlaying((p) => (p === url ? null : p)));
    audioRef.current = el;
    setPlaying(url);
    void el.play().catch(() => setPlaying(null));
    stopTimer.current = window.setTimeout(stopPreview, PREVIEW_SECONDS * 1000);
  }

  useEffect(() => () => stopPreview(), []);

  const selected = options.find((o) => o.value === value);
  const Icon = kind === "music" ? Music : Volume2;

  return (
    <div className={`${styles.adminFormField} ${styles.full}`}>
      <span className={styles.adminLabel}>{label}</span>
      <button
        type="button"
        className={styles.sceneBgSummary}
        aria-expanded={open}
        onClick={() => {
          if (open) stopPreview();
          setOpen((v) => !v);
        }}
      >
        <span className={styles.soundSummaryIcon}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className={styles.sceneBgSummaryText}>{selected?.label ?? value ?? "—"}</span>
        <span className={styles.sceneBgSummaryAction}>
          {open ? "ซ่อน" : "เปลี่ยน"}
          {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </span>
      </button>
      {open && (
        <ul className={styles.soundOptionList} role="radiogroup" aria-label={label}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const isPlaying = opt.previewUrl !== undefined && playing === opt.previewUrl;
            return (
              <li key={opt.value || "__default"} className={`${styles.soundOption} ${isSelected ? styles.soundOptionSelected : ""}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={styles.soundOptionPick}
                  onClick={() => onChange(opt.value)}
                >
                  <span className={styles.soundOptionDot} aria-hidden="true" />
                  {opt.label}
                </button>
                {opt.previewUrl && (
                  <button
                    type="button"
                    className={styles.sceneIconBtn}
                    title={isPlaying ? "หยุดฟัง" : "ฟังตัวอย่าง"}
                    aria-label={`${isPlaying ? "หยุดฟัง" : "ฟังตัวอย่าง"} ${opt.label}`}
                    onClick={() => togglePreview(opt.previewUrl!)}
                  >
                    {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
