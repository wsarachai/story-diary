# Admin Chapter Scenes CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/admin/chapters/[id]` detail page with full CRUD for chapter fields and its scenes (subchapters).

**Architecture:** DB functions → service layer → API routes → RTK Query hooks → page component. The chapters list page Edit button is changed to navigate to the detail page instead of opening an inline form.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, RTK Query, MongoDB (memory-store in tests), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-admin-chapter-scenes-crud-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `frontend/lib/db.ts` | Add insert/update/delete for ChapterSceneDoc |
| Modify | `frontend/lib/services/adminService.ts` | Add adminGetChapter + scene CRUD service functions |
| Modify | `frontend/app/api/admin/chapters/[id]/route.ts` | Add GET handler |
| Create | `frontend/app/api/admin/chapters/[id]/scenes/route.ts` | GET list + POST create scene |
| Create | `frontend/app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts` | PATCH + DELETE scene |
| Modify | `frontend/store/adminApi.ts` | Add scene request types + 5 new RTK Query endpoints |
| Create | `frontend/app/(admin)/admin/chapters/[id]/page.tsx` | Detail page: chapter info + scenes table |
| Modify | `frontend/app/(admin)/admin/chapters/page.tsx` | Change Edit button to navigate; remove inline edit form |
| Modify | `frontend/tests/unit/services/adminService.test.ts` | Append scene CRUD tests |

---

## Task 1: DB layer — scene CRUD functions

**Files:**
- Modify: `frontend/lib/db.ts` (append after existing admin section)

- [ ] **Step 1: Append three functions to `frontend/lib/db.ts`**

Add at the very end of the file, after `deleteQuizQuestionDoc`:

```ts
// ── Admin: Chapter Scene CRUD ─────────────────────────────────────────────────

export async function insertChapterSceneDoc(scene: ChapterSceneDoc): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    memoryStore.chapterScenes.push({ ...scene });
    return;
  }
  await chapterScenesCollection().insertOne(scene);
}

export async function updateChapterSceneDoc(id: string, patch: Partial<ChapterSceneDoc>): Promise<ChapterSceneDoc | undefined> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapterScenes.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    memoryStore.chapterScenes[index] = { ...memoryStore.chapterScenes[index], ...patch };
    return memoryStore.chapterScenes[index];
  }
  const result = await chapterScenesCollection().findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ?? undefined;
}

export async function deleteChapterSceneDoc(id: string): Promise<boolean> {
  await initializeDatabase();
  if (mode === "memory") {
    const index = memoryStore.chapterScenes.findIndex((s) => s.id === id);
    if (index === -1) return false;
    memoryStore.chapterScenes.splice(index, 1);
    return true;
  }
  const result = await chapterScenesCollection().deleteOne({ id });
  return result.deletedCount > 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add scene insert/update/delete functions"
```

---

## Task 2: Service layer — scene CRUD + adminGetChapter

**Files:**
- Modify: `frontend/lib/services/adminService.ts`

- [ ] **Step 1: Add imports at the top of `frontend/lib/services/adminService.ts`**

Change the import from `@/lib/db` to also include the three new functions and `listChapterScenesByChapterId`:

```ts
import {
  listChaptersDocs,
  findChapterById,
  getNextChapterId,
  insertChapterDoc,
  updateChapterDoc,
  deleteChapterDoc,
  listEBooksDocs,
  insertEBookDoc,
  updateEBookDoc,
  deleteEBookDoc,
  listQuizQuestionsDocs,
  findQuizQuestionById,
  insertQuizQuestionDoc,
  updateQuizQuestionDoc,
  deleteQuizQuestionDoc,
  listChapterScenesByChapterId,
  insertChapterSceneDoc,
  updateChapterSceneDoc,
  deleteChapterSceneDoc,
} from "@/lib/db";
```

Also add `ChapterScene` to the import from `@/types/chapters`:

```ts
import type { ChapterSummary, Chapter, ChapterScene } from "@/types/chapters";
```

- [ ] **Step 2: Add scene request types and service functions**

Add after the existing `adminDeleteChapter` function (before the `// ── EBooks` section):

```ts
// ── Admin: Chapter detail + Scene CRUD ───────────────────────────────────────

export async function adminGetChapter(id: number): Promise<Chapter> {
  const row = await findChapterById(id);
  if (!row) throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${id} not found`);
  return {
    id: row.id,
    title: row.title,
    introTitle: row.intro_title,
    ...(row.background_image_url ? { backgroundImageUrl: row.background_image_url } : {}),
    lockState: row.lock_state,
    progress: "not-started",
    scenes: [],
  };
}

function sceneDocToModel(doc: { id: string; chapter_id: number; idx: number; speaker_name: string; speaker_image_url?: string | null; text: string }): ChapterScene {
  return {
    id: doc.id,
    index: doc.idx,
    speakerName: doc.speaker_name,
    ...(doc.speaker_image_url ? { speakerImageUrl: doc.speaker_image_url } : {}),
    text: doc.text,
  };
}

export async function adminListScenes(chapterId: number): Promise<ChapterScene[]> {
  const rows = await listChapterScenesByChapterId(chapterId);
  return rows.map(sceneDocToModel);
}

export interface CreateSceneRequest {
  idx: number;
  speakerName: string;
  speakerImageUrl?: string;
  text: string;
}

export type UpdateSceneRequest = Partial<CreateSceneRequest>;

export async function adminCreateScene(chapterId: number, body: CreateSceneRequest): Promise<ChapterScene> {
  const chapter = await findChapterById(chapterId);
  if (!chapter) throw Errors.notFound("CHAPTER_NOT_FOUND", `Chapter ${chapterId} not found`);

  const id = `scene-${uuidv4().slice(0, 8)}`;
  await insertChapterSceneDoc({
    id,
    chapter_id: chapterId,
    idx: body.idx,
    speaker_name: body.speakerName,
    speaker_image_url: body.speakerImageUrl ?? null,
    text: body.text,
  });
  return {
    id,
    index: body.idx,
    speakerName: body.speakerName,
    ...(body.speakerImageUrl ? { speakerImageUrl: body.speakerImageUrl } : {}),
    text: body.text,
  };
}

export async function adminUpdateScene(sceneId: string, body: UpdateSceneRequest): Promise<ChapterScene> {
  const patch: Record<string, unknown> = {};
  if (body.idx !== undefined) patch.idx = body.idx;
  if (body.speakerName !== undefined) patch.speaker_name = body.speakerName;
  if (body.speakerImageUrl !== undefined) patch.speaker_image_url = body.speakerImageUrl || null;
  if (body.text !== undefined) patch.text = body.text;

  const updated = await updateChapterSceneDoc(sceneId, patch as Parameters<typeof updateChapterSceneDoc>[1]);
  if (!updated) throw Errors.notFound("SCENE_NOT_FOUND", `Scene ${sceneId} not found`);
  return sceneDocToModel(updated);
}

export async function adminDeleteScene(sceneId: string): Promise<void> {
  const deleted = await deleteChapterSceneDoc(sceneId);
  if (!deleted) throw Errors.notFound("SCENE_NOT_FOUND", `Scene ${sceneId} not found`);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/services/adminService.ts
git commit -m "feat(admin-service): add adminGetChapter and scene CRUD service functions"
```

---

## Task 3: Tests for scene service functions

**Files:**
- Modify: `frontend/tests/unit/services/adminService.test.ts` (append)

- [ ] **Step 1: Append scene tests to `frontend/tests/unit/services/adminService.test.ts`**

Add after the last `describe` block:

```ts
// ── Chapter Scenes ────────────────────────────────────────────────────────────

import {
  adminGetChapter,
  adminListScenes,
  adminCreateScene,
  adminUpdateScene,
  adminDeleteScene,
} from "@/lib/services/adminService";

describe("adminGetChapter", () => {
  it("returns chapter fields for a valid id", async () => {
    const ch = await adminGetChapter(1);
    expect(ch.id).toBe(1);
    expect(ch.title).toBe("บทที่ 1: เริ่มต้นการเดินทาง");
    expect(ch.scenes).toHaveLength(0);
  });

  it("throws 404 for missing chapter", async () => {
    await expect(adminGetChapter(9999)).rejects.toMatchObject({ statusCode: 404, code: "CHAPTER_NOT_FOUND" });
  });
});

describe("adminListScenes", () => {
  it("returns seeded scenes for chapter 1", async () => {
    const scenes = await adminListScenes(1);
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0]).toHaveProperty("id");
    expect(scenes[0]).toHaveProperty("index");
    expect(scenes[0]).toHaveProperty("speakerName");
    expect(scenes[0]).toHaveProperty("text");
  });

  it("returns empty array for chapter with no scenes", async () => {
    const scenes = await adminListScenes(9999);
    expect(scenes).toHaveLength(0);
  });
});

describe("adminCreateScene", () => {
  it("creates a scene and returns it", async () => {
    const scene = await adminCreateScene(1, {
      idx: 99,
      speakerName: "ทดสอบ",
      speakerImageUrl: "/img/test.png",
      text: "ข้อความทดสอบ",
    });
    expect(scene.index).toBe(99);
    expect(scene.speakerName).toBe("ทดสอบ");
    expect(scene.speakerImageUrl).toBe("/img/test.png");
    expect(scene.text).toBe("ข้อความทดสอบ";
    expect(typeof scene.id).toBe("string");
  });

  it("new scene appears in list", async () => {
    const before = await adminListScenes(1);
    await adminCreateScene(1, { idx: 50, speakerName: "ผู้บรรยาย", text: "เพิ่มใหม่" });
    const after = await adminListScenes(1);
    expect(after.length).toBe(before.length + 1);
  });

  it("throws 404 for non-existent chapter", async () => {
    await expect(
      adminCreateScene(9999, { idx: 0, speakerName: "x", text: "x" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminUpdateScene", () => {
  it("updates scene text", async () => {
    const scenes = await adminListScenes(1);
    const id = scenes[0].id;
    const updated = await adminUpdateScene(id, { text: "ข้อความใหม่" });
    expect(updated.text).toBe("ข้อความใหม่");
  });

  it("updates speakerName", async () => {
    const scenes = await adminListScenes(1);
    const id = scenes[0].id;
    const updated = await adminUpdateScene(id, { speakerName: "ชื่อใหม่" });
    expect(updated.speakerName).toBe("ชื่อใหม่");
  });

  it("throws 404 for missing scene", async () => {
    await expect(adminUpdateScene("ghost-id", { text: "x" })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminDeleteScene", () => {
  it("removes scene from list", async () => {
    const scenes = await adminListScenes(1);
    const id = scenes[0].id;
    await adminDeleteScene(id);
    const after = await adminListScenes(1);
    expect(after.some((s) => s.id === id)).toBe(false);
  });

  it("throws 404 for missing scene", async () => {
    await expect(adminDeleteScene("ghost")).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 2: Fix the import block at the top of the test file**

The test file already imports some functions from `adminService`. Add the new ones to the existing import:

```ts
import {
  adminListChapters,
  adminCreateChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminListEBooks,
  adminCreateEBook,
  adminUpdateEBook,
  adminDeleteEBook,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGetChapter,
  adminListScenes,
  adminCreateScene,
  adminUpdateScene,
  adminDeleteScene,
} from "@/lib/services/adminService";
```

(Remove the inline `import` statements added in the appended block — all imports must be at the top.)

Also fix the typo in the test (missing closing parenthesis):
```ts
    expect(scene.text).toBe("ข้อความทดสอบ");  // was missing closing )
```

- [ ] **Step 3: Run tests and confirm they pass**

```bash
cd frontend
pnpm test
```

Expected output: all tests pass, scene describe blocks present.

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/unit/services/adminService.test.ts
git commit -m "test(admin): add scene CRUD unit tests"
```

---

## Task 4: API routes — GET chapter + scene endpoints

**Files:**
- Modify: `frontend/app/api/admin/chapters/[id]/route.ts`
- Create: `frontend/app/api/admin/chapters/[id]/scenes/route.ts`
- Create: `frontend/app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts`

- [ ] **Step 1: Add GET to `frontend/app/api/admin/chapters/[id]/route.ts`**

Replace the entire file content with:

```ts
import { requireAdmin } from "@/lib/api-auth";
import { adminGetChapter, adminUpdateChapter, adminDeleteChapter } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const chapter = await adminGetChapter(Number(id));
    return ok(chapter);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const chapter = await adminUpdateChapter(Number(id), body);
    return ok(chapter);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await adminDeleteChapter(Number(id));
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
```

- [ ] **Step 2: Create `frontend/app/api/admin/chapters/[id]/scenes/route.ts`**

```ts
import { requireAdmin } from "@/lib/api-auth";
import { adminListScenes, adminCreateScene } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const scenes = await adminListScenes(Number(id));
    return ok({ scenes });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const scene = await adminCreateScene(Number(id), body);
    return ok(scene, 201);
  } catch (err) {
    return handleError(err);
  }
}
```

- [ ] **Step 3: Create `frontend/app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts`**

```ts
import { requireAdmin } from "@/lib/api-auth";
import { adminUpdateScene, adminDeleteScene } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; sceneId: string }> }) {
  try {
    await requireAdmin(req);
    const { sceneId } = await ctx.params;
    const body = await req.json();
    const scene = await adminUpdateScene(sceneId, body);
    return ok(scene);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; sceneId: string }> }) {
  try {
    await requireAdmin(req);
    const { sceneId } = await ctx.params;
    await adminDeleteScene(sceneId);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/admin/chapters/[id]/route.ts \
        "frontend/app/api/admin/chapters/[id]/scenes/route.ts" \
        "frontend/app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts"
git commit -m "feat(api): add admin chapter GET and scene CRUD routes"
```

---

## Task 5: RTK Query — scene endpoints

**Files:**
- Modify: `frontend/store/adminApi.ts`

- [ ] **Step 1: Add scene request types after `UpdateChapterRequest` in `frontend/store/adminApi.ts`**

```ts
// ── Scene admin payloads ────────────────────────────────────────────────────

export interface CreateSceneRequest {
  idx: number;
  speakerName: string;
  speakerImageUrl?: string;
  text: string;
}

export type UpdateSceneRequest = Partial<CreateSceneRequest>;
```

- [ ] **Step 2: Add `ChapterScene` to the chapters import**

```ts
import type { Chapter, ChapterSummary, ChapterLockState, ChapterScene } from "@/types/chapters";
```

- [ ] **Step 3: Add 5 new endpoints inside `adminApi.injectEndpoints`**

After the `deleteChapter` endpoint and before `// EBooks`:

```ts
    // Chapter detail
    getAdminChapter: builder.query<Chapter, number>({
      query: (id) => `/admin/chapters/${id}`,
      providesTags: ["Admin"],
    }),

    // Scenes
    getAdminScenes: builder.query<ChapterScene[], number>({
      query: (chapterId) => `/admin/chapters/${chapterId}/scenes`,
      transformResponse: (res: { scenes: ChapterScene[] }) => res.scenes,
      providesTags: ["Admin"],
    }),
    createScene: builder.mutation<ChapterScene, { chapterId: number; body: CreateSceneRequest }>({
      query: ({ chapterId, body }) => ({ url: `/admin/chapters/${chapterId}/scenes`, method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),
    updateScene: builder.mutation<ChapterScene, { sceneId: string; body: UpdateSceneRequest }>({
      query: ({ sceneId, body }) => ({ url: `/admin/chapters/scenes/${sceneId}`, method: "PATCH", body }),
      invalidatesTags: ["Admin"],
    }),
    deleteScene: builder.mutation<void, string>({
      query: (sceneId) => ({ url: `/admin/chapters/scenes/${sceneId}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),
```

**Note:** `updateScene` and `deleteScene` use `/admin/chapters/scenes/:sceneId` — a flat path — because the route handler only needs `sceneId`, not `chapterId`.

- [ ] **Step 4: Export the new hooks**

Add to the `export const { ... }` block:

```ts
  useGetAdminChapterQuery,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
```

- [ ] **Step 5: Update the scene route files to match the flat URL**

`updateScene` and `deleteScene` use `/api/admin/chapters/scenes/[sceneId]` (no `[id]` in the path). Create this route file instead of the nested one from Task 4 Step 3:

Create `frontend/app/api/admin/chapters/scenes/[sceneId]/route.ts`:

```ts
import { requireAdmin } from "@/lib/api-auth";
import { adminUpdateScene, adminDeleteScene } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";

export async function PATCH(req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  try {
    await requireAdmin(req);
    const { sceneId } = await ctx.params;
    const body = await req.json();
    const scene = await adminUpdateScene(sceneId, body);
    return ok(scene);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  try {
    await requireAdmin(req);
    const { sceneId } = await ctx.params;
    await adminDeleteScene(sceneId);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
```

Delete the previously created nested file `frontend/app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts` (it is now replaced by the flat path).

- [ ] **Step 6: Commit**

```bash
git add frontend/store/adminApi.ts \
        "frontend/app/api/admin/chapters/scenes/[sceneId]/route.ts"
git rm "frontend/app/api/admin/chapters/[id]/scenes/[sceneId]/route.ts"
git commit -m "feat(store): add scene RTK Query endpoints and flat scene mutation routes"
```

---

## Task 6: Detail page — `/admin/chapters/[id]`

**Files:**
- Create: `frontend/app/(admin)/admin/chapters/[id]/page.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "frontend/app/(admin)/admin/chapters/[id]"
```

- [ ] **Step 2: Create `frontend/app/(admin)/admin/chapters/[id]/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminChapterQuery,
  useUpdateChapterMutation,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
  type CreateSceneRequest,
  type UpdateSceneRequest,
} from "@/store/adminApi";
import type { ChapterScene } from "@/types/chapters";

const EMPTY_SCENE: CreateSceneRequest = {
  idx: 0,
  speakerName: "",
  speakerImageUrl: "",
  text: "",
};

export default function AdminChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = Number(params.id);

  const { data: chapter, isLoading: chapterLoading } = useGetAdminChapterQuery(chapterId);
  const { data: scenes, isLoading: scenesLoading } = useGetAdminScenesQuery(chapterId);
  const [updateChapter] = useUpdateChapterMutation();
  const [createScene] = useCreateSceneMutation();
  const [updateScene] = useUpdateSceneMutation();
  const [deleteScene] = useDeleteSceneMutation();

  const [chapterForm, setChapterForm] = useState({
    title: "",
    introTitle: "",
    lockState: "unlocked" as "unlocked" | "locked",
    backgroundImageUrl: "",
  });

  useEffect(() => {
    if (chapter) {
      setChapterForm({
        title: chapter.title,
        introTitle: chapter.introTitle,
        lockState: chapter.lockState,
        backgroundImageUrl: chapter.backgroundImageUrl ?? "",
      });
    }
  }, [chapter]);

  const [showSceneForm, setShowSceneForm] = useState(false);
  const [editSceneId, setEditSceneId] = useState<string | null>(null);
  const [sceneForm, setSceneForm] = useState<CreateSceneRequest>(EMPTY_SCENE);

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    await updateChapter({ id: chapterId, body: chapterForm });
  }

  function openCreateScene() {
    setEditSceneId(null);
    setSceneForm(EMPTY_SCENE);
    setShowSceneForm(true);
  }

  function openEditScene(scene: ChapterScene) {
    setEditSceneId(scene.id);
    setSceneForm({
      idx: scene.index,
      speakerName: scene.speakerName,
      speakerImageUrl: scene.speakerImageUrl ?? "",
      text: scene.text,
    });
    setShowSceneForm(true);
  }

  function closeSceneForm() {
    setShowSceneForm(false);
    setEditSceneId(null);
    setSceneForm(EMPTY_SCENE);
  }

  async function handleSubmitScene(e: React.FormEvent) {
    e.preventDefault();
    const body: CreateSceneRequest = {
      ...sceneForm,
      speakerImageUrl: sceneForm.speakerImageUrl || undefined,
    };
    if (editSceneId !== null) {
      await updateScene({ sceneId: editSceneId, body: body as UpdateSceneRequest });
    } else {
      await createScene({ chapterId, body });
    }
    closeSceneForm();
  }

  async function handleDeleteScene(sceneId: string) {
    if (!window.confirm("ลบ scene นี้หรือไม่?")) return;
    await deleteScene(sceneId);
  }

  if (chapterLoading) return <div className="admin-layout"><AdminSidebar /><div className="admin-main-wrapper"><main className="admin-main"><div className="chapter-spinner" /></main></div></div>;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-wrapper">
        <main className="admin-main">

          <div className="admin-page-header">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => router.push("/admin/chapters")}>
                ← Chapters
              </button>
              <h1 className="admin-page-title">{chapter?.title ?? "Chapter"}</h1>
            </div>
          </div>

          {/* Chapter info form */}
          <div className="admin-form-card">
            <h2>Chapter Info</h2>
            <form onSubmit={handleSaveChapter}>
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label className="admin-label">Title</label>
                  <input className="admin-input" value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} required />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Intro Title</label>
                  <input className="admin-input" value={chapterForm.introTitle} onChange={(e) => setChapterForm({ ...chapterForm, introTitle: e.target.value })} />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Lock State</label>
                  <select className="admin-select" value={chapterForm.lockState} onChange={(e) => setChapterForm({ ...chapterForm, lockState: e.target.value as "unlocked" | "locked" })}>
                    <option value="unlocked">unlocked</option>
                    <option value="locked">locked</option>
                  </select>
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Background Image URL (optional)</label>
                  <input className="admin-input" value={chapterForm.backgroundImageUrl} onChange={(e) => setChapterForm({ ...chapterForm, backgroundImageUrl: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary">บันทึก</button>
              </div>
            </form>
          </div>

          {/* Scene add/edit form */}
          {showSceneForm && (
            <div className="admin-form-card">
              <h2>{editSceneId !== null ? "แก้ไข Scene" : "เพิ่ม Scene ใหม่"}</h2>
              <form onSubmit={handleSubmitScene}>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label className="admin-label">Index (idx)</label>
                    <input className="admin-input" type="number" value={sceneForm.idx} onChange={(e) => setSceneForm({ ...sceneForm, idx: Number(e.target.value) })} required />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Speaker Name</label>
                    <input className="admin-input" value={sceneForm.speakerName} onChange={(e) => setSceneForm({ ...sceneForm, speakerName: e.target.value })} required />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Speaker Image URL (optional)</label>
                    <input className="admin-input" value={sceneForm.speakerImageUrl ?? ""} onChange={(e) => setSceneForm({ ...sceneForm, speakerImageUrl: e.target.value })} />
                  </div>
                  <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="admin-label">Text</label>
                    <textarea className="admin-input" rows={4} value={sceneForm.text} onChange={(e) => setSceneForm({ ...sceneForm, text: e.target.value })} required style={{ resize: "vertical" }} />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={closeSceneForm}>ยกเลิก</button>
                  <button type="submit" className="admin-btn admin-btn-primary">{editSceneId !== null ? "บันทึก" : "เพิ่ม"}</button>
                </div>
              </form>
            </div>
          )}

          {/* Scenes table */}
          <div className="admin-page-header" style={{ marginTop: "2rem" }}>
            <h2 className="admin-page-title" style={{ fontSize: "1.2rem" }}>Scenes</h2>
            <button className="admin-btn admin-btn-primary" onClick={openCreateScene}>+ Add Scene</button>
          </div>

          {scenesLoading ? (
            <div className="chapter-spinner" />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>idx</th>
                    <th>Speaker Name</th>
                    <th>Speaker Image URL</th>
                    <th>Text</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(scenes ?? []).map((scene) => (
                    <tr key={scene.id}>
                      <td>{scene.index}</td>
                      <td>{scene.speakerName}</td>
                      <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scene.speakerImageUrl ?? "—"}</td>
                      <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scene.text}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button className="admin-btn admin-btn-secondary" onClick={() => openEditScene(scene)}>Edit</button>
                          <button className="admin-btn admin-btn-danger" onClick={() => handleDeleteScene(scene.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(admin)/admin/chapters/[id]/page.tsx"
git commit -m "feat(admin): add chapter detail page with scene CRUD"
```

---

## Task 7: Update chapters list page — Edit navigates to detail

**Files:**
- Modify: `frontend/app/(admin)/admin/chapters/page.tsx`

- [ ] **Step 1: Replace `frontend/app/(admin)/admin/chapters/page.tsx`**

The inline edit form and its state are removed. Edit button navigates to the detail page.

```tsx
"use client";

import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminChaptersQuery,
  useCreateChapterMutation,
  useDeleteChapterMutation,
  type CreateChapterRequest,
} from "@/store/adminApi";
import { useState } from "react";

const EMPTY_FORM: CreateChapterRequest = {
  title: "",
  introTitle: "",
  lockState: "unlocked",
  backgroundImageUrl: "",
};

export default function AdminChaptersPage() {
  const router = useRouter();
  const { data: chapters, isLoading } = useGetAdminChaptersQuery();
  const [createChapter] = useCreateChapterMutation();
  const [deleteChapter] = useDeleteChapterMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateChapterRequest>(EMPTY_FORM);

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createChapter(form);
    closeForm();
  }

  async function handleDelete(id: number) {
    if (!window.confirm("ลบบทนี้หรือไม่?")) return;
    await deleteChapter(id);
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-wrapper">
        <main className="admin-main">
          <div className="admin-page-header">
            <h1 className="admin-page-title">Chapters</h1>
            <button className="admin-btn admin-btn-primary" onClick={openCreate}>
              + เพิ่มบท
            </button>
          </div>

          {showForm && (
            <div className="admin-form-card">
              <h2>เพิ่มบทใหม่</h2>
              <form onSubmit={handleSubmit}>
                <div className="admin-form-grid">
                  <div className="admin-form-field">
                    <label className="admin-label">Title</label>
                    <input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Intro Title</label>
                    <input className="admin-input" value={form.introTitle} onChange={(e) => setForm({ ...form, introTitle: e.target.value })} required />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Lock State</label>
                    <select className="admin-select" value={form.lockState} onChange={(e) => setForm({ ...form, lockState: e.target.value as "unlocked" | "locked" })}>
                      <option value="unlocked">unlocked</option>
                      <option value="locked">locked</option>
                    </select>
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Background Image URL (optional)</label>
                    <input className="admin-input" value={form.backgroundImageUrl ?? ""} onChange={(e) => setForm({ ...form, backgroundImageUrl: e.target.value })} />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm}>ยกเลิก</button>
                  <button type="submit" className="admin-btn admin-btn-primary">เพิ่ม</button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="chapter-spinner" />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Lock State</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(chapters ?? []).map((ch) => (
                    <tr key={ch.id}>
                      <td>{ch.id}</td>
                      <td>{ch.title}</td>
                      <td>
                        <span className={`admin-badge ${ch.lockState === "unlocked" ? "admin-badge-green" : "admin-badge-yellow"}`}>
                          {ch.lockState}
                        </span>
                      </td>
                      <td>{ch.progress}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button className="admin-btn admin-btn-secondary" onClick={() => router.push(`/admin/chapters/${ch.id}`)}>
                            Edit →
                          </button>
                          <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(ch.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd frontend
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(admin)/admin/chapters/page.tsx"
git commit -m "feat(admin): change Edit button to navigate to chapter detail page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ DB functions: insert/update/delete scene (Task 1)
- ✅ `adminGetChapter` service (Task 2)
- ✅ Scene CRUD service functions (Task 2)
- ✅ Unit tests for all scene service functions (Task 3)
- ✅ `GET /api/admin/chapters/[id]` (Task 4)
- ✅ `GET/POST /api/admin/chapters/[id]/scenes` (Task 4)
- ✅ `PATCH/DELETE /api/admin/chapters/scenes/[sceneId]` (Task 5 — flat path)
- ✅ RTK Query hooks (Task 5)
- ✅ Detail page with chapter info + scenes table (Task 6)
- ✅ Chapter list Edit → navigate (Task 7)

**Type consistency:**
- `ChapterScene.index` maps to `ChapterSceneDoc.idx` throughout ✅
- `CreateSceneRequest` defined in both `adminService.ts` (for service) and `adminApi.ts` (for store) ✅
- Hook names: `useGetAdminChapterQuery`, `useGetAdminScenesQuery`, `useCreateSceneMutation`, `useUpdateSceneMutation`, `useDeleteSceneMutation` — consistent across store and page ✅
