"use client";
import Link from "next/link";
import IconRail from "@/components/IconRail";

const PHYSICAL_ITEMS = [
  { label: "จัดการอารมณ์", href: "/habit/add/physical/emotion", isMenu: true },
  { label: "การออกกำลังกาย", href: "/habit/add/physical/form?name=%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%AD%E0%B8%AD%E0%B8%81%E0%B8%81%E0%B8%B3%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%81%E0%B8%B2%E0%B8%A2", isMenu: false },
  { label: "รับแสงแดด", href: "/habit/add/physical/sunlight", isMenu: true },
  { label: "ป้องกันเชื้อโรค", href: "/habit/add/physical/infection", isMenu: true },
  { label: "อาการผิดปกติ", href: "/habit/add/physical/symptoms", isMenu: false },
  { label: "ตรวจตามนัดแพทย์", href: "/habit/add/physical/form?name=%E0%B8%95%E0%B8%A3%E0%B8%A7%E0%B8%88%E0%B8%95%E0%B8%B2%E0%B8%A1%E0%B8%99%E0%B8%B1%E0%B8%94%E0%B9%81%E0%B8%9E%E0%B8%97%E0%B8%A2%E0%B9%8C", isMenu: false },
  { label: "วางแผนการตั้งครรภ์", href: "/habit/add/physical/form?name=%E0%B8%A7%E0%B8%B2%E0%B8%87%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B8%84%E0%B8%A3%E0%B8%A3%E0%B8%A0%E0%B9%8C", isMenu: false },
  { label: "อื่นๆ", href: "/habit/add/physical/form?name=other", isMenu: false },
] as const;

export default function AddPhysicalPage() {
  return (
    <main className="screen" aria-label="Story Diary Create Physical Activity">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="กิจกรรมทางกาย">
          <div className="create-card" role="dialog" aria-modal="true" aria-labelledby="physical-title">
            <header className="create-header">
              <Link className="action-btn" href="/habit/add" aria-label="กลับ">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </Link>
              <h2 className="create-title" id="physical-title">กิจกรรมทางกาย</h2>
              <div className="action-btn" aria-hidden="true" style={{ visibility: "hidden" }} />
            </header>
            <div className="menu-list" role="list" aria-label="ประเภทกิจกรรมทางกาย">
              {PHYSICAL_ITEMS.map(({ label, href, isMenu }) => (
                <Link
                  key={label}
                  className="menu-item"
                  role="listitem"
                  href={href}
                  aria-label={label}
                >
                  <span className="menu-item-dot" aria-hidden="true" />
                  <span className="menu-item-label">{label}</span>
                  {isMenu && (
                    <svg className="menu-item-chevron" viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
        <IconRail />
      </section>
    </main>
  );
}
