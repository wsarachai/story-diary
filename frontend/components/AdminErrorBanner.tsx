"use client";

import styles from "@/components/Admin.module.css";

/**
 * Dismissible inline error banner for admin screens. Used to surface
 * mutation failures (e.g. an optimistic reorder that the server rejected
 * and rolled back) so the revert isn't silent.
 */
export default function AdminErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className={styles.adminErrorBanner} role="alert">
      <span>{message}</span>
      <button
        type="button"
        className={styles.adminErrorBannerDismiss}
        onClick={onDismiss}
        aria-label="ปิด"
      >
        ×
      </button>
    </div>
  );
}
