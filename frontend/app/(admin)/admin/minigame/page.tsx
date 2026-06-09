"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AdminSidebar from "@/components/AdminSidebar";
import AdminErrorBanner from "@/components/AdminErrorBanner";
import {
  useGetAdminQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useReorderQuestionsMutation,
  type CreateQuestionRequest,
} from "@/store/adminApi";
import type { QuizQuestion, AnswerLetter } from "@/types/minigame";
import styles from "@/components/Admin.module.css";

const EMPTY_FORM: CreateQuestionRequest = {
  text: "",
  correctAnswer: "A",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  explanation: "",
};

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
  question,
  position,
  onEdit,
  onDelete,
}: {
  question: QuizQuestion;
  position: number;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    background: isDragging ? "#21262d" : undefined,
    boxShadow: isDragging ? "0 2px 10px rgba(0,0,0,0.6)" : undefined,
    cursor: "default",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ width: 32 }}>
        <span {...attributes} {...listeners} style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
          <DragHandle />
        </span>
      </td>
      <td>{position}</td>
      <td>{question.text.length > 60 ? question.text.slice(0, 60) + "…" : question.text}</td>
      <td>
        <span className={`${styles.adminBadge} ${styles.adminBadgeGreen}`}>{question.correctAnswer}</span>
      </td>
      <td>
        <div className={styles.adminTableActions}>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnSecondary}`}
            onClick={() => onEdit(question)}
          >
            Edit
          </button>
          <button
            className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
            onClick={() => onDelete(question.id)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminMinigamePage() {
  const { data: serverQuestions, isLoading } = useGetAdminQuestionsQuery();
  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [reorderQuestions] = useReorderQuestionsMutation();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateQuestionRequest>(EMPTY_FORM);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const questions: QuizQuestion[] = serverQuestions ?? [];

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !serverQuestions) return;

    const base = serverQuestions.map((q) => q.id);
    const oldIndex = base.indexOf(active.id as string);
    const newIndex = base.indexOf(over.id as string);
    const newOrder = arrayMove(base, oldIndex, newIndex);

    try {
      await reorderQuestions(newOrder).unwrap();
    } catch {
      setReorderError("บันทึกลำดับคำถามไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(q: QuizQuestion) {
    setEditId(q.id);
    setForm({
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

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          {showForm && (
            <div className={styles.adminFormCard} ref={formRef}>
              <h2>{editId !== null ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.adminFormGrid}>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }} />
                      <th>#</th>
                      <th>Question</th>
                      <th>Correct</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={questions.map((q) => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {questions.map((q, i) => (
                        <SortableRow
                          key={q.id}
                          question={q}
                          position={i + 1}
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
