import styles from "./PageSpinner.module.css";

/**
 * PageSpinner — shared loading indicator for book-shell pages.
 *
 * Variants:
 *   full   – centred over the entire page area (default)
 *   inline – centred in a fixed-height region (e.g. a list section)
 *   small  – inline 20px spinner, for tight spaces (checkin pre-load)
 *
 * Usage:
 *   <PageSpinner />                 full-page overlay
 *   <PageSpinner variant="inline" height="10rem" />
 *   <PageSpinner variant="small" />
 */
export default function PageSpinner({
  variant = "full",
  height = "100%",
  label = "กำลังโหลด…",
}: {
  variant?: "full" | "inline" | "small";
  height?: string;
  label?: string;
}) {
  if (variant === "small") {
    return (
      <span
        role="status"
        aria-label={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4em",
          fontSize: "0.75em",
          color: "rgba(13,18,23,0.45)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "0.9em",
            height: "0.9em",
            border: "2px solid rgba(14,152,175,0.25)",
            borderTopColor: "var(--panel-blue-deep)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {label}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: "grid",
        placeItems: "center",
        height: variant === "full" ? height : height,
        width: "100%",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.9em",
        }}
      >
        <div className={styles.chapterSpinner} />
        <span
          style={{
            fontSize: "0.72em",
            fontWeight: 500,
            color: "var(--panel-blue-deep)",
            opacity: 0.7,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
