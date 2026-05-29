"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminEBooksQuery,
  useCreateEBookMutation,
  useUpdateEBookMutation,
  useDeleteEBookMutation,
  type CreateEBookRequest,
} from "@/store/adminApi";
import type { EBookChapter } from "@/types/ebook";

const EMPTY_FORM: CreateEBookRequest = { title: "", pdfUrl: "" };

export default function AdminEBooksPage() {
  const { data: ebooks, isLoading } = useGetAdminEBooksQuery();
  const [createEBook] = useCreateEBookMutation();
  const [updateEBook] = useUpdateEBookMutation();
  const [deleteEBook] = useDeleteEBookMutation();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEBookRequest>(EMPTY_FORM);

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
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-page-title">E-Books</h1>
          <button className="admin-btn admin-btn-primary" onClick={openCreate}>
            + เพิ่ม E-Book
          </button>
        </div>

        {showForm && (
          <div className="admin-form-card">
            <h2>{editId !== null ? "แก้ไข E-Book" : "เพิ่ม E-Book ใหม่"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label className="admin-label">Title</label>
                  <input
                    className="admin-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">PDF URL</label>
                  <input
                    className="admin-input"
                    value={form.pdfUrl}
                    onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={closeForm}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  {editId !== null ? "บันทึก" : "เพิ่ม"}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="chapter-spinner" />
        ) : (
          <table className="admin-table">
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
                      style={{ color: "#58a6ff", wordBreak: "break-all" }}
                    >
                      {eb.pdfUrl}
                    </a>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="admin-btn admin-btn-secondary"
                        onClick={() => openEdit(eb)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-danger"
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
        )}
      </main>
    </div>
  );
}
