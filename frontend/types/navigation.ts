/**
 * Navigation domain contracts for Story Diary.
 *
 * The wireframes declare a stable 4-item icon rail (.icon-rail) anchored to
 * the right edge of the book-shell on every authenticated screen. Each
 * screen marks exactly one rail item with `class="is-active"` and
 * `aria-current="page"`. The active item's accent colour differs per top-
 * level destination:
 *
 *   home                 → #ff3131  (red)        rail key: "home"
 *   chapters / story     → #08c65a  (green)      rail key: "chapters"
 *   habit tracker        → #6a24f2  (purple)     rail key: "habit"
 *   minigame             → #c771e8  (lilac)      rail key: "minigame"
 *
 * Cross-agent contract: shared by frontend (rail component, route guards,
 * tests). Backend does not consume this file.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Screen ids — one per `docz/wireframes/s###-*.html`
 * ──────────────────────────────────────────────────────────────────────── */

export type ScreenId =
    // Public / auth
    | "s001-landing"
    | "s002-login"
    | "s003-register"
    // Authed shell — top-level destinations
    | "s004-home"
    | "s005-chapters"
    | "s006-habit-tracker"
    | "s007-minigame"
    // Chapters / story flow
    | "s008-chapters-menu"
    | "s009-chapters-explain"
    | "s010-chapters-explain-details"
    | "s011-video-clips"
    // Habit tracker — read views
    | "s012-habit-daily-today"
    | "s013-habit-weekly-tracker"
    | "s014-habit-monthly-tracker"
    | "s015-habit-monthly-summary"
    // Habit tracker — authoring & check-in
    | "s016-habit-add-activity"
    | "s020-create-activity"
    | "s021-create-nutrition"
    | "s022-medecine-checkin"
    | "s023-nutrition-checkin"
    | "s024-create-physical-activity-menu"
    | "s025-create-physical-activity-emotion-menu"
    | "s026-create-physical-activity-psunlight-menu"
    | "s027-create-physical-activity-usymptoms-menu"
    | "s028-create-physical-activity-explore-emotion-menu"
    | "s029-create-physical-activity"
    | "s030-create-physical-activity-pinfection-menu"
    // Minigame quiz flow
    | "s017-minigame-quiz"
    | "s018-minigame-quiz-feedback"
    | "s019-minigame-score"
    | "s031-minigame-quiz-summary"
    | "s999-profile";

/**
 * The four destinations exposed on the persistent icon rail. Excludes
 * landing/login/register because the rail only renders inside authenticated
 * shells, and excludes deep sub-screens that share an active key with their
 * parent (e.g. s012 maps onto rail key "habit").
 */
export type NavRailKey = "home" | "chapters" | "habit" | "minigame";

/* ────────────────────────────────────────────────────────────────────────
 * App routes (Next.js paths)
 *
 * Where a wireframe `data-navigate="<file>.html"` value falls under more than
 * one URL (e.g. s029 prefilled by name), the canonical route is listed once
 * here and the implementer composes the query string at navigation time.
 * ──────────────────────────────────────────────────────────────────────── */

export type AppRoute =
    // Public
    | "/"
    | "/login"
    | "/register"
    // Authed top-level
    | "/home"
    | "/chapters"
    | "/habit"
    | "/minigame"
    | "/profile"
    // Chapters / story
    | "/chapters/menu"
    | `/chapters/${number}/explain`
    | `/chapters/${number}/explain/${number}`
    | "/video-clips"
    // Habit — read views
    | "/habit/today"
    | "/habit/weekly"
    | "/habit/monthly"
    | "/habit/summary"
    // Habit — authoring (category picker → typed sub-flow)
    | "/habit/add"
    | "/habit/add/medicine"
    | "/habit/add/nutrition"
    | "/habit/add/physical"
    | "/habit/add/physical/emotion"
    | "/habit/add/physical/sunlight"
    | "/habit/add/physical/infection"
    | "/habit/add/physical/symptoms"
    | "/habit/add/physical/emotion/explore"
    | "/habit/add/physical/form"
    // Habit — check-in
    | "/habit/checkin/medicine"
    | "/habit/checkin/nutrition"
    // Minigame — quiz wizard
    | "/minigame/quiz"
    | "/minigame/quiz/feedback"
    | "/minigame/quiz/score"
    | "/minigame/quiz/summary";

/**
 * View-model for a single rail item. Order in the rendered rail must match
 * the order declared in `RAIL_ITEMS` below to preserve the wireframe layout.
 */
export interface NavRailItem {
    key: NavRailKey;
    /** The "home" wireframe of this rail destination. */
    screenId: ScreenId;
    /** Top-level Next.js route. */
    href: AppRoute;
    /** Filename under `assets/icons/` in the wireframe. */
    icon: "home.svg" | "book.svg" | "edit.svg" | "game.svg";
    /** Thai aria-label, taken from the wireframe. */
    ariaLabel: string;
    /**
     * Hex accent colour applied to the `.is-active::before` pseudo-element on
     * the wireframe. The rail component should expose this as a CSS custom
     * property `--rail-accent` on the active anchor only.
     */
    activeAccent: `#${string}`;
}

/**
 * Canonical rail item list. Order, copy, and accents match the wireframes
 * exactly — do not reorder without updating every screen.
 */
export const RAIL_ITEMS: readonly NavRailItem[] = [
    {
        key: "home",
        screenId: "s004-home",
        href: "/home",
        icon: "home.svg",
        ariaLabel: "ไปหน้าแรก",
        activeAccent: "#ff3131",
    },
    {
        key: "chapters",
        screenId: "s005-chapters",
        href: "/chapters",
        icon: "book.svg",
        ariaLabel: "ไปหน้าอ่านเนื้อเรื่อง",
        activeAccent: "#08c65a",
    },
    {
        key: "habit",
        screenId: "s006-habit-tracker",
        href: "/habit",
        icon: "edit.svg",
        ariaLabel: "ไปหน้า habit tracker",
        activeAccent: "#6a24f2",
    },
    {
        key: "minigame",
        screenId: "s007-minigame",
        href: "/minigame",
        icon: "game.svg",
        ariaLabel: "ไปหน้ามินิเกม",
        activeAccent: "#c771e8",
    },
] as const;

/**
 * Mapping from a deep ScreenId to the rail key it should activate.
 * The rail component reads this to decide which item gets the accent
 * regardless of how deep the user has navigated.
 */
export const SCREEN_TO_RAIL: Readonly<Record<ScreenId, NavRailKey | null>> = {
    "s001-landing": null,
    "s002-login": null,
    "s003-register": null,

    "s004-home": "home",

    "s005-chapters": "chapters",
    "s008-chapters-menu": "chapters",
    "s009-chapters-explain": "chapters",
    "s010-chapters-explain-details": "chapters",
    "s011-video-clips": "chapters",

    "s006-habit-tracker": "habit",
    "s012-habit-daily-today": "habit",
    "s013-habit-weekly-tracker": "habit",
    "s014-habit-monthly-tracker": "habit",
    "s015-habit-monthly-summary": "habit",
    "s016-habit-add-activity": "habit",
    "s020-create-activity": "habit",
    "s021-create-nutrition": "habit",
    "s022-medecine-checkin": "habit",
    "s023-nutrition-checkin": "habit",
    "s024-create-physical-activity-menu": "habit",
    "s025-create-physical-activity-emotion-menu": "habit",
    "s026-create-physical-activity-psunlight-menu": "habit",
    "s027-create-physical-activity-usymptoms-menu": "habit",
    "s028-create-physical-activity-explore-emotion-menu": "habit",
    "s029-create-physical-activity": "habit",
    "s030-create-physical-activity-pinfection-menu": "habit",

    "s007-minigame": "minigame",
    "s017-minigame-quiz": "minigame",
    "s018-minigame-quiz-feedback": "minigame",
    "s019-minigame-score": "minigame",
    "s031-minigame-quiz-summary": "minigame",
    "s999-profile": "home",
} as const;
