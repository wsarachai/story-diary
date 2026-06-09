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
  onEdit: (ebook: EBookChapter) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ebook.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    background: isDragging ? "#21262d" : undefined,
    boxShadow: isDragging ? "0 2px 10px rgba(0,0,0,0.6)" : undefined,
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

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

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
    if (!over || active.id === over.id) return;

    const oldIndex = ebooks.findIndex((e) => e.id === active.id);
    const newIndex = ebooks.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(ebooks.map((e) => e.id), oldIndex, newIndex);

    try {
      await reorderEBooks(newOrder).unwrap();
    } catch {
      setReorderError("บันทึกลำดับหนังสือไม่สำเร็จ ลองอีกครั้ง");
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
                <SortableContext items={ebooks.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {ebooks.map((eb) => (
                      <SortableRow
                        key={eb.id}
                        ebook={eb}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
