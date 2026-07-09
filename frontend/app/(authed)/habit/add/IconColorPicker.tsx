import { Sun } from "lucide-react";
import styles from "./HabitAdd.module.css";

export interface IconColorOption {
  value: string;
  label: string;
}

export const ICON_COLOR_OPTIONS: IconColorOption[] = [
  { value: "#aa85e5", label: "ม่วง" },
  { value: "#2a9d8f", label: "เขียวมินต์" },
  { value: "#ee8a4a", label: "ส้ม" },
  { value: "#4d8dff", label: "น้ำเงิน" },
  { value: "#ff6b6b", label: "แดง" },
  { value: "#111111", label: "ดำ" },
  { value: "#ffffff", label: "ขาว" },
];

export function getIconColorLabel(color: string): string {
  const normalized = color.trim().toLowerCase();
  const found = ICON_COLOR_OPTIONS.find(
    (option) => option.value.toLowerCase() === normalized,
  );
  return found ? found.label : "สีกำหนดเอง";
}

interface IconColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  recommendedColor: string;
  previewLabel: string;
  customInputId: string;
}

export default function IconColorPicker({
  value,
  onChange,
  recommendedColor,
  previewLabel,
  customInputId,
}: IconColorPickerProps) {
  const colorLabel = getIconColorLabel(value);

  return (
    <>
      <p className={styles.colorDialogTitle}>เลือกสีไอคอน</p>

      <div className={styles.colorPreview}>
        <span
          className={styles.colorPreviewIcon}
          style={{ ["--name-icon-stroke" as string]: value }}
          aria-hidden="true"
        >
          <Sun />
        </span>
        <div className={styles.colorPreviewText}>
          <p className={styles.colorPreviewTitle}>ตัวอย่างไอคอน</p>
          <p className={styles.colorPreviewMeta}>
            {previewLabel || "ชื่อกิจกรรม"} • {colorLabel}
          </p>
        </div>
      </div>

      <p className={styles.colorSectionTitle}>สีที่เลือกได้</p>
      <div
        className={styles.colorTileGrid}
        role="radiogroup"
        aria-label="ตัวเลือกสีไอคอน"
      >
        {ICON_COLOR_OPTIONS.map((option) => {
          const selected = option.value.toLowerCase() === value.toLowerCase();
          const recommended =
            option.value.toLowerCase() === recommendedColor.toLowerCase();

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`${styles.colorTile}${selected ? ` ${styles.isSelected}` : ""}`}
              onClick={() => onChange(option.value)}
            >
              <span
                className={styles.colorTileSwatch}
                style={{ background: option.value }}
                aria-hidden="true"
              />
              <span className={styles.colorTileLabel}>{option.label}</span>
              {recommended && (
                <span className={styles.colorTileBadge}>แนะนำ</span>
              )}
              {selected && (
                <span className={styles.colorTileSelected}>เลือกแล้ว</span>
              )}
            </button>
          );
        })}
      </div>

      <details className={styles.colorAdvanced}>
        <summary>ขั้นสูง: เลือกสีเอง</summary>
        <div className={styles.colorCustomRow}>
          <label htmlFor={customInputId}>สีอื่น:</label>
          <input
            className={styles.colorCustom}
            id={customInputId}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <code className={styles.colorHexText}>{value.toUpperCase()}</code>
        </div>
      </details>
    </>
  );
}
