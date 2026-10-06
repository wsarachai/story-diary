import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Minimal Web Audio fakes: gains record the last ramp target. */
class FakeParam {
  value = 1;
  target: number | null = null;
  cancelScheduledValues() {}
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.target = v;
  }
}
class FakeGain {
  gain = new FakeParam();
  connect() {}
}
class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createGain() {
    return new FakeGain();
  }
  createMediaElementSource() {
    return { connect() {} };
  }
  async resume() {}
}

let playBehavior: "ok" | "blocked" = "ok";
const created: FakeAudio[] = [];
class FakeAudio {
  src: string;
  loop = false;
  preload = "";
  paused = true;
  currentTime = 0;
  plays = 0;
  private listeners: Record<string, (() => void)[]> = {};
  constructor(src = "") {
    this.src = src;
    created.push(this);
  }
  async play() {
    if (playBehavior === "blocked") throw new DOMException("blocked", "NotAllowedError");
    this.plays++;
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  addEventListener(type: string, fn: () => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  emit(type: string) {
    this.listeners[type]?.forEach((fn) => fn());
  }
}

const A = "/sounds/bgm/village-calm.mp3";
const B = "/sounds/bgm/castle-tension.mp3";
const FX = "/sounds/sfx/chime.mp3";

async function freshEngine() {
  vi.resetModules();
  const mod = await import("@/lib/audio/sceneAudio");
  return mod.sceneAudio;
}

/** Let pending play()/resume() promises settle (timers are faked, so no setTimeout). */
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const audioFor = (url: string) => created.filter((a) => a.src === url);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  playBehavior = "ok";
  created.length = 0;
  localStorage.clear();
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("sceneAudio", () => {
  it("keeps the same track playing across scenes instead of restarting it", async () => {
    const audio = await freshEngine();
    audio.setMusic(A);
    await flush();
    audio.setMusic(A);
    await flush();
    expect(audioFor(A)).toHaveLength(1);
    expect(audioFor(A)[0].plays).toBe(1);
  });

  it("cross-fades to a new track and pauses the old one after the fade", async () => {
    const audio = await freshEngine();
    audio.setMusic(A);
    await flush();
    audio.setMusic(B);
    await flush();
    expect(audioFor(B)[0].paused).toBe(false);
    expect(audioFor(A)[0].paused).toBe(false); // still fading out
    vi.advanceTimersByTime(1100);
    expect(audioFor(A)[0].paused).toBe(true);
  });

  it("silence (null) fades the current track out", async () => {
    const audio = await freshEngine();
    audio.setMusic(A);
    await flush();
    audio.setMusic(null);
    vi.advanceTimersByTime(1100);
    expect(audioFor(A)[0].paused).toBe(true);
  });

  it("stops a still-playing effect when the next scene starts", async () => {
    const audio = await freshEngine();
    audio.playEffect(FX);
    await flush();
    const fx = audioFor(FX)[0];
    expect(fx.paused).toBe(false);
    audio.playEffect(null);
    expect(fx.paused).toBe(true);
  });

  it("replays the effect from the start on revisit, reusing the element", async () => {
    const audio = await freshEngine();
    audio.playEffect(FX);
    await flush();
    audioFor(FX)[0].emit("ended");
    audio.playEffect(FX);
    await flush();
    expect(audioFor(FX)).toHaveLength(1);
    expect(audioFor(FX)[0].plays).toBe(2);
    expect(audioFor(FX)[0].currentTime).toBe(0);
  });

  it("remembers mute on this device and restores it on the next load", async () => {
    let audio = await freshEngine();
    audio.setMuted(true);
    expect(audio.getState().muted).toBe(true);
    expect(localStorage.getItem("story-diary:sound-muted")).toBe("1");
    audio = await freshEngine();
    const unsubscribe = audio.subscribe(() => {});
    expect(audio.getState().muted).toBe(true);
    unsubscribe();
  });

  it("reports blocked autoplay and recovers on the next user gesture", async () => {
    const audio = await freshEngine();
    const unsubscribe = audio.subscribe(() => {});
    playBehavior = "blocked";
    audio.setMusic(A);
    await flush();
    expect(audio.getState().blocked).toBe(true);

    playBehavior = "ok";
    window.dispatchEvent(new Event("pointerdown"));
    await flush();
    await flush();
    expect(audio.getState().blocked).toBe(false);
    expect(audioFor(A)[0].paused).toBe(false);
    unsubscribe();
  });

  it("stopMusic fades out and clears the blocked flag", async () => {
    const audio = await freshEngine();
    audio.setMusic(A);
    await flush();
    audio.stopMusic();
    vi.advanceTimersByTime(600);
    expect(audioFor(A)[0].paused).toBe(true);
    expect(audio.getState().blocked).toBe(false);
  });
});
