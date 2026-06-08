# Spec: Minigame Quiz

**Status:** Implemented
**Last updated:** 2026-06-08
**Scope:** Minigame hub, quiz question/answer flow, per-question feedback, score screen, and summary screen.

---

## Summary

The minigame is a health-knowledge quiz. Questions are fetched once and held in a `QuizProvider` context that manages the entire attempt lifecycle as client state (no server-side session). The flow is: hub (start/decline) → question page → feedback page (per question) → repeat → score page → summary page. Navigating away mid-quiz triggers a confirmation dialog; confirming abandons the attempt. Score is calculated as `correctCount × 7` points. The quiz phase is stored as a state machine (`idle | in-progress | feedback | completed | score | summary`) that drives URL transitions via `useEffect`.

---

## Routes

| Route | Page file | Description |
|-------|-----------|-------------|
| `/minigame` | `frontend/app/(authed)/minigame/page.tsx` | Hub with story intro and start/decline buttons |
| `/minigame/quiz` | `frontend/app/(authed)/minigame/quiz/page.tsx` | Question page; left page shows question + progress, right page shows four answer options |
| `/minigame/quiz/feedback` | `frontend/app/(authed)/minigame/quiz/feedback/page.tsx` | Feedback page; highlights correct/wrong options and shows a result banner |
| `/minigame/quiz/score` | `frontend/app/(authed)/minigame/quiz/score/page.tsx` | Completion screen with points and correct/wrong counts |
| `/minigame/quiz/summary` | `frontend/app/(authed)/minigame/quiz/summary/page.tsx` | Alternate summary view with total points |

---

## API Endpoints

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/minigame/quiz` | `frontend/app/api/minigame/quiz/route.ts` | Returns all quiz questions (fetched once on mount) |
| `POST` | `/api/minigame/quiz/attempts` | `frontend/app/api/minigame/quiz/attempts/route.ts` | Records a completed quiz attempt |

---

## Key Components

- `MinigamePage` — `frontend/app/(authed)/minigame/page.tsx` — hub with SVG spiral doodle and "พร้อมแล้ว / ยังไม่พร้อม" buttons
- `QuizProvider` — `frontend/app/(authed)/minigame/QuizProvider.tsx` — React context that owns entire quiz state: attempt, score, phase machine, `start / selectOption / submitAnswer / advance / abandon` actions
- `QuizPage` — `frontend/app/(authed)/minigame/quiz/page.tsx` — reads phase from context; shows question text and four option buttons; custom rail intercepts navigation to show abandon dialog
- `FeedbackPage` — `frontend/app/(authed)/minigame/quiz/feedback/page.tsx` — highlights correct (green) and wrong (red) options; shows banner with result copy and next-question / see-score button
- `ScorePage` — `frontend/app/(authed)/minigame/quiz/score/page.tsx` — displays total points, correct count, wrong count; "เดินทางต่อ" link returns to home
- `SummaryPage` — `frontend/app/(authed)/minigame/quiz/summary/page.tsx` — alternate completion view with smoke-wisp SVG decoration and total points
- `minigame/layout.tsx` — `frontend/app/(authed)/minigame/layout.tsx` — wraps all minigame routes in `QuizProvider`

---

## State

Client context (no Redux slice): `frontend/app/(authed)/minigame/QuizProvider.tsx` — manages `quiz` (from RTK Query), `attempt` (current index, answers map, phase, pending selection), and `score` as React state. Phase transitions drive URL changes via `useEffect`; URL does not drive phase.

RTK Query: `frontend/store/quizApi.ts` — `getQuiz` query fetches and caches the question list from `GET /api/minigame/quiz`.
