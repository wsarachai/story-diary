import styles from "./Quiz.module.css";

/**
 * Questions longer than this get a smaller type size so they fit the page
 * without scrolling. Every seeded question is under 280 characters; admin
 * scenario questions run longer (one is ~400). The card also scrolls as a
 * last resort, so even longer text stays readable.
 */
const LONG_QUESTION_CHARS = 300;

/** "โจทย์" label + question card, shared by the quiz and feedback pages. */
export default function QuestionCard({ text, live = false }: { text: string; live?: boolean }) {
  const lines = text.split("\n");
  const textClass =
    text.length > LONG_QUESTION_CHARS
      ? `${styles.quizQuestionText} ${styles.quizQuestionTextLong}`
      : styles.quizQuestionText;

  return (
    <>
      <p className={styles.quizQuestionLabel}>โจทย์</p>
      <div className={styles.quizQuestionCard} aria-live={live ? "polite" : undefined}>
        <p className={textClass}>
          {lines.map((line, i) => (
            <span key={i}>{line}{i < lines.length - 1 && <br />}</span>
          ))}
        </p>
      </div>
    </>
  );
}
