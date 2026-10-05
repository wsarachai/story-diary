/** Points for a perfect run, whatever the number of questions in the set. */
export const QUIZ_MAX_POINTS = 100;

/**
 * Quiz points scaled so answering every question correctly scores exactly
 * QUIZ_MAX_POINTS. A fixed per-answer value (the old 7 points) drifted with
 * the set size — admins add and remove questions — e.g. 12 × 7 = 84.
 * Shared by the server (authoritative) and the client's offline fallback.
 */
export function quizPoints(correctCount: number, questionCount: number): number {
  if (questionCount <= 0) return 0;
  const correct = Math.min(Math.max(correctCount, 0), questionCount);
  return Math.round((correct / questionCount) * QUIZ_MAX_POINTS);
}
