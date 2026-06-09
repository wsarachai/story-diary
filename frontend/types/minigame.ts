/**
 * Minigame Quiz domain contracts for Story Diary.
 *
 * Source wireframes:
 *   - docz/wireframes/s007-minigame.html             (intro + ready-prompt)
 *   - docz/wireframes/s017-minigame-quiz.html        (question + 4 options)
 *   - docz/wireframes/s018-minigame-quiz-feedback.html (correct/wrong banner)
 *   - docz/wireframes/s019-minigame-score.html       (final score + chips)
 *   - docz/wireframes/s031-minigame-quiz-summary.html(lighter summary)
 *
 * Cross-agent contract: shared by frontend (Redux + screens), backend, and tests.
 */

/**
 * Multiple-choice answer letter, mirroring the s017/s018 `.option-letter`.
 * The wireframe always shows exactly four options A-D.
 */
export type AnswerLetter = "A" | "B" | "C" | "D";

/** One option in a quiz question. Letter + body copy. */
export interface QuizOption {
    letter: AnswerLetter;
    /** Body text — wireframe sample: "06:00 – 09:00 น." */
    text: string;
}

/**
 * A single quiz question. Sample on s017:
 *   text  = "ควรหลีกเลี่ยงแสงแดดในช่วงเวลาใดเพื่อป้องกันผิวหนังจากแสงยูวี?"
 *   options = [A,B,C,D]
 *   correct = "B"
 *
 * `correctAnswer` is required so the frontend can render the s018 feedback
 * highlight without a network round-trip per question. Backends that need
 * to keep answers private can return a feedback-only API and let the
 * frontend store this field after submission only.
 */
export interface QuizQuestion {
    id: string;
    /** Body copy. May contain `<br>` line breaks; UI should split on `\n`. */
    text: string;
    options: [QuizOption, QuizOption, QuizOption, QuizOption];
    correctAnswer: AnswerLetter;
    /** Optional explanation copy shown alongside the s018 feedback banner. */
    explanation?: string;
}

/**
 * Full quiz set — the user works through these in order. The wireframe
 * counter "บททดสอบที่ 3/13" implies a fixed-length set of 13.
 */
export interface Quiz {
    id: string;
    title?: string;
    questions: QuizQuestion[];
    /** When true, advancing past the last question lands on s019 score. */
    showFinalScore?: boolean;
}

/**
 * Per-question attempt record. Generated client-side as the user answers.
 */
export interface QuizAnswer {
    questionId: string;
    /** The user's selected option. May be null if they ran out of time. */
    selected: AnswerLetter | null;
    correct: AnswerLetter;
    /** Computed: `selected === correct`. */
    isCorrect: boolean;
    /** ISO-8601 timestamp when the answer was committed. */
    answeredAt: string;
}

/**
 * Live attempt state; lives in Redux while the quiz is in flight.
 */
export interface QuizAttempt {
    quizId: string;
    /** 0-based pointer into `Quiz.questions`. */
    currentIndex: number;
    /** Answers keyed by questionId; insertion-ordered to mirror question order. */
    answers: Record<string, QuizAnswer>;
    /** "in-progress" while the user is answering; "feedback" while s018 is shown. */
    phase: "idle" | "in-progress" | "feedback" | "completed";
    /** Letter the user has tentatively selected on s017 but not yet submitted. */
    pendingSelection: AnswerLetter | null;
    /** ISO-8601. */
    startedAt: string;
    /** ISO-8601; populated when phase === "completed". */
    completedAt?: string;
}

/**
 * Final score view-model used by s019 + s031.
 */
export interface QuizScore {
    quizId: string;
    /** Total questions answered (matches denominator on s017). */
    total: number;
    /** Number of `answers[].isCorrect === true`. */
    correctCount: number;
    /** total - correctCount. */
    wrongCount: number;
    /**
     * Aggregate point value displayed in the s019 .score-box-value
     * (wireframe shows "91 แต้ม"). Default scoring rule: 7 points / correct,
     * but the rule is server-owned — UI should not derive it client-side.
     */
    points: number;
}

/** Variant of the feedback banner on s018 (`.feedback-banner.correct|.wrong`). */
export type FeedbackVariant = "correct" | "wrong";
