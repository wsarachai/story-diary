"use client";
import Link from "next/link";
import IconRail from "@/components/IconRail";
import BookShellLayout from "@/components/BookShellLayout";
import styles from "../../HabitAdd.module.css";

const EMOTION_ITEMS = [
  { label: "สำรวจอารมณ์ตนเอง", href: "/habit/add/physical/emotion/explore", isMenu: true },
  { label: "สร้างอารมณ์เชิงบวก", href: "/habit/add/physical/form?name=%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%AD%E0%B8%B2%E0%B8%A3%E0%B8%A1%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%8A%E0%B8%B4%E0%B8%87%E0%B8%9A%E0%B8%A7%E0%B8%81", isMenu: false },
  { label: "ฝึกสติ", href: "/habit/add/physical/form?name=%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%AA%E0%B8%95%E0%B8%B4", isMenu: false },
] as const;

export default function EmotionMenuPage() {
  const leftPage = (
    <div className={styles.authoringPage} aria-label="จัดการอารมณ์">
      <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="emotion-title">
        <header className={styles.createHeader}>
          <Link className={styles.actionBtn} href="/habit/add/physical" aria-label="กลับ">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <h2 className={styles.createTitle} id="emotion-title">จัดการอารมณ์</h2>
          <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
        </header>
        <div className={styles.menuList} role="list" aria-label="ประเภทการจัดการอารมณ์">
          {EMOTION_ITEMS.map(({ label, href, isMenu }) => (
            <Link
              key={label}
              className={styles.menuItem}
              role="listitem"
              href={href}
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
      left={leftPage}
      right={<div />}
      rail={<IconRail />}
      ariaLabel="Story Diary Create Emotion Activity"
    />
  );
}
