## Status
last-updated: complete
resuming-at: done

## Steps
- [x] 1. FormChrome (cancel + save circle buttons + DS-2 spinner) + DiscardConfirmDialog
- [x] 2. ChipTrack + FrequencyChips + FrequencySubpanel primitives
- [x] 3. IconColorDialog using native <dialog>
- [x] 4. /habit/add (s016) — category picker, routes only
- [x] 5. /habit/add/nutrition (s021) preset list
- [x] 6. ActivityForm + /habit/add/medicine (s020) — medicine + nutrition flavours
- [x] 7. createActivity thunk + DS-1/DS-2/DS-3 wiring
- [x] 8. /habit/add/physical (s024) menu → PhysicalSubMenu for s025/s026/s030
- [x] 9. PhysicalActivityForm + /habit/add/physical/form (s029)
- [x] 10. /habit/checkin/medicine (s022) + saveMedicineCheckin thunk
- [x] 11. /habit/checkin/nutrition (s023) + saveNutritionCheckin thunk
- [x] 12. /habit/add/physical/symptoms (s027) + saveSymptomsCheckin thunk
- [x] 13. /habit/add/physical/emotion/explore (s028) mood + slider + saveMoodCheckin
- [x] 14. End-to-end pass through every leaf flow

## Notes
- Prerequisite: frontend-habit-views must be complete (habitsSlice base, CheckToggle, BookShellLayout)
- All authoring pages use direct layout (no BookShellLayout) with `.authoring-page` spanning both columns
- DS-4 discard dialog implemented as native <dialog> with useRef in each form page
- IconColorDialog implemented inline in medicine + physical form pages
- /habit/add/medicine handles both medicine (source=medicine) and nutrition (?type=<NutritionPresetKey>) flavours
- NUTRITION_PRESETS imported from @/types/habit for s021 preset list
- /habit/today "+ " button fixed to link /habit/add; row taps route to medicine/nutrition checkin pages
- pnpm lint + pnpm build both pass ✅ — 32 routes generated
