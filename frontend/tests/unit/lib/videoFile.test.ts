import { describe, it, expect } from "vitest";
import { MAX_VIDEO_BYTES, videoBlobPathname, videoContentType, isPublicBlobUrl } from "@/lib/videoFile";

describe("MAX_VIDEO_BYTES", () => {
  it("is 200 MB", () => {
    expect(MAX_VIDEO_BYTES).toBe(200 * 1024 * 1024);
  });
});

describe("videoBlobPathname", () => {
  it("keeps ASCII names and a supported extension", () => {
    expect(videoBlobPathname("Clip 1 (final).mp4")).toBe("videos/Clip-1-final.mp4");
  });

  it("falls back to a real base name for all-Thai file names", () => {
    expect(videoBlobPathname("คลิปสอน.mp4")).toBe("videos/clip.mp4");
  });

  it("keeps the ASCII part of mixed Thai/ASCII names", () => {
    expect(videoBlobPathname("คลิปที่ 2 unit2.WEBM")).toBe("videos/2-unit2.webm");
  });

  it("forces a supported extension and lower-cases it", () => {
    expect(videoBlobPathname("recording")).toBe("videos/recording.mp4");
    expect(videoBlobPathname(".ogg")).toBe("videos/clip.ogg");
  });

  it("keeps an unsupported extension as part of the name (the dropzone pre-check rejects it first)", () => {
    expect(videoBlobPathname("movie.MOV")).toBe("videos/movie-MOV.mp4");
  });
});

describe("videoContentType", () => {
  it("maps supported extensions to their canonical MIME", () => {
    expect(videoContentType("a.mp4")).toBe("video/mp4");
    expect(videoContentType("a.WEBM")).toBe("video/webm");
    expect(videoContentType("clip.ogg")).toBe("video/ogg");
  });

  it("returns null for unsupported files", () => {
    expect(videoContentType("movie.mov")).toBeNull();
    expect(videoContentType("noext")).toBeNull();
    expect(videoContentType("page.html")).toBeNull();
  });
});

describe("isPublicBlobUrl", () => {
  it("detects public-store URLs only", () => {
    expect(isPublicBlobUrl("https://abc123.public.blob.vercel-storage.com/videos/a.mp4")).toBe(true);
    expect(isPublicBlobUrl("https://abc123.private.blob.vercel-storage.com/ebooks/a.pdf")).toBe(false);
    expect(isPublicBlobUrl("https://evil.com/x.public.blob.vercel-storage.com/a.mp4")).toBe(false);
    expect(isPublicBlobUrl("http://abc123.public.blob.vercel-storage.com/a.mp4")).toBe(false);
    expect(isPublicBlobUrl("/local.mp4")).toBe(false);
  });
});
