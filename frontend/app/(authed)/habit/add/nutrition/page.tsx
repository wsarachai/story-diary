"use client";
import Link from "next/link";
import IconRail from "@/components/IconRail";
import { NUTRITION_PRESETS, type NutritionPresetKey } from "@/types/habit";

const PRESET_KEYS: NutritionPresetKey[] = [
  "nutrition_5_groups",
  "nutrition_clean_cooked",
  "nutrition_mild_taste",
  "nutrition_order_low_seasoning",
];

export default function AddNutritionPage() {
  return (
    <main className="screen" aria-label="Story Diary Create Nutrition">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
        <section className="page authoring-page" aria-label="เลือกโภชนาการ">
          <div className="create-card" role="dialog" aria-modal="true" aria-labelledby="nutrition-title">
            <header className="create-header">
              <Link
                className="action-btn"
                href="/habit/add"
                aria-label="กลับ"
              >
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </Link>
              <h2 className="create-title" id="nutrition-title">โภชนาการ</h2>
              <div className="action-btn" aria-hidden="true" style={{ visibility: "hidden" }} />
            </header>
            <div className="nutrition-list" role="list" aria-label="ประเภทโภชนาการ">
              {PRESET_KEYS.map((key) => (
                <Link
                  key={key}
                  className="nutrition-item"
                  role="listitem"
                  href={`/habit/add/medicine?type=${key}`}
                  aria-label={NUTRITION_PRESETS[key]}
                >
                  <span className="nutrition-item-dot" aria-hidden="true" />
                  <span className="nutrition-item-label">{NUTRITION_PRESETS[key]}</span>
                  <svg className="nutrition-item-chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <IconRail />
      </section>
    </main>
  );
}
