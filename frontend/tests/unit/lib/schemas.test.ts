// @vitest-environment node
import { describe, it, expect } from "vitest";
import { CreateActivitySchema } from "@/lib/schemas";
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
