/**
 * Chapter sound registry — background music loops and one-shot effects the
 * admin chapter/scene editors offer. Files live in public/sounds and are
 * synthesized by scripts/synth-sounds.py (deterministic; re-run it to tweak
 * or regenerate). Real recordings can replace a file in place, or be added
 * here as new entries.
 */

export interface SoundAsset {
  url: string;
  /** Thai label for pickers and scene cards. */
  label: string;
}

const bgm = (slug: string, label: string): SoundAsset => ({ url: `/sounds/bgm/${slug}.mp3`, label });
const sfx = (slug: string, label: string): SoundAsset => ({ url: `/sounds/sfx/${slug}.mp3`, label });

/** Seamless loops (32–40 s). */
export const BGM_TRACKS: readonly SoundAsset[] = [
  bgm("village-calm", "หมู่บ้านอบอุ่น"),
  bgm("mist-mystery", "หมอกลึกลับ"),
  bgm("castle-tension", "ปราสาทตึงเครียด"),
  bgm("forest-ambience", "ลมในป่า"),
];

/** One-shot effects (≈2 s). */
export const SOUND_EFFECTS: readonly SoundAsset[] = [
  sfx("magic-sparkle", "เวทมนตร์วิบวับ"),
  sfx("wind-whoosh", "ลมพัดวูบ"),
  sfx("heartbeat", "เสียงหัวใจเต้น"),
  sfx("chime", "เสียงระฆังใส"),
  sfx("rumble", "เสียงครืนต่ำ"),
  sfx("torch-crackle", "คบเพลิงปะทุ"),
  sfx("footsteps", "เสียงฝีเท้า"),
];

/**
 * Stored on a scene to mean "no music here" — distinct from an empty/absent
 * value, which means "use the chapter's music".
 */
export const SCENE_MUSIC_SILENCE = "none";

export function findBgmTrack(url: string | undefined): SoundAsset | undefined {
  return url ? BGM_TRACKS.find((s) => s.url === url) : undefined;
}

export function findSoundEffect(url: string | undefined): SoundAsset | undefined {
  return url ? SOUND_EFFECTS.find((s) => s.url === url) : undefined;
}

/**
 * Music that should play for a scene: the scene's own track, nothing when the
 * scene is set to silence, otherwise the chapter's track (or nothing).
 */
export function resolveSceneMusic(
  sceneMusicUrl: string | undefined,
  chapterMusicUrl: string | undefined,
): string | null {
  if (sceneMusicUrl === SCENE_MUSIC_SILENCE) return null;
  return sceneMusicUrl || chapterMusicUrl || null;
}
