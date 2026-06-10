// @vitest-environment node
import { describe, it, expect } from "vitest";
import { localDateStr, localWeekStartStr } from "@/lib/utils/date";

const BANGKOK = "Asia/Bangkok";

describe("localDateStr", () => {
  it("returns YYYY-MM-DD in the given timezone", () => {
    // 2026-06-09 23:00 UTC is already 2026-06-10 06:00 in Bangkok (UTC+7)
    const now = new Date("2026-06-09T23:00:00Z");
    expect(localDateStr(BANGKOK, now)).toBe("2026-06-10");
  });
});

describe("localWeekStartStr", () => {
  it("returns the Monday of the current week", () => {
    // 2026-06-10 is a Wednesday in Bangkok → week starts Monday 2026-06-08
    const now = new Date("2026-06-10T03:00:00Z");
    expect(localWeekStartStr(BANGKOK, now)).toBe("2026-06-08");
  });

  it("returns the same date when today is Monday", () => {
    const now = new Date("2026-06-08T03:00:00Z");
    expect(localWeekStartStr(BANGKOK, now)).toBe("2026-06-08");
  });

  it("returns the previous Monday when today is Sunday", () => {
    const now = new Date("2026-06-14T03:00:00Z");
    expect(localWeekStartStr(BANGKOK, now)).toBe("2026-06-08");
  });

  it("crosses a month boundary backwards", () => {
    // 2026-05-01 is a Friday → week starts Monday 2026-04-27
    const now = new Date("2026-05-01T03:00:00Z");
    expect(localWeekStartStr(BANGKOK, now)).toBe("2026-04-27");
  });
});
