export type HabitLegendVariant =
  | "done"
  | "partial"
  | "skip"
  | "missed"
  | "future"
  | "off";

export type HabitLegendItem =
  | {
      key: string;
      kind: "dot";
      variant: HabitLegendVariant;
      label: string;
    }
  | {
      key: string;
      kind: "hint";
      label: string;
    };

export const HABIT_TRACKER_LEGEND: HabitLegendItem[] = [
  { key: "done", kind: "dot", variant: "done", label: "ทำเสร็จ" },
  { key: "partial", kind: "dot", variant: "partial", label: "กำลังทำ" },
  { key: "skip", kind: "dot", variant: "skip", label: "ข้ามไป" },
  { key: "missed", kind: "dot", variant: "missed", label: "ไม่ได้ทำ" },
  { key: "future", kind: "dot", variant: "future", label: "ยังไม่ถึง" },
  { key: "off", kind: "dot", variant: "off", label: "ไม่มีตารางวันนี้" },
  { key: "today", kind: "hint", label: "วงม่วง = วันนี้" },
];