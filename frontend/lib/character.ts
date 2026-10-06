/**
 * Character registry for chapter scenes — single source of truth for the
 * admin scene editor's character selector and for reader-side art resolution.
 *
 * Two special cases live here as well:
 *  - The protagonist ("ตัวละครหลัก") resolves name and art from the reader's
 *    registration data at render time; a scene stores only an optional
 *    expression key, shown in the reader's gender.
 *  - "custom" is the free-form entry: an authored speaker name plus any image
 *    from the registry gallery.
 *
 * Legacy `chapter-speaker-*.png` art was removed; scenes storing those URLs
 * are remapped once by the `scene-image-remap-v1` migration in lib/db.ts.
 */
import type { Gender } from "@/types/auth";

/** Fixed speaker name shown for main-actor scenes. */
export const MAIN_ACTOR_SPEAKER_NAME = "ผู้กล้า";

/** Protagonist expressions; every key has both a male and a female image. */
export type MainActorExpression =
  | "normal"
  | "sick"
  | "curious"
  | "smile"
  | "excited"
  | "determined"
  | "shocked"
  | "scared";

const heroImage = (gender: Gender, expression: MainActorExpression): string =>
  // The female "shocked" art is wider to fit its "!!!" marks.
  `/images/characters/main-${gender}-${expression}-${gender === "female" && expression === "shocked" ? "673" : "593"}x720.png`;

export const MAIN_ACTOR_EXPRESSIONS: readonly {
  key: MainActorExpression;
  label: string;
  images: Record<Gender, string>;
}[] = (
  [
    ["normal", "ปกติ"],
    ["sick", "ป่วย / เหนื่อย"],
    ["curious", "สงสัย"],
    ["smile", "ยิ้ม"],
    ["excited", "ตื่นเต้น"],
    ["determined", "มุ่งมั่น"],
    ["shocked", "ตกใจ"],
    ["scared", "กลัว / กังวล"],
  ] as const
).map(([key, label]) => ({
  key,
  label,
  images: { male: heroImage("male", key), female: heroImage("female", key) },
}));

export function isMainActorExpression(value: unknown): value is MainActorExpression {
  return MAIN_ACTOR_EXPRESSIONS.some((e) => e.key === value);
}

/** Registration character art per chosen gender (the "normal" expression). */
export const MAIN_ACTOR_IMAGE_URLS: Record<Gender, string> = {
  male: heroImage("male", "normal"),
  female: heroImage("female", "normal"),
};

/**
 * Figure art for main-actor scenes: the scene's expression (default "normal")
 * in the reader's gender, falling back to the female set.
 */
export function mainActorImageUrl(
  gender: Gender | undefined,
  expression?: string | null,
): string {
  const key: MainActorExpression = isMainActorExpression(expression) ? expression : "normal";
  return heroImage(gender ?? "female", key);
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

/** Shadow-in-the-mist version of the fairy, used while it is still "???". */
export const FAIRY_UNKNOWN_IMAGE = "/images/characters/fairy-unknown-560x720.png";

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
  {
    key: "villager-b",
    label: "ชาวบ้าน B",
    kind: "preset",
    images: [
      "/images/characters/villager-b-normal-540x720.png",
      "/images/characters/villager-b-sick-540x720.png",
    ],
  },
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
  {
    key: "main-male",
    label: "ผู้กล้า-ชาย",
    kind: "preset",
    images: MAIN_ACTOR_EXPRESSIONS.map((e) => e.images.male),
  },
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
      "/images/characters/main-female-scared-593x720.png",
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
  {
    key: "fairy",
    label: "ภูติน้อย",
    kind: "preset",
    images: [
      "/images/characters/fairy-normal-560x720.png",
      "/images/characters/fairy-shocked-560x720.png",
      "/images/characters/fairy-confused-560x720.png",
      "/images/characters/fairy-worried-560x720.png",
      "/images/characters/fairy-determined-560x720.png",
      "/images/characters/fairy-happy-560x720.png",
      // Mist-veiled silhouette for scenes before the fairy is named ("???").
      FAIRY_UNKNOWN_IMAGE,
    ],
  },
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
