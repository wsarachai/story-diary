"use client";

import { useState } from "react";
import AdminDragHandle from "@/components/AdminDragHandle";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import AdminBackgroundPicker from "@/components/AdminBackgroundPicker";
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
          <AdminDragHandle />
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
  const [createChapter, { isLoading: saving }] = useCreateChapterMutation();
  const [deleteChapter] = useDeleteChapterMutation();
  const [reorderChapters] = useReorderChaptersMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateChapterRequest>(EMPTY_FORM);

  const chapters = serverChapters ?? [];

  const sensors = useSensors(useSensor(PointerSensor));

  function openCreate() {
    setForm(EMPTY_FORM);
    setMutationError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setMutationError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setMutationError(null);
    try {
      await createChapter(form).unwrap();
      closeForm();
    } catch {
      setMutationError("บันทึกบทเรียนไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("ลบบทนี้หรือไม่?")) return;
    await deleteChapter(id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((ch) => String(ch.id) === String(active.id));
    const newIndex = chapters.findIndex((ch) => String(ch.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(chapters.map((ch) => ch.id), oldIndex, newIndex);

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

          {(reorderError || mutationError) && (
            <AdminErrorBanner
              message={mutationError ?? reorderError ?? ""}
              onDismiss={() => {
                setReorderError(null);
                setMutationError(null);
              }}
            />
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
                  <div className={`${styles.adminFormField} ${styles.full}`}>
                    <label className={styles.adminLabel}>Background Image (optional)</label>
                    <AdminBackgroundPicker
                      value={form.backgroundImageUrl ?? ""}
                      onChange={(url) => setForm({ ...form, backgroundImageUrl: url })}
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeForm}>ยกเลิก</button>
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} disabled={saving}>เพิ่ม</button>
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
                  <SortableContext items={chapters.map((ch) => String(ch.id))} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {chapters.map((ch) => (
                        <SortableRow
                          key={ch.id}
                          chapter={ch}
                          onEdit={(id) => router.push(`/admin/chapters/${id}`)}
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
