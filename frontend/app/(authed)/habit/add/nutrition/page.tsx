import Link from "next/link";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";
import { NUTRITION_PRESETS, type NutritionPresetKey } from "@/types/habit";
import styles from "../HabitAdd.module.css";

const PRESET_KEYS: NutritionPresetKey[] = [
  "nutrition_5_groups",
  "nutrition_clean_cooked",
  "nutrition_mild_taste",
  "nutrition_order_low_seasoning",
];

export default async function AddNutritionPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { from = "/habit/checklist" } = await searchParams;
  const encodedFrom = encodeURIComponent(from);

  return (
    <BookShellLayout
      tight
      rail={<IconRail />}
      mergedOnly
      merged={
        <div className={styles.authoringPage} aria-label="เลือกโภชนาการ">
          <div className={styles.createCard} role="dialog" aria-modal="true" aria-labelledby="nutrition-title">
            <header className={styles.createHeader}>
              <Link
                className={styles.actionBtn}
                href={`/habit/add?from=${from}`}
                aria-label="กลับ"
              >
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </Link>
              <h2 className={styles.createTitle} id="nutrition-title">โภชนาการ</h2>
              <div className={styles.actionBtn} aria-hidden="true" style={{ visibility: "hidden" }} />
            </header>
            <div className={styles.nutritionList} role="list" aria-label="ประเภทโภชนาการ">
              {PRESET_KEYS.map((key) => (
                <Link
                  key={key}
                  className={styles.nutritionItem}
                  role="listitem"
                  href={`/habit/add/nutrition/${key}?from=${encodedFrom}`}
                  aria-label={NUTRITION_PRESETS[key]}
                >
                  <span className={styles.nutritionItemDot} aria-hidden="true" />
                  <span className={styles.nutritionItemLabel}>{NUTRITION_PRESETS[key]}</span>
                  <svg className={styles.nutritionItemChevron} viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
              <Link
                className={styles.nutritionItem}
                role="listitem"
                href={`/habit/add/nutrition/custom?from=${encodedFrom}`}
                aria-label="อื่นๆ"
              >
                <span className={styles.nutritionItemDot} aria-hidden="true" />
                <span className={styles.nutritionItemLabel}>อื่นๆ</span>
                <svg className={styles.nutritionItemChevron} viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      }
    />
  );
}
