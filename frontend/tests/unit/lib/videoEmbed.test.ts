import { describe, it, expect } from "vitest";
import { toEmbedUrl, isSupportedVideoUrl } from "@/lib/videoEmbed";

describe("toEmbedUrl — YouTube", () => {
  it("converts youtu.be short links", () => {
    expect(toEmbedUrl("https://youtu.be/Ktxam4bHrTo")).toBe(
      "https://www.youtube.com/embed/Ktxam4bHrTo?autoplay=1&rel=0",
    );
  });

  it("converts watch links with ?v=", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123?autoplay=1&rel=0",
    );
  });

  it("converts Shorts links", () => {
    expect(toEmbedUrl("https://www.youtube.com/shorts/shortId1")).toBe(
      "https://www.youtube.com/embed/shortId1?autoplay=1&rel=0",
    );
  });

  it("normalizes /embed links to the canonical autoplay form", () => {
    expect(toEmbedUrl("https://www.youtube.com/embed/xyz789")).toBe(
      "https://www.youtube.com/embed/xyz789?autoplay=1&rel=0",
    );
  });

  it("converts /live links", () => {
    expect(toEmbedUrl("https://youtube.com/live/liveId42")).toBe(
      "https://www.youtube.com/embed/liveId42?autoplay=1&rel=0",
    );
  });
});

describe("toEmbedUrl — Google Drive", () => {
  it("converts /file/d/<id> links", () => {
    expect(toEmbedUrl("https://drive.google.com/file/d/FILE123/view?usp=sharing")).toBe(
      "https://drive.google.com/file/d/FILE123/preview",
    );
  });

  it("converts legacy /open?id= links", () => {
    expect(toEmbedUrl("https://drive.google.com/open?id=FILE123")).toBe(
      "https://drive.google.com/file/d/FILE123/preview",
    );
  });
});

describe("toEmbedUrl — rejects", () => {
  it("returns empty for non-video hosts", () => {
    expect(toEmbedUrl("https://example.com/watch?v=abc")).toBe("");
  });

  it("returns empty for malformed URLs", () => {
    expect(toEmbedUrl("not a url")).toBe("");
    expect(toEmbedUrl("")).toBe("");
  });

  it("drives isSupportedVideoUrl", () => {
    expect(isSupportedVideoUrl("https://www.youtube.com/shorts/x")).toBe(true);
    expect(isSupportedVideoUrl("https://vimeo.com/12345")).toBe(false);
  });
});
