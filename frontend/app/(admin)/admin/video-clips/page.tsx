"use client";

import { useState, useRef, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import {
  useGetAdminVideoClipsQuery,
  useCreateVideoClipMutation,
  useUpdateVideoClipMutation,
  useDeleteVideoClipMutation,
  useReorderVideoClipsMutation,
  type VideoClipModel,
  type CreateVideoClipRequest,
} from "@/store/adminApi";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateVideoClipRequest = { caption: "", sourceUrl: "", thumbnailUrl: "" };

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
  clip,
  onEdit,
  onDelete,
}: {
  clip: VideoClipModel;
  onEdit: (clip: VideoClipModel) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });

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
      <td>{clip.id}</td>
      <td>{clip.caption}</td>
      <td>
        <a
          href={clip.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.adminLink}
          style={{ maxWidth: "280px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}
        >
          {clip.sourceUrl}
        </a>
      </td>
      <td>
        {clip.thumbnailUrl ? (
          <a
            href={clip.thumbnailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.adminLink}
            style={{ maxWidth: "180px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}
          >
            {clip.thumbnailUrl}
          </a>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        )}
      </td>
      <td>
        <div className={styles.adminTableActions}>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
            onClick={() => onEdit(clip)}
          >
            Edit
          </button>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
            onClick={() => onDelete(clip.id)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminVideoClipsPage() {
  const { data: serverClips, isLoading } = useGetAdminVideoClipsQuery();
  const [createVideoClip] = useCreateVideoClipMutation();
  const [updateVideoClip] = useUpdateVideoClipMutation();
  const [deleteVideoClip] = useDeleteVideoClipMutation();
  const [reorderVideoClips] = useReorderVideoClipsMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateVideoClipRequest>(EMPTY_FORM);
  const formRef = useRef<HTMLDivElement>(null);

  const clips: VideoClipModel[] = serverClips ?? [];

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(clip: VideoClipModel) {
    setEditId(clip.id);
    setForm({ caption: clip.caption, sourceUrl: clip.sourceUrl, thumbnailUrl: clip.thumbnailUrl ?? "" });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, thumbnailUrl: form.thumbnailUrl || undefined };
    if (editId !== null) {
      await updateVideoClip({ id: editId, body: payload });
    } else {
      await createVideoClip(payload);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบวิดีโอคลิปนี้หรือไม่?")) return;
    await deleteVideoClip(id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = clips.findIndex((c) => c.id === active.id);
    const newIndex = clips.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(clips, oldIndex, newIndex);
    const orderedIds = reordered.map((c) => c.id);
    try {
      await reorderVideoClips(orderedIds).unwrap();
    } catch {
      setReorderError("บันทึกลำดับวิดีโอคลิปไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>Video Clips</h1>
            <button className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} onClick={openCreate}>
              + เพิ่มวิดีโอคลิป
            </button>
          </div>

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          {showForm && (
            <div className={styles.adminFormCard} ref={formRef}>
              <h2>{editId !== null ? "แก้ไขวิดีโอคลิป" : "เพิ่มวิดีโอคลิปใหม่"}</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.adminFormGrid}>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Caption</label>
                    <input
                      className={styles.adminInput}
                      value={form.caption}
                      onChange={(e) => setForm({ ...form, caption: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Source URL</label>
                    <input
                      className={styles.adminInput}
                      value={form.sourceUrl}
                      onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Thumbnail URL (optional)</label>
                    <input
                      className={styles.adminInput}
                      value={form.thumbnailUrl ?? ""}
                      onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                      placeholder="https://..."
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
                      <th>Caption</th>
                      <th>Source URL</th>
                      <th>Thumbnail URL</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <SortableContext items={clips.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {clips.map((clip) => (
                        <SortableRow
                          key={clip.id}
                          clip={clip}
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
