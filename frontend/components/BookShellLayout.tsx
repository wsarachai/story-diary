import React from "react";
import styles from "./BookShellLayout.module.css";

interface BookShellLayoutProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  merged?: React.ReactNode;
  mergedOnly?: boolean;
  /** When true, applies tight gap (s003/s004). */
  tight?: boolean;
  /**
   * When true, drops the mobile `min-height: 50dvh` floor on each page so the
   * stacked pages shrink to their content and the screen can fit in one mobile
   * viewport (used by the quiz/feedback screens). No effect on desktop.
   */
  fitViewport?: boolean;
  /**
   * When true, the left page is hidden on mobile and the right page takes the
   * full width, so its content rises to the top instead of sitting below a
   * tall decorative left page. No effect on desktop (both pages still show).
   */
  hideLeftOnMobile?: boolean;
  /** Optional persistent right-edge rail (s004+). */
  rail?: React.ReactNode;
  /** Custom aria-label for the main container. */
  ariaLabel?: string;
  /** Optional children rendered at the root level (e.g. for absolute dialogs). */
  children?: React.ReactNode;
}

/**
 * Ports `.screen → .book-shell → .page-left / .page-right` from common.css.
 * Two-page open-book layout at 1920×1080.
 */
export default function BookShellLayout({
  left,
  right,
  merged,
  mergedOnly = false,
  tight = false,
  fitViewport = false,
  hideLeftOnMobile = false,
  rail,
  ariaLabel = "Story Diary",
  children,
}: BookShellLayoutProps) {
  return (
    <main className={styles.screen} aria-label={ariaLabel}>
      <section
        className={`${styles.bookShell}${tight ? ` ${styles.bookShellTight}` : ""}${fitViewport ? ` ${styles.bookShellFitViewport}` : ""}${hideLeftOnMobile ? ` ${styles.bookShellHideLeftMobile}` : ""}`}
        style={rail ? { gridTemplateColumns: "1fr 1fr auto" } : undefined}
      >
        {mergedOnly && merged ? (
          <section className={`${styles.page} ${styles.pageMergedOnly}`}>{merged}</section>
        ) : (
          <>
            <section className={`${styles.page} ${styles.pageLeft} ${styles.pageSeamRight}`}>{left}</section>
            <section className={`${styles.page} ${styles.pageRight}`}>{right}</section>
            {merged ? <section className={styles.bookShellMergedLayer}>{merged}</section> : null}
          </>
        )}
        {rail}
      </section>
      {children}
    </main>
  );
}
