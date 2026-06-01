"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminChaptersQuery,
  useCreateChapterMutation,
  useDeleteChapterMutation,
  type CreateChapterRequest,
} from "@/store/adminApi";

const EMPTY_FORM: CreateChapterRequest = {
  title: "",
  introTitle: "",
  lockState: "unlocked",
  backgroundImageUrl: "",
};

export default function AdminChaptersPage() {
  const router = useRouter();
  const { data: chapters, isLoading } = useGetAdminChaptersQuery();
  const [createChapter] = useCreateChapterMutation();
  const [deleteChapter] = useDeleteChapterMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateChapterRequest>(EMPTY_FORM);

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createChapter(form);
    closeForm();
  }

  async function handleDelete(id: number) {
    if (!window.confirm("ลบบทนี้หรือไม่?")) return;
    await deleteChapter(id);
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-wrapper">
        <main className="admin-main">
          <div className="admin-page-header">
            <h1 className="admin-page-title">Chapters</h1>
            <button className="admin-btn admin-btn-primary" onClick={openCreate}>
              + เพิ่มบท
            </button>
          </div>

          {showForm && (
            <div className="admin-form-card">
              <h2>เพิ่มบทใหม่</h2>
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
                    <label className="admin-label">Intro Title</label>
                    <input
                      className="admin-input"
                      value={form.introTitle}
                      onChange={(e) => setForm({ ...form, introTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Lock State</label>
                    <select
                      className="admin-select"
                      value={form.lockState}
                      onChange={(e) => setForm({ ...form, lockState: e.target.value as "unlocked" | "locked" })}
                    >
                      <option value="unlocked">unlocked</option>
                      <option value="locked">locked</option>
                    </select>
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Background Image URL (optional)</label>
                    <input
                      className="admin-input"
                      value={form.backgroundImageUrl ?? ""}
                      onChange={(e) => setForm({ ...form, backgroundImageUrl: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm}>ยกเลิก</button>
                  <button type="submit" className="admin-btn admin-btn-primary">เพิ่ม</button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="chapter-spinner" />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Lock State</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(chapters ?? []).map((ch) => (
                    <tr key={ch.id}>
                      <td>{ch.id}</td>
                      <td>{ch.title}</td>
                      <td>
                        <span className={`admin-badge ${ch.lockState === "unlocked" ? "admin-badge-green" : "admin-badge-yellow"}`}>
                          {ch.lockState}
                        </span>
                      </td>
                      <td>{ch.progress}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            className="admin-btn admin-btn-secondary"
                            onClick={() => router.push(`/admin/chapters/${ch.id}`)}
                          >
                            Edit →
                          </button>
                          <button
                            className="admin-btn admin-btn-danger"
                            onClick={() => handleDelete(ch.id)}
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
