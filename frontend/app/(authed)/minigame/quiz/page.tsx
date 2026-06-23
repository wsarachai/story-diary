"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useClientSearchParams } from "@/lib/hooks";
import { useQuiz } from "../QuizProvider";
import type { AnswerLetter } from "@/types/minigame";
import styles from "./Quiz.module.css";
import BookShellLayout from "@/components/BookShellLayout";
import IconRail from "@/components/IconRail";

function QuizInner() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const {
    currentQuestion: question,
    counterText,
    progressPercent,
    attempt,
    phase,
    selectOption: handleSelect,
    submitAnswer: doSubmit,
    abandon: doAbandon,
  } = useQuiz();
  const pendingSelection = attempt?.pendingSelection ?? null;

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

  function handleSubmit() {
    if (!pendingSelection) return;
    doSubmit();
    router.push(`/minigame/quiz/feedback?n=${nIndex}`);
  }

  function handleRailNavigate(href: string, e: React.MouseEvent<HTMLAnchorElement>) {
    // While a quiz is in progress, intercept the link and confirm abandonment
    // instead of navigating away. Otherwise let the rail's <Link> navigate.
    if (phase === "in-progress") {
      e.preventDefault();
      dialogRef.current?.showModal();
      (dialogRef.current as HTMLDialogElement & { _pendingHref?: string })._pendingHref = href;
    }
  }

  function handleAbandon() {
    const dlg = dialogRef.current as HTMLDialogElement & { _pendingHref?: string };
    const href = dlg._pendingHref ?? "/home";
    doAbandon();
    dlg.close();
    router.push(href);
  }

  if (!question) return null;

  const letters: AnswerLetter[] = ["A", "B", "C", "D"];

  const left = (
    <div className={styles.quizPageLeft} aria-label="คำถาม">
      <div className={styles.quizProgressRow}>
        <p className={styles.quizCounter}>
          บททดสอบที่ <strong>{nIndex + 1}</strong>/{counterText.split("/")[1]}
        </p>
        <div className={styles.quizProgressBar} aria-hidden="true">
          <div className={styles.quizProgressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <p className={styles.quizQuestionLabel}>โจทย์</p>
      <div className={styles.quizQuestionCard} aria-live="polite">
        <p className={styles.quizQuestionText}>
          {question.text.split("\n").map((line, i) => (
            <span key={i}>{line}{i < question.text.split("\n").length - 1 && <br />}</span>
          ))}
        </p>
      </div>
    </div>
  );

  const right = (
    <div className={styles.quizPageRight} aria-label="ตัวเลือกคำตอบ">
      <div className={styles.quizOptions} role="group" aria-label="เลือกคำตอบ">
        {letters.map((letter) => {
          const opt = question.options.find((o) => o.letter === letter);
          if (!opt) return null;
          const isSelected = pendingSelection === letter;
          return (
            <button
              key={letter}
              className={`${styles.quizOption}${isSelected ? ` ${styles.isSelected}` : ""}`}
              aria-label={`ตัวเลือก ${letter}`}
              aria-pressed={isSelected}
              onClick={() => handleSelect(letter)}
            >
              <span className={styles.optionLetter}>{letter}</span>
              <span className={styles.optionText}>{opt.text}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.quizSubmitRow}>
        <button
          className={styles.quizSubmitBtn}
          disabled={!pendingSelection}
          aria-label="ส่งคำตอบ"
          onClick={handleSubmit}
        >
          ส่ง
          <ArrowRight className={styles.btnArrowIcon} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <BookShellLayout
      tight
      fitViewport
      left={left}
      right={right}
      rail={<IconRail onNavigate={handleRailNavigate} />}
    >
      {/* DS-2 abandon dialog */}
      <dialog ref={dialogRef} className={styles.abandonDialog} aria-modal="true">
        <h2>ออกจากการทดสอบ?</h2>
        <p>คะแนนของคุณจะหายไปหากออกก่อนทำเสร็จ</p>
        <div className={styles.abandonDialogBtns}>
          <button className={styles.abandonBtnStay} onClick={() => dialogRef.current?.close()}>
            เล่นต่อ
          </button>
          <button className={styles.abandonBtnLeave} onClick={handleAbandon}>
            ออก
          </button>
        </div>
      </dialog>
    </BookShellLayout>
  );
}

export default function QuizPage() {
  return <QuizInner />;
}
