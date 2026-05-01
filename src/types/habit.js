"use strict";
/**
 * Habit Tracker domain contracts for Story Diary.
 *
 * Source wireframes:
 *   - docz/wireframes/s006-habit-tracker.html        (overview: daily / weekly / monthly cards)
 *   - docz/wireframes/s012-habit-daily-today.html    (today list)
 *   - docz/wireframes/s013-habit-weekly-tracker.html (weekly grid)
 *   - docz/wireframes/s014-habit-monthly-tracker.html(31-day grid)
 *   - docz/wireframes/s015-habit-monthly-summary.html(goals + results)
 *   - docz/wireframes/s016-habit-add-activity.html   (3-category picker)
 *   - docz/wireframes/s020-create-activity.html      (medicine form)
 *   - docz/wireframes/s021-create-nutrition.html     (nutrition picklist)
 *   - docz/wireframes/s022-medecine-checkin.html     (medicine check-in + side effects)
 *   - docz/wireframes/s023-nutrition-checkin.html    (3-meal entry form)
 *   - docz/wireframes/s024-create-physical-activity-menu.html
 *   - docz/wireframes/s025-create-physical-activity-emotion-menu.html
 *   - docz/wireframes/s026-create-physical-activity-psunlight-menu.html
 *   - docz/wireframes/s027-create-physical-activity-usymptoms-menu.html
 *   - docz/wireframes/s028-create-physical-activity-explore-emotion-menu.html
 *   - docz/wireframes/s029-create-physical-activity.html
 *   - docz/wireframes/s030-create-physical-activity-pinfection-menu.html
 *
 * Cross-agent contract: shared by frontend (Redux + screens), backend, and tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUTRITION_PRESETS = void 0;
/** Display map for the s021 picklist. The wireframe is the source of truth. */
exports.NUTRITION_PRESETS = {
    nutrition_5_groups: "รับประทานอาหารครบ 5 หมู่",
    nutrition_clean_cooked: "รับประทานอาหารปรุงสุก สะอาด",
    nutrition_mild_taste: "รับประทานอาหารรสไม่จัด",
    nutrition_order_low_seasoning: "ซื้ออาหารตามสั่งจากร้าน บอกแม่ค้าปรุงรสอ่อน",
};
//# sourceMappingURL=habit.js.map