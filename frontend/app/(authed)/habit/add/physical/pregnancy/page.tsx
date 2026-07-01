import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const PREGNANCY_ITEMS = [
  { label: "ใช้ยาคุมกำเนิด", type: "oral_contraceptive" },
  { label: "ใช้ถุงยางอนามัย", type: "condom" },
];

export default async function PregnancyMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="การวางแผนการตั้งครรภ์/การคุมกำเนิด">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="pregnancy-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <ChevronLeft />
          </Link>
          <h2 className={styles.createTitle} id="pregnancy-title">การวางแผนการตั้งครรภ์/การคุมกำเนิด</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="การวางแผนการตั้งครรภ์/การคุมกำเนิด">
          {PREGNANCY_ITEMS.map(({ label, type }) => (
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
      fitViewport
      centerMobile
      rail={<IconRail />}
      mergedOnly
      merged={leftPage}
    />
  );
}
