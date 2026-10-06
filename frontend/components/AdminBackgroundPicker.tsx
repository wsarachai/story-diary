"use client";

import Image from "next/image";
import { CHAPTER_BACKGROUNDS, findChapterBackground } from "@/lib/backgrounds";
import styles from "@/components/Admin.module.css";

/**
 * Chapter background selector shared by the add-chapter and edit-chapter
 * forms: a "none" tile plus one 16:9 tile per registry image. A stored URL
 * that isn't in the registry (set before the picker existed) is shown below
 * the grid so saving the form doesn't silently drop it.
 */
export default function AdminBackgroundPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const current = findChapterBackground(value);
  return (
    <div>
      <div className={`${styles.adminImagePicker} ${styles.adminImagePickerWide}`}>
        <button
          type="button"
          title="ไม่มีภาพพื้นหลัง"
          onClick={() => onChange("")}
          className={`${styles.adminImageTile} ${styles.adminImageTileWide} ${value === "" ? styles.adminImageTileSelected : ""}`}
        >
          <span className={styles.adminImageTileNone}>ไม่มี</span>
        </button>
        {CHAPTER_BACKGROUNDS.map((bg) => (
          <button
            key={bg.url}
            type="button"
            title={bg.label}
            onClick={() => onChange(bg.url)}
            className={`${styles.adminImageTile} ${styles.adminImageTileWide} ${value === bg.url ? styles.adminImageTileSelected : ""}`}
          >
            <Image
              src={bg.url}
              alt={bg.label}
              fill
              sizes="200px"
              style={{ objectFit: "cover" }}
            />
          </button>
        ))}
      </div>
      <div style={{ marginTop: "0.4rem", fontSize: "0.85rem", opacity: 0.75 }}>
        {value === ""
          ? "ไม่ได้เลือกภาพพื้นหลัง"
          : current
            ? `เลือก: ${current.label}`
            : `ภาพเดิม (ไม่อยู่ในรายการ): ${value}`}
      </div>
    </div>
  );
}
