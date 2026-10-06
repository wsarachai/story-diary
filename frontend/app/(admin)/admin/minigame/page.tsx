"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronLeft, ChevronRight, MessageSquareText, Plus, Trash2, X } from "lucide-react";
import AdminDragHandle from "@/components/AdminDragHandle";
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
import type {
  QuizQuestion,
  AnswerLetter,
  QuestionGender,
} from "@/types/minigame";
import styles from "@/components/Admin.module.css";

type QuestionForm = Omit<CreateQuestionRequest, "gender">;

const EMPTY_FORM: QuestionForm = {
  text: "",
  correctAnswer: "A",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  explanation: "",
};

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];
const OPTION_KEY = { A: "optionA", B: "optionB", C: "optionC", D: "optionD" } as const;

const GENDER_TABS: { key: QuestionGender; label: string }[] = [
  { key: "male", label: "ชาย" },
  { key: "female", label: "หญิง" },
];

function questionToForm(q: QuizQuestion): QuestionForm {
  return {
    text: q.text,
    correctAnswer: q.correctAnswer,
    optionA: q.options[0]?.text ?? "",
    optionB: q.options[1]?.text ?? "",
    optionC: q.options[2]?.text ?? "",
    optionD: q.options[3]?.text ?? "",
    explanation: q.explanation ?? "",
  };
}

function SortableQuestionCard({
  question,
  position,
  selected,
  onSelect,
  onDelete,
}: {
  question: QuizQuestion;
  position: number;
  selected: boolean;
  onSelect: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.95 : 1,
    boxShadow: isDragging ? "0 4px 14px rgba(0,0,0,0.6)" : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: "relative",
  };
  const correct = question.options.find((o) => o.letter === question.correctAnswer);

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-item-id={question.id}
      role="button"
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
      aria-label={`คำถามข้อ ${position}: ${question.text.slice(0, 40)}`}
      className={`${styles.sceneCard} ${styles.quizCard} ${selected ? styles.sceneCardSelected : ""}`}
      onClick={() => onSelect(question)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(question);
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
      <span className={styles.sceneCardBody}>
        <span className={styles.sceneCardText}>{question.text}</span>
        <span className={styles.quizCardAnswer}>
          <span className={`${styles.adminBadge} ${styles.adminBadgeGreen}`}>✓ {question.correctAnswer}</span>
          <span className={styles.quizCardAnswerText}>{correct?.text ?? "—"}</span>
          {question.explanation && (
            <span title="มีคำอธิบาย" style={{ display: "inline-flex", flexShrink: 0 }}>
              <MessageSquareText size={13} aria-label="มีคำอธิบาย" />
            </span>
          )}
        </span>
      </span>
      <button
        type="button"
        className={`${styles.sceneIconBtn} ${styles.sceneIconBtnDanger}`}
        title="ลบคำถาม"
        aria-label={`ลบคำถามข้อ ${position}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(question.id);
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export default function AdminMinigamePage() {
  const { data: serverQuestions, isLoading } = useGetAdminQuestionsQuery();
  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [reorderQuestions] = useReorderQuestionsMutation();

  const [activeGender, setActiveGender] = useState<QuestionGender>("male");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  /** Snapshot the editor opened with — compared against `form` for unsaved changes. */
  const [baseline, setBaseline] = useState<QuestionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const questions: QuizQuestion[] = serverQuestions?.[activeGender] ?? [];
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const editIndex = editId === null ? -1 : questions.findIndex((q) => q.id === editId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

  function resetEditor() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setSaved(false);
    setMutationError(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const base = questions.map((q) => q.id);
    const oldIndex = base.indexOf(active.id as string);
    const newIndex = base.indexOf(over.id as string);
    const newOrder = arrayMove(base, oldIndex, newIndex);

    try {
      await reorderQuestions({ gender: activeGender, ids: newOrder }).unwrap();
    } catch {
      setReorderError("บันทึกลำดับคำถามไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  function switchGender(gender: QuestionGender) {
    if (gender === activeGender || !confirmDiscard()) return;
    setActiveGender(gender);
    resetEditor();
    setReorderError(null);
  }

  function openCreate() {
    if (!confirmDiscard()) return;
    setEditId(null);
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setSaved(false);
    setMutationError(null);
    setShowForm(true);
  }

  function loadQuestion(q: QuizQuestion) {
    const next = questionToForm(q);
    setEditId(q.id);
    setForm(next);
    setBaseline(next);
    setSaved(false);
    setMutationError(null);
    setShowForm(true);
  }

  function selectQuestion(q: QuizQuestion) {
    if (q.id === editId && showForm) return;
    if (!confirmDiscard()) return;
    loadQuestion(q);
  }

  function stepQuestion(delta: -1 | 1) {
    const target = questions[editIndex + delta];
    if (!target || !confirmDiscard()) return;
    loadQuestion(target);
    scrollCardIntoView(target.id);
  }

  const closeForm = useCallback(() => {
    if (!confirmDiscard()) return;
    resetEditor();
  }, [confirmDiscard]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setMutationError(null);
    setSaving(true);
    try {
      if (editId !== null) {
        await updateQuestion({ id: editId, body: form }).unwrap();
      } else {
        const created = await createQuestion({ ...form, gender: activeGender }).unwrap();
        // Keep editing the new question in place and bring its card into view.
        if (created?.id) {
          setEditId(created.id);
          scrollCardIntoView(created.id);
        }
      }
      setBaseline(form);
      setSaved(true);
    } catch {
      setMutationError("บันทึกคำถามไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ลบคำถามนี้หรือไม่?")) return;
    setMutationError(null);
    try {
      await deleteQuestion(id).unwrap();
      if (id === editId) resetEditor();
    } catch {
      setMutationError("ลบคำถามไม่สำเร็จ ลองอีกครั้ง");
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

  const genderLabel = GENDER_TABS.find((g) => g.key === activeGender)?.label;

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminMainWrapper}>
        <main className={styles.adminMain}>
          <div className={styles.adminPageHeader}>
            <h1 className={styles.adminPageTitle}>Minigame Questions</h1>
          </div>

          {reorderError && (
            <AdminErrorBanner message={reorderError} onDismiss={() => setReorderError(null)} />
          )}

          <div className={styles.sceneWorkspace}>
            <section aria-label="คำถาม">
              <div className={styles.sceneListHeader}>
                <div className={styles.quizTabs} role="tablist" aria-label="ชุดคำถามตามเพศ" style={{ marginBottom: 0 }}>
                  {GENDER_TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={activeGender === key}
                      className={`${styles.quizTab} ${activeGender === key ? styles.quizTabActive : ""}`}
                      onClick={() => switchGender(key)}
                    >
                      {label}
                      {serverQuestions && (
                        <span className={styles.quizTabCount}>{serverQuestions[key].length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                  onClick={openCreate}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Plus size={16} aria-hidden="true" /> เพิ่มคำถาม
                </button>
              </div>

              {isLoading ? (
                <div className={styles.adminSpinner} />
              ) : questions.length === 0 ? (
                <div className={styles.adminEmpty}>ชุดคำถาม{genderLabel}ยังไม่มีคำถาม — กด “เพิ่มคำถาม” เพื่อเริ่ม</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                    <ul className={styles.sceneList}>
                      {questions.map((q, i) => (
                        <SortableQuestionCard
                          key={q.id}
                          question={q}
                          position={i + 1}
                          selected={showForm && q.id === editId}
                          onSelect={selectQuestion}
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
                <aside className={styles.sceneEditor} aria-label="Question editor">
                  <div className={styles.sceneEditorHeader}>
                    <h2 className={styles.sceneEditorTitle}>
                      {editId !== null
                        ? `แก้ไขคำถามข้อ ${editIndex >= 0 ? editIndex + 1 : ""} (${genderLabel})`
                        : `เพิ่มคำถามใหม่ (${genderLabel})`}
                      {isDirty && <span style={{ color: "#d29922", marginLeft: "0.4rem" }} title="ยังไม่บันทึก">●</span>}
                    </h2>
                    {editId !== null && (
                      <>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="คำถามก่อนหน้า"
                          aria-label="คำถามก่อนหน้า"
                          disabled={editIndex <= 0}
                          onClick={() => stepQuestion(-1)}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={styles.sceneIconBtn}
                          title="คำถามถัดไป"
                          aria-label="คำถามถัดไป"
                          disabled={editIndex < 0 || editIndex >= questions.length - 1}
                          onClick={() => stepQuestion(1)}
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
                          <label className={styles.adminLabel} htmlFor="quiz-text">คำถาม</label>
                          <textarea
                            id="quiz-text"
                            className={styles.adminTextarea}
                            rows={5}
                            value={form.text}
                            onChange={(e) => setForm({ ...form, text: e.target.value })}
                            required
                          />
                        </div>
                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <span className={styles.adminLabel}>ตัวเลือก — กดตัวอักษรเพื่อเลือกคำตอบที่ถูก</span>
                          <div className={styles.quizOptions} role="radiogroup" aria-label="คำตอบที่ถูก">
                            {LETTERS.map((letter) => {
                              const key = OPTION_KEY[letter];
                              const isCorrect = form.correctAnswer === letter;
                              return (
                                <div key={letter} className={styles.quizOptionRow}>
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={isCorrect}
                                    aria-label={`ตั้งข้อ ${letter} เป็นคำตอบที่ถูก`}
                                    title={isCorrect ? "คำตอบที่ถูก" : `ตั้งข้อ ${letter} เป็นคำตอบที่ถูก`}
                                    className={`${styles.quizLetterBtn} ${isCorrect ? styles.quizLetterBtnCorrect : ""}`}
                                    onClick={() => setForm({ ...form, correctAnswer: letter })}
                                  >
                                    {isCorrect ? <Check size={16} aria-hidden="true" style={{ verticalAlign: "middle" }} /> : letter}
                                  </button>
                                  <textarea
                                    className={`${styles.adminTextarea} ${styles.quizOptionInput} ${isCorrect ? styles.quizOptionCorrect : ""}`}
                                    aria-label={`ตัวเลือก ${letter}`}
                                    placeholder={`ตัวเลือก ${letter}`}
                                    rows={2}
                                    value={form[key]}
                                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                    required
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className={`${styles.adminFormField} ${styles.full}`}>
                          <label className={styles.adminLabel} htmlFor="quiz-explanation">คำอธิบาย (ไม่บังคับ — แสดงหลังตอบ)</label>
                          <textarea
                            id="quiz-explanation"
                            className={styles.adminTextarea}
                            rows={3}
                            value={form.explanation ?? ""}
                            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                          />
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
              <aside className={`${styles.sceneEditor} ${styles.sceneEditorIdle}`} aria-label="Question editor">
                <div className={styles.sceneEditorEmpty}>
                  เลือกคำถามทางซ้ายเพื่อแก้ไข
                  <br />
                  หรือกด “เพิ่มคำถาม” เพื่อสร้างใหม่
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
