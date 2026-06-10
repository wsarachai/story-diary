import { notFound } from "next/navigation";
import NutritionFormClient from "../NutritionFormClient";
import { NUTRITION_PRESETS, type NutritionPresetKey } from "@/types/habit";

const PRESET_KEYS = Object.keys(NUTRITION_PRESETS) as NutritionPresetKey[];

function toPresetKey(value: string): NutritionPresetKey | null {
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  return PRESET_KEYS.includes(normalized as NutritionPresetKey)
    ? (normalized as NutritionPresetKey)
    : null;
}

export default async function AddNutritionPresetPage({
  params,
}: {
  params: Promise<{ preset: string }>;
}) {
  const { preset } = await params;
  const presetKey = toPresetKey(preset);

  if (!presetKey) {
    notFound();
  }

  return <NutritionFormClient preset={presetKey} />;
}
