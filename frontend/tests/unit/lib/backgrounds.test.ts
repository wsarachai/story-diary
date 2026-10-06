import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { CHAPTER_BACKGROUNDS, findChapterBackground } from "@/lib/backgrounds";

describe("CHAPTER_BACKGROUNDS", () => {
  it("points every entry at a file that exists in public/", () => {
    for (const bg of CHAPTER_BACKGROUNDS) {
      expect(fs.existsSync(path.join(process.cwd(), "public", bg.url)), bg.url).toBe(true);
    }
  });

  it("has unique URLs", () => {
    const urls = CHAPTER_BACKGROUNDS.map((b) => b.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("finds entries by URL and ignores unknown or empty values", () => {
    expect(findChapterBackground(CHAPTER_BACKGROUNDS[1].url)?.label).toBe("หมู่บ้าน");
    expect(findChapterBackground("/images/other.png")).toBeUndefined();
    expect(findChapterBackground("")).toBeUndefined();
  });
});
