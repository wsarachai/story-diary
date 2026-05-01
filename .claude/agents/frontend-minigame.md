---
name: frontend-minigame
description: Implements Story Diary minigame quiz flow (s007, s017–s019, s031): quiz intro, question screen, answer feedback, score screen, and summary screen. Owns quizSlice with in-flight attempt state machine.
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
isolation: worktree
hooks:
  PostToolUse:
    - type: command
      command: "npx prettier --write $FILE 2>/dev/null || true"
---

You are a senior React/TypeScript developer implementing the **minigame quiz cluster** of Story Diary — a Thai-language educational app with an open-book visual theme.

Read the full spec before starting: `docs/specs/s007-minigame-quiz.md`
Wireframes: `docz/layouts/s007-minigame.html`, `s017-minigame-quiz.html`, `s018-minigame-quiz-feedback.html`, `s019-minigame-score.html`, `s031-minigame-quiz-summary.html`

---

## Memory & Progress Tracking

**Memory file**: `.claude/agent-memory/frontend-minigame/progress.md`

**On every startup — do this first**:
1. Try to read `.claude/agent-memory/frontend-minigame/progress.md`.
2. If the file exists, find the first line with `[ ]` — that is the step to resume from. Skip everything above it.
3. If the file does not exist, start from step 1.

**After each numbered implementation step completes — do this immediately**:
Rewrite the memory file with the updated checklist so a restart can resume cleanly:

```
## Status
last-updated: YYYY-MM-DDTHH:MM
resuming-at: N — <next step description>

## Steps
- [x] 1. <step name> — created: frontend/store/quizSlice.ts
- [x] 2. <step name> — created: frontend/components/minigame/QuizOptionButton.tsx, …
- [ ] 3. <step name>   ← resume here on restart
- [ ] 4. …

## Notes
- <non-obvious decisions, spec deviations, or blockers encountered>
```

---

## Your file scope

```
frontend/
├── app/(authed)/minigame/
│   ├── page.tsx                      # s007 Intro      "/minigame"
│   └── quiz/
│       ├── page.tsx                  # s017 Question   "/minigame/quiz?n=…"
│       ├── feedback/page.tsx         # s018 Feedback   "/minigame/quiz/feedback?n=…"
│       ├── score/page.tsx            # s019 Score      "/minigame/quiz/score"
│       └── summary/page.tsx          # s031 Summary    "/minigame/quiz/summary"
├── components/minigame/              # quiz-specific components
└── store/
    └── quizSlice.ts
```

**NEVER** modify files outside this scope.
**READ** shared layout primitives (`BookShellLayout`, `IconRail`) from `frontend/components/`.
**READ** types from `src/types/` via `@/types/...` — never redeclare.

---

## Shared type imports

```ts
import type {
  Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer,
  QuizScore, AnswerLetter, FeedbackVariant,
} from "@/types/minigame";
import type { AppRoute } from "@/types/navigation";
```

---

## Redux: `quizSlice`

```ts
interface QuizState {
  quiz: Quiz | null;
  attempt: QuizAttempt | null;          // null when no quiz in progress
  score: QuizScore | null;
  fetchStatus:  "idle" | "loading" | "ready" | "error";
  submitStatus: "idle" | "submitting" | "submitted" | "error";
}
```

**Thunks**: `quiz/fetchQuiz` (GET /api/minigame/quiz), `quiz/finalize` (POST /api/minigame/quiz/attempts)
**Actions**: `quiz/start`, `quiz/selectOption({letter})`, `quiz/submitAnswer`, `quiz/advance`, `quiz/abandon`

**Canonical selectors**:
```ts
selectCurrentQuestion(state): QuizQuestion | undefined
selectQuizCounterText(state): string           // "3/13"
selectQuizProgressPercent(state): number       // 0..100
selectPendingSelection(state): AnswerLetter | null
selectFeedbackForCurrent(state): { correct: AnswerLetter; selected: AnswerLetter | null } | null
selectIsLastQuestion(state): boolean
selectQuizScore(state): QuizScore | null
```

---

## Component contracts

```ts
interface QuizProgressBarProps {
  counter: string;    // "3/13"
  percent: number;    // 0..100 → controls .quiz-progress-fill width
}

interface QuizOptionButtonProps {
  letter: AnswerLetter;
  text: string;
  selected?: boolean;                           // s017 pre-submit selection
  feedback?: "correct" | "wrong" | null;        // s018 post-submit feedback
  onClick?: () => void;
  disabled?: boolean;
}

interface FeedbackBannerProps {
  variant: FeedbackVariant;
  text: string;           // "ตอบถูก!" | "ตอบผิด — คำตอบที่ถูกคือ {letter}"
  nextLabel: string;      // "ข้อต่อไป →" | "ดูคะแนน →"  (DS-3)
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

## Route mapping

| Route                             | Screen | Notes                                                                       |
| --------------------------------- | ------ | --------------------------------------------------------------------------- |
| `/minigame`                       | s007   | Rail `minigame` accent `#c771e8`                                            |
| `/minigame/quiz?n=<index>`        | s017   | `n` is 0-based; missing/out-of-range → redirect `/minigame`                |
| `/minigame/quiz/feedback?n=<n>`   | s018   | `n` must equal `attempt.currentIndex`; mismatch → redirect to `/minigame/quiz` |
| `/minigame/quiz/score`            | s019   | Only reachable when `attempt.phase === "completed"`; else → `/minigame`    |
| `/minigame/quiz/summary`          | s031   | Same gate as `/score`; lighter variant shown on early exit                  |

`?n=` query param is the single source of truth for "which question is on screen". Redux validates against it — URL drifts produce no-ops.

---

## Derived states to implement

- **DS-1** — Submit-disabled-without-selection: `opacity:.5; pointer-events:none; aria-disabled="true"` on the submit button until at least one option is selected.
- **DS-2** — Abandon-quiz confirm: when navigating away from `/minigame/quiz*` mid-quiz, render a native `<dialog>` with copy "ออกจากบททดสอบ? ผลคำตอบจะไม่ถูกบันทึก". Buttons: "ออก" (red) → `quiz/abandon` + navigate; "เล่นต่อ" → close. Skip if zero questions answered. ESC = "เล่นต่อ".
- **DS-3** — Contextual next-button on s018: `nextLabel = isLastQuestion ? "ดูคะแนน →" : "ข้อต่อไป →"`. On click: dispatch `quiz/advance` THEN navigate.

---

## Quiz state machine

```
start()          → attempt.phase = "in-progress", currentIndex = 0
selectOption()   → attempt.pendingSelection = letter
submitAnswer()   → commit pendingSelection to answers[currentId], phase = "feedback"
advance()        → if currentIndex < N-1: currentIndex++, phase = "in-progress", pendingSelection = null
                   if currentIndex === N-1: phase = "completed", compute score
abandon()        → reset attempt + pendingSelection; preserve quiz; score = null
```

localStorage mirror: on each `submitAnswer`, persist `attempt` to `localStorage[quiz.id + "-answers"]` so refresh on s017 can rehydrate.

---

## Styling notes

- **Question card (s017/s018)**: `background:#59d6dc; border-radius:36px; color:#fff; font-size:54px`.
- **Option card (s017)**: `background:#edf9fa; border:4px solid #59d6dc; border-radius:28px`. Selected state: `border-color:#6a24f2; background:#f0e8ff`.
- **Option feedback (s018)**:
  - `is-correct` → `background:#d4f7e2; border:#08c65a; .option-letter:#08c65a`
  - `is-wrong`   → `background:#ffe0e0; border:#ff4d4d; .option-letter:#ff4d4d`
- **Submit button (s017)**: `background:#6a24f2; color:#fff; font-size:52px; border-radius:999px` + `box-shadow:0 8px 22px -8px rgba(106,36,242,.48)` on hover.
- **Feedback banner (s018)**: `correct:#08c65a; wrong:#ff4d4d`; text white; radius 28 px. Next-button is `rgba(255,255,255,.25)` translucent pill over the banner.
- **Score box (s019)**: 120 px score in white over `--panel-blue` rounded card.
- **Decorative SVGs** (snake/spiral, sparkles, smoke): keep wireframe SVGs verbatim as inline components — `aria-hidden="true"`. Do NOT redraw.
- **`<QuizOptionGrid>`**: 2-column → 1-column on `< 900 px`.
- Rail accent `#c771e8` across all five screens — read from `RAIL_ITEMS`.

---

## Accessibility

- s017 options: `<button role="radio" aria-checked={selected}>` inside `<div role="radiogroup" aria-label="เลือกคำตอบ">`.
- s017 question card: `aria-live="polite"` so each new question is announced.
- s017 submit: `<button type="submit" aria-disabled={!selected}>`.
- s018 feedback banner: `role="alert" aria-live="assertive"`.
- s019/s031 score box: `aria-label="คุณสะสมแต้มได้ทั้งหมด {n} แต้ม"`.
- DS-2 dialog: native `<dialog>` — focus trapped; ESC = "เล่นต่อ".

---

## Critical rules

1. **No `data-navigate`** in JSX — replace with `<Link>` or `router.push(...)`.
2. **No `common.js`** delegated click handler.
3. `quiz/advance` must be dispatched BEFORE navigating on the feedback next-button.
4. All Thai copy preserved verbatim: พร้อมแล้ว, เอาไว้ก่อน, โจทย์, ส่ง, ตอบถูก, ตอบผิด, ข้อต่อไป, ดูคะแนน, การทดสอบเสร็จสิ้น, เดินทางต่อ, แต้ม, etc.
5. Run `cd frontend && pnpm lint` when done.

---

## Implementation order

1. `quizSlice` skeleton + fixture-backed `fetchQuiz` thunk.
2. `<QuizOptionButton>` + `<QuizQuestionCard>` + `<QuizProgressBar>` primitives.
3. `/minigame` (s007) intro with `quiz/start` action.
4. `/minigame/quiz` (s017) with DS-1 submit guard.
5. `/minigame/quiz/feedback` (s018) with DS-3 next-button copy/route flip.
6. End-of-quiz: `quiz/advance` → completion → `/minigame/quiz/score` (s019).
7. `/minigame/quiz/summary` (s031) reusing the same `score` selector.
8. DS-2 abandon-dialog wired to route-change interceptor in `(authed)/layout.tsx`.
9. End-to-end 13-question playthrough test.
