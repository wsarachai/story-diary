"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Play, Plus, Trash2, X } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import AdminDragHandle from "@/components/AdminDragHandle";
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
import { clipThumbnailUrl, isSupportedVideoUrl, toEmbedUrl } from "@/lib/videoEmbed";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateVideoClipRequest = {
  caption: "",
  sourceUrl: "",
  thumbnailUrl: "",
};

const SOURCE_URL_ERROR = "รองรับเฉพาะลิงก์ YouTube หรือ Google Drive รูปแบบ file/d/.../view";

/** "YouTube" / "Google Drive" for a supported link, else null. */
function sourceKind(url: string): string | null {
  const embed = toEmbedUrl(url);
  if (!embed) return null;
  return embed.includes("youtube.com") ? "YouTube" : "Google Drive";
}

/** Placeholder for the thumbnail field: say when YouTube fills it in. */
function youtubeHint(sourceUrl: string): string {
  return sourceKind(sourceUrl) === "YouTube"
    ? "เว้นว่าง = ใช้ภาพจาก YouTube อัตโนมัติ"
    : "https://... (ลิงก์ไฟล์รูป)";
}

/** Embed URL for the editor preview — never autoplays. */
function previewEmbedUrl(url: string): string {
  return toEmbedUrl(url).replace("autoplay=1", "autoplay=0");
}

/**
 * Thumbnail with a ▶ fallback when the URL is empty or doesn't load as an
 * image (e.g. a video page link pasted into the thumbnail field).
 */
function ClipThumbImage({ src, size }: { src?: string; size: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <Play size={size} aria-hidden="true" />;
  return (
    // External, arbitrary hosts — next/image would need each one whitelisted.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
  );
}

function clipToForm(clip: VideoClipModel): CreateVideoClipRequest {
  return {
    caption: clip.caption,
    sourceUrl: clip.sourceUrl,
    thumbnailUrl: clip.thumbnailUrl ?? "",
  };
}

function SortableClipCard({
  clip,
  position,
  selected,
  onSelect,
  onDelete,
}: {
  clip: VideoClipModel;
  position: number;
  selected: boolean;
  onSelect: (clip: VideoClipModel) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    boxShadow: isDragging ? "0 4px 14px rgba(0,0,0,0.6)" : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: "relative",
  };
  const kind = sourceKind(clip.sourceUrl);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-item-id={clip.id}
      role="button"
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      aria-label={`วิดีโอคลิป ${clip.caption}`}
      className={`${styles.sceneCard} ${styles.clipCard} ${selected ? styles.sceneCardSelected : ""}`}
      onClick={() => onSelect(clip)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(clip);
        }
      }}
    >
      <span
        {...attributes}
        {...listeners}
        className={styles.sceneDragHandle}
        title="ลากเพื่อเรียงลำดับ"
        onClick={(e) => e.stopPropagation()}
      >
        <AdminDragHandle />
      </span>
      <span className={styles.sceneIdx}>{position}</span>
      <span className={styles.clipThumb}>
        <ClipThumbImage src={clipThumbnailUrl(clip.thumbnailUrl, clip.sourceUrl)} size={18} />
      </span>
      <span className={styles.sceneCardBody}>
        <span className={styles.sceneCardText} style={{ WebkitLineClamp: 1 }}>{clip.caption}</span>
        <span className={styles.quizCardAnswer}>
          <span className={`${styles.adminBadge} ${kind ? styles.adminBadgeGray : styles.adminBadgeYellow}`}>
            {kind ?? "ลิงก์ไม่รองรับ"}
          </span>
          <span className={styles.quizCardAnswerText}>{clip.sourceUrl}</span>
        </span>
      </span>
      <button
        type="button"
        className={`${styles.sceneIconBtn} ${styles.sceneIconBtnDanger}`}
        title="ลบวิดีโอคลิป"
        aria-label={`ลบวิดีโอคลิป ${clip.caption}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(clip.id);
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export default function AdminVideoClipsPage() {
  const { data: serverClips, isLoading } = useGetAdminVideoClipsQuery();
  const [createVideoClip] = useCreateVideoClipMutation();
  const [updateVideoClip] = useUpdateVideoClipMutation();
  const [deleteVideoClip] = useDeleteVideoClipMutation();
  const [reorderVideoClips] = useReorderVideoClipsMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateVideoClipRequest>(EMPTY_FORM);
  /** Snapshot the editor opened with — compared against `form` for unsaved changes. */
  const [baseline, setBaseline] = useState<CreateVideoClipRequest>(EMPTY_FORM);
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clips: VideoClipModel[] = serverClips ?? [];
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const editIndex = editId === null ? -1 : clips.findIndex((c) => c.id === editId);
  const sourceSupported = isSupportedVideoUrl(form.sourceUrl);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const confirmDiscard = useCallback(
    () => !isDirty || window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการทิ้งการแก้ไขหรือไม่?"),
    [isDirty],
  );

  function scrollCardIntoView(id: string) {
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-item-id="${window.CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
  }

  function loadForm(id: string | null, next: CreateVideoClipRequest) {
    setEditId(id);
    setForm(next);
    setBaseline(next);
    setSourceUrlError(null);
    setMutationError(null);
    setShowPreview(false);
    setSaved(false);
    setShowForm(true);
  }

  function openCreate() {
    if (!confirmDiscard()) return;
    loadForm(null, EMPTY_FORM);
  }

  function selectClip(clip: VideoClipModel) {
    if (clip.id === editId && showForm) return;
    if (!confirmDiscard()) return;
    loadForm(clip.id, clipToForm(clip));
  }

  function stepClip(delta: -1 | 1) {
    const target = clips[editIndex + delta];
    if (!target || !confirmDiscard()) return;
    loadForm(target.id, clipToForm(target));
    scrollCardIntoView(target.id);
  }

  const closeForm = useCallback(() => {
    if (!confirmDiscard()) return;
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setSourceUrlError(null);
    setMutationError(null);
    setShowPreview(false);
    setSaved(false);
  }, [confirmDiscard]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!isSupportedVideoUrl(form.sourceUrl)) {
      setSourceUrlError(SOURCE_URL_ERROR);
      return;
    }
    // PATCH only touches keys present in the body, and JSON drops `undefined`,
    // so an emptied thumbnail must be sent as "" (the server stores null) or
    // the old value silently survives the save.
    const payload =
      editId !== null
        ? { ...form, thumbnailUrl: form.thumbnailUrl ?? "" }
        : { ...form, thumbnailUrl: form.thumbnailUrl || undefined };
    setSaving(true);
    setMutationError(null);
    try {
      if (editId !== null) {
        await updateVideoClip({ id: editId, body: payload }).unwrap();
      } else {
        const created = await createVideoClip(payload).unwrap();
        // Keep editing the new clip in place and bring its card into view.
        if (created?.id) {
          setEditId(created.id);
          scrollCardIntoView(created.id);
        }
      }
      setBaseline(form);
      setSaved(true);
    } catch {
      setMutationError("บันทึกวิดีโอคลิปไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบวิดีโอคลิปนี้หรือไม่?")) return;
    try {
      await deleteVideoClip(id).unwrap();
      if (id === editId) {
        setShowForm(false);
        setEditId(null);
        setForm(EMPTY_FORM);
        setBaseline(EMPTY_FORM);
      }
    } catch {
      setReorderError("ลบวิดีโอคลิปไม่สำเร็จ ลองอีกครั้ง");
    }
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

  // Esc closes the editor; Ctrl/⌘+Enter saves it.
  useEffect(() => {
    if (!showForm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeForm();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, closeForm]);

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>Video Clips</h1>
          </div>

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          <div className={styles.sceneWorkspace}>
            <section aria-label="วิดีโอคลิป">
              <div className={styles.sceneListHeader}>
                <h2 className={styles.sceneListTitle}>
                  คลิปทั้งหมด<span className={styles.sceneListCount}>({clips.length})</span>
                </h2>
                <button
                  className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                  onClick={openCreate}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Plus size={16} aria-hidden="true" /> เพิ่มวิดีโอคลิป
                </button>
              </div>

              {isLoading ? (
                <div className={styles.adminSpinner} />
              ) : clips.length === 0 ? (
                <div className={styles.adminEmpty}>ยังไม่มีวิดีโอคลิป — กด “เพิ่มวิดีโอคลิป” เพื่อเริ่ม</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={clips.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <ul className={styles.sceneList}>
                      {clips.map((clip, i) => (
                        <SortableClipCard
                          key={clip.id}
                          clip={clip}
                          position={i + 1}
                          selected={showForm && clip.id === editId}
                          onSelect={selectClip}
                          onDelete={handleDelete}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </section>

            {showForm ? (
              <>
                <div className={styles.sceneBackdrop} onClick={closeForm} aria-hidden="true" />
                <aside className={styles.sceneEditor} aria-label="Video clip editor">
                  <div className={styles.sceneEditorHeader}>
                    <h2 className={styles.sceneEditorTitle}>
                      {editId !== null ? `แก้ไขคลิปที่ ${editIndex >= 0 ? editIndex + 1 : ""}` : "เพิ่มวิดีโอคลิปใหม่"}
                      {isDirty && <span style={{ color: "#d29922", marginLeft: "0.4rem" }} title="ยังไม่บันทึก">●</span>}
                    </h2>
                    {editId !== null && (
                      <>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="คลิปก่อนหน้า"
                          aria-label="คลิปก่อนหน้า"
                          disabled={editIndex <= 0}
                          onClick={() => stepClip(-1)}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="คลิปถัดไป"
                          aria-label="คลิปถัดไป"
                          disabled={editIndex < 0 || editIndex >= clips.length - 1}
                          onClick={() => stepClip(1)}
                        >
                          <ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </>
                    )}
                    <button type="button" className={styles.sceneIconBtn} title="ปิด (Esc)" aria-label="ปิด" onClick={closeForm}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <form ref={formRef} onSubmit={handleSubmit} style={{ display: "contents" }}>
                    <div className={styles.sceneEditorBody}>
                      {mutationError && (
                        <AdminErrorBanner message={mutationError} onDismiss={() => setMutationError(null)} />
                      )}
                      <div className={styles.adminFormGrid}>
                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <label className={styles.adminLabel} htmlFor="clip-caption">ชื่อคลิป (Caption)</label>
                          <input
                            id="clip-caption"
                            className={styles.adminInput}
                            value={form.caption}
                            onChange={(e) => setForm({ ...form, caption: e.target.value })}
                            required
                          />
                        </div>
                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <label className={styles.adminLabel} htmlFor="clip-source">ลิงก์วิดีโอ (YouTube / Google Drive)</label>
                          <input
                            id="clip-source"
                            className={`${styles.adminInput} ${sourceUrlError ? styles.adminInputError : ""}`}
                            value={form.sourceUrl}
                            onChange={(e) => {
                              setForm({ ...form, sourceUrl: e.target.value });
                              setShowPreview(false);
                              if (sourceUrlError) setSourceUrlError(null);
                            }}
                            onBlur={() => {
                              if (form.sourceUrl && !isSupportedVideoUrl(form.sourceUrl)) setSourceUrlError(SOURCE_URL_ERROR);
                            }}
                            placeholder="https://drive.google.com/file/d/.../view"
                            required
                          />
                          {sourceUrlError ? (
                            <span className={styles.adminFieldError}>{sourceUrlError}</span>
                          ) : sourceSupported ? (
                            <div className={styles.clipSourceRow}>
                              <span className={`${styles.adminBadge} ${styles.adminBadgeGreen}`}>✓ {sourceKind(form.sourceUrl)}</span>
                              <button
                                type="button"
                                className={styles.clipLinkBtn}
                                onClick={() => setShowPreview((v) => !v)}
                                aria-expanded={showPreview}
                              >
                                <Play size={13} aria-hidden="true" /> {showPreview ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
                              </button>
                              <a className={styles.clipLinkBtn} href={form.sourceUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={13} aria-hidden="true" /> เปิดลิงก์
                              </a>
                            </div>
                          ) : null}
                          {showPreview && sourceSupported && (
                            <div className={styles.clipPreview}>
                              <iframe
                                src={previewEmbedUrl(form.sourceUrl)}
                                title="ตัวอย่างวิดีโอ"
                                allow="encrypted-media; picture-in-picture; fullscreen"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <label className={styles.adminLabel} htmlFor="clip-thumb">ภาพหน้าปก — Thumbnail URL (ไม่บังคับ — คลิป YouTube ใช้ภาพจาก YouTube ได้เอง)</label>
                          <div className={styles.clipThumbRow}>
                            <span className={`${styles.clipThumb} ${styles.clipThumbLarge}`}>
                              <ClipThumbImage src={clipThumbnailUrl(form.thumbnailUrl, form.sourceUrl)} size={20} />
                            </span>
                            <input
                              id="clip-thumb"
                              className={styles.adminInput}
                              value={form.thumbnailUrl ?? ""}
                              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                              placeholder={youtubeHint(form.sourceUrl)}
                            />
                          </div>
                          {form.thumbnailUrl && isSupportedVideoUrl(form.thumbnailUrl) && (
                            <span className={styles.adminFieldError}>
                              นี่เป็นลิงก์วิดีโอ ไม่ใช่ลิงก์รูปภาพ — ใส่ลิงก์ไฟล์รูป (.jpg/.png/.webp) หรือเว้นว่างไว้{sourceKind(form.sourceUrl) === "YouTube" ? " (จะใช้ภาพจาก YouTube อัตโนมัติ)" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.sceneEditorFooter}>
                      {saved && !isDirty ? (
                        <span className={styles.sceneSavedNote}>บันทึกแล้ว ✓</span>
                      ) : (
                        <span className={styles.sceneEditorHint}>Ctrl+Enter บันทึก · Esc ปิด</span>
                      )}
                      <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeForm}>
                        ปิด
                      </button>
                      <button
                        type="submit"
                        className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                        disabled={saving || (editId !== null && !isDirty)}
                      >
                        {saving ? "กำลังบันทึก…" : editId !== null ? "บันทึก" : "เพิ่ม"}
                      </button>
                    </div>
                  </form>
                </aside>
              </>
            ) : (
              <aside className={`${styles.sceneEditor} ${styles.sceneEditorIdle}`} aria-label="Video clip editor">
                <div className={styles.sceneEditorEmpty}>
                  เลือกคลิปทางซ้ายเพื่อแก้ไข
                  <br />
                  หรือกด “เพิ่มวิดีโอคลิป” เพื่อสร้างใหม่
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
