// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { clearTestData } from "@/lib/db";
import {
  createActivity,
  getTodayEntries,
  toggleOccurrence,
  getWeeklyView,
  getMonthlyView,
  getMonthlySummary,
} from "@/lib/services/habitService";

const USER = "appt-user";
const TODAY = "2026-07-09";

function apptInput(date: string, note?: string) {
  return {
    category: "physical" as const,
    physicalCategory: "doctor-visit" as const,
    physicalPreset: "doctor_visit" as const,
    name: "ตรวจตามนัดแพทย์",
    schedule: { frequency: "todo" as const, importance: "general" as const },
    appointmentDate: date,
    ...(note ? { appointmentNote: note } : {}),
    archived: false,
  };
}

beforeEach(() => {
  clearTestData();
});

describe("appointment create", () => {
  it("persists appointmentDate + appointmentNote", async () => {
    const a = await createActivity(USER, apptInput("2026-07-20", "เตรียมผลเลือด"));
    expect(a.appointmentDate).toBe("2026-07-20");
    expect(a.appointmentNote).toBe("เตรียมผลเลือด");
    expect(a.physicalCategory).toBe("doctor-visit");
  });

  it("allows multiple appointments with the same fixed name (no uniqueness conflict)", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    await expect(createActivity(USER, apptInput("2026-08-03"))).resolves.toBeTruthy();
    const two = await getTodayEntries(USER, TODAY);
    expect(two.length).toBe(2);
  });
});

describe("appointment in the today checklist", () => {
  it("shows every day (upcoming and overdue) until attended", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    // upcoming
    expect((await getTodayEntries(USER, "2026-07-10")).length).toBe(1);
    // overdue (past the appointment date, still pending)
    expect((await getTodayEntries(USER, "2026-07-25")).length).toBe(1);
  });

  it("groups under the todo cadence", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const [entry] = await getTodayEntries(USER, TODAY);
    expect(entry.activity.schedule.frequency).toBe("todo");
  });

  it("drops out of the list once attended, keyed to the appointment date", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const [entry] = await getTodayEntries(USER, "2026-07-10");
    // The occurrence is keyed to the appointment date, not 'today'.
    expect(entry.occurrence.date).toBe("2026-07-20");
    await toggleOccurrence(USER, entry.occurrence.id, "done");
    expect((await getTodayEntries(USER, "2026-07-11")).length).toBe(0);
  });
});

describe("appointment in the monthly grid", () => {
  it("appears in its appointment month with a marker on the appointment cell only", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const view = await getMonthlyView(USER, "2026-07");
    const row = view.rowsByActivity.find((r) => r.appointment);
    expect(row).toBeTruthy();
    expect(row!.appointment!.date).toBe("2026-07-20");
    const scheduledCells = row!.cells.filter((c) => c.scheduled);
    expect(scheduledCells.map((c) => c.date)).toEqual(["2026-07-20"]);
  });

  it("does not appear in a different month", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const view = await getMonthlyView(USER, "2026-06");
    expect(view.rowsByActivity.some((r) => r.appointment)).toBe(false);
  });

  it("is excluded from the done/target summary", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const view = await getMonthlyView(USER, "2026-07");
    expect(view.summary).toEqual({ done: 0, target: 0 });
  });

  it("reflects attended state on the marker", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const [entry] = await getTodayEntries(USER, "2026-07-10");
    await toggleOccurrence(USER, entry.occurrence.id, "done");
    const view = await getMonthlyView(USER, "2026-07");
    const row = view.rowsByActivity.find((r) => r.appointment)!;
    expect(row.appointment!.attended).toBe(true);
  });

  it("reports the furthest appointment month for forward navigation", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    await createActivity(USER, apptInput("2026-09-02"));
    const view = await getMonthlyView(USER, "2026-07");
    expect(view.maxAppointmentMonth).toBe("2026-09");
  });

  it("is not counted in the monthly summary goals", async () => {
    await createActivity(USER, apptInput("2026-07-20"));
    const summary = await getMonthlySummary(USER, "2026-07");
    expect(summary.goals.some((g) => g.name === "ตรวจตามนัดแพทย์")).toBe(false);
  });
});

describe("appointment is excluded from the weekly grid", () => {
  it("never appears as a weekly row", async () => {
    await createActivity(USER, apptInput("2026-07-09"));
    const view = await getWeeklyView(USER, "2026-07-06");
    expect(view.rowsByActivity.some((r) => r.appointment)).toBe(false);
    expect(view.rowsByActivity.length).toBe(0);
  });
});
