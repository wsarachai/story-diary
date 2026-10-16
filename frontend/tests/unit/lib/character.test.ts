import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  CHARACTER_PRESETS,
  MAIN_ACTOR_EXPRESSIONS,
  MAIN_ACTOR_IMAGE_URLS,
  mainActorImageUrl,
  findCharacterPreset,
  guessCharacterKey,
} from "@/lib/character";

const exists = (url: string) => fs.existsSync(path.join(process.cwd(), "public", url));

describe("character art registry", () => {
  it("points every preset image at a file that exists", () => {
    for (const p of CHARACTER_PRESETS) for (const img of p.images) expect(exists(img), img).toBe(true);
  });

  it("has art for every character that appears in chapter 1", () => {
    for (const key of ["villager-a", "villager-b", "fairy", "main-male", "main-female", "goddess-good"]) {
      expect(findCharacterPreset(key)?.images.length, key).toBeGreaterThan(0);
    }
    // The full fairy set from the Drive folder (10 expressions).
    expect(findCharacterPreset("fairy")?.images).toHaveLength(10);
  });
});

describe("main actor expressions", () => {
  it("ships all 7 expressions in both genders, every file present", () => {
    // The Drive art set has no "scared" hero renders.
    expect(MAIN_ACTOR_EXPRESSIONS.map((e) => e.key)).toEqual([
      "normal", "sick", "curious", "smile", "excited", "determined", "shocked",
    ]);
    for (const e of MAIN_ACTOR_EXPRESSIONS) {
      expect(exists(e.images.male), e.images.male).toBe(true);
      expect(exists(e.images.female), e.images.female).toBe(true);
    }
  });

  it("resolves the scene's expression in the reader's gender", () => {
    expect(mainActorImageUrl("male", "shocked")).toBe("/images/characters/main-male-shocked-593x720.png");
    expect(mainActorImageUrl("female", "shocked")).toBe("/images/characters/main-female-shocked-673x720.png");
  });

  it("falls back to normal for missing/unknown expressions and to female for unknown gender", () => {
    expect(mainActorImageUrl("male", undefined)).toBe(MAIN_ACTOR_IMAGE_URLS.male);
    expect(mainActorImageUrl("male", "angry")).toBe(MAIN_ACTOR_IMAGE_URLS.male);
    expect(mainActorImageUrl("male", "scared")).toBe(MAIN_ACTOR_IMAGE_URLS.male);
    expect(mainActorImageUrl(undefined, "smile")).toBe("/images/characters/main-female-smile-593x720.png");
  });

  it("uses the new male art (not the old shared registration image) for male readers", () => {
    expect(MAIN_ACTOR_IMAGE_URLS.male).toBe("/images/characters/main-male-normal-593x720.png");
  });

  it("recognises the fairy and villager B art when reopening a scene", () => {
    expect(guessCharacterKey("ภูติน้อย", "/images/characters/fairy-worried-560x720.png")).toBe("fairy");
    expect(guessCharacterKey("ภูติน้อย", "/images/characters/fairy-crying-560x720.png")).toBe("fairy");
    expect(guessCharacterKey("ชาวบ้าน B", "/images/characters/villager-b-sick-540x720.png")).toBe("villager-b");
  });
});
