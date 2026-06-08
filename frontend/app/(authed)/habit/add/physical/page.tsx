import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import styles from "../HabitAdd.module.css";

type PhysicalItem = { label: string; base: string; isMenu: boolean };

const PHYSICAL_ITEMS: PhysicalItem[] = [
  { label: "จัดการอารมณ์",          base: "/habit/add/physical/emotion",                                    isMenu: true  },
  { label: "การออกกำลังกาย",        base: "/habit/add/physical/form?name=%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%AD%E0%B8%AD%E0%B8%81%E0%B8%81%E0%B8%B3%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B8%B2%E0%B8%A2", isMenu: false },
  { label: "รับแสงแดด",             base: "/habit/add/physical/sunlight",                                   isMenu: true  },
  { label: "ป้องกันเชื้อโรค",       base: "/habit/add/physical/infection",                                  isMenu: true  },
  { label: "อาการผิดปกติ",          base: "/habit/add/physical/symptoms",                                   isMenu: false },
  { label: "ตรวจตามนัดแพทย์",      base: "/habit/add/physical/form?name=%E0%B8%95%E0%B8%A3%E0%B8%A7%E0%B8%88%E0%B8%95%E0%B8%B2%E0%B8%A1%E0%B8%99%E0%B8%B1%E0%B8%94%E0%B9%81%E0%B8%9E%E0%B8%97%E0%B8%A2%E0%B9%8C", isMenu: false },
  { label: "วางแผนการตั้งครรภ์",    base: "/habit/add/physical/form?name=%E0%B8%A7%E0%B8%B2%E0%B8%87%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B8%84%E0%B8%A3%E0%B8%A3%E0%B8%A0%E0%B9%8C", isMenu: false },
  { label: "อื่นๆ",                  base: "/habit/add/physical/form?name=other",                            isMenu: false },
];

export default async function AddPhysicalPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  function buildHref(base: string): string {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}from=${from}`;
  }

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      mergedOnly
      merged={
        <div className={styles.authoringPage} aria-label="กิจกรรมทางกาย">
          <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="physical-title">
            <header className={styles.createHeader}>
              <Link className={styles.actionBtn} href={`/habit/add?from=${from}`} aria-label="กลับ">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </Link>
              <h2 className={styles.createTitle} id="physical-title">กิจกรรมทางกาย</h2>
              <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
            </header>
            <div className={styles.menuList} role="list" aria-label="ประเภทกิจกรรมทางกาย">
              {PHYSICAL_ITEMS.map(({ label, base, isMenu }) => (
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
      }
    />
  );
}
