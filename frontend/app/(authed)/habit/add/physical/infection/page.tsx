"use client";
import Link from "next/link";
import IconRail from "@/components/IconRail";

const INFECTION_ITEMS = [
  { label: "ล้างมือด้วยสบู่", href: "/habit/add/physical/form?name=%E0%B8%A5%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%94%E0%B9%89%E0%B8%A7%E0%B8%A2%E0%B8%AA%E0%B8%9A%E0%B8%B9%E0%B9%88" },
  { label: "สวมหน้ากากอนามัย", href: "/habit/add/physical/form?name=%E0%B8%AA%E0%B8%A7%E0%B8%A1%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%81%E0%B8%AD%E0%B8%99%E0%B8%B2%E0%B8%A1%E0%B8%B1%E0%B8%A2" },
  { label: "เว้นระยะห่างทางสังคม", href: "/habit/add/physical/form?name=%E0%B9%80%E0%B8%A7%E0%B9%89%E0%B8%99%E0%B8%A3%E0%B8%B0%E0%B8%A2%E0%B8%B0%E0%B8%AB%E0%B9%88%E0%B8%B2%E0%B8%87%E0%B8%97%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1" },
  { label: "อื่นๆ", href: "/habit/add/physical/form?name=other" },
] as const;

export default function InfectionMenuPage() {
  return (
    <main className="screen" aria-label="Story Diary Create Infection Prevention Activity">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="ป้องกันเชื้อโรค">
          <div className="create-card" role="dialog" aria-modal="true" aria-labelledby="infection-title">
            <header className="create-header">
              <Link className="action-btn" href="/habit/add/physical" aria-label="กลับ">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </Link>
              <h2 className="create-title" id="infection-title">ป้องกันเชื้อโรค</h2>
              <div className="action-btn" aria-hidden="true" style={{ visibility: "hidden" }} />
            </header>
            <div className="menu-list" role="list" aria-label="วิธีป้องกันเชื้อโรค">
              {INFECTION_ITEMS.map(({ label, href }) => (
                <Link
                  key={label}
                  className="menu-item"
                  role="listitem"
                  href={href}
                  aria-label={label}
                >
                  <span className="menu-item-dot" aria-hidden="true" />
                  <span className="menu-item-label">{label}</span>
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
