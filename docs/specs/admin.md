# Spec: Admin Panel

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Admin layout, auth guard, and CRUD management for chapters, chapter scenes, e-books, and minigame questions.

---

## Summary

The admin panel is a fullscreen dashboard that overlays the normal book-shell layout (a separate `(admin)` route group with its own layout). Access is gated by `AdminShell`, which redirects non-admin users to `/login`. The panel has a collapsible sidebar with links to five sections. On mobile, the full topbar is replaced by a floating hamburger icon; tapping it slides the sidebar in over a backdrop.

Admin CRUD covers: chapters (title, intro title, lock state, background image), chapter scenes (idx, speaker name, speaker image URL, text), e-books (title, PDF URL), and minigame quiz questions (number, text, four options, correct answer, explanation).

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/admin` | `frontend/app/(admin)/admin/page.tsx` | Dashboard with stat cards (chapter count, e-book count, question count) |
| `/admin/chapters` | `frontend/app/(admin)/admin/chapters/page.tsx` | Chapter list with create and delete; rows link to detail/edit |
| `/admin/chapters/[id]` | `frontend/app/(admin)/admin/chapters/[id]/page.tsx` | Chapter detail: edit chapter fields + full scenes CRUD (create, edit, delete) |
| `/admin/e-books` | `frontend/app/(admin)/admin/e-books/page.tsx` | E-book list with inline create/edit form and delete |
| `/admin/minigame` | `frontend/app/(admin)/admin/minigame/page.tsx` | Quiz question list with inline create/edit form and delete |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/admin/chapters` | `frontend/app/api/admin/chapters/route.ts` | List all chapters |
| `POST` | `/api/admin/chapters` | `frontend/app/api/admin/chapters/route.ts` | Create chapter (201) |
| `GET` | `/api/admin/chapters/[id]` | `frontend/app/api/admin/chapters/[id]/route.ts` | Get chapter detail |
| `PATCH` | `/api/admin/chapters/[id]` | `frontend/app/api/admin/chapters/[id]/route.ts` | Update chapter fields |
| `DELETE` | `/api/admin/chapters/[id]` | `frontend/app/api/admin/chapters/[id]/route.ts` | Delete chapter |
| `GET` | `/api/admin/chapters/[id]/scenes` | `frontend/app/api/admin/chapters/[id]/scenes/route.ts` | List scenes for chapter |
| `POST` | `/api/admin/chapters/[id]/scenes` | `frontend/app/api/admin/chapters/[id]/scenes/route.ts` | Add scene to chapter (201) |
| `PATCH` | `/api/admin/chapters/scenes/[sceneId]` | `frontend/app/api/admin/chapters/scenes/[sceneId]/route.ts` | Update scene |
| `DELETE` | `/api/admin/chapters/scenes/[sceneId]` | `frontend/app/api/admin/chapters/scenes/[sceneId]/route.ts` | Delete scene |
| `GET` | `/api/admin/e-books` | `frontend/app/api/admin/e-books/route.ts` | List all e-books |
| `POST` | `/api/admin/e-books` | `frontend/app/api/admin/e-books/route.ts` | Create e-book (201) |
| `PATCH` | `/api/admin/e-books/[id]` | `frontend/app/api/admin/e-books/[id]/route.ts` | Update e-book |
| `DELETE` | `/api/admin/e-books/[id]` | `frontend/app/api/admin/e-books/[id]/route.ts` | Delete e-book |
| `GET` | `/api/admin/minigame/questions` | `frontend/app/api/admin/minigame/questions/route.ts` | List all quiz questions |
| `POST` | `/api/admin/minigame/questions` | `frontend/app/api/admin/minigame/questions/route.ts` | Create quiz question (201) |
| `PATCH` | `/api/admin/minigame/questions/[id]` | `frontend/app/api/admin/minigame/questions/[id]/route.ts` | Update quiz question |
| `DELETE` | `/api/admin/minigame/questions/[id]` | `frontend/app/api/admin/minigame/questions/[id]/route.ts` | Delete quiz question |

All admin endpoints require `requireAdmin` (verifies Bearer JWT and `role === "admin"`).

---

## Key Components

- `AdminShell` — `frontend/components/AdminShell.tsx` — client component; reads `useGetMeQuery`; redirects to `/login` if user is missing or not admin; renders a loading state while auth is resolving
- `AdminSidebar` — `frontend/components/AdminSidebar.tsx` — collapsible sidebar with five nav items (Dashboard, Chapters, E-Books, Minigame, Home); on mobile, hidden by default with a floating hamburger trigger; closes on route change or Escape key
- `AdminBodyClass` — `frontend/components/AdminBodyClass.tsx` — sets a body class to override the book-shell styling for the fullscreen admin layout
- `AdminLayout` — `frontend/app/(admin)/layout.tsx` — wraps all admin pages in `AdminShell + AdminBodyClass`
- `AdminDashboardPage` — `frontend/app/(admin)/admin/page.tsx` — stat grid showing chapter, e-book, and question counts
- `AdminChaptersPage` — `frontend/app/(admin)/admin/chapters/page.tsx` — table of chapters; inline create form; delete with `window.confirm`; rows navigate to chapter detail
- `AdminChapterDetailPage` — `frontend/app/(admin)/admin/chapters/[id]/page.tsx` — chapter metadata edit form; scenes table with add/edit/delete; scene form appears inline above the table
- `AdminEBooksPage` — `frontend/app/(admin)/admin/e-books/page.tsx` — e-book table with inline create/edit form
- `AdminMinigamePage` — `frontend/app/(admin)/admin/minigame/page.tsx` — quiz question table with inline create/edit form; fields: number, question text, options A–D, correct answer, explanation

---

## State

RTK Query: `frontend/store/adminApi.ts` — all admin queries and mutations tagged with `Admin`; cache tag invalidated after any mutation. Exports hooks for chapters (`getAdminChapters`, `createChapter`, `updateChapter`, `deleteChapter`), scenes (`getAdminChapter`, `getAdminScenes`, `createScene`, `updateScene`, `deleteScene`), e-books (`getAdminEBooks`, `createEBook`, `updateEBook`, `deleteEBook`), and questions (`getAdminQuestions`, `createQuestion`, `updateQuestion`, `deleteQuestion`).

---

## Responsive notes

On mobile, `AdminSidebar` hides the full sidebar; a floating trigger button (`adminMobileTrigger`) appears in the corner to open it. The sidebar slides in as an overlay with a backdrop. The admin layout is fullscreen (not constrained by the book-shell) and uses its own CSS module (`Admin.module.css`).

For detailed scenes CRUD design decisions, see `docs/superpowers/specs/2026-06-01-admin-chapter-scenes-crud-design.md`.
