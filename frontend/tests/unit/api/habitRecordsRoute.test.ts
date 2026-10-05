// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { GET as getDay } from "@/app/api/admin/habit-records/route";
import { GET as getUsers } from "@/app/api/admin/habit-records/users/route";
import { PUT as record } from "@/app/api/admin/habit-records/[occurrenceId]/route";
import { clearTestData, insertUser } from "@/lib/db";
import { createActivity } from "@/lib/services/habitService";
import { getJwtSecret } from "@/lib/services/authService";
import { localDateStr } from "@/lib/utils/date";

process.env.JWT_SECRET ??= "unit-test-jwt-secret";

const TODAY = localDateStr("Asia/Bangkok");
const token = (userId: string) => jwt.sign({ userId }, getJwtSecret(), { expiresIn: "1h" });

function seed(id: string, tel: string, role?: "admin") {
  return insertUser({
    id, name: `User ${id}`, tel, password_hash: "x", character_name: "Char", gender: "male",
    ...(role ? { role } : {}), timezone: "Asia/Bangkok",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
}

function req(path: string, who: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost:3000/api/admin/habit-records${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token(who)}`, "content-type": "application/json" },
  });
}

beforeEach(async () => {
  clearTestData();
  await seed("u-user", "0800000001");
  await seed("u-admin", "0800000002", "admin");
  await createActivity("u-user", {
    category: "physical", name: "เดิน", schedule: { frequency: "daily", weekdays: [] }, archived: false,
  });
});

describe("/api/admin/habit-records", () => {
  it("forbids regular users on every endpoint", async () => {
    expect((await getUsers(req("/users", "u-user"))).status).toBe(403);
    expect((await getDay(req(`?userId=u-user&date=${TODAY}`, "u-user"))).status).toBe(403);
    const res = await record(req("/occ-x", "u-user", { method: "PUT", body: JSON.stringify({ userId: "u-user", status: "done" }) }),
      { params: Promise.resolve({ occurrenceId: "occ-x" }) });
    expect(res.status).toBe(403);
  });

  it("lets an admin load a user's day and record it", async () => {
    const dayRes = await getDay(req(`?userId=u-user&date=${TODAY}`, "u-admin"));
    expect(dayRes.status).toBe(200);
    const day = await dayRes.json();
    expect(day.today).toBe(TODAY);
    const occurrenceId = day.entries[0].occurrence.id;

    const putRes = await record(
      req(`/${occurrenceId}`, "u-admin", { method: "PUT", body: JSON.stringify({ userId: "u-user", status: "done" }) }),
      { params: Promise.resolve({ occurrenceId }) },
    );
    expect(putRes.status).toBe(200);
    const { occurrence } = await putRes.json();
    expect(occurrence.status).toBe("done");
    expect(occurrence.recordedByAdmin).toBe(true);
  });

  it("returns 400 for missing params or an invalid status", async () => {
    expect((await getDay(req("?userId=u-user", "u-admin"))).status).toBe(400);
    const day = await (await getDay(req(`?userId=u-user&date=${TODAY}`, "u-admin"))).json();
    const occurrenceId = day.entries[0].occurrence.id;
    const res = await record(
      req(`/${occurrenceId}`, "u-admin", { method: "PUT", body: JSON.stringify({ userId: "u-user", status: "nope" }) }),
      { params: Promise.resolve({ occurrenceId }) },
    );
    expect(res.status).toBe(400);
  });
});
