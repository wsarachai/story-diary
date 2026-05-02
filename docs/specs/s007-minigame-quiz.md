# Spec: Minigame Quiz Flow (s007, s017–s019, s031)

**Status:** Draft
**Owner:** Architect (handoff to frontend implementer + tester)
**Last updated:** 2026-05-01
**Scope:** UI architecture for the Minigame quiz: from intro
("คุณพร้อมสำหรับบททดสอบแล้วใช่หรือไม่") through per-question play,
per-answer feedback, and final summary.

---

## Summary

The Minigame is a fixed-length multiple-choice quiz (the wireframe
counter is "บททดสอบที่ 3/13" → 13 questions). Tapping the "Minigame"
card on the home dashboard or the rail "game" icon opens the intro
(s007). Answering "พร้อมแล้ว" enters the quiz (s017); each submitted
answer reveals correct/wrong feedback (s018) and advances to the next
question. After the final question the user sees a score screen (s019)
and is returned to home.

This spec maps the wireframes onto a `quizSlice` Redux slice that
holds an in-flight `QuizAttempt`, plus four routes under
`/minigame/...`. It introduces three derived states not present in the
wireframes — answer-not-selected guard, last-question-of-quiz transition,
and abandon-quiz prompt — all grounded in the existing visual language.

---

## Source Wireframes

| Screen ID                       | File                                                | Role                                                       |
| ------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `s007-minigame`                 | `docz/wireframes/s007-minigame.html`                | Intro doodle + ready prompt + "พร้อมแล้ว / เอาไว้ก่อน" buttons. |
| `s017-minigame-quiz`            | `docz/wireframes/s017-minigame-quiz.html`           | Question card + 4 options + ส่ง button.                    |
| `s018-minigame-quiz-feedback`   | `docz/wireframes/s018-minigame-quiz-feedback.html`  | Same question + colour-coded options + feedback banner.    |
| `s019-minigame-score`           | `docz/wireframes/s019-minigame-score.html`          | Snake/spiral art + 91-point score + ถูก/ผิด chips + continue. |
| `s031-minigame-quiz-summary`    | `docz/wireframes/s031-minigame-quiz-summary.html`   | Lighter "summary" variant: smoke art + score line + continue. |

Neighbours that affect navigation:

- `s004-home.html` — feature card "Minigame" routes here.
- `s019` and `s031` both `data-navigate="s004-home.html"` — the quiz
  always ends back on home.

### Page-specific JS vs shared `common.js`

- **None** of these five screens ship page-specific JS. They rely on
  shared `common.js` for `data-navigate` (only used by s007's two
  ready buttons; everything else uses native `<a href>`).
- The wireframes hard-code one question with one selected wrong answer
  on s018 (option C wrong, B correct). The React port computes the
  highlight from `QuizAttempt.answers[currentQuestion.id]`.

### Gaps not covered by predefined wireframes

1. **No question state machine.** The wireframes are static stills.
   How questions cycle (s017 → s018 → s017 with the next question →
   ... → s019) is not depicted. Spec defines the cycle below.
2. **No "select-then-submit" guard.** s017's submit button is a
   plain `<a>`; tapping it without selecting an option would still
   navigate. **DS-1.**
3. **Last-question routing.** s018's "เดินทางต่อ →" links to s031;
   yet s019 also exists with a richer score view that links straight
   to home. The two final screens are not differentiated by the
   wireframes. The spec resolves this ambiguity by:
   - Treating **s019 as the canonical final score** for a completed
     quiz attempt (13/13 answered).
   - Treating **s031 as a "summary" variant** shown when the user
     exits early ("เอาไว้ก่อน" mid-quiz, or a future timed-out path)
     or as a lighter alternative after the last `s018` feedback when
     the design system is short on screen real estate.
   - Both screens are routable; quiz completion routes to s019 by
     default, with s031 as an opt-in.
4. **Abandon-quiz prompt.** Tapping the rail "home" icon mid-quiz
   would silently discard progress. **DS-2.**
5. **Missing "continue to next question" affordance on s018.** The
   wireframe shows a generic "เดินทางต่อ →" button that goes to s031
   regardless of position; in the live app this button must
   contextually advance to the next question or to the score screen
   on the last question. **DS-3.**

---

## Derived Screens and States

| ID    | Name                                       | Type                | Inherits from                                            |
| ----- | ------------------------------------------ | ------------------- | -------------------------------------------------------- |
| DS-1  | Submit-disabled-without-selection          | Inline UI state     | s017 `.quiz-submit-btn` (opacity .5 + `aria-disabled`)   |
| DS-2  | Abandon-quiz confirm dialog                | Modal dialog        | DS-4 from s016 spec (small card with two pill buttons)   |
| DS-3  | "ข้อต่อไป →" (next question) variant of feedback button | Inline button label  | s018 `.feedback-next-btn` with route flip on last question |

DS-1 visual rules: the submit button is disabled until at least one
option is selected. Disabled state = `opacity:.5; pointer-events:none;
aria-disabled="true"`.

DS-2 visual rules: when the user attempts to leave `/minigame/quiz` (or
`/minigame/quiz/feedback`) via the rail or browser back, render a
small native `<dialog>` matching the s016 DS-4 pattern with copy:

> "ออกจากบททดสอบ?
>  ผลคำตอบจะไม่ถูกบันทึก"

Buttons: "ออก" (red) → discard attempt + navigate; "เล่นต่อ" → close.
Skip the dialog if the user has answered zero questions.

DS-3 visual rules: when the current question is NOT the last,
`.feedback-next-btn` reads "ข้อต่อไป →" and routes to
`/minigame/quiz?n={next}`. On the LAST question, copy reads
"ดูคะแนน →" and routes to `/minigame/quiz/score`.

---

## User Flow

```
                ┌────────────────┐
                │ /home (s004)   │
                └───────┬────────┘
                        │ feature card "Minigame" / rail "game"
                        ▼
                ┌─────────────────────────┐
                │ /minigame (s007 intro)  │
                │  พร้อมแล้ว ↘  ↙ เอาไว้ก่อน │
                └───┬────────────┬────────┘
                    │            │
                    ▼            ▼
        /minigame/quiz?n=0   /home (s004)
            (s017)
              │
              │ ส่ง  → submit selected
              ▼
        /minigame/quiz/feedback?n=0   (s018)
              │
              │ "ข้อต่อไป →"  (DS-3, when n < N-1)
              ▼
        /minigame/quiz?n=1   (s017)
              │
              │ … repeat …
              │ on n = N-1, "ดูคะแนน →"
              ▼
        /minigame/quiz/score   (s019)
              │
              │ "เดินทางต่อ →"
              ▼
        /home

   side path:
        /minigame/quiz/summary  (s031)  ← reachable by abandoning early or
                                          via a future "lite-mode" toggle.
                                          Also routes to /home on continue.
```

---

## Component Tree

```
app/(authed)/minigame/
├── page.tsx                       ← s007  ("/minigame")
│   └── <MinigameIntroScreen>
│       ├── <DoodleArt />          (decorative left-page SVG)
│       └── <ReadyPanel>
│           ├── <IntroText />      ("พ่อมดแห่งหอคอย…")
│           ├── <Ornament />
│           ├── <ReadyText />      ("คุณพร้อมสำหรับบททดสอบ…")
│           └── <ReadyButtons>
│               ├── <ReadyButton variant="yes" onClick={startQuiz}/>
│               └── <ReadyButton variant="no"  href="/home"/>
│
└── quiz/
    ├── page.tsx                   ← s017  ("/minigame/quiz?n=…")
    │   └── <QuizQuestionScreen>
    │       ├── <QuizProgressBar counter="3/13" percent={23}/>
    │       ├── <QuizQuestionLabel>โจทย์</QuizQuestionLabel>
    │       ├── <QuizQuestionCard text={question.text}/>
    │       ├── <QuizOptionGrid>
    │       │   └── <QuizOptionButton letter selected onClick=…/>  ×4
    │       └── <SubmitRow>
    │           └── <QuizSubmitButton disabled={!selected} onClick={submit}/>  (DS-1)
    │
    ├── feedback/page.tsx          ← s018  ("/minigame/quiz/feedback?n=…")
    │   └── <QuizFeedbackScreen>
    │       ├── <QuizProgressBar />
    │       ├── <QuizQuestionLabel />
    │       ├── <QuizQuestionCard />
    │       ├── <QuizOptionGrid feedback={correctLetter, selectedLetter}/>
    │       └── <FeedbackBanner variant="correct"|"wrong">
    │           ├── <FeedbackText>
    │           └── <FeedbackNextButton href={…}>      (DS-3)
    │
    ├── score/page.tsx             ← s019  ("/minigame/quiz/score")
    │   └── <QuizScoreScreen score={score}>
    │       ├── <SnakeArt />                (left-page spiral SVG)
    │       ├── <ScoreCompleteTitle/>       ("การทดสอบเสร็จสิ้น!")
    │       ├── <ScoreCompleteSub />        ("ทำข้อสอบครบ 13/13 ข้อ")
    │       ├── <SparkleCluster />          (right-page sparkles)
    │       ├── <ScoreBox label="คุณสะสมแต้มได้ทั้งหมด" value={91} unit="แต้ม"/>
    │       ├── <ScoreDetailRow>
    │       │   ├── <ScoreDetailChip>ถูก {correctCount} ข้อ</ScoreDetailChip>
    │       │   └── <ScoreDetailChip>ผิด {wrongCount} ข้อ</ScoreDetailChip>
    │       └── <ScoreContinueButton href="/home">เดินทางต่อ →</ScoreContinueButton>
    │
    └── summary/page.tsx           ← s031  ("/minigame/quiz/summary")
        └── <QuizSummaryScreen score={score}>
            ├── <SummaryTitle>การทดสอบเสร็จสิ้น</SummaryTitle>
            ├── <SmokeArt />                (decorative left-page SVG)
            ├── <SummaryStars />            (right-page stars SVG)
            ├── <SummaryScoreText>คุณสะสมแต้มได้ทั้งหมด {points} แต้ม</SummaryScoreText>
            └── <SummaryContinueButton href="/home">เดินทางต่อ</SummaryContinueButton>
```

### Reusable component contracts

```ts
import type {
    AnswerLetter,
    QuizAttempt,
    QuizQuestion,
    QuizScore,
    FeedbackVariant,
} from "@/types/minigame";

interface QuizProgressBarProps {
    /** "บททดสอบที่ 3/13" → counter = "3/13". */
    counter: string;
    /** 0..100, controls `.quiz-progress-fill` width. */
    percent: number;
}

interface QuizOptionButtonProps {
    letter: AnswerLetter;
    text: string;
    /** Pre-submit local selection (s017). */
    selected?: boolean;
    /** Post-submit feedback rendering (s018). */
    feedback?: "correct" | "wrong" | null;
    onClick?: () => void;
    disabled?: boolean;
}

interface FeedbackBannerProps {
    variant: FeedbackVariant;
    /** "ตอบผิด — คำตอบที่ถูกคือ B" or "ตอบถูก!". */
    text: string;
    /** Localised next-step copy ("ข้อต่อไป →" / "ดูคะแนน →"). */
    nextLabel: string;
    nextHref: AppRoute;
}

interface ScoreBoxProps {
    label: string;
    value: number;
    unit: string;
}

interface ReadyButtonProps {
    variant: "yes" | "no";
    children: React.ReactNode;
    onClick?: () => void;
    href?: AppRoute;
}
```

---

## Redux State Design

### `quizSlice`

```ts
import type {
    AnswerLetter,
    Quiz,
    QuizAttempt,
    QuizScore,
} from "@/types/minigame";

interface QuizState {
    /** Loaded quiz definition. */
    quiz: Quiz | null;
    /** Live attempt; null when no quiz is in progress. */
    attempt: QuizAttempt | null;
    /** Final score (computed on completion). */
    score: QuizScore | null;
    fetchStatus:   "idle" | "loading" | "ready" | "error";
    submitStatus:  "idle" | "submitting" | "submitted" | "error";
}
```

### Actions / thunks

| Action                           | Effect                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `quiz/fetchQuiz`                 | GET `/api/minigame/quiz`; populates `quiz`.                                              |
| `quiz/start`                     | Initialises `attempt` with `currentIndex = 0`, `phase = "in-progress"`, fresh timestamps. |
| `quiz/selectOption({ letter })`  | Sets `attempt.pendingSelection`. No network.                                             |
| `quiz/submitAnswer`              | Optimistically commits `pendingSelection` to `answers[currentId]`, flips phase to "feedback", and POSTs the attempt-step (optional). |
| `quiz/advance`                   | Increments `currentIndex`; flips phase back to "in-progress" with `pendingSelection = null`. If past last question, flips to "completed" and computes `score`. |
| `quiz/abandon`                   | Resets `attempt` and `pendingSelection`; preserves `quiz` and `score = null`. Triggered by DS-2.|
| `quiz/finalize`                  | POST `/api/minigame/quiz/attempts` with full attempt for server scoring.                  |

### Selectors

```ts
selectCurrentQuestion(state): QuizQuestion | undefined
selectQuizCounterText(state): string                    // "3/13"
selectQuizProgressPercent(state): number                // 0..100
selectPendingSelection(state): AnswerLetter | null
selectFeedbackForCurrent(state): { correct: AnswerLetter; selected: AnswerLetter | null } | null
selectIsLastQuestion(state): boolean
selectQuizScore(state): QuizScore | null
```

### Local-only state

- Hover/focus visuals on `<QuizOptionButton>` and `<ReadyButton>`.
- Sparkle / snake / smoke decorations are pure SVG markup, no state.

---

## Interaction Mapping

### s007 Intro

| Element                                                              | Wireframe behaviour     | React/Redux mapping                                                                        |
| -------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `.ready-btn-yes[data-navigate="s017-minigame-quiz.html"]`            | common.js navigate      | `onClick`: `dispatch(quiz/start())` → `router.push("/minigame/quiz?n=0")`.                 |
| `.ready-btn-no[data-navigate="s004-home.html"]`                      | common.js               | `<Link href="/home">`. No state change (attempt stays null).                                |

### s017 Question

| Element                                  | Wireframe behaviour                  | React/Redux mapping                                                                                       |
| ---------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `.quiz-option` × 4                       | hover effect only                    | `<QuizOptionButton onClick={() => dispatch(quiz/selectOption(letter))}>`. Applies `selected` ring locally. |
| `.quiz-submit-btn[href="s018-…"]`        | native nav                           | `onClick`: if `pendingSelection` is null → no-op (DS-1); else `dispatch(quiz/submitAnswer())` → `router.push("/minigame/quiz/feedback?n=" + currentIndex)`. |
| `.quiz-progress-fill` width style        | static                               | Bound to `selectQuizProgressPercent`.                                                                     |

### s018 Feedback

| Element                                              | Wireframe behaviour          | React/Redux mapping                                                                                                                       |
| ---------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.quiz-option.is-correct` / `.is-wrong`              | hard-coded class on B and C  | Computed from `selectFeedbackForCurrent()`: the option whose `letter === correct` gets `is-correct`; the option whose `letter === selected && selected !== correct` gets `is-wrong`. |
| `.feedback-banner.wrong` / `.correct`                | hard-coded `wrong`           | Variant from `selected === correct`. Sets banner background `#08c65a` (correct) or `#ff4d4d` (wrong).                                     |
| `.feedback-text`                                     | hard-coded copy              | "ตอบถูก!" or "ตอบผิด — คำตอบที่ถูกคือ {correct}".                                                                                         |
| `.feedback-next-btn[href="s031-…-summary.html"]`     | wireframe always sends to s031 | DS-3 mapping: `nextHref = isLastQuestion ? "/minigame/quiz/score" : "/minigame/quiz?n=" + (currentIndex+1)` and label flips accordingly. `onClick` dispatches `quiz/advance` THEN navigates. |

### s019 Score

| Element                                            | Wireframe behaviour     | React/Redux mapping                                              |
| -------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `.score-box-value` "91 แต้ม"                       | hard-coded              | Bound to `score.points`.                                         |
| `.score-detail-chip` "ถูก 10 ข้อ" / "ผิด 3 ข้อ"     | hard-coded              | Bound to `score.correctCount` / `score.wrongCount`.              |
| `.score-continue-btn[href=s004]`                   | native nav              | `<Link href="/home">`. Optionally dispatch `quiz/finalize` first if not already submitted.|

### s031 Summary

| Element                                            | Wireframe behaviour     | React/Redux mapping                                              |
| -------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `.summary-score-text` ("คุณสะสมแต้มได้ทั้งหมด x แต้ม") | hard-coded             | Bound to `score.points`.                                         |
| `.summary-continue-btn[href=s004]`                 | native nav              | `<Link href="/home">`.                                            |

---

## Route Mapping

| Wireframe filename                       | Next.js route                                       | Auth      | Notes                                                                |
| ---------------------------------------- | --------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| `s007-minigame.html`                     | `/minigame`                                         | Protected | Rail `minigame` (`#c771e8`).                                         |
| `s017-minigame-quiz.html`                | `/minigame/quiz?n=<index>`                          | Protected | `n` is `0..N-1`; missing/out-of-range → redirect `/minigame`.        |
| `s018-minigame-quiz-feedback.html`       | `/minigame/quiz/feedback?n=<index>`                 | Protected | `n` must equal `attempt.currentIndex`; mismatch → redirect to `/minigame/quiz`.|
| `s019-minigame-score.html`               | `/minigame/quiz/score`                              | Protected | Reachable only when `attempt.phase === "completed"`; otherwise redirect to `/minigame`.|
| `s031-minigame-quiz-summary.html`        | `/minigame/quiz/summary`                            | Protected | Same gate as `/score`. Variant view; opt-in.                         |

The `?n=` query is the single source of truth for "which question is
on screen" — Redux validates against it and dispatches no-ops if the
URL drifts. This keeps deep-linking + browser back/forward working
naturally inside the wizard.

---

## TypeScript Contracts

UI prop shapes are listed above. Domain shapes (`Quiz`,
`QuizQuestion`, `QuizOption`, `AnswerLetter`, `QuizAttempt`,
`QuizAnswer`, `QuizScore`, `FeedbackVariant`) live in
`src/types/minigame.ts`. UI must not redeclare them.

Assumed API endpoints (full backend spec out of scope):

```ts
// GET /api/minigame/quiz                    → Quiz
// POST /api/minigame/quiz/attempts          → { score: QuizScore }
//   Body: QuizAttempt   (server validates and computes points)
```

When the backend spec lands, add `QUIZ_NOT_FOUND` and
`QUIZ_ATTEMPT_INVALID` to `src/types/error.ts#ApiErrorCode`.

---

## Styling Notes

- **Question card (s017/s018)**: `background:#59d6dc;
  border-radius:36px; color:#fff; font-size:54px;`.
- **Option card** (s017): `background:#edf9fa; border:4px solid
  #59d6dc; border-radius:28px;`. Selected hover/state outline:
  `border-color:#6a24f2; background:#f0e8ff`.
- **Option card feedback** (s018):
  - `is-correct` → `background:#d4f7e2; border:#08c65a; .option-letter:#08c65a`.
  - `is-wrong`   → `background:#ffe0e0; border:#ff4d4d; .option-letter:#ff4d4d`.
- **Submit button (s017)**: `background:#6a24f2; color:#fff;
  font-size:52px; border-radius:999px;` with the `box-shadow:0 8px
  22px -8px rgba(106,36,242,.48)` lift on hover.
- **Feedback banner (s018)**: `correct → #08c65a; wrong → #ff4d4d`;
  text always white; rounded 28 px; the next-button is a translucent
  white-bordered pill `rgba(255,255,255,.25)` over the same banner.
- **Score box (s019)**: large 120 px score in white over the
  `--panel-blue` rounded card.
- **Sparkle / snake / smoke art**: keep the wireframe SVGs verbatim;
  React port may inline them as components but must not redraw.
- **Active rail accent (all 5 screens)**: `#c771e8` lilac — read from
  `RAIL_ITEMS[3].activeAccent`.
- **Decorative-but-static elements** (intro doodle, sparkles) are
  `aria-hidden="true"`; no React state.

**Responsive note:** `<QuizOptionGrid>` collapses from 2-column to
1-column on `< 900 px`. The right-page Submit button stays right-
aligned at all widths. The score screens (s019/s031) collapse the
two-page layout into a vertical stack with the score box on top and
the art below.

---

## Accessibility Notes

- `<html lang="th">`.
- s007 ready buttons: native `<button>` (yes) + `<a>` (no). Each has a
  Thai `aria-label` matching the visible text.
- s017 question card: `aria-live="polite"` so screen readers announce
  the question on first paint of each step.
- s017 options: `<button role="radio" aria-checked={selected}
  aria-label="ตัวเลือก {letter}">` inside a parent `<div
  role="radiogroup" aria-label="เลือกคำตอบ">`. Submit button is a
  `<button type="submit" aria-disabled={!selected}>`.
- s018 feedback banner: `role="alert" aria-live="assertive"` (matches
  wireframe). Options are non-interactive (no click handler) but keep
  `aria-label="ตัวเลือก {letter} {ถูกต้อง|ตอบผิด|ไม่ถูก}"` per the
  wireframe.
- s019 / s031: each is a `<main>` landmark with a descriptive
  `aria-label="คะแนนรวม"`. The score box has its own
  `aria-label="คุณสะสมแต้มได้ทั้งหมด {n} แต้ม"`.
- DS-2 native `<dialog>` traps focus; ESC = "เล่นต่อ".

---

## Edge Cases

1. **User refreshes mid-question** → URL `?n=` is the source of
   truth; `attempt` rehydrates from localStorage (mirror selected
   answers); if no local cache, redirect to `/minigame` and force the
   user to restart.
2. **`?n=` out of range** → redirect to `/minigame`.
3. **`?n=` mismatch** with `attempt.currentIndex` → redirect to the
   canonical step.
4. **Submitting on s017 with no selection** → DS-1 (button disabled);
   no thunk fires.
5. **Network error during `quiz/finalize`** → keep score visible; show
   inline "บันทึกผลไม่สำเร็จ — เก็บคะแนนชั่วคราว" line; queue retry.
6. **User leaves /minigame/quiz mid-quiz** → DS-2 confirm. On accept,
   `quiz/abandon` resets state; on cancel, stay.
7. **All answers correct** → score box shows perfect score; the chips
   collapse to "ถูก {N} ข้อ" only (no "ผิด" chip).
8. **Quiz with zero questions** (server malformation) → redirect to
   `/minigame` and surface "บททดสอบยังไม่พร้อม".
9. **Feedback page accessed without prior submit** (deep link) →
   redirect to `/minigame/quiz?n={index}`.
10. **Score page accessed without completion** → redirect to
    `/minigame`.
11. **Two tabs play the same quiz** → each tab keeps its own
    `attempt` in localStorage keyed by `quiz.id + "-" + tabId`. The
    server only sees the final `finalize` POST.

---

## Implementation Plan

1. Land `src/types/minigame.ts` (already in this commit) and refresh
   `src/types/navigation.ts`.
2. `quizSlice` skeleton + fixture-backed `fetchQuiz` thunk.
3. `<QuizOptionButton>` + `<QuizQuestionCard>` + `<QuizProgressBar>`
   primitives, against fixture data.
4. `/minigame` (s007) intro screen with `quiz/start` action.
5. `/minigame/quiz` (s017) with DS-1 submit guard.
6. `/minigame/quiz/feedback` (s018) with DS-3 next-button copy/route.
7. End-of-quiz handling: `quiz/advance` → completion; render
   `/minigame/quiz/score` (s019).
8. `/minigame/quiz/summary` (s031) as a sibling route reusing the
   same `score` selector.
9. DS-2 abandon-quiz dialog wired to `(authed)/layout.tsx` route
   change interceptor.
10. End-to-end pass: 13-question playthrough with mixed correct/wrong
    answers, ending at `/home`.

Dependencies: 1 unblocks 2; 5 must precede 6; 7 must precede 8.

---

## Acceptance Criteria

1. From `/home`, tapping the Minigame card or rail "game" icon
   navigates to `/minigame` with the rail "minigame" item active and
   accented `#c771e8`.
2. On `/minigame`, tapping "พร้อมแล้ว" navigates to
   `/minigame/quiz?n=0` and renders the s017 layout with question 1.
3. Tapping an option toggles its selected ring; the submit button is
   disabled (DS-1) until at least one option is selected.
4. Tapping ส่ง with a selected option records the answer and
   navigates to `/minigame/quiz/feedback?n=0`. The correct option is
   green; if the user's selection differs from the correct answer,
   the user's pick is red.
5. The feedback banner reads "ตอบถูก!" (green) or "ตอบผิด — คำตอบที่
   ถูกคือ {letter}" (red).
6. Tapping the feedback's next button on a non-last question reads
   "ข้อต่อไป →" and navigates to `/minigame/quiz?n=N+1` with the
   next question rendered fresh.
7. On the final question, the next button reads "ดูคะแนน →" and
   navigates to `/minigame/quiz/score`.
8. `/minigame/quiz/score` renders the snake/spiral art, the title
   "การทดสอบเสร็จสิ้น!", "ทำข้อสอบครบ N/N ข้อ", the score box (X
   แต้ม), and two chips with the correct + wrong counts.
9. Tapping เดินทางต่อ → on the score screen routes to `/home`.
10. Attempting to leave `/minigame/quiz*` mid-quiz prompts DS-2;
    confirming discards `attempt`.
11. Refreshing on `/minigame/quiz?n=…` rehydrates from localStorage if
    available, otherwise redirects to `/minigame`.
12. All Thai copy preserved verbatim from the wireframes.

---

## Shared Type Files

| File                          | Exports                                                                                                                      | Notes                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/types/minigame.ts`       | `AnswerLetter`, `QuizOption`, `QuizQuestion`, `Quiz`, `QuizAnswer`, `QuizAttempt`, `QuizScore`, `FeedbackVariant`             | New file — created in this commit.                                                 |
| `src/types/navigation.ts`     | `ScreenId` (s007/s017/s018/s019/s031), `AppRoute` (`/minigame/...`)                                                          | Updated in this commit.                                                            |
| `src/types/error.ts`          | (future) `QUIZ_NOT_FOUND`, `QUIZ_ATTEMPT_INVALID`                                                                             | Add when backend spec lands.                                                       |
