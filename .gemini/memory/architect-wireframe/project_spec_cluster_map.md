---
name: Spec cluster map for s001-s031
description: Which spec file owns which wireframes; the canonical division of the 31 screens
type: project
---

The 31 wireframes (`docz/wireframes/s001-*.html` through `s031-*.html`) are partitioned across 5 spec files in `docs/specs/`. Each spec covers all neighbouring wireframes that share Redux state, navigation, or visual chrome.

| Spec file | Wireframes | Rail key |
| --------- | ---------- | -------- |
| `s001-auth-and-home-entry.md` | s001 landing, s002 login, s003 register, s004 home | none / home |
| `s005-chapters-and-story.md` | s005 hub, s008 chapter menu, s009 chapter intro, s010 chapter scene, s011 video clips | chapters (#08c65a) |
| `s006-habit-tracker-views.md` | s006 hub, s012 today, s013 weekly, s014 monthly, s015 monthly summary | habit (#6a24f2) |
| `s016-habit-activity-authoring.md` | s016 add picker, s020 medicine form, s021 nutrition picklist, s022 medicine check-in, s023 nutrition check-in, s024 physical menu, s025 emotion menu, s026 sunlight menu, s027 symptoms check-in, s028 emotion check-in (mood+slider), s029 physical form, s030 infection menu | habit (#6a24f2) |
| `s007-minigame-quiz.md` | s007 intro, s017 question, s018 feedback, s019 score, s031 lighter summary | minigame (#c771e8) |

**Why:** Splitting authoring (`s016+s020-s030`, 11 screens) from read-views (`s006+s012-s015`, 5 screens) keeps each spec focused enough to implement in one PR without forcing every habit-tracker change to touch a 50 KB doc.

**How to apply:** When the user asks for a new screen that fits one of these clusters, extend the existing spec rather than creating a new one. When asked for a brand-new feature with no wireframe yet, follow the cluster pattern: one spec per Redux slice + rail destination.
