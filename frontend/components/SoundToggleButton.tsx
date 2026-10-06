"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sceneAudio } from "@/lib/audio/sceneAudio";

/**
 * Story sound on/off. The choice is remembered on this device. When the
 * browser has blocked autoplay, it shows the muted icon with a hint — any tap
 * (including this button) starts the audio.
 */
export default function SoundToggleButton({
  className,
  iconClassName,
  labelClassName,
}: {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}) {
  const { muted, blocked } = useSyncExternalStore(
    sceneAudio.subscribe,
    sceneAudio.getState,
    sceneAudio.getServerState,
  );
  const silent = muted || blocked;
  const label = blocked && !muted ? "แตะเพื่อเปิดเสียง" : muted ? "เปิดเสียง" : "ปิดเสียง";

  return (
    <button
      type="button"
      className={className}
      aria-pressed={muted}
      aria-label={label}
      title={label}
      onClick={() => {
        // A blocked-but-unmuted tap only needs the gesture (handled globally).
        if (blocked && !muted) return;
        sceneAudio.toggleMuted();
      }}
    >
      {blocked && !muted && <span className={labelClassName}>แตะเพื่อเปิดเสียง</span>}
      <span className={iconClassName} aria-hidden="true">
        {silent ? <VolumeX /> : <Volume2 />}
      </span>
    </button>
  );
}
