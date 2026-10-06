"use client";

import { useState, useRef, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import AdminDragHandle from "@/components/AdminDragHandle";
import { upload } from "@vercel/blob/client";
import { MAX_EBOOK_PDF_BYTES } from "@/lib/ebook";
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
 * Map a failed Blob client-upload to actionable Thai copy. The SDK throws a
 * generic "Failed to retrieve the client token" for ANY server-side failure
 * of the token request (expired session or missing Blob env), so that case
 * names both likely causes.
 */
function uploadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/retrieve the client token|presigned url/i.test(msg)) {
    return "อัปโหลดไม่สำเร็จ — เซสชันอาจหมดอายุ (ลองเข้าสู่ระบบใหม่) หรือเซิร์ฟเวอร์ยังไม่ได้เชื่อมต่อ Vercel Blob";
  }
  if (/large|size|413/i.test(msg)) {
    return "ไฟล์ใหญ่เกิน 50 MB";
  }
  if (/content[- ]type|pdf/i.test(msg)) {
    return "รองรับเฉพาะไฟล์ PDF";
  }
  return `อัปโหลดไม่สำเร็จ${msg ? ` (${msg})` : " ลองอีกครั้ง"}`;
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
          <AdminDragHandle />
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
  const [pdfUrlError, setPdfUrlError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPdfUrlError(null);
    setIsUploading(false);
    setUploadError(null);
  }

  /** Upload the picked PDF straight from the browser to Vercel Blob, then
   *  fill the URL field with the resulting blob URL. */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("เลือกไฟล์ PDF เท่านั้น");
      return;
    }
    if (file.size > MAX_EBOOK_PDF_BYTES) {
      setUploadError("ไฟล์ใหญ่เกิน 50 MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      // The SDK's token request carries no cookies, so the admin JWT must be
      // attached explicitly for the upload route's requireAdmin guard.
      const jwt = localStorage.getItem("auth_token");
      if (!jwt) {
        setUploadError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
        return;
      }
      // Spaces/unicode in filenames are collapsed to keep Blob pathnames safe.
      const safeName = file.name.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const blob = await upload(`ebooks/${safeName || "ebook.pdf"}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/e-books/upload",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setForm((f) => ({ ...f, pdfUrl: blob.url }));
      setPdfUrlError(null);
    } catch (err) {
      setUploadError(uploadErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  function validatePdfUrl(url: string): boolean {
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      setPdfUrlError("URL ต้องขึ้นต้นด้วย http://, https:// หรือ /");
      return false;
    }
    const pathname = new URL(url, window.location.origin).pathname;
    if (!pathname.toLowerCase().endsWith(".pdf")) {
      setPdfUrlError("ต้องเป็นลิงก์ไฟล์ PDF เท่านั้น");
      return false;
    }
    setPdfUrlError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePdfUrl(form.pdfUrl)) return;
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
                <div className={`${styles.adminFormField} ${styles.full}`}>
                  <label className={styles.adminLabel}>PDF</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? "กำลังอัปโหลด…" : "อัปโหลดไฟล์ PDF"}
                    </button>
                    <span style={{ opacity: 0.65 }}>หรือวาง URL ด้านล่าง (สูงสุด 50 MB)</span>
                  </div>
                  {uploadError && <span className={styles.adminFieldError}>{uploadError}</span>}
                  <input
                    className={`${styles.adminInput} ${pdfUrlError ? styles.adminInputError : ""}`}
                    value={form.pdfUrl}
                    placeholder="https://example.com/book.pdf"
                    onChange={(e) => {
                      setForm({ ...form, pdfUrl: e.target.value });
                      if (pdfUrlError) validatePdfUrl(e.target.value);
                    }}
                    required
                  />
                  {pdfUrlError && <span className={styles.adminFieldError}>{pdfUrlError}</span>}
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
