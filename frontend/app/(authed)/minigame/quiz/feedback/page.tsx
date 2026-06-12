"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import IconRail from "@/components/IconRail";
import { useClientSearchParams } from "@/lib/hooks";
import { useQuiz } from "../../QuizProvider";
import type { AnswerLetter } from "@/types/minigame";
import styles from "../Quiz.module.css";
import BookShellLayout from "@/components/BookShellLayout";

function FeedbackInner() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const {
    currentQuestion: question,
    counterText,
    progressPercent,
    feedbackForCurrent: feedback,
    isLastQuestion,
    phase,
    currentIndex,
    advance: doAdvance,
  } = useQuiz();

  const nParam = searchParams.get("n");
  const nIndex = nParam ? parseInt(nParam, 10) : 0;

  // Use currentIndex from Redux (not nIndex from URL) so the redirect target is
  // always the question that advance() just moved to, not the old URL value.
  useEffect(() => {
    if (phase === "idle") {
      router.replace("/minigame");
    }
    if (phase === "in-progress") {
      router.replace(`/minigame/quiz?n=${currentIndex}`);
    }
    if (phase === "completed") {
      router.replace("/minigame/quiz/score");
    }
  }, [phase, router, currentIndex]);

  function handleAdvance() {
    doAdvance();
    // Navigation is driven entirely by the useEffect above so there is no
    // race between an explicit push and the effect's replace.
  }

  if (!question || !feedback) return null;

  const isCorrect = feedback.selected === feedback.correct;
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
      <div className={styles.quizQuestionCard}>
        <p className={styles.quizQuestionText}>
          {question.text.split("\n").map((line, i) => (
            <span key={i}>{line}{i < question.text.split("\n").length - 1 && <br />}</span>
          ))}
        </p>
      </div>
    </div>
  );

  const right = (
    <div className={styles.quizPageRight} aria-label="ผลคำตอบ">
      <div className={styles.quizOptions} role="group" aria-label="คำตอบ">
        {letters.map((letter) => {
          const opt = question.options.find((o) => o.letter === letter);
          if (!opt) return null;
          const isCorrectOption = letter === feedback.correct;
          const isWrongOption = letter === feedback.selected && !isCorrect;

          let cls = styles.quizOption;
          if (isCorrectOption) cls += ` ${styles.isCorrect}`;
          else if (isWrongOption) cls += ` ${styles.isWrong}`;

          const ariaLabel =
            isCorrectOption
              ? `ตัวเลือก ${letter} ถูกต้อง`
              : isWrongOption
                ? `ตัวเลือก ${letter} ตอบผิด`
                : `ตัวเลือก ${letter}`;
          return (
            <div key={letter} className={cls} aria-label={ariaLabel}>
              <span className={styles.optionLetter}>{letter}</span>
              <span className={styles.optionText}>{opt.text}</span>
            </div>
          );
        })}
      </div>

      {/* Feedback banner */}
      <div
        className={`${styles.feedbackBanner} ${isCorrect ? styles.correct : styles.wrong}`}
        role="alert"
        aria-live="assertive"
      >
        <div className={styles.feedbackIcon} aria-hidden="true">
          {isCorrect ? (
            <Check color="#fff" strokeWidth={2.5} />
          ) : (
            <X color="#fff" strokeWidth={2.5} />
          )}
        </div>
        <span className={styles.feedbackText}>
          {isCorrect ? "ถูกต้อง!" : `ตอบผิด — คำตอบที่ถูกคือ ${feedback.correct}`}
        </span>
        {/* DS-3: flip button copy on last question */}
        <button className={styles.feedbackNextBtn} onClick={handleAdvance} aria-label={isLastQuestion ? "ดูคะแนน" : "ข้อต่อไป"}>
          {isLastQuestion ? "ดูคะแนน" : "ข้อต่อไป"}
          <ArrowRight className={styles.btnArrowIcon} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <BookShellLayout
      tight
      left={left}
      right={right}
      rail={<IconRail />}
    />
  );
}

export default function FeedbackPage() {
  return <FeedbackInner />;
}
