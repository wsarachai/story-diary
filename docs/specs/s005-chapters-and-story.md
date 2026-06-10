# Spec: Chapters and Story Reader

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Chapters hub, chapter menu, chapter intro, scene reader, and video clips.

---

## Summary

The chapters feature is a story reader built on a visual-novel pattern. Users navigate a chapter menu, tap an unlocked chapter to enter its intro screen, then advance through scenes one at a time using a typewriter effect. Completing a chapter (advancing past the last scene) marks it `completed` and dynamically unlocks the next chapter in sort order for that specific user. Locked chapters display a shake animation and a "not yet unlocked" hint when tapped. Chapter lock states are isolated per-user, calculated dynamically at the service layer by checking the completion status of the preceding chapter in sort order. The chapters hub also surfaces video clips ("ดาวแห่งการเรียนรู้") and e-books as secondary content cards.

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/chapters` | `frontend/app/(authed)/chapters/page.tsx` | Chapters hub; links to chapter menu, video clips, and e-books |
| `/chapters/menu` | `frontend/app/(authed)/chapters/menu/page.tsx` | Chapter list split across left/right pages; locked chapters show lock icon |
| `/chapters/[id]/explain` | `frontend/app/(authed)/chapters/[id]/explain/page.tsx` | Chapter intro screen with background image and intro title |
| `/chapters/[id]/explain/[scene]` | `frontend/app/(authed)/chapters/[id]/explain/[scene]/page.tsx` | Scene reader with typewriter text, speaker image, and advance/complete logic |
| `/video-clips` | `frontend/app/(authed)/video-clips/page.tsx` | Video clip grid; odd-indexed clips on left, even on right |
| `/video-clips/[clip]` | `frontend/app/(authed)/video-clips/[clip]/page.tsx` | Individual video clip player |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/chapters` | `frontend/app/api/chapters/route.ts` | List all chapters with user-specific progress and lock state |
| `GET` | `/api/chapters/[id]` | `frontend/app/api/chapters/[id]/route.ts` | Get single chapter with scenes and user-specific lock state |
| `POST` | `/api/chapters/[id]/progress` | `frontend/app/api/chapters/[id]/progress/route.ts` | Set user chapter progress (`not-started`, `in-progress`, `completed`); completing dynamically unlocks next chapter for this user |
| `GET` | `/api/video-clips` | `frontend/app/api/video-clips/route.ts` | List video clips |

---

## Key Components

- `ChaptersPage` — `frontend/app/(authed)/chapters/page.tsx` — left page has diamond card linking to chapter menu; right page has two cards (video clips, e-books)
- `ChaptersMenuPage` — `frontend/app/(authed)/chapters/menu/page.tsx` — renders odd-ID chapters on the left, even-ID chapters on the right; each row has a pin-circle number, title pill, and optional lock icon; locked chapters shake and show a tooltip on tap
- `ChapterIntroPage` — `frontend/app/(authed)/chapters/[id]/explain/page.tsx` — fullscreen with optional background image; shows `introTitle`; tapping anywhere advances to scene 0
- `ChapterScenePage` — `frontend/app/(authed)/chapters/[id]/explain/[scene]/page.tsx` — typewriter animation at 60 ms/char; clicking before typing completes skips to full text; clicking after advances to next scene or completes the chapter; speaker name substitutes the user's `characterName` when the stored name is "ชื่อตัวละคร"
- `VideoClipsPage` — `frontend/app/(authed)/video-clips/page.tsx` — grid of clip thumbnails; odd/even split across book pages
- `IconRail` — `frontend/components/IconRail.tsx` — persistent side navigation

---

## State

Redux slice: `frontend/store/chaptersApi.ts` — manages `getChapterSummaries` (list with lock state and progress), `getChapter` (detail with scenes), and `updateChapterProgress` mutation. Progress update applies optimistic updates to both the summaries list and the chapter detail cache; on completing a chapter, the next chapter's `lockState` is also optimistically set to `"unlocked"`.

Redux slice: `frontend/store/videoClipsApi.ts` — manages `getVideoClips`.

---

## Responsive notes

The chapter intro and scene reader use fullscreen layouts that override the standard book-shell. The scene page renders the speaker image absolutely positioned on the right side of the screen at `width: 30%`.
