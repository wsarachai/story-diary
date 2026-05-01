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

const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1", number: 1,
    text: "ควรหลีกเลี่ยงแสงแดดในช่วงเวลาใด\nเพื่อป้องกันผิวหนังจากแสงยูวี?",
    options: [
      { letter: "A", text: "06:00 – 09:00 น." },
      { letter: "B", text: "10:00 – 17:00 น." },
      { letter: "C", text: "17:00 – 19:00 น." },
      { letter: "D", text: "ทุกช่วงเวลา" },
    ], correctAnswer: "B",
  },
  {
    id: "q2", number: 2,
    text: "วิตามิน D ที่ร่างกายสร้างเองได้จากแสงแดด\nควรได้รับกี่นาทีต่อวัน?",
    options: [
      { letter: "A", text: "5–10 นาที" },
      { letter: "B", text: "30–60 นาที" },
      { letter: "C", text: "10–20 นาที" },
      { letter: "D", text: "มากกว่า 2 ชั่วโมง" },
    ], correctAnswer: "C",
  },
  {
    id: "q3", number: 3,
    text: "ยาปฏิชีวนะควรรับประทานครบกำหนดหรือไม่?",
    options: [
      { letter: "A", text: "หยุดเมื่ออาการดีขึ้น" },
      { letter: "B", text: "รับประทานครบทุกมื้อ" },
      { letter: "C", text: "รับประทานสลับวัน" },
      { letter: "D", text: "รับประทานเฉพาะตอนปวด" },
    ], correctAnswer: "B",
  },
  {
    id: "q4", number: 4,
    text: "อาหาร 5 หมู่ประกอบด้วยหมู่ใดบ้าง?",
    options: [
      { letter: "A", text: "ข้าว ผัก ผลไม้ เนื้อ นม" },
      { letter: "B", text: "ข้าว ผัก เนื้อ ไขมัน น้ำตาล" },
      { letter: "C", text: "ผัก ผลไม้ เนื้อ ไขมัน น้ำ" },
      { letter: "D", text: "ข้าว ผลไม้ ไขมัน น้ำตาล เนื้อ" },
    ], correctAnswer: "A",
  },
  {
    id: "q5", number: 5,
    text: "การออกกำลังกายแบบแอโรบิคควรทำอย่างน้อย\nกี่นาทีต่อสัปดาห์?",
    options: [
      { letter: "A", text: "60 นาที" },
      { letter: "B", text: "150 นาที" },
      { letter: "C", text: "300 นาที" },
      { letter: "D", text: "45 นาที" },
    ], correctAnswer: "B",
  },
  {
    id: "q6", number: 6,
    text: "น้ำเปล่าที่ควรดื่มต่อวันสำหรับผู้ใหญ่คือเท่าไร?",
    options: [
      { letter: "A", text: "1 ลิตร" },
      { letter: "B", text: "1.5 ลิตร" },
      { letter: "C", text: "2 ลิตร" },
      { letter: "D", text: "3 ลิตร" },
    ], correctAnswer: "C",
  },
  {
    id: "q7", number: 7,
    text: "การล้างมือที่ถูกต้องควรใช้เวลากี่วินาที?",
    options: [
      { letter: "A", text: "10 วินาที" },
      { letter: "B", text: "20 วินาที" },
      { letter: "C", text: "5 วินาที" },
      { letter: "D", text: "60 วินาที" },
    ], correctAnswer: "B",
  },
  {
    id: "q8", number: 8,
    text: "ค่า BMI ที่ถือว่าปกติสำหรับผู้ใหญ่คือช่วงใด?",
    options: [
      { letter: "A", text: "15–18.5" },
      { letter: "B", text: "18.5–24.9" },
      { letter: "C", text: "25–29.9" },
      { letter: "D", text: "30 ขึ้นไป" },
    ], correctAnswer: "B",
  },
  {
    id: "q9", number: 9,
    text: "ควรนอนหลับกี่ชั่วโมงต่อคืนสำหรับผู้ใหญ่?",
    options: [
      { letter: "A", text: "4–5 ชั่วโมง" },
      { letter: "B", text: "5–6 ชั่วโมง" },
      { letter: "C", text: "7–9 ชั่วโมง" },
      { letter: "D", text: "10–12 ชั่วโมง" },
    ], correctAnswer: "C",
  },
  {
    id: "q10", number: 10,
    text: "อาการไข้สูงกว่ากี่องศาเซลเซียสถือว่าอันตราย?",
    options: [
      { letter: "A", text: "37.5 °C" },
      { letter: "B", text: "38.5 °C" },
      { letter: "C", text: "39.5 °C" },
      { letter: "D", text: "40 °C ขึ้นไป" },
    ], correctAnswer: "D",
  },
  {
    id: "q11", number: 11,
    text: "อาหารประเภทใดช่วยลดความเสี่ยงโรคหัวใจ?",
    options: [
      { letter: "A", text: "ไขมันทรานส์" },
      { letter: "B", text: "ไขมันโอเมก้า-3" },
      { letter: "C", text: "น้ำตาลทราย" },
      { letter: "D", text: "โซเดียมสูง" },
    ], correctAnswer: "B",
  },
  {
    id: "q12", number: 12,
    text: "โรคใดเกิดจากการขาดวิตามิน C?",
    options: [
      { letter: "A", text: "โรคกระดูกอ่อน" },
      { letter: "B", text: "โรคเหน็บชา" },
      { letter: "C", text: "โรคลักปิดลักเปิด" },
      { letter: "D", text: "โรคเบาหวาน" },
    ], correctAnswer: "C",
  },
  {
    id: "q13", number: 13,
    text: "การตรวจสุขภาพประจำปีควรทำบ่อยแค่ไหน?",
    options: [
      { letter: "A", text: "ทุก 6 เดือน" },
      { letter: "B", text: "ทุก 1 ปี" },
      { letter: "C", text: "ทุก 3 ปี" },
      { letter: "D", text: "เมื่อป่วยเท่านั้น" },
    ], correctAnswer: "B",
  },
];

const MOCK_QUIZ: Quiz = {
  id: "quiz-1",
  title: "สุขภาพดีชีวีมีสุข",
  questions: MOCK_QUESTIONS,
  showFinalScore: true,
};

const initialState: QuizState = {
  quiz: null,
  attempt: null,
  score: null,
  fetchStatus: "idle",
  submitStatus: "idle",
};

export const fetchQuiz = createAsyncThunk("quiz/fetchQuiz", async () => {
  await new Promise((r) => setTimeout(r, 200));
  return MOCK_QUIZ;
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
