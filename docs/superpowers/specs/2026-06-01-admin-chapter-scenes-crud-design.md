# Admin Chapter Scenes CRUD — Design Spec

**Date:** 2026-06-01
**Status:** Approved

## Problem

`/admin/chapters` lets admins manage top-level chapter metadata, but there is no UI or API to manage the scenes (subchapters) that make up each chapter's dialogue flow. Scenes live in `chapter_scenes` in MongoDB and are seeded statically; admins cannot create, edit, reorder, or delete them.

## Goal

Add a detail page at `/admin/chapters/[id]` that shows chapter fields at the top and a full scenes table below, with complete CRUD for both the chapter and its scenes.

---

## Architecture

Follows the existing admin pattern: DB functions → service layer → API routes → RTK Query → page component.

### 1. DB Layer (`frontend/lib/db.ts`)

Three new functions appended to the existing admin CRUD section:

```ts
insertChapterSceneDoc(scene: ChapterSceneDoc): Promise<void>
updateChapterSceneDoc(id: string, patch: Partial<ChapterSceneDoc>): Promise<ChapterSceneDoc | undefined>
deleteChapterSceneDoc(id: string): Promise<boolean>
```

Memory-store and MongoDB implementations, consistent with all existing db functions.

### 2. Service Layer (`frontend/lib/services/adminService.ts`)

Five new functions:

```ts
adminGetChapter(id: number): Promise<Chapter>         // full chapter (no scenes array needed, just fields)
adminListScenes(chapterId: number): Promise<ChapterScene[]>
adminCreateScene(chapterId: number, body: CreateSceneRequest): Promise<ChapterScene>
adminUpdateScene(sceneId: string, body: UpdateSceneRequest): Promise<ChapterScene>
adminDeleteScene(sceneId: string): Promise<void>
```

`adminGetChapter` returns the chapter fields (id, title, introTitle, lockState, backgroundImageUrl) with `progress: "not-started"` and `scenes: []` — the page loads scenes separately.

### 3. API Routes

| Method | File | Action |
|--------|------|--------|
| `GET` | `app/api/admin/chapters/[id]/route.ts` | Added alongside existing PATCH/DELETE |
| `GET` | `app/api/admin/chapters/[id]/scenes/route.ts` | List scenes for chapter |
| `POST` | `app/api/admin/chapters/[id]/scenes/route.ts` | Create scene |
| `PATCH` | `app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts` | Update scene |
| `DELETE` | `app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts` | Delete scene |

All routes call `requireAdmin(req)`.

### 4. RTK Query (`frontend/store/adminApi.ts`)

Five new endpoints injected into `adminApi`:

```ts
getAdminChapter(id: number)           → Chapter          tag: "Admin"
getAdminScenes(chapterId: number)     → ChapterScene[]   tag: "Admin"
createScene(chapterId, body)          → ChapterScene      invalidates: "Admin"
updateScene(sceneId, body)            → ChapterScene      invalidates: "Admin"
deleteScene(sceneId)                  → void              invalidates: "Admin"
```

### 5. Page (`frontend/app/(admin)/admin/chapters/[id]/page.tsx`)

`"use client"` component. Uses the 5 new hooks plus the existing `useUpdateChapterMutation`.

**Layout:**
```
← Back to Chapters          [Chapter Title]

┌─ Chapter Info ────────────────────────────────┐
│ Title [___]  Intro Title [___]  Lock [▼]      │
│ Background URL [___________________]  [Save]  │
└───────────────────────────────────────────────┘

[Add/Edit scene form card — visible when showSceneForm=true]

┌─ Scenes ──────────────────────────[+ Add Scene]─┐
│ idx │ Speaker Name │ Image URL │ Text │ Actions  │
│  0  │ ผู้บรรยาย   │ /img/...  │ ...  │ Edit Del │
└──────────────────────────────────────────────────┘
```

**State:**
- `chapterForm` — controlled fields for chapter info section
- `showSceneForm` / `editSceneId` / `sceneForm` — scene add/edit form state

**Chapter list page change:** The "Edit" button in `app/(admin)/admin/chapters/page.tsx` changes from opening an inline form to navigating to `/admin/chapters/[id]`. The inline chapter edit form and its state are removed from that page.

---

## Request/Response Shapes

### Scene payloads

```ts
interface CreateSceneRequest {
  idx: number;
  speakerName: string;
  speakerImageUrl?: string;
  text: string;
}

type UpdateSceneRequest = Partial<CreateSceneRequest>;
```

### GET /api/admin/chapters/[id]/scenes response
```json
{ "scenes": [ { "id": "c1s0", "index": 0, "speakerName": "ผู้บรรยาย", "speakerImageUrl": "...", "text": "..." } ] }
```

`index` maps to `ChapterScene.index` (camelCase of `idx`).

---

## Data Model

`ChapterSceneDoc` (already in `lib/db.ts`):
```ts
{
  id: string;          // e.g. "c1s0"
  chapter_id: number;
  idx: number;         // 0-based sort order
  speaker_name: string;
  speaker_image_url?: string | null;
  text: string;
}
```

New scenes get a uuid-based id (e.g. `scene-<uuid-short>`). `idx` is supplied explicitly by the admin.

---

## Error Handling

- Non-existent chapter or scene → 404 with appropriate code (`CHAPTER_NOT_FOUND` / `SCENE_NOT_FOUND`)
- Non-admin → 403
- Unauthenticated → 401

---

## Testing

New unit tests in `tests/unit/services/adminService.test.ts` (appended):
- `adminListScenes` returns seeded scenes for chapter
- `adminCreateScene` adds scene and it appears in list
- `adminUpdateScene` mutates a scene; 404 for missing id
- `adminDeleteScene` removes a scene; 404 for missing id
