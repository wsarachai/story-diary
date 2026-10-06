"use client";

import Image from "next/image";
import { CHAPTER_BACKGROUNDS, findChapterBackground } from "@/lib/backgrounds";
import styles from "@/components/Admin.module.css";

/**
 * Background selector shared by the chapter forms and the scene editor: a
 * "none" tile plus one 16:9 tile per registry image. A stored URL that isn't
 * in the registry (set before the picker existed) is shown below the grid so
 * saving the form doesn't silently drop it.
 *
 * With `inheritUrl` (scene editor), "none" means "use the chapter background":
 * the tile previews that background and the status line says so.
 */
export default function AdminBackgroundPicker({
  value,
  onChange,
  inheritUrl,
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Background used when nothing is picked (the chapter's, for scenes). */
  inheritUrl?: string;
  /** Smaller tiles for narrow panels. */
  compact?: boolean;
}) {
  const inherits = inheritUrl !== undefined;
  const current = findChapterBackground(value);
  const inherited = findChapterBackground(inheritUrl);
  const noneTitle = inherits ? "ใช้พื้นหลังของบท" : "ไม่มีภาพพื้นหลัง";

  let status: string;
  if (value === "") {
    status = inherits
      ? `ใช้พื้นหลังของบท${inherited ? ` (${inherited.label})` : inheritUrl ? "" : " — บทนี้ยังไม่มีพื้นหลัง"}`
      : "ไม่ได้เลือกภาพพื้นหลัง";
  } else {
    status = current ? `เลือก: ${current.label}` : `ภาพเดิม (ไม่อยู่ในรายการ): ${value}`;
  }

  return (
    <div>
      <div
        className={`${styles.adminImagePicker} ${styles.adminImagePickerWide} ${compact ? styles.adminImagePickerCompact : ""}`}
      >
        <button
          type="button"
          title={noneTitle}
          aria-label={noneTitle}
          aria-pressed={value === ""}
          onClick={() => onChange("")}
          className={`${styles.adminImageTile} ${styles.adminImageTileWide} ${value === "" ? styles.adminImageTileSelected : ""}`}
        >
          {inherits && inheritUrl ? (
            <>
              <Image src={inheritUrl} alt="" fill sizes="160px" style={{ objectFit: "cover", opacity: 0.45 }} />
              <span className={styles.adminImageTileCaption}>ใช้ของบท</span>
            </>
          ) : (
            <span className={styles.adminImageTileNone}>{inherits ? "ใช้ของบท" : "ไม่มี"}</span>
          )}
        </button>
        {CHAPTER_BACKGROUNDS.map((bg) => (
          <button
            key={bg.url}
            type="button"
            title={bg.label}
            aria-label={bg.label}
            aria-pressed={value === bg.url}
            onClick={() => onChange(bg.url)}
            className={`${styles.adminImageTile} ${styles.adminImageTileWide} ${value === bg.url ? styles.adminImageTileSelected : ""}`}
          >
            <Image
              src={bg.url}
              alt={bg.label}
              fill
              sizes={compact ? "120px" : "200px"}
              style={{ objectFit: "cover" }}
            />
          </button>
        ))}
      </div>
      <div className={styles.adminPickerStatus}>{status}</div>
    </div>
  );
}
