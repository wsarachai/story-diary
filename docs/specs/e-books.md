# Spec: E-Books

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** E-book list and PDF viewer for users; admin CRUD for e-book entries.

---

## Summary

E-books are PDF documents associated with story chapters. The user-facing list shows a grid of book entries split across the two book pages; clicking an entry opens an inline PDF viewer using an `<iframe>`. The e-books section is reachable from the chapters hub (the "E-book" card). Admin users can create, edit, and delete e-book records via the admin panel; each record stores a title and a PDF URL.

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/e-books` | `frontend/app/(authed)/e-books/page.tsx` | E-book list; odd-indexed items on left page, even on right |
| `/e-books/[id]` | `frontend/app/(authed)/e-books/[id]/page.tsx` | PDF viewer for a single e-book; uses `<iframe>` with toolbar/navpanes/scrollbar disabled |
| `/admin/e-books` | `frontend/app/(admin)/admin/e-books/page.tsx` | Admin CRUD for e-book records (title + PDF URL) |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/e-books` | `frontend/app/api/e-books/route.ts` | Returns `{ badge, chapters[] }` for the e-book collection |
| `GET` | `/api/admin/e-books` | `frontend/app/api/admin/e-books/route.ts` | Admin: list all e-books (requires `role=admin`) |
| `POST` | `/api/admin/e-books` | `frontend/app/api/admin/e-books/route.ts` | Admin: create e-book (201) |
| `PATCH` | `/api/admin/e-books/[id]` | `frontend/app/api/admin/e-books/[id]/route.ts` | Admin: update title or PDF URL |
| `DELETE` | `/api/admin/e-books/[id]` | `frontend/app/api/admin/e-books/[id]/route.ts` | Admin: delete e-book |

---

## Key Components

- `EBooksPage` — `frontend/app/(authed)/e-books/page.tsx` — fetches collection with `useGetEBooksQuery`; renders badge link back to `/chapters`; splits items into odd/even columns; each item has a play-button overlay linking to the detail page
- `EBookViewerPage` — `frontend/app/(authed)/e-books/[id]/page.tsx` — finds the active e-book from the cached collection by `params.id`; renders an `<iframe>` with the PDF URL; shows "ไม่พบไฟล์ PDF" fallback if `pdfUrl` is absent
- `AdminEBooksPage` — `frontend/app/(admin)/admin/e-books/page.tsx` — table of all e-books with inline create/edit form; uses `useCreateEBookMutation`, `useUpdateEBookMutation`, `useDeleteEBookMutation`
- `AdminShell` — `frontend/components/AdminShell.tsx` — auth guard for admin pages
- `AdminSidebar` — `frontend/components/AdminSidebar.tsx` — admin navigation

---

## State

RTK Query: `frontend/store/ebookApi.ts` — `getEBooks` query tagged with `Chapters` cache tag. The viewer page reads from the same cached collection rather than making a separate per-book request.

Admin RTK Query: `frontend/store/adminApi.ts` — `getAdminEBooks`, `createEBook`, `updateEBook`, `deleteEBook` endpoints tagged with `Admin`.
