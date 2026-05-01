---
name: Shared type files inventory
description: What lives in src/types/ as of 2026-05-01 and which spec each file backs
type: project
---

`src/types/` contains the cross-agent contracts referenced by every spec under `docs/specs/`. As of 2026-05-01:

- `auth.ts` — `Gender`, `User` (re-export), `LoginInput`, `RegisterInput`, `RegisterRequest`, `AuthResponse`, `AuthStatus`. Backs `s001-auth-and-home-entry.md`.
- `user.ts` — `UserProfile`, `UpdateUserRequest`, `GetUserResponse`, `UpdateUserResponse`. Canonical for the existing `docs/specs/user-profile.md` API.
- `error.ts` — `ApiError`, `ApiErrorDetail`, `ApiErrorCode`, `ValidationFieldCode`, `isApiError`. Used by all specs.
- `navigation.ts` — `ScreenId` (all 31), `NavRailKey`, `AppRoute`, `NavRailItem`, `RAIL_ITEMS`, `SCREEN_TO_RAIL`. Used by every authed screen.
- `chapters.ts` — `ChapterId`, `ChapterLockState`, `ChapterProgressState`, `ChapterSummary`, `ChapterScene`, `Chapter`, `VideoClip`, `VideoClipsCollection`. Backs `s005-chapters-and-story.md`.
- `habit.ts` — `HabitCategory`, `PhysicalCategory`, `HabitFrequency`, `HabitImportance`, `HabitOccurrenceStatus`, `WeekdayIndex`, `MealSlot`, `MealRelation`, `HabitSchedule`, `HabitActivity`, `HabitOccurrence`, `SymptomCheck`, `MedicineCheckin`, `NutritionCheckin`, `UnusualSymptomsCheckin`, `MoodCheckin`, `MoodLevel`, `TodayHabitEntry`, `PeriodSummary`, `MonthlyGoal`, `MonthlyResults`, `NutritionPresetKey`, `NUTRITION_PRESETS`. Backs `s006-...` and `s016-...` specs.
- `minigame.ts` — `AnswerLetter`, `QuizOption`, `QuizQuestion`, `Quiz`, `QuizAnswer`, `QuizAttempt`, `QuizScore`, `FeedbackVariant`. Backs `s007-minigame-quiz.md`.

**Why:** Every spec lists a "Shared Type Files" section pointing here. New specs MUST extend these files, not create domain-overlapping new ones (e.g. don't add a `quiz.ts` next to `minigame.ts`).

**How to apply:** Before writing a new shared type, grep for the symbol name across `src/types/`. If a similar shape exists, extend the union or add a sibling field rather than redefining. Domain → file mapping is encoded in this list.

**Pending additions deferred to backend specs:** `CHAPTER_NOT_FOUND`, `OCCURRENCE_NOT_FOUND`, `OCCURRENCE_LOCKED`, `ACTIVITY_NAME_TAKEN`, `QUIZ_NOT_FOUND`, `QUIZ_ATTEMPT_INVALID` — each spec calls these out as "add when backend spec lands". Don't add them speculatively to `error.ts`; they are codes the backend route handlers will return, not codes the UI invents.
