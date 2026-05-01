"use client";
import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  selectCurrentQuestion,
  selectQuizCounterText,
  selectQuizProgressPercent,
  selectPendingSelection,
  selectQuizPhase,
  selectOption,
  submitAnswer,
  abandon,
} from "@/store/quizSlice";
import type { AnswerLetter } from "@/types/minigame";

function QuizInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const question = useAppSelector(selectCurrentQuestion);
  const counterText = useAppSelector(selectQuizCounterText);
  const progressPercent = useAppSelector(selectQuizProgressPercent);
  const pendingSelection = useAppSelector(selectPendingSelection);
  const phase = useAppSelector(selectQuizPhase);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const nParam = searchParams.get("n");
  const nIndex = nParam ? parseInt(nParam, 10) : 0;

  useEffect(() => {
    if (phase === "idle") {
      router.replace("/minigame");
    }
    if (phase === "feedback") {
      router.replace(`/minigame/quiz/feedback?n=${nIndex}`);
    }
    if (phase === "completed") {
      router.replace("/minigame/quiz/score");
    }
  }, [phase, router, nIndex]);

  function handleSelect(letter: AnswerLetter) {
    dispatch(selectOption(letter));
  }

  function handleSubmit() {
    if (!pendingSelection) return;
    dispatch(submitAnswer());
    router.push(`/minigame/quiz/feedback?n=${nIndex}`);
  }

  function handleRailNavigate(href: string) {
    if (phase === "in-progress") {
      dialogRef.current?.showModal();
      (dialogRef.current as HTMLDialogElement & { _pendingHref?: string })._pendingHref = href;
    } else {
      router.push(href);
    }
  }

  function handleAbandon() {
    const dlg = dialogRef.current as HTMLDialogElement & { _pendingHref?: string };
    const href = dlg._pendingHref ?? "/home";
    dispatch(abandon());
    dlg.close();
    router.push(href);
  }

  if (!question) return null;

  const letters: AnswerLetter[] = ["A", "B", "C", "D"];

  return (
    <main className="screen" aria-label="Story Diary Minigame Quiz">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>

        {/* Left: progress + question */}
        <section className="page quiz-page-left page-seam-right" aria-label="คำถาม">
          <div className="quiz-progress-row">
            <p className="quiz-counter">
              บทถดสอบที่ <strong>{nIndex + 1}</strong>/{counterText.split("/")[1]}
            </p>
            <div className="quiz-progress-bar" aria-hidden="true">
              <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <p className="quiz-question-label">โจทย์</p>
          <div className="quiz-question-card" aria-live="polite">
            <p className="quiz-question-text">
              {question.text.split("\n").map((line, i) => (
                <span key={i}>{line}{i < question.text.split("\n").length - 1 && <br />}</span>
              ))}
            </p>
          </div>
        </section>

        {/* Right: options + submit */}
        <section className="page quiz-page-right" aria-label="ตัวเลือกคำตอบ">
          <div className="quiz-options" role="group" aria-label="เลือกคำตอบ">
            {letters.map((letter) => {
              const opt = question.options.find((o) => o.letter === letter);
              if (!opt) return null;
              const isSelected = pendingSelection === letter;
              return (
                <button
                  key={letter}
                  className={`quiz-option${isSelected ? " is-selected" : ""}`}
                  aria-label={`ตัวเลือก ${letter}`}
                  aria-pressed={isSelected}
                  onClick={() => handleSelect(letter)}
                >
                  <span className="option-letter">{letter}</span>
                  <span className="option-text">{opt.text}</span>
                </button>
              );
            })}
          </div>
          <div className="quiz-submit-row">
            <button
              className="quiz-submit-btn"
              disabled={!pendingSelection}
              aria-label="ส่งคำตอบ"
              onClick={handleSubmit}
            >
              ส่ง →
            </button>
          </div>
        </section>

        {/* Locked rail (DS-2) */}
        <nav className="icon-rail" aria-label="Main navigation">
          {[
            { href: "/home", icon: "/icons/home.svg", label: "ไปหน้าแรก" },
            { href: "/chapters", icon: "/icons/book.svg", label: "ไปหน้าอ่านเนื้อเรื่อง" },
            { href: "/habit", icon: "/icons/edit.svg", label: "ไปหน้า habit tracker" },
            { href: "/minigame", icon: "/icons/game.svg", label: "ไปหน้ามินิเกม" },
          ].map(({ href, icon, label }) => (
            <button
              key={href}
              className={`icon-rail-link${href === "/minigame" || href.startsWith("/minigame/") ? " is-active" : ""}`}
              aria-label={label}
              onClick={() => handleRailNavigate(href)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <Image src={icon} alt="" width={72} height={72} style={{ display: "block", width: "100%", height: "100%", borderRadius: "0 1.3rem 1.3rem 0" }} />
            </button>
          ))}
        </nav>
      </section>

      {/* DS-2 abandon dialog */}
      <dialog ref={dialogRef} className="abandon-dialog" aria-modal="true">
        <h2>ออกจากการทดสอบ?</h2>
        <p>คะแนนของคุณจะหายไปหากออกก่อนทำเสร็จ</p>
        <div className="abandon-dialog-btns">
          <button className="abandon-btn-stay" onClick={() => dialogRef.current?.close()}>
            เล่นต่อ
          </button>
          <button className="abandon-btn-leave" onClick={handleAbandon}>
            ออก
          </button>
        </div>
      </dialog>
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizInner />
    </Suspense>
  );
}
