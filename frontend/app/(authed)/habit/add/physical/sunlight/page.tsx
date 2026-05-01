"use client";
import Link from "next/link";
import IconRail from "@/components/IconRail";

const SUNLIGHT_ITEMS = [
  { label: "รับแสงแดดยามเช้า", href: "/habit/add/physical/form?name=%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%81%E0%B8%AA%E0%B8%87%E0%B9%81%E0%B8%94%E0%B8%94%E0%B8%A2%E0%B8%B2%E0%B8%A1%E0%B9%80%E0%B8%8A%E0%B9%89%E0%B8%B2" },
  { label: "รับแสงแดดช่วงกลางวัน", href: "/habit/add/physical/form?name=%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%81%E0%B8%AA%E0%B8%87%E0%B9%81%E0%B8%94%E0%B8%94%E0%B8%8A%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87%E0%B8%A7%E0%B8%B1%E0%B8%99" },
  { label: "อื่นๆ", href: "/habit/add/physical/form?name=other" },
] as const;

export default function SunlightMenuPage() {
  return (
    <main className="screen" aria-label="Story Diary Create Sunlight Activity">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="รับแสงแดด">
          <div className="create-card" role="dialog" aria-modal="true" aria-labelledby="sunlight-title">
            <header className="create-header">
              <Link className="action-btn" href="/habit/add/physical" aria-label="กลับ">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </Link>
              <h2 className="create-title" id="sunlight-title">รับแสงแดด</h2>
              <div className="action-btn" aria-hidden="true" style={{ visibility: "hidden" }} />
            </header>
            <div className="menu-list" role="list" aria-label="ประเภทการรับแสงแดด">
              {SUNLIGHT_ITEMS.map(({ label, href }) => (
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
