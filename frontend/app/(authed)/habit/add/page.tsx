"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "./HabitAdd.module.css";

export default function AddActivityPage() {
  const router = useRouter();
  const content = (
    <div className={styles.authoringPage} aria-label="เพิ่มกิจกรรม">
      <div className={styles.formCard} role="dialog" aria-modal="true" aria-labelledby="form-title">
        <header className={styles.formCardHeader}>
          <button
            className={styles.formCardBack}
            aria-label="ย้อนกลับ"
            onClick={() => router.back()}
          >
            <svg viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            ย้อนกลับ
          </button>
          <h2 className={styles.formCardTitle} id="form-title">เพิ่มกิจกรรม</h2>
        </header>
        <div className={styles.categoryTabs} role="tablist" aria-label="ประเภทกิจกรรม">
          <Link
            className={`${styles.catTab} ${styles.catMed}`}
            role="tab"
            aria-label="ยา"
            href="/habit/add/medicine?source=medicine"
          >
            <div className={styles.catTabIcon} aria-hidden="true">
              <svg viewBox="0 0 80 80" fill="none">
                <rect x="28" y="10" width="24" height="60" rx="12" stroke="white" strokeWidth="5" />
                <rect x="10" y="28" width="60" height="24" rx="12" stroke="white" strokeWidth="5" />
              </svg>
            </div>
            <span className={styles.catTabLabel}>ยา</span>
          </Link>
          <Link
            className={`${styles.catTab} ${styles.catFood}`}
            role="tab"
            aria-label="โภชนาการ"
            href="/habit/add/nutrition"
          >
            <div className={styles.catTabIcon} aria-hidden="true">
              <svg viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="45" r="26" stroke="white" strokeWidth="5" />
                <path d="M40 19 C40 10 55 10 55 19" stroke="white" strokeWidth="5" strokeLinecap="round" />
                <line x1="40" y1="10" x2="40" y2="22" stroke="white" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
            <span className={styles.catTabLabel}>โภชนาการ</span>
          </Link>
          <Link
            className={`${styles.catTab} ${styles.catBody}`}
            role="tab"
            aria-label="กิจกรรมทางกาย"
            href="/habit/add/physical"
          >
            <div className={styles.catTabIcon} aria-hidden="true">
              <svg viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="18" r="8" stroke="white" strokeWidth="5" />
                <path d="M20 40 L40 30 L60 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 40 L30 60 L40 55 L50 60 L50 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={styles.catTabLabel}>กิจกรรมทางกาย</span>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <BookShellLayout
      mergedOnly
      merged={content}
      rail={<IconRail />}
      tight
    />
  );
}
