---
name: Icon rail accent colors
description: Per-screen active accent on the persistent right-edge icon rail
type: project
---

The 4-item icon rail on s004/s005/s006/s007 uses a different `--rail-accent` per screen for the active item's `::before` background:

- s004 home → `#ff3131` (red)
- s005 chapters → `#08c65a` (green)
- s006 habit-tracker → `#6a24f2` (purple)
- s007 minigame → `#c771e8` (lilac)

**Why:** The wireframes encode this as inline per-page CSS, not as a shared token in common.css. Without recording it, an implementer would either (a) hard-code the same accent everywhere, losing the wireframe's design intent, or (b) chase the colors across four files.

**How to apply:** The accents are baked into `src/types/navigation.ts#RAIL_ITEMS`. The `<IconRail>` component should set `--rail-accent` as a CSS custom property on the active anchor based on `RAIL_ITEMS[i].activeAccent`, not via a per-screen stylesheet.
