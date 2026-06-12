import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const SUNLIGHT_ITEMS = [
  { label: "รับแสงแดดยามเช้า",      type: "morning_sunlight" },
  { label: "รับแสงแดดช่วงกลางวัน",  type: "daytime_sunlight" },
  { label: "อื่นๆ",                   type: "other" },
];

export default async function SunlightMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="รับแสงแดด">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="sunlight-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <ChevronLeft />
          </Link>
          <h2 className={styles.createTitle} id="sunlight-title">รับแสงแดด</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="ประเภทการรับแสงแดด">
          {SUNLIGHT_ITEMS.map(({ label, type }) => (
            <Link
              key={label}
              className={styles.menuItem}
              role="listitem"
              href={`/habit/add/physical/form?type=${type}&from=${from}`}
              aria-label={label}
            >
              <span className={styles.menuItemDot} aria-hidden="true" />
              <span className={styles.menuItemLabel}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      mergedOnly
      merged={leftPage}
    />
  );
}
