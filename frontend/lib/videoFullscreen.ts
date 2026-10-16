/**
 * Fullscreen helpers for the native <video> player. Needed because iPhone
 * Safari hides the controls' own expand button on `playsinline` videos and
 * does not implement Element.requestFullscreen at all — there the only way
 * to fill the screen is the native player's webkitEnterFullscreen(). Some
 * in-app WebViews define the standard API but reject it at call time, so a
 * rejection falls through to the iOS fallback before giving up.
 */

type WebKitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** Enter fullscreen, preferring the standard element API. False when no mechanism exists. */
export async function enterVideoFullscreen(video: HTMLVideoElement): Promise<boolean> {
  if (typeof video.requestFullscreen === "function") {
    try {
      await video.requestFullscreen();
      return true;
    } catch {
      // fall through to the iOS-only path
    }
  }
  const webkitVideo = video as WebKitVideo;
  if (typeof webkitVideo.webkitEnterFullscreen === "function") {
    webkitVideo.webkitEnterFullscreen();
    return true;
  }
  return false;
}

/** Exit fullscreen when one is active, otherwise enter it. False after exiting. */
export async function toggleVideoFullscreen(video: HTMLVideoElement): Promise<boolean> {
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {});
    return false;
  }
  return enterVideoFullscreen(video);
}
