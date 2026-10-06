/**
 * Shared contracts for the registration protagonist ("ตัวละครหลัก").
 *
 * Actor scenes with actorKind "main" resolve their speaker name and figure
 * from here at render time — nothing per-scene is stored in the database, so
 * swapping the art or name updates every chapter at once.
 */
import type { Gender } from "@/types/auth";

/** Fixed speaker name shown for main-actor scenes. */
export const MAIN_ACTOR_SPEAKER_NAME = "ผู้กล้า";

/**
 * Registration character art per chosen gender. Both genders currently share
 * one illustration; drop a female variant here when the art exists.
 */
export const MAIN_ACTOR_IMAGE_URLS: Record<Gender, string> = {
  male: "/images/register-character-normal-466x760.png",
  female: "/images/register-character-normal-466x760.png",
};

/** Figure art for main-actor scenes, falling back to the female set. */
export function mainActorImageUrl(gender: Gender | undefined): string {
  return MAIN_ACTOR_IMAGE_URLS[gender ?? "female"];
}
