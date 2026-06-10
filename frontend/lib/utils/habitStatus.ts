import type { HabitGridCell } from "@/types/habit";

/**
 * Render state of one tracker-grid cell. Derived client-side — storage only
 * knows pending/partial/done/skipped; past/future and scheduling are visual.
 *
 *   off     — activity not scheduled on this weekday (muted cell)
 *   missed  — pending and the date is in the past (ไม่ได้ทำ)
 *   pending — pending, today or future (ยังไม่ถึง)
 */
export type GridDotState = "done" | "skipped" | "partial" | "missed" | "pending" | "off";

export function gridDotState(cell: HabitGridCell, todayStr: string): GridDotState {
  if (!cell.scheduled) return "off";
  if (cell.status === "done") return "done";
  if (cell.status === "skipped") return "skipped";
  if (cell.status === "partial") return "partial";
  return cell.date < todayStr ? "missed" : "pending";
}
