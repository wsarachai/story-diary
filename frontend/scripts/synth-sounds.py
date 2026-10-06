"""Synthesize Story Diary's starter BGM loops and SFX, encode to MP3.

Usage: python synth_sounds.py <out_dir>
Writes <out_dir>/bgm/*.mp3 (stereo, 96 kbps, seamless loops) and
<out_dir>/sfx/*.mp3 (mono, 64 kbps). Deterministic (fixed RNG seeds).
"""
import os
import sys

import lameenc
import numpy as np
from scipy import signal

SR = 44100


# ── building blocks ──────────────────────────────────────────────────────────

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def note_hz(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3,
             "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + (octave - 4) * 12) / 12)


def adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    sustain = max(n - a - d - r, 0)
    env = np.concatenate([
        np.linspace(0, 1, a, endpoint=False),
        np.linspace(1, s, d, endpoint=False),
        np.full(sustain, s),
        np.linspace(s, 0, r),
    ])
    return np.pad(env, (0, max(n - len(env), 0)))[:n]


def lowpass(x, cutoff, order=4):
    b, a = signal.butter(order, cutoff / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def highpass(x, cutoff, order=2):
    b, a = signal.butter(order, cutoff / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def reverb(x, seconds=2.5, mix=0.3, seed=0):
    """Convolution with exponentially-decaying noise — a cheap hall."""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lowpass(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return (1 - mix) * x + mix * wet


def pad_voice(freq, dur, detune=0.004, bright=1800):
    """Warm pad: detuned saws, low-passed, slow attack/release."""
    t = t_axis(dur)
    out = np.zeros_like(t)
    for d in (-detune, 0, detune):
        f = freq * (1 + d)
        out += signal.sawtooth(2 * np.pi * f * t + np.random.rand() * 6.28)
    out = lowpass(out / 3, bright)
    return out * adsr(len(t), min(1.2, dur / 3), 0.5, 0.8, min(1.5, dur / 3))


def bell(freq, dur, decay=2.5, partials=((1, 1.0), (2.76, 0.45), (5.4, 0.25), (8.93, 0.1))):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for ratio, amp in partials:
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * decay * ratio ** 0.5)
    attack = np.minimum(t / 0.004, 1)
    return out * attack


def pluck(freq, dur, decay=3.0):
    t = t_axis(dur)
    tone = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t) + 0.12 * np.sin(2 * np.pi * 3 * freq * t)
    return tone * np.exp(-t * decay) * np.minimum(t / 0.006, 1)


def place(buf, clip, at_seconds, gain=1.0):
    i = int(at_seconds * SR)
    end = min(len(buf), i + len(clip))
    buf[i:end] += gain * clip[: end - i]


def make_loop(render, loop_seconds, xfade=3.0):
    """Render loop+xfade seconds, then fold the tail onto the head so the
    file loops seamlessly (equal-power crossfade)."""
    full = render(loop_seconds + xfade)
    n, f = int(loop_seconds * SR), int(xfade * SR)
    body = full[..., :n].copy()
    tail = full[..., n : n + f]
    fade_in = np.sin(np.linspace(0, np.pi / 2, f)) ** 2
    body[..., :f] = body[..., :f] * fade_in + tail * (1 - fade_in)
    return body


def stereo(left, right=None):
    return np.stack([left, left if right is None else right])


def widen(mono, delay_ms=12):
    d = int(delay_ms / 1000 * SR)
    return stereo(mono, np.concatenate([np.zeros(d), mono[:-d]]))


# ── BGM ──────────────────────────────────────────────────────────────────────

def bgm_village_calm(dur):
    """Warm major pad (Cmaj7–Am7–Fmaj7–G6) with a gentle pentatonic pluck."""
    np.random.seed(1)
    rng = np.random.default_rng(1)
    chords = [["C3", "G3", "B3", "E4"], ["A2", "E3", "G3", "C4"], ["F2", "C3", "E3", "A3"], ["G2", "D3", "E3", "B3"]]
    beat = 0.75  # 80 bpm
    bar = beat * 4 * 1.5  # 6 beats per chord
    n = int(dur * SR)
    pad = np.zeros(n)
    k = 0
    while k * bar < dur:
        for name in chords[k % 4]:
            place(pad, pad_voice(note_hz(name), bar + 1.2, bright=1500), k * bar, 0.16)
        k += 1
    mel = np.zeros(n)
    scale = ["C5", "D5", "E5", "G5", "A5", "C6"]
    tpos, idx = 0.0, 2
    while tpos < dur:
        idx = int(np.clip(idx + rng.integers(-2, 3), 0, len(scale) - 1))
        if rng.random() > 0.25:
            place(mel, pluck(note_hz(scale[idx]), 2.0, decay=2.2), tpos, 0.22)
        tpos += beat * rng.choice([1, 1, 2, 1.5])
    bass = np.zeros(n)
    for k2 in range(int(dur / bar) + 1):
        root = note_hz(chords[k2 % 4][0]) / 2
        for b in range(0, 6, 3):
            place(bass, pluck(root, beat * 3, decay=1.2), k2 * bar + b * beat, 0.35)
    mix = pad + reverb(mel, 2.2, 0.35, 2) + lowpass(bass, 400)
    return widen(reverb(mix, 2.0, 0.25, 3), 9)


def bgm_mist_mystery(dur):
    """D-minor drone, breathing filtered noise, sparse distant bells."""
    rng = np.random.default_rng(2)
    t = t_axis(dur)
    drone = 0.0
    for name, amp in (("D2", 0.5), ("A2", 0.32), ("D3", 0.18), ("F3", 0.08)):
        f = note_hz(name)
        drone = drone + amp * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 1.003 * t))
    drone *= 0.55 + 0.45 * np.sin(2 * np.pi * t / 9.0) ** 2
    noise = rng.standard_normal(len(t))
    breath = bandpass(noise, 300, 1400) * (0.3 + 0.7 * np.sin(2 * np.pi * t / 6.5) ** 2) * 0.12
    bells = np.zeros(len(t))
    tones = ["D5", "F5", "A5", "E5", "C6", "A4"]
    tpos = 1.5
    while tpos < dur:
        place(bells, bell(note_hz(rng.choice(tones)), 5.0, decay=0.9), tpos, 0.12)
        tpos += rng.uniform(3.5, 6.5)
    left = lowpass(drone, 900) * 0.35 + breath + reverb(bells, 4.0, 0.6, 5)
    right = lowpass(drone, 900) * 0.35 + np.roll(breath, 2205) + reverb(bells, 4.0, 0.6, 6)
    return stereo(reverb(left, 3.0, 0.3, 7), reverb(right, 3.0, 0.3, 8))


def bgm_castle_tension(dur):
    """Low C drone with a minor-second rub, slow heartbeat-like pulse, swells."""
    rng = np.random.default_rng(3)
    t = t_axis(dur)
    drone = sum(
        amp * signal.sawtooth(2 * np.pi * note_hz(n) * t)
        for n, amp in (("C2", 0.5), ("G2", 0.25), ("C#3", 0.1))
    )
    drone = lowpass(drone, 380) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 12) ** 2)
    pulse = np.zeros(len(t))
    hit_t = t_axis(0.5)
    hit = np.sin(2 * np.pi * (55 * hit_t - 40 * hit_t ** 2)) * np.exp(-hit_t * 9)
    beat = 1.0  # 60 bpm
    for k in range(int(dur / beat)):
        place(pulse, hit, k * beat, 0.9 if k % 2 == 0 else 0.55)
    swells = np.zeros(len(t))
    tpos = 2.0
    while tpos < dur:
        name = rng.choice(["D#3", "F#3", "G#3", "B2"])
        place(swells, pad_voice(note_hz(name), 4.0, detune=0.006, bright=900), tpos, 0.2)
        tpos += rng.uniform(5.0, 8.0)
    mix = drone * 0.4 + lowpass(pulse, 200) * 0.6 + reverb(swells, 3.0, 0.45, 9)
    return widen(reverb(mix, 2.5, 0.2, 10), 14)


def bgm_forest_ambience(dur):
    """Gusting wind, leaf rustle and a soft open-fifth pad."""
    rng = np.random.default_rng(4)
    t = t_axis(dur)
    gust = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.3)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 3.1 + 1))

    def wind(seed):
        n = np.random.default_rng(seed).standard_normal(len(t))
        low = lowpass(n, 700) * 0.5
        hi = bandpass(n, 900, 2600) * 0.12
        return (low + hi) * gust

    rustle = np.zeros(len(t))
    tpos = 0.3
    while tpos < dur:
        burst = highpass(rng.standard_normal(int(0.25 * SR)), 2500) * adsr(int(0.25 * SR), 0.03, 0.1, 0.3, 0.1)
        place(rustle, burst, tpos, rng.uniform(0.03, 0.08))
        tpos += rng.uniform(0.6, 2.2)
    pad = np.zeros(len(t))
    for name in ("G2", "D3", "A3"):
        pad += pad_voice(note_hz(name), dur, bright=700) * 0.12
    left = wind(11) * 0.55 + rustle + pad
    right = wind(12) * 0.55 + np.roll(rustle, 3000) + pad
    return stereo(reverb(left, 2.0, 0.2, 13), reverb(right, 2.0, 0.2, 14))


# ── SFX ──────────────────────────────────────────────────────────────────────

def sfx_magic_sparkle():
    rng = np.random.default_rng(21)
    dur = 2.0
    out = np.zeros(int(dur * SR))
    notes = ["C6", "E6", "G6", "B6", "D7", "G7"]
    for i, name in enumerate(notes):
        place(out, bell(note_hz(name), 1.4, decay=3.5), i * 0.07, 0.5)
    for _ in range(40):
        f = rng.uniform(3000, 9000)
        place(out, bell(f, 0.3, decay=14, partials=((1, 1.0),)), rng.uniform(0.0, 1.1), rng.uniform(0.05, 0.15))
    return reverb(out, 2.0, 0.35, 22)


def sfx_wind_whoosh():
    rng = np.random.default_rng(23)
    dur = 1.8
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # Sweep a band-pass upward then down in short blocks.
    block = 1024
    centers = 300 + 1700 * np.sin(np.linspace(0, np.pi, n // block + 1))
    for k, c in enumerate(centers):
        s = k * block
        seg = noise[max(s - 2048, 0) : s + block]
        filt = bandpass(seg, c * 0.6, c * 1.4)[-block:]
        out[s : s + len(filt)] = filt[: n - s]
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return lowpass(out * env, 5000)


def sfx_heartbeat():
    dur = 1.8
    out = np.zeros(int(dur * SR))
    tt = t_axis(0.35)
    thump = np.sin(2 * np.pi * (70 * tt - 55 * tt ** 2)) * np.exp(-tt * 14)
    for start in (0.05, 0.9):
        place(out, thump, start, 1.0)
        place(out, thump, start + 0.24, 0.7)
    return lowpass(out, 250)


def sfx_chime():
    out = bell(note_hz("E6"), 2.0, decay=2.2) + 0.5 * np.pad(bell(note_hz("B6"), 1.85, decay=2.6), (int(0.15 * SR), 0))[: int(2.0 * SR)]
    return reverb(out, 1.8, 0.3, 24)


def sfx_rumble():
    rng = np.random.default_rng(25)
    dur = 2.2
    t = t_axis(dur)
    noise = lowpass(rng.standard_normal(len(t)), 160, order=6)
    sub = np.sin(2 * np.pi * 36 * t) * 0.6
    wobble = 0.7 + 0.3 * np.sin(2 * np.pi * 7 * t)
    env = adsr(len(t), 0.5, 0.3, 0.85, 1.0)
    return (noise * 4 + sub) * wobble * env


def sfx_torch_crackle():
    rng = np.random.default_rng(26)
    dur = 2.4
    n = int(dur * SR)
    bed = lowpass(rng.standard_normal(n), 900) * 0.18
    pops = np.zeros(n)
    for _ in range(55):
        length = int(rng.uniform(0.002, 0.012) * SR)
        click = rng.standard_normal(length) * np.exp(-np.linspace(0, 6, length))
        place(pops, highpass(click, 1200), rng.uniform(0, dur - 0.02), rng.uniform(0.2, 1.0))
    env = adsr(n, 0.15, 0.1, 1.0, 0.4)
    return (bed + pops) * env


def sfx_footsteps():
    rng = np.random.default_rng(27)
    dur = 2.0
    out = np.zeros(int(dur * SR))
    for i in range(4):
        length = int(0.12 * SR)
        tt = np.arange(length) / SR
        scuff = bandpass(rng.standard_normal(length), 250, 3000) * np.exp(-tt * 35)
        heel = np.sin(2 * np.pi * (110 - 200 * tt) * tt) * np.exp(-tt * 40)
        place(out, scuff * 0.8 + heel, 0.1 + i * 0.45 + rng.uniform(-0.02, 0.02), 1.0 if i % 2 == 0 else 0.8)
    return reverb(out, 0.9, 0.3, 28)


# ── output ───────────────────────────────────────────────────────────────────

def normalize(x, peak_db=-1.0, rms_db=None):
    x = x - np.mean(x)
    if rms_db is not None:
        rms = np.sqrt(np.mean(x ** 2))
        x = x * (10 ** (rms_db / 20) / max(rms, 1e-9))
    peak = np.max(np.abs(x))
    limit = 10 ** (peak_db / 20)
    if peak > limit:
        x = x * (limit / peak)
    return x


def soft_compress(x, target_rms_db=-19.0):
    """Lift peaky, quiet effects (e.g. crackle) with tanh saturation until
    their RMS reaches the target; louder effects pass through unchanged."""
    rms_db = lambda y: 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-12)
    if rms_db(x) >= target_rms_db - 2:
        return x
    for drive in np.linspace(1.5, 12, 40):
        y = np.tanh(x * drive)
        if rms_db(y) >= target_rms_db:
            break
    return normalize(y, -1.0)


def fade_edges(x, ms=8):
    n = int(ms / 1000 * SR)
    ramp = np.linspace(0, 1, n)
    x = x.copy()
    x[..., :n] *= ramp
    x[..., -n:] *= ramp[::-1]
    return x


def write_mp3(path, audio, kbps):
    channels = 1 if audio.ndim == 1 else audio.shape[0]
    pcm = np.clip(audio, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    interleaved = pcm if channels == 1 else pcm.T.reshape(-1)
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(SR)
    enc.set_channels(channels)
    enc.set_quality(2)
    data = enc.encode(interleaved.tobytes()) + enc.flush()
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def main(out_dir):
    os.makedirs(os.path.join(out_dir, "bgm"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "sfx"), exist_ok=True)
    bgm = {
        "village-calm": (bgm_village_calm, 36.0),
        "mist-mystery": (bgm_mist_mystery, 40.0),
        "castle-tension": (bgm_castle_tension, 32.0),
        "forest-ambience": (bgm_forest_ambience, 40.0),
    }
    for name, (fn, seconds) in bgm.items():
        audio = make_loop(fn, seconds)
        audio = np.stack([normalize(ch, -1.5, -20) for ch in audio])
        size = write_mp3(os.path.join(out_dir, "bgm", f"{name}.mp3"), audio, 96)
        print(f"bgm/{name}.mp3  {seconds:4.0f}s  {size // 1024} KB")
    sfx = {
        "magic-sparkle": sfx_magic_sparkle,
        "wind-whoosh": sfx_wind_whoosh,
        "heartbeat": sfx_heartbeat,
        "chime": sfx_chime,
        "rumble": sfx_rumble,
        "torch-crackle": sfx_torch_crackle,
        "footsteps": sfx_footsteps,
    }
    for name, fn in sfx.items():
        audio = normalize(fn(), -1.0)
        audio = fade_edges(soft_compress(audio, target_rms_db=-19.0))
        size = write_mp3(os.path.join(out_dir, "sfx", f"{name}.mp3"), audio, 64)
        print(f"sfx/{name}.mp3  {len(audio) / SR:4.1f}s  {size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
