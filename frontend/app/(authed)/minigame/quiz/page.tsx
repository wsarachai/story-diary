"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useClientSearchParams } from "@/lib/hooks";
import { useQuiz } from "../QuizProvider";
import type { AnswerLetter } from "@/types/minigame";
import styles from "./Quiz.module.css";
import BookShellLayout from "@/components/BookShellLayout";

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
          ส่ง →
        </button>
      </div>
    </div>
  );

  const customRail = (
    <nav className={styles.iconRail} aria-label="Main navigation">
      {[
        { href: "/home", icon: "/icons/home.svg", label: "ไปหน้าแรก", activeAccent: "#ff3131" },
        { href: "/chapters", icon: "/icons/book.svg", label: "ไปหน้าอ่านเนื้อเรื่อง", activeAccent: "#08c65a" },
        { href: "/habit", icon: "/icons/edit.svg", label: "ไปหน้า habit tracker", activeAccent: "#6a24f2" },
        { href: "/minigame", icon: "/icons/game.svg", label: "ไปหน้ามินิเกม", activeAccent: "#c771e8" },
      ].map(({ href, icon, label, activeAccent }) => {
        const isActive = href === "/minigame" || href.startsWith("/minigame/");
        return (
          <button
            key={href}
            className={`${styles.iconRailLink}${isActive ? ` ${styles.isActive}` : ""}`}
            aria-label={label}
            onClick={() => handleRailNavigate(href)}
            style={{
              ["--rail-accent" as string]: activeAccent,
            }}
          >
            <Image src={icon} alt="" width={72} height={72} />
          </button>
        );
      })}
    </nav>
  );

  return (
    <BookShellLayout
      tight
      left={left}
      right={right}
      rail={customRail}
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
