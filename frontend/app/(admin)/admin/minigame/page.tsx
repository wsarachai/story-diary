"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  useGetAdminQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  type CreateQuestionRequest,
} from "@/store/adminApi";
import type { QuizQuestion, AnswerLetter } from "@/types/minigame";

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
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-wrapper">
      <main className="admin-main">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Minigame Questions</h1>
          <button className="admin-btn admin-btn-primary" onClick={openCreate}>
            + เพิ่มคำถาม
          </button>
        </div>

        {showForm && (
          <div className="admin-form-card">
            <h2>{editId !== null ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label className="admin-label">Number</label>
                  <input
                    className="admin-input"
                    type="number"
                    min={1}
                    value={form.number}
                    onChange={(e) =>
                      setForm({ ...form, number: parseInt(e.target.value, 10) || 1 })
                    }
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Correct Answer</label>
                  <select
                    className="admin-select"
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
                <div className="admin-form-field full">
                  <label className="admin-label">Question Text</label>
                  <textarea
                    className="admin-textarea"
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Option A</label>
                  <input
                    className="admin-input"
                    value={form.optionA}
                    onChange={(e) => setForm({ ...form, optionA: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Option B</label>
                  <input
                    className="admin-input"
                    value={form.optionB}
                    onChange={(e) => setForm({ ...form, optionB: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Option C</label>
                  <input
                    className="admin-input"
                    value={form.optionC}
                    onChange={(e) => setForm({ ...form, optionC: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Option D</label>
                  <input
                    className="admin-input"
                    value={form.optionD}
                    onChange={(e) => setForm({ ...form, optionD: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-form-field full">
                  <label className="admin-label">Explanation (optional)</label>
                  <textarea
                    className="admin-textarea"
                    value={form.explanation ?? ""}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
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
          <div className="admin-table-wrap">
          <table className="admin-table">
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
                    <span className="admin-badge admin-badge-green">{q.correctAnswer}</span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="admin-btn admin-btn-secondary"
                        onClick={() => openEdit(q)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-danger"
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
