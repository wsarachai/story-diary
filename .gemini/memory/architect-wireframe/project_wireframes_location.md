---
name: Wireframes location
description: Where Story Diary wireframe HTMLs live and how they are organized
type: project
---

Wireframes live at `docz/wireframes/s###-<page-name>.html`. There are 31 screens (s001–s031) covering landing, auth, home, chapters, habit tracker (daily/weekly/monthly), minigame quiz flow, and physical-activity creation menus. Shared CSS and JS are in `docz/wireframes/assets/common.css` and `assets/common.js`. Icon SVGs in `assets/icons/`, image SVGs in `images/`.

**Why:** The previous location `docz/layouts/` was deleted in commit 37ec698 ("Remove unused files and configurations from frontend"). CLAUDE.md still references the old `docz/layouts/` path — it is stale; trust the filesystem.

**How to apply:** When asked to read wireframes, always look in `docz/wireframes/`. The architect prompt's reference to `docz/wireframes/` is correct; CLAUDE.md's reference to `docz/layouts/` is not.
