"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCREEN_TO_RAIL = exports.RAIL_ITEMS = void 0;
/**
 * Canonical rail item list. Order, copy, and accents match the wireframes
 * exactly — do not reorder without updating every screen.
 */
exports.RAIL_ITEMS = [
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
];
/**
 * Mapping from a deep ScreenId to the rail key it should activate.
 * The rail component reads this to decide which item gets the accent
 * regardless of how deep the user has navigated.
 */
exports.SCREEN_TO_RAIL = {
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
};
//# sourceMappingURL=navigation.js.map