/**
 * Character registry for chapter scenes — single source of truth for the
 * admin scene editor's character selector and for reader-side art resolution.
 *
 * Two special cases live here as well:
 *  - The protagonist ("ตัวละครหลัก") resolves name and art from the reader's
 *    registration data at render time; nothing per-scene is stored.
 *  - "custom" is the free-form entry: an authored speaker name plus any image
 *    from the registry gallery.
 *
 * Legacy `chapter-speaker-*.png` art was removed; scenes storing those URLs
 * are remapped once by the `scene-image-remap-v1` migration in lib/db.ts.
 */
import type { Gender } from "@/types/auth";

/** Fixed speaker name shown for main-actor scenes. */
export const MAIN_ACTOR_SPEAKER_NAME = "ผู้กล้า";

/** Registration character art per chosen gender (kept at /images root). */
export const MAIN_ACTOR_IMAGE_URLS: Record<Gender, string> = {
  male: "/images/register-character-normal-466x760.png",
  female: "/images/characters/main-female-normal-593x720.png",
};

/** Figure art for main-actor scenes, falling back to the female set. */
export function mainActorImageUrl(gender: Gender | undefined): string {
  return MAIN_ACTOR_IMAGE_URLS[gender ?? "female"];
}

/** One selectable character in the admin scene editor. */
export interface CharacterPreset {
  /** Stable select value; "main" is the protagonist, "custom" is free-form. */
  key: string;
  /** Thai display label — also the auto-filled speaker name. */
  label: string;
  /** "main" needs no stored name/art; every other preset is an actor/other. */
  kind: "main" | "preset" | "custom";
  /**
   * Expression art grouped for this character (empty when the art set has not
   * been delivered yet — the picker then falls back to the whole gallery).
   */
  images: string[];
}

const MAIN_MALE_IMAGE = MAIN_ACTOR_IMAGE_URLS.male;

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { key: "main", label: "ตัวละครหลัก (ผู้กล้า)", kind: "main", images: [] },
  {
    key: "villager-a",
    label: "ชาวบ้าน A",
    kind: "preset",
    images: [
      "/images/characters/villager-a-normal-522x720.png",
      "/images/characters/villager-a-sick-522x720.png",
    ],
  },
  { key: "villager-b", label: "ชาวบ้าน B", kind: "preset", images: [] },
  {
    key: "goddess-good",
    label: "เทพี-ดี",
    kind: "preset",
    images: [
      "/images/characters/goddess-good-normal-700x720.png",
      "/images/characters/goddess-good-hurt-700x720.png",
      "/images/characters/goddess-good-confused-700x720.png",
    ],
  },
  {
    key: "goddess-evil",
    label: "เทพี-ร้าย",
    kind: "preset",
    images: ["/images/characters/goddess-evil-normal-638x720.png"],
  },
  { key: "main-male", label: "ผู้กล้า-ชาย", kind: "preset", images: [MAIN_MALE_IMAGE] },
  {
    key: "main-female",
    label: "ผู้กล้า-หญิง",
    kind: "preset",
    images: [
      "/images/characters/main-female-normal-593x720.png",
      "/images/characters/main-female-sick-593x720.png",
      "/images/characters/main-female-curious-593x720.png",
      "/images/characters/main-female-smile-593x720.png",
      "/images/characters/main-female-excited-593x720.png",
      "/images/characters/main-female-determined-593x720.png",
      "/images/characters/main-female-shocked-673x720.png",
    ],
  },
  {
    key: "wizard",
    label: "พ่อมด",
    kind: "preset",
    images: [
      "/images/characters/wizard-normal-650x720.png",
      "/images/characters/wizard-angry-650x720.png",
      "/images/characters/wizard-smirk-650x720.png",
    ],
  },
  { key: "fairy", label: "ภูติน้อย", kind: "preset", images: [] },
  {
    key: "blue-flame",
    label: "ลูกไฟสีฟ้า",
    kind: "preset",
    images: ["/images/characters/blue-flame-normal-478x720.png"],
  },
  { key: "custom", label: "ตัวละครอื่นๆ", kind: "custom", images: [] },
];

/** Every gallery image in the registry, grouped by character. */
export const CHARACTER_IMAGE_GROUPS: { label: string; images: string[] }[] = [
  ...CHARACTER_PRESETS.filter((p) => p.images.length > 0).map((p) => ({
    label: p.label,
    images: p.images,
  })),
];

export function findCharacterPreset(key: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find((p) => p.key === key);
}

/** Guess the preset backing a stored scene (used when re-opening the form). */
export function guessCharacterKey(
  speakerName: string,
  speakerImageUrl?: string,
): string {
  if (speakerImageUrl) {
    const owner = CHARACTER_PRESETS.find((p) => p.images.includes(speakerImageUrl));
    if (owner) return owner.key;
  }
  const byName = CHARACTER_PRESETS.find(
    (p) => p.kind === "preset" && p.label === speakerName,
  );
  return byName?.key ?? "custom";
}
