import { describe, it, expect } from "vitest";
import { typewriterStops } from "@/lib/typewriter";

describe("typewriterStops", () => {
  it("keeps Thai vowel and tone marks with their consonant", () => {
    // "ที่" = ท + ี + ่ (3 code units, 1 cluster); "นี่" likewise.
    const text = "ที่นี่";
    expect(text.length).toBe(6);
    expect(typewriterStops(text)).toEqual([3, 6]);
  });

  it("never stops between a consonant and its mark", () => {
    const text = "หมู่บ้านแห่งนี้...เคยได้รับพร";
    const marks = /[ัิ-ฺ็-๎]/;
    for (const stop of typewriterStops(text)) {
      if (stop < text.length) expect(marks.test(text[stop])).toBe(false);
    }
  });

  it("steps one per character for ASCII and ends at text.length", () => {
    expect(typewriterStops("Hi!")).toEqual([1, 2, 3]);
    expect(typewriterStops("a\nb").at(-1)).toBe(3);
  });

  it("returns no stops for empty text", () => {
    expect(typewriterStops("")).toEqual([]);
  });
});
