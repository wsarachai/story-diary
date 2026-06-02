import React from "react";
import styles from "./BookShellLayout.module.css";

interface BookShellLayoutProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  merged?: React.ReactNode;
  mergedOnly?: boolean;
  /** When true, applies tight gap (s003/s004). */
  tight?: boolean;
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
  rail,
  ariaLabel = "Story Diary",
  children,
}: BookShellLayoutProps) {
  return (
    <main className={styles.screen} aria-label={ariaLabel}>
      <section
        className={`${styles.bookShell}${tight ? ` ${styles.bookShellTight}` : ""}`}
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
