// @vitest-environment node
import { describe, it, expect } from "vitest";
import { CreateActivitySchema, CreateSceneSchema } from "@/lib/schemas";
import { validate } from "@/lib/validate";
import { PHYSICAL_PRESETS, PHYSICAL_PRESET_CATEGORY, type PhysicalPresetKey } from "@/types/habit";

describe("CreateActivitySchema physicalPreset", () => {
  // The zod enum is written out by hand — tsc cannot check it against the
  // PhysicalPresetKey union, so verify every preset key validates.
  const presetKeys = Object.keys(PHYSICAL_PRESETS) as PhysicalPresetKey[];

  it.each(presetKeys)("accepts preset key %s", (key) => {
    const result = validate(CreateActivitySchema, {
      category: "physical",
      physicalPreset: key,
      physicalCategory: PHYSICAL_PRESET_CATEGORY[key],
      name: PHYSICAL_PRESETS[key] === "อื่นๆ" ? "กิจกรรมอื่น" : PHYSICAL_PRESETS[key],
      schedule: { frequency: "daily", weekdays: [1, 3, 5] },
    });
    expect(result.physicalPreset).toBe(key);
  });

  it("rejects an unknown preset key", () => {
    expect(() =>
      validate(CreateActivitySchema, {
        category: "physical",
        physicalPreset: "not_a_preset",
        name: "X",
        schedule: { frequency: "daily", weekdays: [] },
      })
    ).toThrow();
  });
});

describe("CreateSceneSchema", () => {
  it("accepts a system scene without speaker fields", () => {
    const result = validate(CreateSceneSchema, {
      type: "system",
      idx: 0,
      text: "ระบบบรรยาย",
    });
    expect(result.type).toBe("system");
    expect(result.speakerName).toBeUndefined();
  });

  it("keeps an optional per-scene background (stripped keys would silently drop it)", () => {
    const bg = "/images/backgrounds/bg-02-village-1920x1080.webp";
    const result = validate(CreateSceneSchema, { type: "system", idx: 0, text: "x", backgroundImageUrl: bg });
    expect(result.backgroundImageUrl).toBe(bg);
    expect(validate(CreateSceneSchema, { type: "system", idx: 0, text: "x" }).backgroundImageUrl).toBeUndefined();
  });

  it("accepts an actor/main scene and defaults legacy payloads to actor/other", () => {
    const main = validate(CreateSceneSchema, {
      type: "actor",
      actorKind: "main",
      idx: 1,
      text: "บทตัวละครหลัก",
    });
    expect(main.actorKind).toBe("main");

    // Pre-type clients send only the old fields — still valid.
    const legacy = validate(CreateSceneSchema, {
      idx: 2,
      speakerName: "ผู้บรรยาย",
      speakerImageUrl: "/images/characters/villager-a-normal-522x720.png",
      text: "บทเดิม",
    });
    expect(legacy.type).toBe("actor");
    expect(legacy.actorKind).toBe("other");
  });

  it("requires speaker name and image for actor/other scenes", () => {
    expect(() =>
      validate(CreateSceneSchema, {
        type: "actor",
        actorKind: "other",
        idx: 3,
        text: "บทตัวละครอื่น",
      }),
    ).toThrow();
    expect(() =>
      validate(CreateSceneSchema, {
        type: "actor",
        actorKind: "other",
        idx: 3,
        speakerName: "ป้าแก่น",
        text: "บทตัวละครอื่น",
      }),
    ).toThrow();
    const ok = validate(CreateSceneSchema, {
      type: "actor",
      actorKind: "other",
      idx: 3,
      speakerName: "ป้าแก่น",
      speakerImageUrl: "/images/characters/villager-a-sick-522x720.png",
      text: "บทตัวละครอื่น",
    });
    expect(ok.speakerName).toBe("ป้าแก่น");
  });
});
