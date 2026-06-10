"use client";

import Link from "next/link";
import styles from "./habit.module.css";

/** Query failed — visible error instead of a silent empty grid. */
export function TrackerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.trackerState} role="alert">
      <p className={styles.trackerStateTitle}>โหลดข้อมูลไม่สำเร็จ</p>
      <p className={styles.trackerStateSub}>เกิดข้อผิดพลาดระหว่างดึงข้อมูลกิจกรรม</p>
      <button className={styles.trackerStateBtn} onClick={onRetry}>ลองอีกครั้ง</button>
    </div>
  );
}

/** No activities yet — point the user at the add flow. */
export function TrackerEmpty({ addFrom }: { addFrom: string }) {
  return (
    <div className={styles.trackerState}>
      <p className={styles.trackerStateTitle}>ยังไม่มีกิจกรรม</p>
      <p className={styles.trackerStateSub}>เพิ่มกิจกรรมแรกของคุณเพื่อเริ่มติดตาม</p>
      <Link href={`/habit/add?from=${addFrom}`} className={styles.trackerStateBtn}>
        เพิ่มกิจกรรม
      </Link>
    </div>
  );
}
