import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  AnswerLetter,
  Quiz,
  QuizAttempt,
  QuizScore,
  QuizQuestion,
} from "@/types/minigame";

interface QuizState {
  quiz: Quiz | null;
  attempt: QuizAttempt | null;
  score: QuizScore | null;
  fetchStatus: "idle" | "loading" | "ready" | "error";
  submitStatus: "idle" | "submitting" | "submitted" | "error";
}

const initialState: QuizState = {
  quiz: null,
  attempt: null,
  score: null,
  fetchStatus: "idle",
  submitStatus: "idle",
};

export const fetchQuiz = createAsyncThunk("quiz/fetchQuiz", async () => {
  const res = await fetch("/api/minigame/quiz", { credentials: "include" });
  if (!res.ok) throw new Error("FETCH_QUIZ_FAILED");
  const data = await res.json() as Quiz;
  return data;
});

const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    start(state) {
      if (!state.quiz) return;
      state.attempt = {
        quizId: state.quiz.id,
        currentIndex: 0,
        answers: {},
        phase: "in-progress",
        pendingSelection: null,
        startedAt: new Date().toISOString(),
      };
      state.score = null;
    },
    selectOption(state, action: PayloadAction<AnswerLetter>) {
      if (!state.attempt) return;
      state.attempt.pendingSelection = action.payload;
    },
    submitAnswer(state) {
      const { attempt, quiz } = state;
      if (!attempt || !quiz) return;
      const q = quiz.questions[attempt.currentIndex];
      if (!q || !attempt.pendingSelection) return;
      attempt.answers[q.id] = {
        questionId: q.id,
        selected: attempt.pendingSelection,
        correct: q.correctAnswer,
        isCorrect: attempt.pendingSelection === q.correctAnswer,
        answeredAt: new Date().toISOString(),
      };
      attempt.phase = "feedback";
    },
    advance(state) {
      const { attempt, quiz } = state;
      if (!attempt || !quiz) return;
      const nextIndex = attempt.currentIndex + 1;
      if (nextIndex >= quiz.questions.length) {
        attempt.phase = "completed";
        attempt.completedAt = new Date().toISOString();
        const answers = Object.values(attempt.answers);
        const correctCount = answers.filter((a) => a.isCorrect).length;
        state.score = {
          quizId: quiz.id,
          total: quiz.questions.length,
          correctCount,
          wrongCount: quiz.questions.length - correctCount,
          points: correctCount * 7,
        };
      } else {
        attempt.currentIndex = nextIndex;
        attempt.phase = "in-progress";
        attempt.pendingSelection = null;
      }
    },
    abandon(state) {
      state.attempt = null;
      state.score = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuiz.pending, (state) => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchQuiz.fulfilled, (state, action) => {
        state.fetchStatus = "ready";
        state.quiz = action.payload;
      })
      .addCase(fetchQuiz.rejected, (state) => {
        state.fetchStatus = "error";
      });
  },
});

export const { start, selectOption, submitAnswer, advance, abandon } = quizSlice.actions;
export default quizSlice.reducer;

type QuizRootState = { quiz: QuizState };

export const selectCurrentQuestion = (state: QuizRootState): QuizQuestion | undefined =>
  state.quiz.quiz?.questions[state.quiz.attempt?.currentIndex ?? 0];

export const selectQuizCounterText = (state: QuizRootState): string => {
  const total = state.quiz.quiz?.questions.length ?? 0;
  const idx = (state.quiz.attempt?.currentIndex ?? 0) + 1;
  return `${idx}/${total}`;
};

export const selectQuizProgressPercent = (state: QuizRootState): number => {
  const total = state.quiz.quiz?.questions.length ?? 0;
  const idx = state.quiz.attempt?.currentIndex ?? 0;
  return total > 0 ? Math.round((idx / total) * 100) : 0;
};

export const selectPendingSelection = (state: QuizRootState): AnswerLetter | null =>
  state.quiz.attempt?.pendingSelection ?? null;

export const selectFeedbackForCurrent = (
  state: QuizRootState
): { correct: AnswerLetter; selected: AnswerLetter | null } | null => {
  const q = selectCurrentQuestion(state);
  if (!q || !state.quiz.attempt) return null;
  const answer = state.quiz.attempt.answers[q.id];
  if (!answer) return null;
  return { correct: answer.correct, selected: answer.selected };
};

export const selectIsLastQuestion = (state: QuizRootState): boolean => {
  const total = state.quiz.quiz?.questions.length ?? 0;
  const idx = state.quiz.attempt?.currentIndex ?? 0;
  return idx === total - 1;
};

export const selectQuizScore = (state: QuizRootState): QuizScore | null =>
  state.quiz.score;

export const selectQuizPhase = (state: QuizRootState) =>
  state.quiz.attempt?.phase ?? "idle";

export const selectQuizFetchStatus = (state: QuizRootState) =>
  state.quiz.fetchStatus;

export const selectCurrentIndex = (state: QuizRootState): number =>
  state.quiz.attempt?.currentIndex ?? 0;
