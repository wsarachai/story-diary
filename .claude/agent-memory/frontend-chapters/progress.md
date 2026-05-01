## Status
last-updated: 2026-05-01T18:00
resuming-at: complete

## Steps
- [x] 1. chaptersSlice with fetchSummaries thunk — store/chaptersSlice.ts
- [x] 2. ChapterPin + ChapterPill + ChapterRow (lock variant + DS-2 shake)
- [x] 3. /chapters hub (s005) — diamond link, learning-star card, e-book placeholder
- [x] 4. /chapters/menu (s008) with locked-tap interception
- [x] 5. fetchChapter thunk + /chapters/[id]/explain (s009) with DS-1 skeleton
- [x] 6. Scene cursor + /chapters/[id]/explain/[scene] (s010) — advance / completion
- [x] 7. videoClipsSlice + /video-clips (s011) with DS-3 disabled play buttons

## Notes
- Prerequisite: frontend-auth must be complete (BookShellLayout, IconRail, store)
- Mock data used (no backend); chapter 1 unlocked, 2-5 locked
- Images copied from docz/wireframes/images/ to frontend/public/images/
- IconRail updated: /video-clips also maps to "chapters" active key
