import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";

export default function ChaptersPage() {
  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div
          style={{
            display: "grid",
            placeItems: "center",
            height: "100%",
          }}
        >
          <div className="chapter-diamond-wrap">
            <Link
              href="/chapters/menu"
              className="chapter-diamond-wrap-link"
              aria-label="ไปหน้าเมนูบท"
            >
              <div className="chapter-diamond">
                <div className="chapter-diamond-inner">
                  <h1>เนื้อเรื่อง</h1>
                  <div className="diamond-motif" aria-hidden="true">
                    ✦ ✧ ✦ ✦ ✧ ✦
                  </div>
                  <div className="diamond-tail" aria-hidden="true" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      }
      right={
        <div className="chapters-dashboard">
          <section className="chapter-card chapter-card-top">
            <Link
              href="/video-clips"
              className="learning-logo"
              aria-label="ดาวแห่งการเรียนรู้ — ไปหน้าคลิปวิดีโอ"
            >
              <h2>
                ดาว
                <br />
                แห่ง
                <br />
                การเรียนรู้
              </h2>
            </Link>
          </section>

          <section className="chapter-card chapter-card-bottom">
            <Link
              href="/e-books"
              className="ebook-link-overlay"
              aria-label="ไปหน้า E-book"
            >
              <div className="ebook-arch" aria-hidden="true" />
              <div className="ebook-step" aria-hidden="true" />
              <div className="ebook-step s2" aria-hidden="true" />
              <div className="ebook-step s3" aria-hidden="true" />
              <h2>E-book</h2>
            </Link>
          </section>
        </div>
      }
    />
  );
}
