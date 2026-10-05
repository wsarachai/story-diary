import { describe, it, expect } from "vitest";
import { quizPoints, QUIZ_MAX_POINTS } from "@/lib/quizScoring";

describe("quizPoints", () => {
  it("gives full marks for a perfect run at any set size", () => {
    for (const n of [1, 10, 12, 13, 20]) {
      expect(quizPoints(n, n)).toBe(QUIZ_MAX_POINTS);
    }
  });

  it("scales partial credit to the nearest point", () => {
    expect(quizPoints(11, 12)).toBe(92); // 91.67
    expect(quizPoints(6, 12)).toBe(50);
    expect(quizPoints(1, 12)).toBe(8); // 8.33
    expect(quizPoints(0, 12)).toBe(0);
  });

  it("guards against empty sets and out-of-range counts", () => {
    expect(quizPoints(0, 0)).toBe(0);
    expect(quizPoints(15, 12)).toBe(100);
    expect(quizPoints(-1, 12)).toBe(0);
  });
});
