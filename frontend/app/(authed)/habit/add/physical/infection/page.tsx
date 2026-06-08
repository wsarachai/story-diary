import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const INFECTION_ITEMS = [
  { label: "ล้างมือด้วยสบู่",         name: "%E0%B8%A5%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%94%E0%B9%89%E0%B8%A7%E0%B8%A2%E0%B8%AA%E0%B8%9A%E0%B8%B9%E0%B9%88" },
  { label: "สวมหน้ากากอนามัย",        name: "%E0%B8%AA%E0%B8%A7%E0%B8%A1%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%81%E0%B8%AD%E0%B8%99%E0%B8%B2%E0%B8%A1%E0%B8%B1%E0%B8%A2" },
  { label: "เว้นระยะห่างทางสังคม",    name: "%E0%B9%80%E0%B8%A7%E0%B9%89%E0%B8%99%E0%B8%A3%E0%B8%B0%E0%B8%A2%E0%B8%B0%E0%B8%AB%E0%B9%88%E0%B8%B2%E0%B8%87%E0%B8%97%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1" },
  { label: "อื่นๆ",                    name: "other" },
];

export default async function InfectionMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="ป้องกันเชื้อโรค">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="infection-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <h2 className={styles.createTitle} id="infection-title">ป้องกันเชื้อโรค</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="วิธีป้องกันเชื้อโรค">
          {INFECTION_ITEMS.map(({ label, name }) => (
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
      left={leftPage}
      right={<div />}
      rail={<IconRail />}
      ariaLabel="Story Diary Create Infection Prevention Activity"
    />
  );
}
