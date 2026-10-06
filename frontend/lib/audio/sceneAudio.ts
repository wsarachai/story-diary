/**
 * Scene sound engine — a module-level singleton so music keeps playing while
 * the reader moves between scene routes (each scene is its own page, which
 * remounts on navigation).
 *
 * Levels go through Web Audio gain nodes rather than `HTMLAudioElement.volume`
 * because iOS Safari ignores element volume — fades, ducking and mute would
 * otherwise do nothing on iPhones/iPads.
 *
 *   track <audio> ─► per-track gain (cross-fade) ─┐
 *                                                  ├─► music bus (level × duck) ─┐
 *   effect <audio> ─► effect bus ─────────────────────────────────────────────────┴─► master (mute) ─► out
 *
 * Browsers refuse to start audio before a user gesture; when that happens the
 * engine reports `blocked` and retries on the next pointer/key press.
 */

const MUSIC_LEVEL = 0.4;
const EFFECT_LEVEL = 0.8;
/** Music level multiplier while an effect plays. */
const DUCK_LEVEL = 0.6;
const CROSSFADE_S = 1.0;
const STOP_FADE_S = 0.5;
const MUTE_STORAGE_KEY = "story-diary:sound-muted";

export interface SceneAudioState {
  muted: boolean;
  /** Audio is wanted but the browser blocked autoplay until a gesture. */
  blocked: boolean;
}

interface Voice {
  el: HTMLAudioElement;
  gain: GainNode;
}

type Listener = () => void;

function readStoredMute(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

class SceneAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectBus: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private effectEls = new Map<string, HTMLAudioElement>();
  private preloaded = new Map<string, HTMLAudioElement>();

  private musicUrl: string | null = null;
  private currentEffect: HTMLAudioElement | null = null;
  private wantsAudio = false;
  private pausedByVisibility = false;

  private state: SceneAudioState = { muted: false, blocked: false };
  private listeners = new Set<Listener>();
  private initialized = false;

  // ── state for React (useSyncExternalStore) ──
  subscribe = (fn: Listener) => {
    this.init();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): SceneAudioState => this.state;

  private static readonly serverState: SceneAudioState = { muted: false, blocked: false };
  getServerState = (): SceneAudioState => SceneAudio.serverState;

  private setState(patch: Partial<SceneAudioState>) {
    const next = { ...this.state, ...patch };
    if (next.muted === this.state.muted && next.blocked === this.state.blocked) return;
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  /** One-time browser wiring: stored preference, tab visibility, gesture unlock. */
  private init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.state = { muted: readStoredMute(), blocked: false };
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    const unlock = () => void this.unlock();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  private ensureGraph(): AudioContext | null {
    if (typeof window === "undefined") return null;
    this.init();
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    this.master = ctx.createGain();
    this.master.gain.value = this.state.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = MUSIC_LEVEL;
    this.musicBus.connect(this.master);
    this.effectBus = ctx.createGain();
    this.effectBus.gain.value = EFFECT_LEVEL;
    this.effectBus.connect(this.master);
    this.ctx = ctx;
    return ctx;
  }

  private ramp(param: AudioParam, to: number, seconds: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(to, now + seconds);
  }

  /** Start (or resume) playback; flags `blocked` when the browser refuses. */
  private async tryPlay(el: HTMLAudioElement): Promise<boolean> {
    const ctx = this.ctx;
    try {
      if (ctx && ctx.state !== "running") await ctx.resume();
      await el.play();
      if (ctx && ctx.state !== "running") throw new Error("context suspended");
      this.setState({ blocked: false });
      return true;
    } catch {
      this.setState({ blocked: true });
      return false;
    }
  }

  private voiceFor(url: string): Voice | null {
    const ctx = this.ensureGraph();
    if (!ctx || !this.musicBus) return null;
    let voice = this.voices.get(url);
    if (!voice) {
      const el = new Audio(url);
      el.loop = true;
      el.preload = "auto";
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.musicBus);
      voice = { el, gain };
      this.voices.set(url, voice);
    }
    return voice;
  }

  /** Play `url` as the background loop (null = silence), cross-fading tracks. */
  setMusic(url: string | null) {
    this.wantsAudio = true;
    if (url === this.musicUrl) {
      const voice = url ? this.voices.get(url) : null;
      if (voice && voice.el.paused && !this.pausedByVisibility) void this.tryPlay(voice.el);
      return;
    }
    const previous = this.musicUrl ? this.voices.get(this.musicUrl) : null;
    this.musicUrl = url;
    if (previous) this.fadeOutAndPause(previous, CROSSFADE_S);
    if (!url) return;
    const voice = this.voiceFor(url);
    if (!voice) return;
    voice.el.currentTime = 0;
    this.ramp(voice.gain.gain, 1, CROSSFADE_S);
    if (!this.pausedByVisibility) void this.tryPlay(voice.el);
  }

  private fadeOutAndPause(voice: Voice, seconds: number) {
    this.ramp(voice.gain.gain, 0, seconds);
    const el = voice.el;
    window.setTimeout(() => {
      // Only pause if it hasn't been re-selected meanwhile.
      if (this.musicUrl === null || this.voices.get(this.musicUrl) !== voice) el.pause();
    }, seconds * 1000 + 50);
  }

  /** Play a one-shot effect, replacing any effect still playing; ducks music. */
  playEffect(url: string | null) {
    this.wantsAudio = true;
    if (this.currentEffect) {
      this.currentEffect.pause();
      this.currentEffect.currentTime = 0;
      this.currentEffect = null;
      this.unduck();
    }
    if (!url || this.pausedByVisibility) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.effectBus) return;
    let el = this.effectEls.get(url);
    if (!el) {
      el = this.preloaded.get(url) ?? new Audio(url);
      this.preloaded.delete(url);
      el.preload = "auto";
      ctx.createMediaElementSource(el).connect(this.effectBus);
      this.effectEls.set(url, el);
      el.addEventListener("ended", () => {
        if (this.currentEffect === el) {
          this.currentEffect = null;
          this.unduck();
        }
      });
    }
    el.currentTime = 0;
    this.currentEffect = el;
    if (this.musicBus) this.ramp(this.musicBus.gain, MUSIC_LEVEL * DUCK_LEVEL, 0.15);
    void this.tryPlay(el);
  }

  private unduck() {
    if (this.musicBus) this.ramp(this.musicBus.gain, MUSIC_LEVEL, 0.35);
  }

  /** Warm the cache for an upcoming scene's audio so it starts on time. */
  preload(url: string | null | undefined) {
    if (!url || typeof window === "undefined") return;
    if (this.voices.has(url) || this.effectEls.has(url) || this.preloaded.has(url)) return;
    const el = new Audio();
    el.preload = "auto";
    el.src = url;
    this.preloaded.set(url, el);
  }

  /** Leave the story: fade the music out; a playing effect may finish. */
  stopMusic(fadeSeconds = STOP_FADE_S) {
    this.wantsAudio = false;
    const voice = this.musicUrl ? this.voices.get(this.musicUrl) : null;
    this.musicUrl = null;
    if (voice) this.fadeOutAndPause(voice, fadeSeconds);
    if (this.musicBus) this.ramp(this.musicBus.gain, MUSIC_LEVEL, 0.05);
    this.setState({ blocked: false });
  }

  setMuted(muted: boolean) {
    this.init();
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // Private mode / blocked storage: the toggle still works for this visit.
    }
    if (this.master) this.ramp(this.master.gain, muted ? 0 : 1, 0.2);
    this.setState({ muted });
    // Unmuting is itself a gesture — use it to start anything that was blocked.
    if (!muted) void this.unlock();
  }

  toggleMuted() {
    this.setMuted(!this.state.muted);
  }

  /** Retry playback after a user gesture (autoplay was blocked). */
  private unlock = async () => {
    if (!this.wantsAudio || !this.state.blocked) return;
    const voice = this.musicUrl ? this.voices.get(this.musicUrl) : null;
    if (voice) await this.tryPlay(voice.el);
    else if (this.ctx) {
      try {
        await this.ctx.resume();
        this.setState({ blocked: this.ctx.state !== "running" });
      } catch {
        // stays blocked
      }
    }
  };

  /** Pause while the tab is hidden; resume on return. */
  private onVisibilityChange = () => {
    const voice = this.musicUrl ? this.voices.get(this.musicUrl) : null;
    if (document.hidden) {
      if (!this.wantsAudio) return;
      this.pausedByVisibility = true;
      voice?.el.pause();
      this.currentEffect?.pause();
    } else if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      if (voice && this.wantsAudio) void this.tryPlay(voice.el);
    }
  };
}

export const sceneAudio = new SceneAudio();
