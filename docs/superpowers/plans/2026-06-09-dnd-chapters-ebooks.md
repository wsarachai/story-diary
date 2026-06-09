# Drag-and-Drop Ordering for Chapters and E-Books Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop reordering to three admin tables: the chapter list, scenes within a chapter, and the e-books list — matching the existing pattern already used by video clips and minigame questions.

**Architecture:** Every ordered entity uses a `sort_order` (or `idx` for scenes) field persisted via a `bulkWrite` reorder function. The frontend uses `@dnd-kit` with optimistic RTK Query cache updates. We add three new API routes, three db-layer reorder functions, three RTK mutations, and wire DnD into the three affected pages.

**Tech Stack:** Next.js 16, RTK Query (`@/store/adminApi`), `@dnd-kit/core` + `@dnd-kit/sortable`, MongoDB (Atlas), TypeScript strict.

---

## Files to Create / Modify

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/lib/db.ts` | Modify | Add `sort_order` to `EBookDoc`; update seed + list + index; add 3 reorder functions |
| `frontend/lib/services/adminService.ts` | Modify | Update `adminCreateEBook` to set `sort_order`; add 3 reorder service functions |
| `frontend/app/api/admin/chapters/reorder/route.ts` | Create | PUT endpoint to reorder chapters |
| `frontend/app/api/admin/chapters/[id]/scenes/reorder/route.ts` | Create | PUT endpoint to reorder scenes within a chapter |
| `frontend/app/api/admin/e-books/reorder/route.ts` | Create | PUT endpoint to reorder e-books |
| `frontend/store/adminApi.ts` | Modify | Add 3 reorder mutations with optimistic updates; export 3 new hooks |
| `frontend/app/(admin)/admin/chapters/page.tsx` | Modify | Add DnD to chapter list |
| `frontend/app/(admin)/admin/chapters/[id]/page.tsx` | Modify | Add DnD to scenes list |
| `frontend/app/(admin)/admin/e-books/page.tsx` | Modify | Add DnD to e-books list |

---

## Task 1: db.ts — EBookDoc sort_order + 3 reorder functions

**Files:**
- Modify: `frontend/lib/db.ts`

- [ ] **Step 1: Add `sort_order` to `EBookDoc` interface (line ~137)**

Replace:
```typescript
export interface EBookDoc {
  id: string;
  title: string;
  pdf_url: string;
}
```
With:
```typescript
export interface EBookDoc {
  id: string;
  title: string;
  pdf_url: string;
  sort_order: number;
}
```

- [ ] **Step 2: Update `E_BOOKS` seed array (line ~168) to include sort_order**

Replace:
```typescript
const E_BOOKS: EBookDoc[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `ebk-${n}`,
  title: `บทที่ ${n}`,
  pdf_url: `/e-books/ch0${n}.pdf`,
}));
```
With:
```typescript
const E_BOOKS: EBookDoc[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `ebk-${n}`,
  title: `บทที่ ${n}`,
  pdf_url: `/e-books/ch0${n}.pdf`,
  sort_order: n,
}));
```

- [ ] **Step 3: Update `listEBooksDocs()` to sort by sort_order (line ~912)**

Replace:
```typescript
export async function listEBooksDocs(): Promise<EBookDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.eBooks];
  }
  return eBooksCollection().find({}).toArray();
}
```
With:
```typescript
export async function listEBooksDocs(): Promise<EBookDoc[]> {
  await initializeDatabase();
  if (mode === "memory") {
    return [...memoryStore.eBooks].sort((a, b) => a.sort_order - b.sort_order);
  }
  return eBooksCollection().find({}, { sort: { sort_order: 1 } }).toArray();
}
```

- [ ] **Step 4: Add `sort_order` index for eBooks in `ensureMongoIndexes()` (line ~386)**

Replace:
```typescript
    eBooksCollection().createIndex({ id: 1 }, { unique: true }),
```
With:
```typescript
    eBooksCollection().createIndex({ id: 1 }, { unique: true }),
    eBooksCollection().createIndex({ sort_order: 1 }),
```

- [ ] **Step 5: Add `reorderChapterDocs` function after `deleteChapterDoc` (line ~960)**

After the `deleteChapterDoc` function, add:
```typescript
export async function reorderChapterDocs(orderedIds: number[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const chapter = memoryStore.chapters.find((c) => c.id === id);
      if (chapter) chapter.sort_order = index + 1;
    });
    return;
  }
  await chaptersCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id }, update: { $set: { sort_order: index + 1 } } },
    }))
  );
}
```

- [ ] **Step 6: Add `reorderChapterSceneDocs` function after `deleteChapterSceneDoc` (line ~1092)**

After the `deleteChapterSceneDoc` function, add:
```typescript
export async function reorderChapterSceneDocs(chapterId: number, orderedIds: string[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const scene = memoryStore.chapterScenes.find((s) => s.id === id);
      if (scene) scene.idx = index;
    });
    return;
  }
  // Two-pass update to avoid unique-index conflicts on (chapter_id, idx):
  // pass 1 sets large temporary idx values, pass 2 sets final 0-based values.
  const OFFSET = 100_000;
  await chapterScenesCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id, chapter_id: chapterId }, update: { $set: { idx: OFFSET + index } } },
    }))
  );
  await chapterScenesCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id, chapter_id: chapterId }, update: { $set: { idx: index } } },
    }))
  );
}
```

- [ ] **Step 7: Add `reorderEBookDocs` function after `deleteEBookDoc` (line ~1005)**

After the `deleteEBookDoc` function, add:
```typescript
export async function reorderEBookDocs(orderedIds: string[]): Promise<void> {
  await initializeDatabase();
  if (mode === "memory") {
    orderedIds.forEach((id, index) => {
      const ebook = memoryStore.eBooks.find((e) => e.id === id);
      if (ebook) ebook.sort_order = index + 1;
    });
    return;
  }
  await eBooksCollection().bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { id }, update: { $set: { sort_order: index + 1 } } },
    }))
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles with no errors**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add sort_order to EBookDoc and reorder functions for chapters/scenes/ebooks"
```

---

## Task 2: adminService.ts — reorder service functions + fix createEBook

**Files:**
- Modify: `frontend/lib/services/adminService.ts`

- [ ] **Step 1: Update imports at the top of adminService.ts**

Find the import line that pulls db functions. Add the 3 new functions to it:
```typescript
import {
  // ... existing imports ...
  reorderChapterDocs,
  reorderChapterSceneDocs,
  reorderEBookDocs,
} from "@/lib/db";
```

- [ ] **Step 2: Update `adminCreateEBook` to assign sort_order**

Replace:
```typescript
export async function adminCreateEBook(body: CreateEBookRequest): Promise<EBookChapter> {
  const id = `ebk-${uuidv4().slice(0, 8)}`;
  await insertEBookDoc({ id, title: body.title, pdf_url: body.pdfUrl });
  return { id, title: body.title, pdfUrl: body.pdfUrl };
}
```
With:
```typescript
export async function adminCreateEBook(body: CreateEBookRequest): Promise<EBookChapter> {
  const existing = await listEBooksDocs();
  const maxSort = existing.reduce((m, e) => Math.max(m, e.sort_order), 0);
  const id = `ebk-${uuidv4().slice(0, 8)}`;
  await insertEBookDoc({ id, title: body.title, pdf_url: body.pdfUrl, sort_order: maxSort + 1 });
  return { id, title: body.title, pdfUrl: body.pdfUrl };
}
```

- [ ] **Step 3: Add 3 reorder service functions**

After `adminDeleteEBook` (around line ~217), add:
```typescript
export async function adminReorderChapters(orderedIds: number[]): Promise<void> {
  await reorderChapterDocs(orderedIds);
}

export async function adminReorderChapterScenes(chapterId: number, orderedIds: string[]): Promise<void> {
  await reorderChapterSceneDocs(chapterId, orderedIds);
}

export async function adminReorderEBooks(orderedIds: string[]): Promise<void> {
  await reorderEBookDocs(orderedIds);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/services/adminService.ts
git commit -m "feat(admin): add reorder service functions for chapters, scenes, and ebooks"
```

---

## Task 3: Three new API route files

**Files:**
- Create: `frontend/app/api/admin/chapters/reorder/route.ts`
- Create: `frontend/app/api/admin/chapters/[id]/scenes/reorder/route.ts`
- Create: `frontend/app/api/admin/e-books/reorder/route.ts`

- [ ] **Step 1: Create `frontend/app/api/admin/chapters/reorder/route.ts`**

```typescript
import { requireAdmin } from "@/lib/api-auth";
import { adminReorderChapters } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { ids } = (await req.json()) as { ids?: unknown };
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "number")) {
      throw Errors.validation("`ids` must be an array of numbers");
    }
    await adminReorderChapters(ids);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
```

- [ ] **Step 2: Create `frontend/app/api/admin/chapters/[id]/scenes/reorder/route.ts`**

```typescript
import { requireAdmin } from "@/lib/api-auth";
import { adminReorderChapterScenes } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const chapterId = Number(id);
    if (!Number.isInteger(chapterId) || chapterId <= 0) {
      throw Errors.validation("invalid chapter id");
    }
    const { ids } = (await req.json()) as { ids?: unknown };
    if (!Array.isArray(ids) || !ids.every((sid) => typeof sid === "string")) {
      throw Errors.validation("`ids` must be an array of strings");
    }
    await adminReorderChapterScenes(chapterId, ids);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
```

- [ ] **Step 3: Create `frontend/app/api/admin/e-books/reorder/route.ts`**

```typescript
import { requireAdmin } from "@/lib/api-auth";
import { adminReorderEBooks } from "@/lib/services/adminService";
import { ok, handleError } from "@/lib/api-response";
import { Errors } from "@/lib/errors";

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { ids } = (await req.json()) as { ids?: unknown };
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      throw Errors.validation("`ids` must be an array of strings");
    }
    await adminReorderEBooks(ids);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/api/admin/chapters/reorder/route.ts \
        frontend/app/api/admin/chapters/[id]/scenes/reorder/route.ts \
        frontend/app/api/admin/e-books/reorder/route.ts
git commit -m "feat(api): add reorder PUT endpoints for chapters, scenes, and ebooks"
```

---

## Task 4: adminApi.ts — 3 new RTK mutations

**Files:**
- Modify: `frontend/store/adminApi.ts`

- [ ] **Step 1: Add the 3 reorder mutations before the closing `}),` of `endpoints`**

In `adminApi.ts`, find the `reorderQuestions` mutation (the last one before `}),`). After it, add:

```typescript
    reorderChapters: builder.mutation<void, number[]>({
      query: (ids) => ({ url: "/admin/chapters/reorder", method: "PUT", body: { ids } }),
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminChapters", undefined, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderChapterScenes: builder.mutation<void, { chapterId: number; ids: string[] }>({
      query: ({ chapterId, ids }) => ({
        url: `/admin/chapters/${chapterId}/scenes/reorder`,
        method: "PUT",
        body: { ids },
      }),
      async onQueryStarted({ chapterId, ids }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminScenes", chapterId, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    reorderEBooks: builder.mutation<void, string[]>({
      query: (ids) => ({ url: "/admin/e-books/reorder", method: "PUT", body: { ids } }),
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData("getAdminEBooks", undefined, (draft) => {
            draft.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
```

- [ ] **Step 2: Export the 3 new hooks**

In the export block at the bottom of `adminApi.ts`, add the 3 new hooks:

```typescript
export const {
  // ... all existing exports ...
  useReorderChaptersMutation,
  useReorderChapterScenesMutation,
  useReorderEBooksMutation,
} = adminApi;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/store/adminApi.ts
git commit -m "feat(store): add reorder mutations for chapters, scenes, and ebooks"
```

---

## Task 5: chapters/page.tsx — DnD for chapter list

**Files:**
- Modify: `frontend/app/(admin)/admin/chapters/page.tsx`

Chapters have numeric IDs. We stringify them for dnd-kit and convert back for the API call. The drag handle icon matches the video-clips three-line style.

- [ ] **Step 1: Replace the full file content**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import {
  useGetAdminChaptersQuery,
  useCreateChapterMutation,
  useDeleteChapterMutation,
  useReorderChaptersMutation,
  type CreateChapterRequest,
} from "@/store/adminApi";
import type { ChapterSummary } from "@/types/chapters";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateChapterRequest = {
  title: "",
  introTitle: "",
  lockState: "unlocked",
  backgroundImageUrl: "",
};

function DragHandle() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      style={{ width: "1rem", height: "1rem", flexShrink: 0, cursor: "grab", color: "#999" }}
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function SortableRow({
  chapter,
  onEdit,
  onDelete,
}: {
  chapter: ChapterSummary;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(chapter.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <span {...attributes} {...listeners} style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
          <DragHandle />
        </span>
      </td>
      <td>{chapter.id}</td>
      <td>{chapter.title}</td>
      <td>
        <span className={`${styles.adminBadge} ${chapter.lockState === "unlocked" ? styles.adminBadgeGreen : styles.adminBadgeYellow}`}>
          {chapter.lockState}
        </span>
      </td>
      <td>{chapter.progress}</td>
      <td>
        <div className={styles.adminTableActions}>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
            onClick={() => onEdit(chapter.id)}
          >
            Edit →
          </button>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
            onClick={() => onDelete(chapter.id)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminChaptersPage() {
  const router = useRouter();
  const { data: serverChapters, isLoading } = useGetAdminChaptersQuery();
  const [createChapter] = useCreateChapterMutation();
  const [deleteChapter] = useDeleteChapterMutation();
  const [reorderChapters] = useReorderChaptersMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateChapterRequest>(EMPTY_FORM);

  const chapters = serverChapters ?? [];

  const sensors = useSensors(useSensor(PointerSensor));

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !serverChapters) return;

    const base = serverChapters.map((ch) => ch.id);
    const oldIndex = base.findIndex((id) => String(id) === String(active.id));
    const newIndex = base.findIndex((id) => String(id) === String(over.id));
    const newOrder = arrayMove(base, oldIndex, newIndex);

    try {
      await reorderChapters(newOrder).unwrap();
    } catch {
      setReorderError("บันทึกลำดับบทไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>Chapters</h1>
            <button className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} onClick={openCreate}>
              + เพิ่มบท
            </button>
          </div>

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          {showForm && (
            <div className={styles.adminFormCard}>
              <h2>เพิ่มบทใหม่</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.adminFormGrid}>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Title</label>
                    <input
                      className={styles.adminInput}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Intro Title</label>
                    <input
                      className={styles.adminInput}
                      value={form.introTitle}
                      onChange={(e) => setForm({ ...form, introTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Lock State</label>
                    <select
                      className={styles.adminSelect}
                      value={form.lockState}
                      onChange={(e) => setForm({ ...form, lockState: e.target.value as "unlocked" | "locked" })}
                    >
                      <option value="unlocked">unlocked</option>
                      <option value="locked">locked</option>
                    </select>
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Background Image URL (optional)</label>
                    <input
                      className={styles.adminInput}
                      value={form.backgroundImageUrl ?? ""}
                      onChange={(e) => setForm({ ...form, backgroundImageUrl: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeForm}>ยกเลิก</button>
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>เพิ่ม</button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className={styles.adminSpinner} />
          ) : (
            <div className={styles.adminTableWrap}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "2rem" }} />
                      <th>ID</th>
                      <th>Title</th>
                      <th>Lock State</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={chapters.map((ch) => String(ch.id))} strategy={verticalListSortingStrategy}>
                      {chapters.map((ch) => (
                        <SortableRow
                          key={ch.id}
                          chapter={ch}
                          onEdit={(id) => router.push(`/admin/chapters/${id}`)}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(admin)/admin/chapters/page.tsx
git commit -m "feat(admin/chapters): add drag-and-drop ordering to chapter list"
```

---

## Task 6: chapters/[id]/page.tsx — DnD for scenes list

**Files:**
- Modify: `frontend/app/(admin)/admin/chapters/[id]/page.tsx`

Scenes use `idx` (0-based number) for ordering. The `idx` field input in the create/edit form is retained so admins can still set it manually on creation; drag reorder replaces it for existing scenes. After a successful drag reorder the scenes table reflects the new order via optimistic update.

- [ ] **Step 1: Replace the full file content**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import {
  useGetAdminChapterQuery,
  useUpdateChapterMutation,
  useGetAdminScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
  useReorderChapterScenesMutation,
  type CreateSceneRequest,
  type UpdateSceneRequest,
} from "@/store/adminApi";
import type { ChapterScene } from "@/types/chapters";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/components/Admin.module.css";

const EMPTY_SCENE: CreateSceneRequest = {
  idx: 0,
  speakerName: "",
  speakerImageUrl: "",
  text: "",
};

function DragHandle() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      style={{ width: "1rem", height: "1rem", flexShrink: 0, cursor: "grab", color: "#999" }}
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function SortableSceneRow({
  scene,
  onEdit,
  onDelete,
}: {
  scene: ChapterScene;
  onEdit: (scene: ChapterScene) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <span {...attributes} {...listeners} style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
          <DragHandle />
        </span>
      </td>
      <td>{scene.index}</td>
      <td>{scene.speakerName}</td>
      <td className={styles.adminTruncated}>{scene.speakerImageUrl ?? "—"}</td>
      <td className={styles.adminTruncated} style={{ maxWidth: "300px" }}>{scene.text}</td>
      <td>
        <div className={styles.adminTableActions}>
          <button className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={() => onEdit(scene)}>Edit</button>
          <button className={`${styles.adminBtn} ${styles.adminBtnDanger}`} onClick={() => onDelete(scene.id)}>Delete</button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = Number(params.id);

  const { data: chapter, isLoading: chapterLoading } = useGetAdminChapterQuery(chapterId);
  const { data: serverScenes, isLoading: scenesLoading } = useGetAdminScenesQuery(chapterId);
  const [updateChapter] = useUpdateChapterMutation();
  const [createScene] = useCreateSceneMutation();
  const [updateScene] = useUpdateSceneMutation();
  const [deleteScene] = useDeleteSceneMutation();
  const [reorderChapterScenes] = useReorderChapterScenesMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);

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

  const scenes = serverScenes ?? [];

  const sensors = useSensors(useSensor(PointerSensor));

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !serverScenes) return;

    const base = serverScenes.map((s) => s.id);
    const oldIndex = base.indexOf(active.id as string);
    const newIndex = base.indexOf(over.id as string);
    const newOrder = arrayMove(base, oldIndex, newIndex);

    try {
      await reorderChapterScenes({ chapterId, ids: newOrder }).unwrap();
    } catch {
      setReorderError("บันทึกลำดับ scene ไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  if (chapterLoading) {
    return (
      <div className={styles.adminLayout}>
        <AdminSidebar />
        <div className={styles.adminMainWrapper}>
          <main className={styles.adminMain}><div className={styles.adminSpinner} /></main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>

          <div className={styles.adminPageHeader}>
            <div className={styles.adminHeaderGroup}>
              <button className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={() => router.push("/admin/chapters")}>
                ← Chapters
              </button>
              <h1 className={styles.adminPageTitle}>{chapter?.title ?? "Chapter"}</h1>
            </div>
          </div>

          {/* Chapter info form */}
          <div className={styles.adminFormCard}>
            <h2>Chapter Info</h2>
            <form onSubmit={handleSaveChapter}>
              <div className={styles.adminFormGrid}>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Title</label>
                  <input
                    className={styles.adminInput}
                    value={chapterForm.title}
                    onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Intro Title</label>
                  <input
                    className={styles.adminInput}
                    value={chapterForm.introTitle}
                    onChange={(e) => setChapterForm({ ...chapterForm, introTitle: e.target.value })}
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Lock State</label>
                  <select
                    className={styles.adminSelect}
                    value={chapterForm.lockState}
                    onChange={(e) => setChapterForm({ ...chapterForm, lockState: e.target.value as "unlocked" | "locked" })}
                  >
                    <option value="unlocked">unlocked</option>
                    <option value="locked">locked</option>
                  </select>
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Background Image URL (optional)</label>
                  <input
                    className={styles.adminInput}
                    value={chapterForm.backgroundImageUrl}
                    onChange={(e) => setChapterForm({ ...chapterForm, backgroundImageUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.adminFormActions}>
                <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>บันทึก</button>
              </div>
            </form>
          </div>

          {/* Scene add/edit form */}
          {showSceneForm && (
            <div className={styles.adminFormCard}>
              <h2>{editSceneId !== null ? "แก้ไข Scene" : "เพิ่ม Scene ใหม่"}</h2>
              <form onSubmit={handleSubmitScene}>
                <div className={styles.adminFormGrid}>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Index (idx)</label>
                    <input
                      className={styles.adminInput}
                      type="number"
                      value={sceneForm.idx}
                      onChange={(e) => setSceneForm({ ...sceneForm, idx: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Speaker Name</label>
                    <input
                      className={styles.adminInput}
                      value={sceneForm.speakerName}
                      onChange={(e) => setSceneForm({ ...sceneForm, speakerName: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Speaker Image URL (optional)</label>
                    <input
                      className={styles.adminInput}
                      value={sceneForm.speakerImageUrl ?? ""}
                      onChange={(e) => setSceneForm({ ...sceneForm, speakerImageUrl: e.target.value })}
                    />
                  </div>
                  <div className={`${styles.adminFormField} ${styles.full}`}>
                    <label className={styles.adminLabel}>Text</label>
                    <textarea
                      className={styles.adminTextarea}
                      rows={4}
                      value={sceneForm.text}
                      onChange={(e) => setSceneForm({ ...sceneForm, text: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeSceneForm}>ยกเลิก</button>
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>
                    {editSceneId !== null ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          {/* Scenes table */}
          <div className={`${styles.adminPageHeader} ${styles.adminSectionHeader}`}>
            <h2 className={styles.adminPageTitle} style={{ fontSize: "1.2rem" }}>Scenes</h2>
            <button className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} onClick={openCreateScene}>+ Add Scene</button>
          </div>

          {scenesLoading ? (
            <div className={styles.adminSpinner} />
          ) : (
            <div className={styles.adminTableWrap}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "2rem" }} />
                      <th>idx</th>
                      <th>Speaker Name</th>
                      <th>Speaker Image URL</th>
                      <th>Text</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {scenes.map((scene) => (
                        <SortableSceneRow
                          key={scene.id}
                          scene={scene}
                          onEdit={openEditScene}
                          onDelete={handleDeleteScene}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(admin)/admin/chapters/[id]/page.tsx
git commit -m "feat(admin/chapters): add drag-and-drop ordering to scenes list"
```

---

## Task 7: e-books/page.tsx — DnD for e-books list

**Files:**
- Modify: `frontend/app/(admin)/admin/e-books/page.tsx`

- [ ] **Step 1: Replace the full file content**

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import {
  useGetAdminEBooksQuery,
  useCreateEBookMutation,
  useUpdateEBookMutation,
  useDeleteEBookMutation,
  useReorderEBooksMutation,
  type CreateEBookRequest,
} from "@/store/adminApi";
import type { EBookChapter } from "@/types/ebook";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateEBookRequest = { title: "", pdfUrl: "" };

function DragHandle() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      style={{ width: "1rem", height: "1rem", flexShrink: 0, cursor: "grab", color: "#999" }}
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function SortableRow({
  ebook,
  onEdit,
  onDelete,
}: {
  ebook: EBookChapter;
  onEdit: (eb: EBookChapter) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ebook.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <span {...attributes} {...listeners} style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
          <DragHandle />
        </span>
      </td>
      <td>{ebook.id}</td>
      <td>{ebook.title}</td>
      <td>
        <a
          href={ebook.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.adminLink}
        >
          {ebook.pdfUrl}
        </a>
      </td>
      <td>
        <div className={styles.adminTableActions}>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
            onClick={() => onEdit(ebook)}
          >
            Edit
          </button>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
            onClick={() => onDelete(ebook.id)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminEBooksPage() {
  const { data: serverEBooks, isLoading } = useGetAdminEBooksQuery();
  const [createEBook] = useCreateEBookMutation();
  const [updateEBook] = useUpdateEBookMutation();
  const [deleteEBook] = useDeleteEBookMutation();
  const [reorderEBooks] = useReorderEBooksMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEBookRequest>(EMPTY_FORM);
  const formRef = useRef<HTMLDivElement>(null);

  const ebooks = serverEBooks ?? [];

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

  const sensors = useSensors(useSensor(PointerSensor));

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(eb: EBookChapter) {
    setEditId(eb.id);
    setForm({ title: eb.title, pdfUrl: eb.pdfUrl });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId !== null) {
      await updateEBook({ id: editId, body: form });
    } else {
      await createEBook(form);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบ E-Book นี้หรือไม่?")) return;
    await deleteEBook(id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !serverEBooks) return;

    const base = serverEBooks.map((e) => e.id);
    const oldIndex = base.indexOf(active.id as string);
    const newIndex = base.indexOf(over.id as string);
    const reordered = arrayMove(base, oldIndex, newIndex);

    try {
      await reorderEBooks(reordered).unwrap();
    } catch {
      setReorderError("บันทึกลำดับ E-Book ไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>E-Books</h1>
            <button className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} onClick={openCreate}>
              + เพิ่ม E-Book
            </button>
          </div>

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          {showForm && (
            <div className={styles.adminFormCard} ref={formRef}>
              <h2>{editId !== null ? "แก้ไข E-Book" : "เพิ่ม E-Book ใหม่"}</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.adminFormGrid}>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Title</label>
                    <input
                      className={styles.adminInput}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>PDF URL</label>
                    <input
                      className={styles.adminInput}
                      value={form.pdfUrl}
                      onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  <button
                    type="button"
                    className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                    onClick={closeForm}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>
                    {editId !== null ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className={styles.adminSpinner} />
          ) : (
            <div className={styles.adminTableWrap}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "2rem" }} />
                      <th>ID</th>
                      <th>Title</th>
                      <th>PDF URL</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={ebooks.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                      {ebooks.map((eb) => (
                        <SortableRow
                          key={eb.id}
                          ebook={eb}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(admin)/admin/e-books/page.tsx
git commit -m "feat(admin/ebooks): add drag-and-drop ordering to e-books list"
```

---

## Self-Review

**Spec coverage:**
- ✅ Chapters list drag-and-drop → Task 5
- ✅ Scenes within chapter drag-and-drop → Task 6
- ✅ E-books drag-and-drop → Task 7
- ✅ EBookDoc schema update + seed → Task 1
- ✅ EBook sort_order on creation → Task 2
- ✅ Three API routes → Task 3
- ✅ Three RTK mutations with optimistic updates → Task 4
- ✅ Chapters reorder controls unlock sequence (by design, agreed in grilling) → sort_order is what drives unlock progression, handled naturally by reorderChapterDocs

**Placeholder scan:** All steps contain complete code — no TBDs.

**Type consistency:**
- `reorderChapterDocs(orderedIds: number[])` in db.ts ↔ `adminReorderChapters(orderedIds: number[])` in adminService.ts ✅
- `reorderChapterSceneDocs(chapterId: number, orderedIds: string[])` ↔ `adminReorderChapterScenes(chapterId: number, orderedIds: string[])` ✅
- `reorderEBookDocs(orderedIds: string[])` ↔ `adminReorderEBooks(orderedIds: string[])` ✅
- RTK mutation arg `{ chapterId: number; ids: string[] }` matches route and service call ✅
- `EBookDoc.sort_order: number` flows into `listEBooksDocs` sort and `insertEBookDoc` call ✅
