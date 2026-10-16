import { describe, it, expect, vi, afterEach } from "vitest";
import { enterVideoFullscreen, toggleVideoFullscreen } from "@/lib/videoFullscreen";

/** Document with the (jsdom-missing) Fullscreen API made assignable for stubs. */
type StubbedDoc = Omit<Document, "fullscreenElement" | "exitFullscreen"> & {
  fullscreenElement?: unknown;
  exitFullscreen?: unknown;
};

function fakeVideo(mechanisms: {
  requestFullscreen?: () => Promise<void>;
  webkitEnterFullscreen?: () => void;
} = {}) {
  return mechanisms as unknown as HTMLVideoElement;
}

afterEach(() => {
  const doc = document as unknown as StubbedDoc;
  delete doc.fullscreenElement;
  delete doc.exitFullscreen;
});

describe("enterVideoFullscreen", () => {
  it("uses the standard element API when available", async () => {
    const requestFullscreen = vi.fn(async () => {});
    await expect(enterVideoFullscreen(fakeVideo({ requestFullscreen }))).resolves.toBe(true);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("falls back to the iOS native player when the standard API rejects (in-app WebViews)", async () => {
    const requestFullscreen = vi.fn(async () => {
      throw new Error("NotAllowedError");
    });
    const webkitEnterFullscreen = vi.fn();
    const video = fakeVideo({ requestFullscreen, webkitEnterFullscreen });
    await expect(enterVideoFullscreen(video)).resolves.toBe(true);
    expect(webkitEnterFullscreen).toHaveBeenCalledTimes(1);
  });

  it("uses only the iOS native player when the standard API is missing (iPhone Safari)", async () => {
    const webkitEnterFullscreen = vi.fn();
    await expect(enterVideoFullscreen(fakeVideo({ webkitEnterFullscreen }))).resolves.toBe(true);
    expect(webkitEnterFullscreen).toHaveBeenCalledTimes(1);
  });

  it("reports false when no fullscreen mechanism exists", async () => {
    await expect(enterVideoFullscreen(fakeVideo())).resolves.toBe(false);
  });
});

describe("toggleVideoFullscreen", () => {
  it("exits first when something is already fullscreen", async () => {
    const doc = document as unknown as StubbedDoc;
    doc.fullscreenElement = document.body;
    const exitFullscreen = vi.fn(async () => {});
    doc.exitFullscreen = exitFullscreen;
    const requestFullscreen = vi.fn(async () => {});
    await expect(toggleVideoFullscreen(fakeVideo({ requestFullscreen }))).resolves.toBe(false);
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("enters when nothing is fullscreen", async () => {
    const requestFullscreen = vi.fn(async () => {});
    await expect(toggleVideoFullscreen(fakeVideo({ requestFullscreen }))).resolves.toBe(true);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
