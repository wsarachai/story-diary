import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  BGM_TRACKS,
  SOUND_EFFECTS,
  SCENE_MUSIC_SILENCE,
  findBgmTrack,
  findSoundEffect,
  resolveSceneMusic,
} from "@/lib/sounds";

describe("sound registry", () => {
  it("points every entry at an MP3 that exists in public/", () => {
    for (const s of [...BGM_TRACKS, ...SOUND_EFFECTS]) {
      expect(s.url.endsWith(".mp3"), s.url).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), "public", s.url)), s.url).toBe(true);
    }
  });

  it("ships the agreed starter set (4 loops, 7 effects) with unique URLs", () => {
    expect(BGM_TRACKS).toHaveLength(4);
    expect(SOUND_EFFECTS).toHaveLength(7);
    const urls = [...BGM_TRACKS, ...SOUND_EFFECTS].map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("looks entries up by URL", () => {
    expect(findBgmTrack(BGM_TRACKS[0].url)?.label).toBe(BGM_TRACKS[0].label);
    expect(findSoundEffect(SOUND_EFFECTS[2].url)?.label).toBe(SOUND_EFFECTS[2].label);
    expect(findBgmTrack(SCENE_MUSIC_SILENCE)).toBeUndefined();
    expect(findSoundEffect(undefined)).toBeUndefined();
  });
});

describe("resolveSceneMusic", () => {
  const chapter = "/sounds/bgm/village-calm.mp3";
  const scene = "/sounds/bgm/castle-tension.mp3";

  it("uses the scene's own track over the chapter's", () => {
    expect(resolveSceneMusic(scene, chapter)).toBe(scene);
  });

  it("inherits the chapter track when the scene has none", () => {
    expect(resolveSceneMusic(undefined, chapter)).toBe(chapter);
    expect(resolveSceneMusic("", chapter)).toBe(chapter);
  });

  it("is silent when the scene opts out, even if the chapter has music", () => {
    expect(resolveSceneMusic(SCENE_MUSIC_SILENCE, chapter)).toBeNull();
  });

  it("is silent when neither sets music", () => {
    expect(resolveSceneMusic(undefined, undefined)).toBeNull();
  });
});
