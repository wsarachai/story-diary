"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import { useClientSearchParams } from "@/lib/hooks";
import {
  useGetHabitRecordUsersQuery,
  useGetHabitRecordDayQuery,
  useRecordHabitForUserMutation,
  type AdminRecordStatus,
} from "@/store/adminApi";
import type { HabitOccurrenceStatus, TodayHabitEntry } from "@/types/habit";
import styles from "@/components/Admin.module.css";

const STATUS_LABEL: Record<HabitOccurrenceStatus, string> = {
  pending: "ยังไม่ทำ",
  partial: "ทำบางส่วน",
  done: "ทำครบ",
  skipped: "ข้าม",
};

const ACTIONS: { status: AdminRecordStatus; label: string }[] = [
  { status: "done", label: "ทำครบ" },
  { status: "skipped", label: "ข้าม" },
  { status: "pending", label: "ยังไม่ทำ" },
];

function categoryLabel(entry: TodayHabitEntry): string {
  const { activity } = entry;
  if (activity.category === "physical" && activity.physicalCategory === "doctor-visit") return "นัดแพทย์";
  return { medicine: "ยา", nutrition: "โภชนาการ", physical: "กิจกรรมทางกาย" }[activity.category] ?? activity.category;
}

/** YYYY-MM-DD in the admin's browser timezone (initial default only). */
function browserToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

export default function AdminHabitRecordsPage() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const date = searchParams.get("date") ?? browserToday();

  const { data: users, isLoading: usersLoading } = useGetHabitRecordUsersQuery();
  const { data: day, isFetching: dayLoading, error: dayError } = useGetHabitRecordDayQuery(
    { userId, date },
    { skip: !userId },
  );
  const [recordHabit] = useRecordHabitForUserMutation();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");

  const today = day?.today;
  const isToday = today !== undefined && date >= today;

  // A deep link with a future date (in the user's timezone) snaps back to their today.
  useEffect(() => {
    if (today && date > today) setParams(userId, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, date]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!users) return [];
    return q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.tel.includes(q)) : users;
  }, [users, userFilter]);

  function setParams(nextUserId: string, nextDate: string) {
    const qs = new URLSearchParams();
    if (nextUserId) qs.set("userId", nextUserId);
    qs.set("date", nextDate);
    router.replace(`/admin/habit-records?${qs.toString()}`);
  }

  async function handleRecord(entry: TodayHabitEntry, status: AdminRecordStatus) {
    setMutationError(null);
    try {
      await recordHabit({ userId, date, occurrenceId: entry.occurrence.id, status }).unwrap();
    } catch {
      setMutationError(`บันทึก "${entry.activity.name}" ไม่สำเร็จ ลองอีกครั้ง`);
    }
  }

  const dayErrorMessage =
    dayError && "data" in dayError
      ? ((dayError.data as { error?: { message?: string } })?.error?.message ?? "โหลดข้อมูลไม่สำเร็จ")
      : dayError
        ? "โหลดข้อมูลไม่สำเร็จ"
        : null;

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <main className={styles.adminMain}>
        <div className={styles.adminPageHeader}>
          <h1 className={styles.adminPageTitle}>บันทึกแทนผู้ใช้</h1>
        </div>
        <p className={styles.adminHint}>
          ใช้เมื่อผู้ใช้ลืมบันทึกประจำวัน เลือกผู้ใช้และวันที่ แล้วกำหนดสถานะของแต่ละกิจกรรม
          — รายการที่บันทึกจากหน้านี้จะแสดงป้าย &quot;บันทึกโดยแอดมิน&quot;
        </p>

        <div className={styles.adminFilterRow}>
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel} htmlFor="hr-user-filter">ค้นหาผู้ใช้</label>
            <input
              id="hr-user-filter"
              className={styles.adminInput}
              placeholder="ชื่อหรือเบอร์โทร"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel} htmlFor="hr-user">ผู้ใช้</label>
            <select
              id="hr-user"
              className={styles.adminSelect}
              value={userId}
              onChange={(e) => setParams(e.target.value, date)}
              disabled={usersLoading}
            >
              <option value="">— เลือกผู้ใช้ —</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.tel})</option>
              ))}
            </select>
          </div>
          <div className={styles.adminFormField}>
            <label className={styles.adminLabel} htmlFor="hr-date">วันที่</label>
            <div className={styles.adminDateRow}>
              <button
                type="button"
                className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                onClick={() => setParams(userId, shiftDate(date, -1))}
                aria-label="วันก่อนหน้า"
              >
                ‹
              </button>
              <input
                id="hr-date"
                type="date"
                className={styles.adminInput}
                value={date}
                max={today}
                onChange={(e) => e.target.value && setParams(userId, e.target.value)}
              />
              <button
                type="button"
                className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                onClick={() => setParams(userId, shiftDate(date, 1))}
                disabled={isToday}
                aria-label="วันถัดไป"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {mutationError && <AdminErrorBanner message={mutationError} onDismiss={() => setMutationError(null)} />}
        {dayErrorMessage && <AdminErrorBanner message={dayErrorMessage} onDismiss={() => setParams(userId, today ?? browserToday())} />}

        {!userId ? (
          <p className={styles.adminEmpty}>เลือกผู้ใช้เพื่อดูกิจกรรมของวันนั้น</p>
        ) : dayLoading && !day ? (
          <p className={styles.adminEmpty}>กำลังโหลด…</p>
        ) : day && day.entries.length === 0 ? (
          <p className={styles.adminEmpty}>ไม่มีกิจกรรมที่ต้องทำในวันนี้</p>
        ) : day ? (
          <div className={styles.adminTableWrap}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>กิจกรรม</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th>บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {day.entries.map((entry) => (
                  <tr key={entry.occurrence.id}>
                    <td>
                      <div>{entry.activity.name}</div>
                      {entry.subline && <div className={styles.adminSubline}>{entry.subline}</div>}
                    </td>
                    <td>{categoryLabel(entry)}</td>
                    <td>
                      <span className={`${styles.adminBadge} ${entry.occurrence.status === "done" ? styles.adminBadgeGreen : entry.occurrence.status === "pending" ? styles.adminBadgeGray : styles.adminBadgeYellow}`}>
                        {STATUS_LABEL[entry.occurrence.status]}
                      </span>
                      {entry.occurrence.recordedByAdmin && (
                        <span className={styles.adminRecordedTag}>บันทึกโดยแอดมิน</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.adminStatusGroup} role="group" aria-label={`บันทึก ${entry.activity.name}`}>
                        {ACTIONS.map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            className={`${styles.adminStatusBtn}${entry.occurrence.status === action.status ? ` ${styles.isActive}` : ""}`}
                            aria-pressed={entry.occurrence.status === action.status}
                            onClick={() => handleRecord(entry, action.status)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}
