import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const SUNLIGHT_ITEMS = [
  { label: "เสื้อผ้าแขนขายาว/พกร่ม/หมวกก่อนออกจากบ้าน", type: "sun_protection_clothing" },
  { label: "ทาครีมกันแดด",                                 type: "sunscreen" },
  { label: "เลี่ยงตากแดดตอน 10.00 – 17.00 น.",            type: "avoid_midday_sun" },
];

export default async function SunlightMenuPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;

  const leftPage = (
    <div className={styles.authoringPage} aria-label="การป้องกันแสงแดด">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="sunlight-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href={`/habit/add/physical?from=${from}`} aria-label="กลับ">
            <ChevronLeft />
          </Link>
          <h2 className={styles.createTitle} id="sunlight-title">การป้องกันแสงแดด</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="วิธีป้องกันแสงแดด">
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
      fitViewport
      centerMobile
      rail={<IconRail />}
      mergedOnly
      merged={leftPage}
    />
  );
}
