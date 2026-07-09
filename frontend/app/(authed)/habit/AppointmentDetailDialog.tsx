"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { formatFull } from "@/components/DateBadge";
import styles from "./habit.module.css";

interface AppointmentDetailDialogProps {
  /** Appointment date, YYYY-MM-DD. */
  date: string;
  note?: string;
  attended: boolean;
  /** Today in the user's timezone, YYYY-MM-DD; used to flag overdue visits. */
  todayStr: string;
  isDeleting?: boolean;
  onDelete: () => void;
  onClose: () => void;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function statusLabel(date: string, attended: boolean, todayStr: string): string {
  if (attended) return "ตรวจแล้ว";
  if (todayStr && date < todayStr) return "เลยกำหนดนัด";
  return "นัดหมายที่จะถึง";
}

export default function AppointmentDetailDialog({
  date,
  note,
  attended,
  todayStr,
  isDeleting = false,
  onDelete,
  onClose,
}: AppointmentDetailDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={styles.deleteConfirmOverlay} onClick={onClose}>
      <div
        className={styles.apptDetailCard}
        role="dialog"
        aria-modal="true"
        aria-label="รายละเอียดการนัดตรวจตามแพทย์"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.apptDetailHeader}>
          <span className={styles.apptDetailIcon} aria-hidden="true">
            <CalendarClock />
          </span>
          <p className={styles.deleteConfirmTitle}>ตรวจตามนัดแพทย์</p>
        </div>

        <span
          className={`${styles.apptDetailStatus}${attended ? ` ${styles.apptDetailStatusDone}` : ""}${
            !attended && todayStr && date < todayStr ? ` ${styles.apptDetailStatusOverdue}` : ""
          }`}
        >
          {statusLabel(date, attended, todayStr)}
        </span>

        <dl className={styles.apptDetailList}>
          <dt className={styles.apptDetailTerm}>วันที่แพทย์นัด</dt>
          <dd className={styles.apptDetailValue}>{formatFull(parseISO(date))}</dd>

          <dt className={styles.apptDetailTerm}>สิ่งที่ต้องเตรียม</dt>
          <dd className={styles.apptDetailValue}>
            {note && note.trim() ? note : <span className={styles.apptDetailEmpty}>ไม่มี</span>}
          </dd>
        </dl>

        {confirmDelete ? (
          <>
            <p className={styles.apptDetailConfirmText}>ลบการนัดหมายนี้? ไม่สามารถกู้คืนได้</p>
            <div className={styles.deleteConfirmActions}>
              <button
                className={styles.deleteConfirmCancel}
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                ยกเลิก
              </button>
              <button
                className={styles.deleteConfirmOk}
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "กำลังลบ…" : "ลบการนัดหมาย"}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.deleteConfirmActions}>
            <button className={styles.deleteConfirmOk} onClick={() => setConfirmDelete(true)}>
              ลบ
            </button>
            <button className={styles.deleteConfirmCancel} onClick={onClose}>
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
