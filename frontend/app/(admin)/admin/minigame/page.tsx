"use client";

import { useState, useRef, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  type CreateQuestionRequest,
} from "@/store/adminApi";
import type { QuizQuestion, AnswerLetter } from "@/types/minigame";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateQuestionRequest = {
  number: 1,
  text: "",
  correctAnswer: "A",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  explanation: "",
};

export default function AdminMinigamePage() {
  const { data: questions, isLoading } = useGetAdminQuestionsQuery();
  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateQuestionRequest>(EMPTY_FORM);
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

  function openEdit(q: QuizQuestion) {
    setEditId(q.id);
    setForm({
      number: q.number,
      text: q.text,
      correctAnswer: q.correctAnswer,
      optionA: q.options[0]?.text ?? "",
      optionB: q.options[1]?.text ?? "",
      optionC: q.options[2]?.text ?? "",
      optionD: q.options[3]?.text ?? "",
      explanation: q.explanation ?? "",
    });
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
      await updateQuestion({ id: editId, body: form });
    } else {
      await createQuestion(form);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบคำถามนี้หรือไม่?")) return;
    await deleteQuestion(id);
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
      <main className={styles.adminMain}>
        <div className={styles.adminPageHeader}>
          <h1 className={styles.adminPageTitle}>Minigame Questions</h1>
          <button className={`${styles.adminBtn} ${styles.adminBtnPrimary}`} onClick={openCreate}>
            + เพิ่มคำถาม
          </button>
        </div>

        {showForm && (
          <div className={styles.adminFormCard} ref={formRef}>
            <h2>{editId !== null ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.adminFormGrid}>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Number</label>
                  <input
                    className={styles.adminInput}
                    type="number"
                    min={1}
                    value={form.number}
                    onChange={(e) =>
                      setForm({ ...form, number: parseInt(e.target.value, 10) || 1 })
                    }
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Correct Answer</label>
                  <select
                    className={styles.adminSelect}
                    value={form.correctAnswer}
                    onChange={(e) =>
                      setForm({ ...form, correctAnswer: e.target.value as AnswerLetter })
                    }
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div className={`${styles.adminFormField} ${styles.full}`}>
                  <label className={styles.adminLabel}>Question Text</label>
                  <textarea
                    className={styles.adminTextarea}
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Option A</label>
                  <input
                    className={styles.adminInput}
                    value={form.optionA}
                    onChange={(e) => setForm({ ...form, optionA: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Option B</label>
                  <input
                    className={styles.adminInput}
                    value={form.optionB}
                    onChange={(e) => setForm({ ...form, optionB: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Option C</label>
                  <input
                    className={styles.adminInput}
                    value={form.optionC}
                    onChange={(e) => setForm({ ...form, optionC: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.adminFormField}>
                  <label className={styles.adminLabel}>Option D</label>
                  <input
                    className={styles.adminInput}
                    value={form.optionD}
                    onChange={(e) => setForm({ ...form, optionD: e.target.value })}
                    required
                  />
                </div>
                <div className={`${styles.adminFormField} ${styles.full}`}>
                  <label className={styles.adminLabel}>Explanation (optional)</label>
                  <textarea
                    className={styles.adminTextarea}
                    value={form.explanation ?? ""}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
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
                <th>#</th>
                <th>Question</th>
                <th>Correct</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(questions ?? []).map((q) => (
                <tr key={q.id}>
                  <td>{q.number}</td>
                  <td>{q.text.length > 60 ? q.text.slice(0, 60) + "…" : q.text}</td>
                  <td>
                    <span className={`${styles.adminBadge} ${styles.adminBadgeGreen}`}>{q.correctAnswer}</span>
                  </td>
                  <td>
                    <div className={styles.adminTableActions}>
                      <button
                        className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
                        onClick={() => openEdit(q)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
                        onClick={() => handleDelete(q.id)}
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
