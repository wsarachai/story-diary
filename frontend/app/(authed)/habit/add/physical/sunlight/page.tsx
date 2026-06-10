import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const SUNLIGHT_ITEMS = [
  { label: "รับแสงแดดยามเช้า",      name: "%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%81%E0%B8%AA%E0%B8%87%E0%B9%81%E0%B8%94%E0%B8%94%E0%B8%A2%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%8A%E0%B9%89%E0%B8%B2" },
  { label: "รับแสงแดดช่วงกลางวัน",  name: "%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%81%E0%B8%AA%E0%B8%87%E0%B9%81%E0%B8%94%E0%B8%94%E0%B8%8A%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87%E0%B8%A7%E0%B8%B1%E0%B8%99" },
  { label: "อื่นๆ",                   name: "other" },
];

export default async function SunlightMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="รับแสงแดด">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="sunlight-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <h2 className={styles.createTitle} id="sunlight-title">รับแสงแดด</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="ประเภทการรับแสงแดด">
          {SUNLIGHT_ITEMS.map(({ label, name }) => (
            <Link
              key={label}
              className={styles.menuItem}
              role="listitem"
              href={`/habit/add/physical/form?name=${name}&from=${from}`}
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
