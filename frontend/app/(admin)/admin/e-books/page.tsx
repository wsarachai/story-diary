"use client";

import { useState, useRef, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminEBooksQuery,
  useCreateEBookMutation,
  useUpdateEBookMutation,
  useDeleteEBookMutation,
  type CreateEBookRequest,
} from "@/store/adminApi";
import type { EBookChapter } from "@/types/ebook";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateEBookRequest = { title: "", pdfUrl: "" };

export default function AdminEBooksPage() {
  const { data: ebooks, isLoading } = useGetAdminEBooksQuery();
  const [createEBook] = useCreateEBookMutation();
  const [updateEBook] = useUpdateEBookMutation();
  const [deleteEBook] = useDeleteEBookMutation();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEBookRequest>(EMPTY_FORM);
  const formRef = useRef<HTMLDivElement>(null);

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
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>PDF URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(ebooks ?? []).map((eb) => (
                <tr key={eb.id}>
                  <td>{eb.id}</td>
                  <td>{eb.title}</td>
                  <td>
                    <a
                      href={eb.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.adminLink}
                    >
                      {eb.pdfUrl}
                    </a>
                  </td>
                  <td>
                    <div className={styles.adminTableActions}>
                      <button
                        className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                        onClick={() => openEdit(eb)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
                        onClick={() => handleDelete(eb.id)}
                      >
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
