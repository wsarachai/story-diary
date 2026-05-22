"use client";
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useGetQuizQuery } from "@/store/quizApi";
import type { Quiz, QuizAttempt, QuizScore, AnswerLetter, QuizQuestion } from "@/types/minigame";

interface QuizContextValue {
  quiz: Quiz | undefined;
  attempt: QuizAttempt | null;
  score: QuizScore | null;
  isLoading: boolean;
  isError: boolean;
  currentQuestion: QuizQuestion | undefined;
  counterText: string;
  progressPercent: number;
  phase: string;
  feedbackForCurrent: { correct: AnswerLetter; selected: AnswerLetter | null } | null;
  isLastQuestion: boolean;
  currentIndex: number;
  start: () => void;
  selectOption: (option: AnswerLetter) => void;
  submitAnswer: () => void;
  advance: () => void;
  abandon: () => void;
}

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const { data: quiz, isLoading, isError } = useGetQuizQuery();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [score, setScore] = useState<QuizScore | null>(null);

  const currentQuestion = useMemo(() => {
    if (!quiz || !attempt) return undefined;
    return quiz.questions[attempt.currentIndex];
  }, [quiz, attempt]);

  const counterText = useMemo(() => {
    if (!quiz) return "0/0";
    const total = quiz.questions.length;
    const idx = (attempt?.currentIndex ?? 0) + 1;
    return `${idx}/${total}`;
  }, [quiz, attempt]);

  const progressPercent = useMemo(() => {
    if (!quiz) return 0;
    const total = quiz.questions.length;
    const idx = attempt?.currentIndex ?? 0;
    return total > 0 ? Math.round((idx / total) * 100) : 0;
  }, [quiz, attempt]);

  const phase = useMemo(() => attempt?.phase ?? "idle", [attempt]);

  const feedbackForCurrent = useMemo(() => {
    if (!currentQuestion || !attempt) return null;
    const answer = attempt.answers[currentQuestion.id];
    if (!answer) return null;
    return { correct: answer.correct, selected: answer.selected };
  }, [currentQuestion, attempt]);

  const isLastQuestion = useMemo(() => {
    if (!quiz) return false;
    const total = quiz.questions.length;
    const idx = attempt?.currentIndex ?? 0;
    return idx === total - 1;
  }, [quiz, attempt]);

  const currentIndex = useMemo(() => attempt?.currentIndex ?? 0, [attempt]);

  const start = useCallback(() => {
    if (!quiz) return;
    setAttempt({
      quizId: quiz.id,
      currentIndex: 0,
      answers: {},
      phase: "in-progress",
      pendingSelection: null,
      startedAt: new Date().toISOString(),
    });
    setScore(null);
  }, [quiz]);

  const selectOption = useCallback((option: AnswerLetter) => {
    setAttempt((prev) => prev ? { ...prev, pendingSelection: option } : null);
  }, []);

  const submitAnswer = useCallback(() => {
    if (!attempt || !quiz) return;
    const q = quiz.questions[attempt.currentIndex];
    if (!q || !attempt.pendingSelection) return;

    const newAnswers = {
      ...attempt.answers,
      [q.id]: {
        questionId: q.id,
        selected: attempt.pendingSelection,
        correct: q.correctAnswer,
        isCorrect: attempt.pendingSelection === q.correctAnswer,
        answeredAt: new Date().toISOString(),
      },
    };

    setAttempt({
      ...attempt,
      answers: newAnswers,
      phase: "feedback",
    });
  }, [attempt, quiz]);

  const advance = useCallback(() => {
    if (!attempt || !quiz) return;
    const nextIndex = attempt.currentIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      const completedAt = new Date().toISOString();
      const answersList = Object.values(attempt.answers);
      const correctCount = answersList.filter((a) => a.isCorrect).length;
      
      setAttempt({
        ...attempt,
        phase: "completed",
        completedAt,
      });

      setScore({
        quizId: quiz.id,
        total: quiz.questions.length,
        correctCount,
        wrongCount: quiz.questions.length - correctCount,
        points: correctCount * 7,
      });
    } else {
      setAttempt({
        ...attempt,
        currentIndex: nextIndex,
        phase: "in-progress",
        pendingSelection: null,
      });
    }
  }, [attempt, quiz]);

  const abandon = useCallback(() => {
    setAttempt(null);
    setScore(null);
  }, []);

  const value = useMemo(() => ({
    quiz,
    attempt,
    score,
    isLoading,
    isError,
    currentQuestion,
    counterText,
    progressPercent,
    phase,
    feedbackForCurrent,
    isLastQuestion,
    currentIndex,
    start,
    selectOption,
    submitAnswer,
    advance,
    abandon
  }), [quiz, attempt, score, isLoading, isError, currentQuestion, counterText, progressPercent, phase, feedbackForCurrent, isLastQuestion, currentIndex, start, selectOption, submitAnswer, advance, abandon]);

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
}
