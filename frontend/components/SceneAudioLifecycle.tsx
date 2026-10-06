"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sceneAudio } from "@/lib/audio/sceneAudio";

/** `/chapters/<id>/explain/<scene>` — the only routes that play story audio. */
const SCENE_ROUTE = /^\/chapters\/[^/]+\/explain\/[^/]+\/?$/;

/**
 * Fades the music out whenever the reader is not on a scene route (e.g. back
 * on the chapter intro) and when they leave the chapter entirely.
 */
export default function SceneAudioLifecycle() {
  const pathname = usePathname();

  useEffect(() => {
    if (!SCENE_ROUTE.test(pathname ?? "")) sceneAudio.stopMusic();
  }, [pathname]);

  useEffect(() => () => sceneAudio.stopMusic(), []);

  return null;
}
