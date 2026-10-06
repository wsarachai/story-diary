"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Eye, FileText, Plus, Trash2, UploadCloud, X } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import AdminDragHandle from "@/components/AdminDragHandle";
import { upload } from "@vercel/blob/client";
import { MAX_EBOOK_PDF_BYTES, ebookBlobPathname, isPrivateBlobUrl } from "@/lib/ebook";
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

/**
 * Abort an upload once no bytes have moved for this long. The Blob SDK
 * retries network-level failures (including error responses that lack CORS
 * headers) ~10 times with exponential backoff, which otherwise leaves the
 * button stuck on "กำลังอัปโหลด…" for many minutes.
 */
const UPLOAD_STALL_MS = 30_000;

/**
 * Map a failed Blob client-upload to actionable Thai copy. The SDK throws a
 * generic "Failed to retrieve the client token" for ANY server-side failure
 * of the token request (expired session or missing Blob env), so that case
 * names both likely causes. Matches the SDK's exact message prefixes — its
 * error classes aren't exported from the client entry, and loose patterns
 * (e.g. /pdf/) also match messages that merely quote the pathname.
 */
function uploadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/The request was aborted/i.test(msg)) {
    return "อัปโหลดไม่สำเร็จ — การเชื่อมต่อกับ Vercel Blob ไม่ตอบสนอง ลองอีกครั้ง";
  }
  if (/retrieve the client token|presigned url/i.test(msg)) {
    return "อัปโหลดไม่สำเร็จ — เซสชันอาจหมดอายุ (ลองเข้าสู่ระบบใหม่) หรือเซิร์ฟเวอร์ยังไม่ได้เชื่อมต่อ Vercel Blob";
  }
  if (/File is too large/i.test(msg)) {
    return "ไฟล์ใหญ่เกิน 50 MB";
  }
  if (/Content type mismatch/i.test(msg)) {
    return "รองรับเฉพาะไฟล์ PDF";
  }
  return `อัปโหลดไม่สำเร็จ${msg ? ` (${msg})` : " ลองอีกครั้ง"}`;
}

/** Private-store blob URLs 403 when opened directly; route them through the
 *  authenticated PDF proxy the reader page uses. */
function pdfViewHref(pdfUrl: string): string {
  if (!isPrivateBlobUrl(pdfUrl)) return pdfUrl;
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") ?? "") : "";
  return `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}&token=${encodeURIComponent(token)}`;
}

/** Validation copy for a PDF URL, or null when it's acceptable. */
function pdfUrlProblem(url: string): string | null {
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
    return "URL ต้องขึ้นต้นด้วย http://, https:// หรือ /";
  }
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    if (!pathname.toLowerCase().endsWith(".pdf")) return "ต้องเป็นลิงก์ไฟล์ PDF เท่านั้น";
  } catch {
    return "URL ไม่ถูกต้อง";
  }
  return null;
}

/** Last path segment of a PDF URL, decoded — readable in cards and the editor. */
function pdfFileName(url: string): string {
  try {
    const name = new URL(url, "https://x.invalid").pathname.split("/").filter(Boolean).pop() ?? url;
    return decodeURIComponent(name);
  } catch {
    return url;
  }
}

function SortableEBookCard({
  ebook,
  position,
  selected,
  onSelect,
  onDelete,
}: {
  ebook: EBookChapter;
  position: number;
  selected: boolean;
  onSelect: (ebook: EBookChapter) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ebook.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    boxShadow: isDragging ? "0 4px 14px rgba(0,0,0,0.6)" : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: "relative",
  };
  const uploaded = isPrivateBlobUrl(ebook.pdfUrl);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-item-id={ebook.id}
      role="button"
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      aria-label={`E-Book ${ebook.title}`}
      className={`${styles.sceneCard} ${styles.ebookCard} ${selected ? styles.sceneCardSelected : ""}`}
      onClick={() => onSelect(ebook)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(ebook);
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
      <span className={styles.ebookIcon}>
        <FileText size={20} aria-hidden="true" />
      </span>
      <span className={styles.sceneCardBody}>
        <span className={styles.sceneCardText} style={{ WebkitLineClamp: 1 }}>{ebook.title}</span>
        <span className={styles.quizCardAnswer}>
          <span className={`${styles.adminBadge} ${uploaded ? styles.sceneBadgeBlue : styles.adminBadgeGray}`}>
            {uploaded ? "ไฟล์อัปโหลด" : "ลิงก์ภายนอก"}
          </span>
          <span className={styles.quizCardAnswerText}>{pdfFileName(ebook.pdfUrl)}</span>
        </span>
      </span>
      <span style={{ display: "inline-flex" }}>
        <a
          className={styles.sceneIconBtn}
          href={pdfViewHref(ebook.pdfUrl)}
          target="_blank"
          rel="noopener noreferrer"
          title="เปิด PDF"
          aria-label={`เปิด PDF ${ebook.title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={16} aria-hidden="true" />
        </a>
        <button
          type="button"
          className={`${styles.sceneIconBtn} ${styles.sceneIconBtnDanger}`}
          title="ลบ E-Book"
          aria-label={`ลบ E-Book ${ebook.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(ebook.id);
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </span>
    </li>
  );
}

export default function AdminEBooksPage() {
  const { data: serverEBooks, isLoading } = useGetAdminEBooksQuery();
  const [createEBook] = useCreateEBookMutation();
  const [updateEBook] = useUpdateEBookMutation();
  const [deleteEBook] = useDeleteEBookMutation();
  const [reorderEBooks] = useReorderEBooksMutation();

  const [reorderError, setReorderError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEBookRequest>(EMPTY_FORM);
  /** Snapshot the editor opened with — compared against `form` for unsaved changes. */
  const [baseline, setBaseline] = useState<CreateEBookRequest>(EMPTY_FORM);
  const [pdfUrlError, setPdfUrlError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const ebooks = serverEBooks ?? [];
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const editIndex = editId === null ? -1 : ebooks.findIndex((e) => e.id === editId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const confirmDiscard = useCallback(() => {
    if (isUploading) {
      return window.confirm("กำลังอัปโหลดไฟล์อยู่ ต้องการออกจากการแก้ไขหรือไม่?");
    }
    return !isDirty || window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการทิ้งการแก้ไขหรือไม่?");
  }, [isDirty, isUploading]);

  function scrollCardIntoView(id: string) {
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-item-id="${window.CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
  }

  function loadForm(id: string | null, next: CreateEBookRequest) {
    setEditId(id);
    setForm(next);
    setBaseline(next);
    setPdfUrlError(null);
    setUploadError(null);
    setMutationError(null);
    setShowPreview(false);
    setSaved(false);
    setShowForm(true);
  }

  function openCreate() {
    if (!confirmDiscard()) return;
    loadForm(null, EMPTY_FORM);
  }

  function selectEBook(eb: EBookChapter) {
    if (eb.id === editId && showForm) return;
    if (!confirmDiscard()) return;
    loadForm(eb.id, { title: eb.title, pdfUrl: eb.pdfUrl });
  }

  function stepEBook(delta: -1 | 1) {
    const target = ebooks[editIndex + delta];
    if (!target || !confirmDiscard()) return;
    loadForm(target.id, { title: target.title, pdfUrl: target.pdfUrl });
    scrollCardIntoView(target.id);
  }

  const closeForm = useCallback(() => {
    if (!confirmDiscard()) return;
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setPdfUrlError(null);
    setUploadError(null);
    setMutationError(null);
    setShowPreview(false);
    setSaved(false);
  }, [confirmDiscard]);

  /** Upload the picked/dropped PDF straight from the browser to Vercel Blob,
   *  then fill the URL field with the resulting blob URL. */
  async function uploadPdf(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("เลือกไฟล์ PDF เท่านั้น");
      return;
    }
    if (file.size > MAX_EBOOK_PDF_BYTES) {
      setUploadError("ไฟล์ใหญ่เกิน 50 MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    const controller = new AbortController();
    let stallTimer = setTimeout(() => controller.abort(), UPLOAD_STALL_MS);
    // SDK retries re-send the body from byte 0, so only progress past the
    // furthest point reached counts as the upload being alive.
    let maxLoaded = 0;
    const onProgress = ({ loaded, percentage }: { loaded: number; percentage: number }) => {
      setUploadProgress(percentage);
      if (loaded <= maxLoaded) return;
      maxLoaded = loaded;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => controller.abort(), UPLOAD_STALL_MS);
    };
    try {
      // The SDK's token request carries no cookies, so the admin JWT must be
      // attached explicitly for the upload route's requireAdmin guard.
      const jwt = localStorage.getItem("auth_token");
      if (!jwt) {
        setUploadError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
        return;
      }
      // The story-diary-blob store is private: a "public" PUT is answered with
      // a CORS-less 503 that the SDK retries silently. Readers get the PDF
      // through /api/pdf-proxy, which fetches private blobs with the server token.
      const blob = await upload(ebookBlobPathname(file.name), file, {
        access: "private",
        // Explicit, so Blob never has to infer the type from the pathname or
        // an OS-reported MIME such as "" or "application/x-pdf".
        contentType: "application/pdf",
        handleUploadUrl: "/api/admin/e-books/upload",
        headers: { Authorization: `Bearer ${jwt}` },
        abortSignal: controller.signal,
        onUploadProgress: onProgress,
      });
      setForm((f) => ({
        ...f,
        pdfUrl: blob.url,
        // New books get a starting title from the file name.
        title: f.title || file.name.replace(/\.pdf$/i, ""),
      }));
      setPdfUrlError(null);
      setShowPreview(false);
    } catch (err) {
      setUploadError(uploadErrorMessage(err));
    } finally {
      clearTimeout(stallTimer);
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadPdf(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadPdf(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || isUploading) return;
    const problem = pdfUrlProblem(form.pdfUrl);
    if (problem) {
      setPdfUrlError(problem);
      return;
    }
    setSaving(true);
    setMutationError(null);
    try {
      if (editId !== null) {
        await updateEBook({ id: editId, body: form }).unwrap();
      } else {
        const created = await createEBook(form).unwrap();
        // Keep editing the new book in place and bring its card into view.
        if (created?.id) {
          setEditId(created.id);
          scrollCardIntoView(created.id);
        }
      }
      setBaseline(form);
      setSaved(true);
    } catch {
      setMutationError("บันทึก E-Book ไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบ E-Book นี้หรือไม่?")) return;
    try {
      await deleteEBook(id).unwrap();
      if (id === editId) {
        setShowForm(false);
        setEditId(null);
        setForm(EMPTY_FORM);
        setBaseline(EMPTY_FORM);
      }
    } catch {
      setReorderError("ลบ E-Book ไม่สำเร็จ ลองอีกครั้ง");
    }
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

  const hasPdf = form.pdfUrl !== "" && !pdfUrlProblem(form.pdfUrl);

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>E-Books</h1>
          </div>

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          <div className={styles.sceneWorkspace}>
            <section aria-label="E-Books">
              <div className={styles.sceneListHeader}>
                <h2 className={styles.sceneListTitle}>
                  หนังสือทั้งหมด<span className={styles.sceneListCount}>({ebooks.length})</span>
                </h2>
                <button
                  className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                  onClick={openCreate}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Plus size={16} aria-hidden="true" /> เพิ่ม E-Book
                </button>
              </div>

              {isLoading ? (
                <div className={styles.adminSpinner} />
              ) : ebooks.length === 0 ? (
                <div className={styles.adminEmpty}>ยังไม่มี E-Book — กด “เพิ่ม E-Book” เพื่อเริ่ม</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={ebooks.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                    <ul className={styles.sceneList}>
                      {ebooks.map((eb, i) => (
                        <SortableEBookCard
                          key={eb.id}
                          ebook={eb}
                          position={i + 1}
                          selected={showForm && eb.id === editId}
                          onSelect={selectEBook}
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
                <aside className={styles.sceneEditor} aria-label="E-Book editor">
                  <div className={styles.sceneEditorHeader}>
                    <h2 className={styles.sceneEditorTitle}>
                      {editId !== null ? `แก้ไข E-Book เล่มที่ ${editIndex >= 0 ? editIndex + 1 : ""}` : "เพิ่ม E-Book ใหม่"}
                      {isDirty && <span style={{ color: "#d29922", marginLeft: "0.4rem" }} title="ยังไม่บันทึก">●</span>}
                    </h2>
                    {editId !== null && (
                      <>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="เล่มก่อนหน้า"
                          aria-label="เล่มก่อนหน้า"
                          disabled={editIndex <= 0}
                          onClick={() => stepEBook(-1)}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="เล่มถัดไป"
                          aria-label="เล่มถัดไป"
                          disabled={editIndex < 0 || editIndex >= ebooks.length - 1}
                          onClick={() => stepEBook(1)}
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
                          <label className={styles.adminLabel} htmlFor="ebook-title">ชื่อหนังสือ (Title)</label>
                          <input
                            id="ebook-title"
                            className={styles.adminInput}
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                          />
                        </div>

                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <span className={styles.adminLabel}>ไฟล์ PDF</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,.pdf"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                          />
                          <button
                            type="button"
                            className={`${styles.ebookDropzone} ${isDragOver ? styles.ebookDropzoneActive : ""}`}
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!isUploading) setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                          >
                            <UploadCloud size={22} aria-hidden="true" />
                            {isUploading ? (
                              <span>
                                กำลังอัปโหลด… {uploadProgress !== null ? `${Math.round(uploadProgress)}%` : ""}
                                <span className={styles.ebookProgress}>
                                  <span style={{ width: `${uploadProgress ?? 0}%` }} />
                                </span>
                              </span>
                            ) : (
                              <span>
                                <strong>{form.pdfUrl ? "อัปโหลดไฟล์ใหม่แทน" : "อัปโหลดไฟล์ PDF"}</strong>
                                <br />
                                <span className={styles.ebookDropzoneHint}>คลิกเพื่อเลือก หรือลากไฟล์มาวางที่นี่ · สูงสุด 50 MB</span>
                              </span>
                            )}
                          </button>
                          {uploadError && <span className={styles.adminFieldError}>{uploadError}</span>}
                        </div>

                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <label className={styles.adminLabel} htmlFor="ebook-url">หรือวางลิงก์ PDF</label>
                          <input
                            id="ebook-url"
                            className={`${styles.adminInput} ${pdfUrlError ? styles.adminInputError : ""}`}
                            value={form.pdfUrl}
                            placeholder="https://example.com/book.pdf"
                            onChange={(e) => {
                              setForm({ ...form, pdfUrl: e.target.value });
                              setShowPreview(false);
                              if (pdfUrlError) setPdfUrlError(pdfUrlProblem(e.target.value));
                            }}
                            onBlur={() => {
                              if (form.pdfUrl) setPdfUrlError(pdfUrlProblem(form.pdfUrl));
                            }}
                            required
                          />
                          {pdfUrlError ? (
                            <span className={styles.adminFieldError}>{pdfUrlError}</span>
                          ) : hasPdf ? (
                            <div className={styles.clipSourceRow}>
                              <span className={`${styles.adminBadge} ${isPrivateBlobUrl(form.pdfUrl) ? styles.sceneBadgeBlue : styles.adminBadgeGray}`}>
                                {isPrivateBlobUrl(form.pdfUrl) ? "ไฟล์อัปโหลด" : "ลิงก์ภายนอก"}
                              </span>
                              <span className={styles.quizCardAnswerText} style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                                {pdfFileName(form.pdfUrl)}
                              </span>
                              <button
                                type="button"
                                className={styles.clipLinkBtn}
                                onClick={() => setShowPreview((v) => !v)}
                                aria-expanded={showPreview}
                              >
                                <Eye size={13} aria-hidden="true" /> {showPreview ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
                              </button>
                              <a className={styles.clipLinkBtn} href={pdfViewHref(form.pdfUrl)} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={13} aria-hidden="true" /> เปิดในแท็บใหม่
                              </a>
                            </div>
                          ) : null}
                          {showPreview && hasPdf && (
                            <div className={styles.ebookPreview}>
                              <iframe src={pdfViewHref(form.pdfUrl)} title="ตัวอย่าง PDF" />
                            </div>
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
                        disabled={saving || isUploading || (editId !== null && !isDirty)}
                      >
                        {saving ? "กำลังบันทึก…" : editId !== null ? "บันทึก" : "เพิ่ม"}
                      </button>
                    </div>
                  </form>
                </aside>
              </>
            ) : (
              <aside className={`${styles.sceneEditor} ${styles.sceneEditorIdle}`} aria-label="E-Book editor">
                <div className={styles.sceneEditorEmpty}>
                  เลือกหนังสือทางซ้ายเพื่อแก้ไข
                  <br />
                  หรือกด “เพิ่ม E-Book” เพื่อสร้างใหม่
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
