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
import styles from "@/components/Admin.module.css";

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
                  <div className={styles.adminFormField}>
                    <label className={styles.adminLabel}>Background Image URL (optional)</label>
                    <input
                      className={styles.adminInput}
                      value={form.backgroundImageUrl ?? ""}
                      onChange={(e) => setForm({ ...form, backgroundImageUrl: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.adminFormActions}>
                  <button type="button" className={`${styles.adminBtn} ${styles.adminBtnSecondary}`} onClick={closeForm}>ยกเลิก</button>
                  <button type="submit" className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}>เพิ่ม</button>
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
                        <span className={`${styles.adminBadge} ${ch.lockState === "unlocked" ? styles.adminBadgeGreen : styles.adminBadgeYellow}`}>
                          {ch.lockState}
                        </span>
                      </td>
                      <td>{ch.progress}</td>
                      <td>
                        <div className={styles.adminTableActions}>
                          <button
                            className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                            onClick={() => router.push(`/admin/chapters/${ch.id}`)}
                          >
                            Edit →
                          </button>
                          <button
                            className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
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
