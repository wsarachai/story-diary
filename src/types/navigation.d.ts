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
export type ScreenId = "s001-landing" | "s002-login" | "s003-register" | "s004-home" | "s005-chapters" | "s006-habit-tracker" | "s007-minigame" | "s008-chapters-menu" | "s009-chapters-explain" | "s010-chapters-explain-details" | "s011-video-clips" | "s012-habit-daily-today" | "s013-habit-weekly-tracker" | "s014-habit-monthly-tracker" | "s015-habit-monthly-summary" | "s016-habit-add-activity" | "s020-create-activity" | "s021-create-nutrition" | "s022-medecine-checkin" | "s023-nutrition-checkin" | "s024-create-physical-activity-menu" | "s025-create-physical-activity-emotion-menu" | "s026-create-physical-activity-psunlight-menu" | "s027-create-physical-activity-usymptoms-menu" | "s028-create-physical-activity-explore-emotion-menu" | "s029-create-physical-activity" | "s030-create-physical-activity-pinfection-menu" | "s017-minigame-quiz" | "s018-minigame-quiz-feedback" | "s019-minigame-score" | "s031-minigame-quiz-summary";
/**
 * The four destinations exposed on the persistent icon rail. Excludes
 * landing/login/register because the rail only renders inside authenticated
 * shells, and excludes deep sub-screens that share an active key with their
 * parent (e.g. s012 maps onto rail key "habit").
 */
export type NavRailKey = "home" | "chapters" | "habit" | "minigame";
export type AppRoute = "/" | "/login" | "/register" | "/home" | "/chapters" | "/habit" | "/minigame" | "/chapters/menu" | `/chapters/${number}/explain` | `/chapters/${number}/explain/${number}` | "/video-clips" | "/habit/today" | "/habit/weekly" | "/habit/monthly" | "/habit/summary" | "/habit/add" | "/habit/add/medicine" | "/habit/add/nutrition" | "/habit/add/physical" | "/habit/add/physical/emotion" | "/habit/add/physical/sunlight" | "/habit/add/physical/infection" | "/habit/add/physical/symptoms" | "/habit/add/physical/emotion/explore" | "/habit/add/physical/form" | "/habit/checkin/medicine" | "/habit/checkin/nutrition" | "/minigame/quiz" | "/minigame/quiz/feedback" | "/minigame/quiz/score" | "/minigame/quiz/summary";
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
export declare const RAIL_ITEMS: readonly NavRailItem[];
/**
 * Mapping from a deep ScreenId to the rail key it should activate.
 * The rail component reads this to decide which item gets the accent
 * regardless of how deep the user has navigated.
 */
export declare const SCREEN_TO_RAIL: Readonly<Record<ScreenId, NavRailKey | null>>;
//# sourceMappingURL=navigation.d.ts.map