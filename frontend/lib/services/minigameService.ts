import { v4 as uuidv4 } from "uuid";
import { insertQuizAttempt, listQuizQuestionsDocs } from "@/lib/db";
import type { Quiz, QuizScore, QuizAnswer } from "@/types/minigame";

const QUIZ_ID = "quiz-v1";
const POINTS_PER_CORRECT = 7;

export async function getQuiz(): Promise<Quiz> {
  const rows = await listQuizQuestionsDocs();

  return {
    id: QUIZ_ID,
    title: "บททดสอบความรู้สุขภาพ",
    showFinalScore: true,
    questions: rows.map((row) => ({
      id: row.id,
      number: row.number,
      text: row.text,
      options: [
        { letter: "A" as const, text: row.option_a },
        { letter: "B" as const, text: row.option_b },
        { letter: "C" as const, text: row.option_c },
        { letter: "D" as const, text: row.option_d },
      ],
      correctAnswer: row.correct_answer,
      ...(row.explanation ? { explanation: row.explanation } : {}),
    })),
  };
}

export async function submitQuiz(
  userId: string,
  quizId: string,
  answers: Record<string, QuizAnswer>
): Promise<QuizScore> {
  const questions = await listQuizQuestionsDocs();

  const correctCount = Object.entries(answers).filter(([id, answer]) => {
    const q = questions.find(q => q.id === id);
    return q && q.correct_answer === answer.selected;
  }).length;

  const total = Object.values(answers).length;
  const points = correctCount * POINTS_PER_CORRECT;
  const now = new Date().toISOString();

  await insertQuizAttempt({
    id: uuidv4(),
    user_id: userId,
    quiz_id: quizId,
    started_at: now,
    completed_at: now,
    score_points: points,
    score_correct: correctCount,
    answers_json: JSON.stringify(answers),
  });

  return {
    quizId,
    total,
    correctCount,
    wrongCount: total - correctCount,
    points,
  };
}
