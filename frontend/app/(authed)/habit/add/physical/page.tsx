import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import styles from "../HabitAdd.module.css";

type PhysicalItem = { label: string; base: string; isMenu: boolean };

const PHYSICAL_ITEMS: PhysicalItem[] = [
  { label: "จัดการอารมณ์",          base: "/habit/add/physical/emotion",                                    isMenu: true  },
  { label: "การออกกำลังกาย",        base: "/habit/add/physical/form?type=exercise",                         isMenu: false },
  { label: "รับแสงแดด",             base: "/habit/add/physical/sunlight",                                   isMenu: true  },
  { label: "ป้องกันเชื้อโรค",       base: "/habit/add/physical/infection",                                  isMenu: true  },
  { label: "อาการผิดปกติ",          base: "/habit/add/physical/form?type=symptoms",                         isMenu: false },
  { label: "ตรวจตามนัดแพทย์",      base: "/habit/add/physical/form?type=doctor_visit",                     isMenu: false },
  { label: "วางแผนการตั้งครรภ์",    base: "/habit/add/physical/form?type=pregnancy_planning",               isMenu: false },
  { label: "อื่นๆ",                  base: "/habit/add/physical/form?type=other",                            isMenu: false },
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
      fitViewport
      centerMobile
      rail={<IconRail />}
      mergedOnly
      merged={
        <div className={styles.authoringPage} aria-label="กิจกรรมทางกาย">
          <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="physical-title">
            <header className={styles.createHeader}>
              <Link className={styles.actionBtn} href={`/habit/add?from=${from}`} aria-label="กลับ">
                <ChevronLeft />
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
                    <ChevronRight className={styles.menuItemChevron} aria-hidden="true" />
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
