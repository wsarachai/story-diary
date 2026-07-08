"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pill, Apple, PersonStanding } from "lucide-react";
import { useClientSearchParams } from "@/lib/hooks";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "./HabitAdd.module.css";

export default function AddActivityPage() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const from = searchParams.get("from") ?? "/habit/checklist";
  const content = (
    <div className={styles.authoringPage} aria-label="เพิ่มกิจกรรม">
      <div
        className={styles.formCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <header className={styles.formCardHeader}>
          <button
            className={styles.formCardBack}
            aria-label="ย้อนกลับ"
            onClick={() => router.push(from)}
          >
            <ChevronLeft aria-hidden="true" />
            <span className={styles.formCardBackText}>ย้อนกลับ</span>
          </button>
          <h2 className={styles.formCardTitle} id="form-title">
            เพิ่มกิจกรรม
          </h2>
        </header>
        <p className={styles.formCardHint}>เลือกประเภทกิจกรรมที่ต้องการเพิ่ม</p>
        <div
          className={styles.categoryTabs}
          role="tablist"
          aria-label="ประเภทกิจกรรม"
        >
          <Link
            className={`${styles.catTab} ${styles.catMed}`}
            role="tab"
            aria-label="ยา"
            href={`/habit/add/medicine?source=medicine&from=${from}`}
          >
            <div className={styles.catTabIcon} aria-hidden="true">
              <Pill />
            </div>
            <span className={styles.catTabLabel}>ยา</span>
            <span className={styles.catTabHint}>บันทึกการกินยา</span>
          </Link>
          <Link
            className={`${styles.catTab} ${styles.catFood}`}
            role="tab"
            aria-label="โภชนาการ"
            href={`/habit/add/nutrition?from=${from}`}
          >
            <div className={styles.catTabIcon} aria-hidden="true">
              <Apple />
            </div>
            <span className={styles.catTabLabel}>โภชนาการ</span>
            <span className={styles.catTabHint}>บันทึกการกินอาหาร</span>
          </Link>
          <Link
            className={`${styles.catTab} ${styles.catBody}`}
            role="tab"
            aria-label="กิจกรรมทางกาย"
            href={`/habit/add/physical?from=${from}`}
          >
            <div className={styles.catTabIcon} aria-hidden="true">
              <PersonStanding />
            </div>
            <span className={styles.catTabLabel}>กิจกรรมทางกาย</span>
            <span className={styles.catTabHint}>
              บันทึกการเคลื่อนไหวร่างกาย
            </span>
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
      fitViewport
      centerMobile
    />
  );
}
