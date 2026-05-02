"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconRail from "@/components/IconRail";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  selectCurrentQuestion,
  selectQuizCounterText,
  selectQuizProgressPercent,
  selectFeedbackForCurrent,
  selectIsLastQuestion,
  selectQuizPhase,
  advance,
} from "@/store/quizSlice";
import type { AnswerLetter } from "@/types/minigame";

function FeedbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const question = useAppSelector(selectCurrentQuestion);
  const counterText = useAppSelector(selectQuizCounterText);
  const progressPercent = useAppSelector(selectQuizProgressPercent);
  const feedback = useAppSelector(selectFeedbackForCurrent);
  const isLastQuestion = useAppSelector(selectIsLastQuestion);
  const phase = useAppSelector(selectQuizPhase);

  const nParam = searchParams.get("n");
  const nIndex = nParam ? parseInt(nParam, 10) : 0;

  useEffect(() => {
    if (phase === "idle") {
      router.replace("/minigame");
    }
    if (phase === "in-progress") {
      router.replace(`/minigame/quiz?n=${nIndex}`);
    }
    if (phase === "completed") {
      router.replace("/minigame/quiz/score");
    }
  }, [phase, router, nIndex]);

  function handleAdvance() {
    dispatch(advance());
    if (isLastQuestion) {
      router.push("/minigame/quiz/score");
    } else {
      router.push(`/minigame/quiz?n=${nIndex + 1}`);
    }
  }

  if (!question || !feedback) return null;

  const isCorrect = feedback.selected === feedback.correct;
  const letters: AnswerLetter[] = ["A", "B", "C", "D"];

  return (
    <main className="screen" aria-label="Story Diary Minigame Quiz Feedback">
      <section className="book-shell book-shell-tight" style={{ gridTemplateColumns: "1fr 1fr auto" }}>

        {/* Left: progress + question */}
        <section className="page quiz-page-left page-seam-right" aria-label="คำถาม">
          <div className="quiz-progress-row">
            <p className="quiz-counter">
              บททดสอบที่ <strong>{nIndex + 1}</strong>/{counterText.split("/")[1]}
            </p>
            <div className="quiz-progress-bar" aria-hidden="true">
              <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <p className="quiz-question-label">โจทย์</p>
          <div className="quiz-question-card">
            <p className="quiz-question-text">
              {question.text.split("\n").map((line, i) => (
                <span key={i}>{line}{i < question.text.split("\n").length - 1 && <br />}</span>
              ))}
            </p>
          </div>
        </section>

        {/* Right: options with feedback highlight + banner */}
        <section className="page quiz-page-right" aria-label="ผลคำตอบ">
          <div className="quiz-options" role="group" aria-label="คำตอบ">
            {letters.map((letter) => {
              const opt = question.options.find((o) => o.letter === letter);
              if (!opt) return null;
              let cls = "quiz-option";
              if (letter === feedback.correct) cls += " is-correct";
              else if (letter === feedback.selected && !isCorrect) cls += " is-wrong";
              const ariaLabel =
                letter === feedback.correct
                  ? `ตัวเลือก ${letter} ถูกต้อง`
                  : letter === feedback.selected
                    ? `ตัวเลือก ${letter} ตอบผิด`
                    : `ตัวเลือก ${letter}`;
              return (
                <div key={letter} className={cls} aria-label={ariaLabel}>
                  <span className="option-letter">{letter}</span>
                  <span className="option-text">{opt.text}</span>
                </div>
              );
            })}
          </div>

          {/* Feedback banner */}
          <div
            className={`feedback-banner ${isCorrect ? "correct" : "wrong"}`}
            role="alert"
            aria-live="assertive"
          >
            <div className="feedback-icon" aria-hidden="true">
              {isCorrect ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <span className="feedback-text">
              {isCorrect ? "ถูกต้อง!" : `ตอบผิด — คำตอบที่ถูกคือ ${feedback.correct}`}
            </span>
            {/* DS-3: flip button copy on last question */}
            <button className="feedback-next-btn" onClick={handleAdvance} aria-label={isLastQuestion ? "ดูคะแนน" : "ข้อต่อไป"}>
              {isLastQuestion ? "ดูคะแนน →" : "ข้อต่อไป →"}
            </button>
          </div>
        </section>

        <IconRail />
      </section>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackInner />
    </Suspense>
  );
}
