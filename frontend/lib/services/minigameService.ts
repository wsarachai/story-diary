import { v4 as uuidv4 } from "uuid";
import { insertQuizAttempt, listQuizQuestionsByGender } from "@/lib/db";
import { getUserById } from "@/lib/services/authService";
import type { Quiz, QuizScore, QuizAnswer, QuestionGender } from "@/types/minigame";

const POINTS_PER_CORRECT = 7;

function quizIdForGender(gender: QuestionGender): string {
  return `quiz-${gender}`;
}

/** The set served to a user mirrors their gender (defaults to male if absent). */
async function resolveUserGender(userId: string): Promise<QuestionGender> {
  const user = await getUserById(userId);
  return user.gender === "female" ? "female" : "male";
}

export async function getQuiz(userId: string): Promise<Quiz> {
  const gender = await resolveUserGender(userId);
  const rows = await listQuizQuestionsByGender(gender);

  return {
    id: quizIdForGender(gender),
    title: "บททดสอบความรู้สุขภาพ",
    showFinalScore: true,
    questions: rows.map((row) => ({
      id: row.id,
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
  _quizId: string,
  answers: Record<string, QuizAnswer>
): Promise<QuizScore> {
  // Grade against the user's own set — the quizId from the client is advisory.
  const gender = await resolveUserGender(userId);
  const quizId = quizIdForGender(gender);
  const questions = await listQuizQuestionsByGender(gender);

  const correctCount = Object.entries(answers).filter(([id, answer]) => {
    const q = questions.find((q) => q.id === id);
    return q && q.correct_answer === answer.selected;
  }).length;

  const total = Object.values(answers).length;
  const points = correctCount * POINTS_PER_CORRECT;
  const now = new Date().toISOString();

  await insertQuizAttempt({
    id: uuidv4(),
    user_id: userId,
    quiz_id: quizId,
    gender,
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
