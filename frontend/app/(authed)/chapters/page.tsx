import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import styles from "./chapters.module.css";

export default function ChaptersPage() {
  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      left={
        <div className={styles.chapterDiamondLeftWrap}>
          <div className={styles.chapterDiamondWrap}>
            <Link
              href="/chapters/menu"
              className={styles.chapterDiamondWrapLink}
              aria-label="ไปหน้าเมนูบท"
            >
              <div className={styles.chapterDiamond}>
                <div className={styles.chapterDiamondInner}>
                  <h1>เนื้อเรื่อง</h1>
                </div>
              </div>
            </Link>
          </div>
        </div>
      }
      right={
        <div className={styles.chaptersDashboard}>
          <section
            className={[styles.chapterCard, styles.chapterCardTop].join(" ")}
          >
            <Link
              href="/video-clips"
              className={styles.learningLogo}
              aria-label="ดาวแห่งการเรียนรู้ — ไปหน้าคลิปวิดีโอ"
            >
              <div className={styles.learningLogoImage} aria-hidden="true" />
            </Link>
          </section>

          <section
            className={[styles.chapterCard, styles.chapterCardBottom].join(" ")}
          >
            <Link
              href="/e-books"
              className={styles.ebookLinkOverlay}
              aria-label="ไปหน้า E-book"
            >
              <div className={styles.ebookCardImage} aria-hidden="true" />
              <h2>E-book</h2>
            </Link>
          </section>
        </div>
      }
    />
  );
}
