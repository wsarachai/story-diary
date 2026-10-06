"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TYPEWRITER_SPEED_MS, typewriterStops } from "@/lib/typewriter";

/**
 * Self-contained typewriter for a single scene.
 * Remounted via `key={sceneIndex}` so state resets automatically on scene change.
 */
export default function TypewriterScene({
  fullText,
  onTypingDone,
}: {
  fullText: string;
  onTypingDone: () => void;
}) {
  // Reveal by grapheme cluster so Thai marks appear with their consonant.
  const stops = useMemo(() => typewriterStops(fullText), [fullText]);
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingDone = step >= stops.length;
  const visibleCount = step === 0 ? 0 : stops[Math.min(step, stops.length) - 1];

  useEffect(() => {
    if (isTypingDone) {
      onTypingDone();
      return;
    }
    timerRef.current = setTimeout(() => {
      setStep((n) => Math.min(n + 1, stops.length));
    }, TYPEWRITER_SPEED_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // onTypingDone is stable (defined inline at callsite) — exclude to avoid re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isTypingDone, stops]);

  const visible = fullText.slice(0, visibleCount);
  const hidden = fullText.slice(visibleCount);
  const visibleLines = visible.split("\n");
  const hiddenLines = hidden.split("\n");

  return (
    <>
      {visibleLines.map((line, i) => (
        <span key={`v${i}`}>
          {line}
          {i === visibleLines.length - 1 ? (
            <span style={{ visibility: "hidden" }}>{hiddenLines[0]}</span>
          ) : (
            <br />
          )}
        </span>
      ))}
      {hiddenLines.slice(1).map((line, i) => (
        <span key={`h${i}`} style={{ visibility: "hidden" }}>
          {line}
          {i < hiddenLines.length - 2 && <br />}
        </span>
      ))}
    </>
  );
}
