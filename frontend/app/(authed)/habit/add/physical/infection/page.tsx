import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const INFECTION_ITEMS = [
  { label: "ล้างมือบ่อย ๆ", type: "wash_hands" },
  { label: "สวมหน้ากากอนามัยตอนออกไปข้างนอก", type: "wear_mask" },
  { label: "เลี่ยงพื้นที่แออัด", type: "social_distancing" },
  { label: "เลี่ยงการอยู่ใกล้คนป่วย", type: "avoid_sick_people" },
  { label: "อื่นๆ", type: "other" },
];

export default async function InfectionMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="ป้องกันการติดเชื้อ">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="infection-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <ChevronLeft />
          </Link>
          <h2 className={styles.createTitle} id="infection-title">ป้องกันการติดเชื้อ</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="ป้องกันการติดเชื้อ">
          {INFECTION_ITEMS.map(({ label, type }) => (
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
