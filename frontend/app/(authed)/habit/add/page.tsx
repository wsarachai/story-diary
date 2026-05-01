"use client";
import Link from "next/link";
import IconRail from "@/components/IconRail";

export default function AddActivityPage() {
  return (
    <main className="screen" aria-label="Story Diary Add Activity">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="เพิ่มกิจกรรม">
          <div className="form-card" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <header className="form-card-header">
              <h2 className="form-card-title" id="form-title">เพิ่มกิจกรรม</h2>
            </header>
            <div className="category-tabs" role="tablist" aria-label="ประเภทกิจกรรม">
              <Link
                className="cat-tab cat-med"
                role="tab"
                aria-label="ยา"
                href="/habit/add/medicine?source=medicine"
              >
                <div className="cat-tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 80 80" fill="none">
                    <rect x="28" y="10" width="24" height="60" rx="12" stroke="white" strokeWidth="5"/>
                    <rect x="10" y="28" width="60" height="24" rx="12" stroke="white" strokeWidth="5"/>
                  </svg>
                </div>
                <span className="cat-tab-label">ยา</span>
              </Link>
              <Link
                className="cat-tab cat-food"
                role="tab"
                aria-label="โภชนาการ"
                href="/habit/add/nutrition"
              >
                <div className="cat-tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="45" r="26" stroke="white" strokeWidth="5"/>
                    <path d="M40 19 C40 10 55 10 55 19" stroke="white" strokeWidth="5" strokeLinecap="round"/>
                    <line x1="40" y1="10" x2="40" y2="22" stroke="white" strokeWidth="5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="cat-tab-label">โภชนาการ</span>
              </Link>
              <Link
                className="cat-tab cat-body"
                role="tab"
                aria-label="กิจกรรมทางกาย"
                href="/habit/add/physical"
              >
                <div className="cat-tab-icon" aria-hidden="true">
                  <svg viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="18" r="8" stroke="white" strokeWidth="5"/>
                    <path d="M20 40 L40 30 L60 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M30 40 L30 60 L40 55 L50 60 L50 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="cat-tab-label">กิจกรรมทางกาย</span>
              </Link>
            </div>
          </div>
        </section>
        <IconRail />
      </section>
    </main>
  );
}
