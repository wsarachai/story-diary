import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

type EmotionItem = { label: string; base: string; isMenu: boolean };

const EMOTION_ITEMS: EmotionItem[] = [
  { label: "สำรวจอารมณ์ตนเอง",   base: "/habit/add/physical/form?type=explore_emotion",                  isMenu: false },
  { label: "สร้างอารมณ์เชิงบวก", base: "/habit/add/physical/form?type=positive_emotion",                 isMenu: false },
  { label: "ฝึกสติ",              base: "/habit/add/physical/form?type=mindfulness",                      isMenu: false },
];

export default async function EmotionMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  function buildHref(base: string): string {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}from=${from}`;
  }

  const leftPage = (
    <div className={styles.authoringPage} aria-label="จัดการอารมณ์">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="emotion-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <h2 className={styles.createTitle} id="emotion-title">จัดการอารมณ์</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="ประเภทการจัดการอารมณ์">
          {EMOTION_ITEMS.map(({ label, base, isMenu }) => (
            <Link
              key={label}
              className={styles.menuItem}
              role="listitem"
              href={buildHref(base)}
              aria-label={label}
            >
              <span className={styles.menuItemDot} aria-hidden="true" />
              <span className={styles.menuItemLabel}>{label}</span>
              {isMenu && (
                <svg className={styles.menuItemChevron} viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
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
