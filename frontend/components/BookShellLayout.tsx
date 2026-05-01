import React from "react";

interface BookShellLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** When true, applies tight gap (s003/s004). */
  tight?: boolean;
  /** Optional persistent right-edge rail (s004+). */
  rail?: React.ReactNode;
}

/**
 * Ports `.screen → .book-shell → .page-left / .page-right` from common.css.
 * Two-page open-book layout at 1920×1080.
 */
export default function BookShellLayout({
  left,
  right,
  tight = false,
  rail,
}: BookShellLayoutProps) {
  return (
    <main className="screen screen-landscape" aria-label="Story Diary">
      <section
        className={`book-shell${tight ? " book-shell-tight" : ""}`}
        style={rail ? { gridTemplateColumns: "1fr 1fr auto" } : undefined}
      >
        <section className="page page-left page-seam-right">{left}</section>
        <section className="page page-right">{right}</section>
        {rail}
      </section>
    </main>
  );
}
