# Spec: Chapters / Story Reader (s005, s008–s011)

**Status:** Draft
**Owner:** Architect (handoff to frontend implementer + tester)
**Last updated:** 2026-05-02
**Scope:** UI architecture for the "เนื้อเรื่อง" (Story) feature accessed
via the icon-rail "book" item. Covers the chapters hub, chapter list,
chapter intro, scene-by-scene reading, and the video-clips collection.

---

## Summary

The Story area lets the user browse a fixed sequence of chapters (5 in the
wireframe), read each chapter as a multi-scene dialogue flow, and
watch supporting video clips ("ดาวแห่งการเรียนรู้"). The hub (s005) is a
two-card surface that branches to either the chapter menu (s008) or the
video clips collection (s011); the chapter list links into a 2-screen
reader (s009 intro + s010 dialogue), and the dialogue closes back to the
chapter list. Chapter-gating is encoded by a lock-key icon on later
chapters.

For implementation fixtures and backend mock data, **every chapter should
carry 5-6 ordered scenes** so the reader flow exercises repeated next-arrow
navigation instead of a single placeholder dialogue.

This spec maps the wireframes onto a `chapters` Redux slice, a small
chapter-content client (assumed CMS-backed), and four Next.js routes under
`/chapters/...` plus `/video-clips`. It introduces two derived states not
present in the wireframes — a chapter-loading skeleton (DS-1) and a
locked-chapter feedback toast (DS-2) — both grounded in the existing
visual language.

---

## Source Wireframes

| Screen ID                          | File                                              | Role                                                    |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `s005-chapters`                    | `docz/wireframes/s005-chapters.html`              | Hub: diamond "เนื้อเรื่อง" + ดาวแห่งการเรียนรู้ + E-book cards. |
| `s008-chapters-menu`               | `docz/wireframes/s008-chapters-menu.html`         | Chapter list 1-5 (left/right pages), pin pills.         |
| `s009-chapters-explain`            | `docz/wireframes/s009-chapters-explain.html`      | Full-bleed bg + "บทบรรยาย" intro panel.                 |
| `s010-chapters-explain-details`    | `docz/wireframes/s010-chapters-explain-details.html` | Speaker figure + dialog panel + next arrow.          |
| `s011-video-clips`                 | `docz/wireframes/s011-video-clips.html`           | 2 video-clip thumbnails under the "ดาวแห่งการเรียนรู้" badge. |

Neighbours that affect navigation:

- `s004-home.html` — icon rail entry-point (book icon).
- All five screens host the persistent rail with `chapters` active (green
  `#08c65a`).

### Page-specific JS vs shared `common.js`

- **None** of s005/s008/s009/s010/s011 ship page-specific JS.
- Shared `assets/common.js` is included by s005/s008 but its `data-navigate`
  pattern is **not** used in any of these five — the wireframes lean on
  native `<a href>` elements throughout. Several anchors are oversized
  hit-targets that absolute-cover the page (s009 `.chapter-explain-link`
  inset:0; s010 `.dialog-next-link` 7×7rem). The React port replaces these
  with real Next.js `<Link>` components that wrap the same hit area.

### Gaps not covered by predefined wireframes

1. **Chapter-loading state.** There is no skeleton when chapter data has
   not arrived. Without one, navigating from s008 to s009 with cold cache
   would briefly render the bg image with no panel copy. **DS-1.**
2. **Locked-chapter tap feedback.** s008 renders chapters 2-5 with a lock
   icon but tapping them still navigates to s009 (since each is wrapped in
   a real `<a>`). The implementer must intercept locked taps and either
   block navigation or surface a hint. **DS-2.**
3. **Last-scene return target.** s010 always navigates back to s008
   (chapter list) on next-tap, regardless of chapter length. The spec
   formalises a "scene cursor" so that next-tap advances to the next scene
   and only the **final** scene routes to s008.
4. **Fixture depth.** A single scene per chapter is not enough to verify the
   s010 reader flow. Mock/API seed content must provide **5-6 scenes per
   chapter** in ascending `index` order.
5. **Video-clip player.** s011 shows a play-icon on each thumbnail but no
   player surface. The wireframe is silent on what tapping the thumbnail
   does. Spec assumes a future video player (out of scope) and records the
   tap as a no-op for v1. **DS-3.**

---

## Derived Screens and States

| ID    | Name                                       | Type            | Inherits from                                      |
| ----- | ------------------------------------------ | --------------- | -------------------------------------------------- |
| DS-1  | Chapter loading skeleton                   | Transient state | s009 layout (bg + dimmed panel + spinner)          |
| DS-2  | Locked-chapter tap feedback                | Inline toast    | s008 chapter-pill (shake + caption "บทนี้ยังไม่ปลดล็อก") |
| DS-3  | Video-clip player placeholder              | No-op state     | s011 (button looks tappable but does nothing in v1) |

**DS-1 visual rules:** keep the s009 background image, dim the
`.chapter-explain-panel` to `opacity:.65`, replace the headline with a
58×58 spinner using `--panel-blue-deep` for stroke. Hold for max 800 ms;
fall through to live content thereafter.

**DS-2 visual rules:** on a locked chapter row, tap dispatches a
`chapters/showLockHint(id)` action; the row gets a 240 ms `transform:
translateX(-4px)` shake animation and renders an inline-help line
"บทนี้ยังไม่ปลดล็อก" beneath the row, auto-dismissed after 2 000 ms.

**DS-3 visual rules:** the play-icon button on s011 thumbnails is
disabled (`aria-disabled="true"`, dim opacity .5) with tooltip "เร็ว ๆ
นี้". Will be replaced once a video player spec lands.

---

## User Flow

```
                 ┌──────────────────┐
                 │  /home (s004)    │
                 └────────┬─────────┘
                          │ rail "book"
                          ▼
              ┌─────────────────────────┐
              │  /chapters (s005 hub)   │
              └────┬────────┬───────────┘
                   │        │
   "ดาวแห่งการเรียนรู้"    "เนื้อเรื่อง" diamond
                   │        │
                   ▼        ▼
         ┌──────────────┐  ┌────────────────────────┐
         │ /video-clips │  │  /chapters/menu (s008) │
         │   (s011)     │  └───────────┬────────────┘
         └──────────────┘              │  pin tap (unlocked)
                                       ▼
                              ┌────────────────────────┐
                              │ /chapters/{id}/explain │
                              │       (s009)           │
                              └───────────┬────────────┘
                                          │ tap arrow / panel
                                          ▼
                          ┌────────────────────────────────┐
                          │ /chapters/{id}/explain/{n}     │
                          │  (s010)  scene n=0,1,2,…       │
                          └───────────┬────────────────────┘
                                      │
                          last scene? │
                            ┌─────────┴───────────┐
                       no   │                     │ yes
                            ▼                     ▼
                       advance scene       /chapters/menu (s008)
```

`E-book` card (s005 bottom-right): no `href` in the wireframe — treated as
"placeholder, no navigation in v1" (out of scope for this spec; surface
DS-3-style "เร็ว ๆ นี้" if implemented). The "ดาวแห่งการเรียนรู้" badge
on s011 returns to `/chapters` (s005).

---

## Component Tree

```
app/(authed)/
├── chapters/page.tsx              ← s005 hub (route "/chapters")
│   └── <ChaptersHubScreen>
│       ├── <ChapterDiamondLink href="/chapters/menu" />
│       ├── <LearningStarCard href="/video-clips" />
│       └── <EbookCard disabled />              (DS-3-style placeholder)
│
├── chapters/menu/page.tsx          ← s008 list
│   └── <ChaptersMenuScreen>
│       ├── <ChaptersColumn side="left">  (chapters 1, 2)
│       └── <ChaptersColumn side="right"> (chapters 3, 4, 5)
│           └── <ChapterRow>
│               ├── <ChapterPin number={n} />
│               └── <ChapterPill text="บทที่ N" lockState />
│
├── chapters/[id]/explain/page.tsx              ← s009
│   └── <ChapterIntroScreen chapter={chapter}>
│       ├── <ChapterBackground src={chapter.backgroundImageUrl} />
│       └── <ChapterIntroPanel title={chapter.introTitle}>
│           └── <NextArrowOverlay href="/chapters/{id}/explain/0" />
│
├── chapters/[id]/explain/[scene]/page.tsx      ← s010
│   └── <ChapterSceneScreen chapter={chapter} sceneIndex={n}>
│       ├── <ChapterBackground />
│       ├── <SpeakerFigure src={scene.speakerImageUrl} alt="" />
│       └── <DialogPanel speakerName={scene.speakerName} text={scene.text}>
│           └── <NextSceneButton onClick={advance} />
│
└── video-clips/page.tsx            ← s011
    └── <VideoClipsScreen collection={collection}>
        ├── <CollectionBadge href="/chapters">{collection.badge}</CollectionBadge>
        └── <ClipGrid>
            └── <ClipCard>  × N
                └── <PlayIconButton disabled />   (DS-3)
```

### Reusable component contracts

```ts
import type {
    Chapter,
    ChapterId,
    ChapterLockState,
    ChapterScene,
    VideoClipsCollection,
} from "@/types/chapters";

interface ChapterRowProps {
    id: ChapterId;
    title: string;
    lockState: ChapterLockState;
    onLockedTap: (id: ChapterId) => void; // dispatches DS-2
}

interface ChapterIntroPanelProps {
    title: string;
    nextHref: AppRoute;
}

interface DialogPanelProps {
    speakerName: string;
    text: string;            // may include "\n"
    onAdvance: () => void;
}

interface ClipCardProps {
    caption: string;
    /** Disabled in v1 (DS-3). */
    disabled?: boolean;
}
```

---

## Redux State Design

### `chaptersSlice`

```ts
import type { Chapter, ChapterId, ChapterSummary } from "@/types/chapters";

interface ChaptersState {
    /** Index of summaries shown on s008. */
    summaries: ChapterSummary[];
    /** Loaded chapter detail, keyed by id. Sparse — only fetched ones. */
    byId: Record<ChapterId, Chapter | undefined>;
    /** Resolution status of `summaries`. */
    summariesStatus: "idle" | "loading" | "ready" | "error";
    /** Per-chapter detail status, keyed by id. */
    detailStatus: Record<ChapterId, "idle" | "loading" | "ready" | "error">;
    /** Last-tapped locked chapter id; cleared after DS-2 toast hides. */
    lockHintFor: ChapterId | null;
}
```

### `videoClipsSlice`

```ts
import type { VideoClipsCollection } from "@/types/chapters";

interface VideoClipsState {
    collection: VideoClipsCollection | null;
    status: "idle" | "loading" | "ready" | "error";
}
```

### Actions / thunks

| Action                              | Effect                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `chapters/fetchSummaries`           | Loads s008 list. Cached for the session.                                   |
| `chapters/fetchChapter(id)`         | Loads s009/s010 content. Idempotent.                                       |
| `chapters/showLockHint(id)`         | Sets `lockHintFor`; dispatched on tap of a locked row (DS-2).              |
| `chapters/clearLockHint`            | Cleared after 2 000 ms or on next route change.                            |
| `videoClips/fetchCollection`        | Loads s011 collection.                                                     |

### Selectors

```ts
selectChapterSummaries(state): ChapterSummary[]
selectChapter(state, id: ChapterId): Chapter | undefined
selectChapterDetailStatus(state, id): "idle" | "loading" | "ready" | "error"
selectLockHintFor(state): ChapterId | null
selectVideoClipsCollection(state): VideoClipsCollection | null
```

### Local-only state

- `<NextSceneButton>` press animation.
- Hover/focus visuals on chapter pins, clip cards.

---

## Interaction Mapping

### s005 Chapters Hub

| Element                                   | Wireframe behaviour                       | React/Redux mapping                                  |
| ----------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `.chapter-diamond-wrap-link[href=s008]`   | Native nav                                | `<Link href="/chapters/menu">`.                      |
| `.learning-logo[href=s011]`               | Native nav                                | `<Link href="/video-clips">`.                        |
| `.chapter-card-bottom` ("E-book", no href)| Static; no nav                            | Render disabled `<EbookCard>` (placeholder per DS-3 pattern). |

### s008 Chapter Menu

| Element                                         | Wireframe behaviour          | React/Redux mapping                                                                 |
| ----------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `.chapter-row-link[href=s009]` (no lock)        | Native nav                   | `<Link href="/chapters/{id}/explain">`.                                             |
| `.chapter-row-link[href=s009]` (lock-icon shown)| Wireframe still navigates    | Intercept onClick → `event.preventDefault()` → dispatch `chapters/showLockHint(id)` → DS-2. |

### s009 Chapter Intro

| Element                                | Wireframe behaviour                            | React/Redux mapping                              |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `.chapter-explain-link[href=s010]` (inset:0 anchor) | Whole-page hit area               | `<Link>` wrapping the screen; navigates to `/chapters/{id}/explain/0` (first scene). |
| `.chapter-explain-next` arrow          | Decorative; redundant with full-page link      | Visual only.                                     |

### s010 Chapter Scene

| Element                                  | Wireframe behaviour                | React/Redux mapping                                                                 |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `.dialog-next-link[href=s008]`           | Hard nav back to chapter menu      | onClick: if `currentScene < chapter.scenes.length - 1` → `router.push("/chapters/{id}/explain/{n+1}")`; else `router.push("/chapters/menu")` and dispatch `chapters/markCompleted(id)`. |
| `.dialog-text`                           | Static                             | Render `scene.text` with `\n` → `<br/>`.                                            |
| `.speaker-name`                          | Static                             | Render `scene.speakerName`.                                                          |

### s011 Video Clips

| Element                                       | Wireframe behaviour | React/Redux mapping                              |
| --------------------------------------------- | ------------------- | ------------------------------------------------ |
| `.clip-section-label-badge[href=s005]`        | Native nav back     | `<Link href="/chapters">`.                       |
| `.clip-thumbnail` + `.clip-play-icon`         | Static (no handler) | DS-3: render disabled with tooltip "เร็ว ๆ นี้". |

---

## Route Mapping

| Wireframe filename                       | Next.js route                       | Auth          | Notes                                                                |
| ---------------------------------------- | ----------------------------------- | ------------- | -------------------------------------------------------------------- |
| `s005-chapters.html`                     | `/chapters`                         | Protected     | Rail `chapters`; defaults from `s004` icon rail.                     |
| `s008-chapters-menu.html`                | `/chapters/menu`                    | Protected     | List view.                                                           |
| `s009-chapters-explain.html`             | `/chapters/[id]/explain`            | Protected     | `id` is `ChapterId`. 404 unknown id; redirect to `/chapters/menu`.   |
| `s010-chapters-explain-details.html`     | `/chapters/[id]/explain/[scene]`    | Protected     | `scene` is the 0-based index into `chapter.scenes`; mock content should provide 5-6 scenes per chapter. |
| `s011-video-clips.html`                  | `/video-clips`                      | Protected     | Rail `chapters` (shares the green accent).                           |

Next.js dynamic route segments use bracket syntax (`[id]`, `[scene]`) per
Next.js 16 conventions. Both segments must be parsed/validated and any
non-numeric value rejected.

---

## TypeScript Contracts

UI prop shapes are listed in **Component Tree**. Domain shapes
(`Chapter`, `ChapterScene`, `VideoClip`, `VideoClipsCollection`,
`ChapterId`, `ChapterLockState`, `ChapterProgressState`,
`ChapterSummary`) live in `src/types/chapters.ts`.

`Chapter.scenes` is the canonical ordered reader flow. During active
development, fixtures and backend mock responses should populate each
chapter with **5-6 scenes** so `/chapters/[id]/explain/[scene]` can be
exercised across multiple next transitions.

API endpoints — see `docs/specs/backend-architecture.md` for the full spec:

```ts
// GET /api/chapters
// 200 → { chapters: ChapterSummary[] }
type ListChaptersResponse = { chapters: ChapterSummary[] };

// GET /api/chapters/:id
// 200 → Chapter   404 → ApiError{code:"CHAPTER_NOT_FOUND"}
type GetChapterResponse = Chapter;

// GET /api/video-clips
// 200 → VideoClipsCollection
type GetVideoClipsResponse = VideoClipsCollection;
```

Add `CHAPTER_NOT_FOUND` to `src/types/error.ts#ApiErrorCode` — this code is already
returned by `chapterService.ts` and the type has been defined there.

---

## Styling Notes

Reuse the design tokens from `common.css` (see s001 spec). Cluster-
specific notes:

- **Chapter pin (s008).** Reproduce the red `#ff3131` pin with the three
  layers: `.pin-circle` (border + numeral), `.pin-tip` (CSS triangle),
  `.pin-base` (oval). Pin number is rendered in Baloo 2 / 700 to match the
  rounded-numeral aesthetic.
- **Chapter pill (s008).** `background:#59d6dc; border-radius:2.15rem;
  font-size:86px;` — use a single `<ChapterPill>` component so locked +
  unlocked variants share the layout.
- **Lock icon.** SVG asset at `assets/icons/lock-key.svg` (already
  present). Render at 3.35rem inside the pill on locked chapters.
- **Diamond (s005).** Achieve via outer-rotate-45 + inner-counter-rotate
  pattern as in `.chapter-diamond` / `.chapter-diamond-inner`. Do NOT
  re-implement with a clip-path — the wireframe pattern keeps text
  reflowable.
- **Full-bleed scenes (s009/s010).** `.screen` becomes the only container
  (no `.book-shell`); the rail is removed. The chapter background image
  is `<img class="chapter-explain-bg" inset:0 object-fit:cover>`. The
  React port should use `next/image` with `fill` + `priority` and the same
  bg asset.
- **Dialog panel (s010).** Outer card `background:#e8e0d4; border:5px
  solid #cb7b2b; border-radius:56px;`. Speaker name pill is positioned
  at `top:-5.2rem; left:3rem;` so it overlaps the card border. Reuse
  this offset exactly.
- **Active rail accent.** All five chapter screens use `#08c65a`
  (green) — read this from `RAIL_ITEMS[1].activeAccent`, do not re-declare.
- **Motion.** Reuse the standard `.rounded-pill-button` 180 ms hover.
  No additional motion is implied by these wireframes.

**Responsive note:** s009/s010 are full-bleed and break naturally below
1920×1080 if `cover` is preserved; the dialog panel should re-flow to a
bottom-aligned 100% width surface on `< 900px`. The chapter list (s008)
collapses from 2-column → 1-column by stacking the right-page list under
the left-page list.

---

## Accessibility Notes

- `<html lang="th">`.
- Pin numerals on s008 are decorative — wrap them in
  `aria-hidden="true"`; the chapter pill carries the visible text and the
  link's `aria-label="ไปหน้าบทบรรยาย บทที่ N"` (verbatim from wireframe).
- Locked chapter rows: when intercepting the tap, set
  `aria-disabled="true"` on the link and announce the lock hint via a
  `role="status"` live region so AT users get DS-2 too.
- s009 full-screen anchor: keep the `aria-label="ไปหน้ารายละเอียด
  บทบรรยาย"` and ensure focus is reachable via Tab.
- s010 dialog panel: the wireframe currently uses `<section
  aria-label="บทสนทนา">` for the panel and a separate
  `aria-label="กลับไปหน้าเลือกบท"` on the next-arrow. Preserve both. The
  speaker figure has `alt="ตัวละครผู้พูด"`.
- Video play buttons (DS-3): `aria-disabled="true"` while the player is
  not implemented; do not set `disabled` on the underlying button (let
  focus reach it).
- Keyboard: every navigable target must be a real `<a>` or `<button>`
  with visible `:focus-visible` ring (reuse the common.css rule).

---

## Edge Cases

1. **Unknown chapter id in URL** → redirect to `/chapters/menu`. Do not
   show 404 in the chapter shell.
2. **`scene` index out of range** (`< 0` or `>= scenes.length`) →
   redirect to `/chapters/menu`.
3. **Locked chapter accessed by deep-link** (e.g. user pasted
   `/chapters/3/explain`) → server may 403; UI redirects to
   `/chapters/menu` and surfaces DS-2 hint inline.
4. **Empty chapter** (zero scenes) → render the s009 intro and route the
   single tap directly to `/chapters/menu` (treated as immediately
   completed). Mark `chapters/markCompleted` so the list reflects it.
5. **Slow chapter detail fetch** (> 800 ms) → show DS-1 skeleton.
6. **Background image fails to load** → fall back to a solid
   `--book-fill` background; do not block panel rendering.
7. **User navigates away mid-scene** → no save needed; scene cursor is
   route-state, not Redux.
8. **Two tabs open at the same chapter** → harmless; each tab tracks
   its own scene cursor in URL.
9. **Speaker image missing** → render an `aria-hidden` SVG placeholder
   silhouette.
10. **Video clip tapped while DS-3** → no-op; focus stays on the
    button.
11. **Returning to `/chapters` after completing a chapter** → summaries
    reload (or are optimistically updated) so the next chapter unlocks.

---

## Implementation Plan

1. Land `src/types/chapters.ts` (this commit) and refresh
   `src/types/navigation.ts` with the new screen ids.
2. `chaptersSlice` with `fetchSummaries` thunk; storybook the s008 list
   against fixture data.
3. `ChapterPin` + `ChapterPill` + `ChapterRow` components; verify lock
   variant + DS-2 shake animation.
4. `/chapters` hub (s005). The `EbookCard` is a no-op placeholder.
5. `/chapters/menu` (s008) with locked-tap interception.
6. `fetchChapter` thunk; render `/chapters/[id]/explain` (s009) with
   DS-1 skeleton.
7. Scene cursor route + `/chapters/[id]/explain/[scene]` (s010); wire
   advance / completion.
8. `videoClipsSlice` + `/video-clips` (s011) with DS-3 disabled play
   buttons.
9. Acceptance pass + a11y audit of every screen.

Dependencies: 1 unblocks 2; 5 needs 3; 7 needs 6.

---

## Acceptance Criteria

1. From `/home`, tapping the rail "book" icon navigates to `/chapters`
   with the rail "chapters" item active and accented `#08c65a`.
2. Tapping the diamond on `/chapters` navigates to `/chapters/menu`,
   showing 5 chapter rows split 2/3 between left and right pages.
3. Chapter 1 (no lock icon) is tappable; chapters 2-5 show the
   `lock-key.svg` icon and tapping any of them triggers DS-2 instead of
   navigating.
4. Tapping chapter 1 navigates to `/chapters/1/explain` and renders the
   s009 layout with the bg image, "บทบรรยาย" panel, and orange next
   arrow.
5. Tapping the panel/arrow navigates to `/chapters/1/explain/0` (first
   scene); the dialog panel shows the speaker name and copy, and the loaded
   chapter data contains 5-6 ordered scenes.
6. Repeated next-arrow taps advance the scene cursor through the remaining
   scenes; the final scene's
   tap routes to `/chapters/menu` and the chapter row's lock state for
   chapter 2 flips to "unlocked".
7. From `/chapters`, tapping "ดาวแห่งการเรียนรู้" navigates to
   `/video-clips` with two clip thumbnails visible. Play buttons are
   `aria-disabled="true"`.
8. From `/video-clips`, tapping the green "ดาวแห่งการเรียนรู้" badge
   returns to `/chapters`.
9. All Thai copy is preserved verbatim from the wireframes.
10. The icon rail accent stays `#08c65a` across s005/s008/s009/s010/s011
    even though s009 and s010 are full-bleed (the rail is hidden on those
    two screens to match the wireframe).

---

## Shared Type Files

| File                          | Exports                                                                                                  | Notes                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/types/chapters.ts`       | `ChapterId`, `ChapterLockState`, `ChapterProgressState`, `ChapterSummary`, `ChapterScene`, `Chapter`, `VideoClip`, `VideoClipsCollection` | New file — created in this commit.                                                                 |
| `src/types/navigation.ts`     | `ScreenId`, `AppRoute`, `SCREEN_TO_RAIL`, `NavRailItem`, `RAIL_ITEMS`                                    | Extended in this commit with s008–s011 ids and `/chapters/...`, `/video-clips` routes.             |
| `src/types/error.ts`          | `CHAPTER_NOT_FOUND`                                                                                       | Defined — used by `chapterService.ts`. See `docs/specs/backend-architecture.md`.                   |
