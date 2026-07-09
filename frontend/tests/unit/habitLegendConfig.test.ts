import { describe, expect, it } from "vitest";

import { HABIT_TRACKER_LEGEND } from "../../app/(authed)/habit/legendConfig";

describe("HABIT_TRACKER_LEGEND", () => {
  it("keeps canonical order and Thai labels", () => {
    expect(HABIT_TRACKER_LEGEND).toEqual([
      { key: "done", kind: "dot", variant: "done", label: "ทำเสร็จ" },
      {
        key: "partial",
        kind: "dot",
        variant: "partial",
        label: "กำลังทำ",
      },
      { key: "skip", kind: "dot", variant: "skip", label: "ข้ามไป" },
      {
        key: "missed",
        kind: "dot",
        variant: "missed",
        label: "ไม่ได้ทำ",
      },
      {
        key: "future",
        kind: "dot",
        variant: "future",
        label: "ยังไม่ถึง",
      },
      {
        key: "off",
        kind: "dot",
        variant: "off",
        label: "ไม่มีตารางวันนี้",
      },
      { key: "today", kind: "hint", label: "วงม่วง = วันนี้" },
    ]);
  });
});
