import { describe, it, expect } from "vitest";
import { toEmbedUrl, isSupportedVideoUrl, clipThumbnailUrl, youtubeVideoId } from "@/lib/videoEmbed";

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

describe("clipThumbnailUrl", () => {
  const yt = "https://www.youtube.com/watch?v=abc123";

  it("uses YouTube's still when no thumbnail is set", () => {
    expect(clipThumbnailUrl(undefined, yt)).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(clipThumbnailUrl("", "https://youtube.com/shorts/CtQ_drx6RUQ?si=x")).toBe(
      "https://i.ytimg.com/vi/CtQ_drx6RUQ/hqdefault.jpg",
    );
  });

  it("prefers an explicit image URL", () => {
    expect(clipThumbnailUrl("https://cdn.example.com/a.jpg", yt)).toBe("https://cdn.example.com/a.jpg");
  });

  it("ignores a video link pasted as the thumbnail", () => {
    expect(clipThumbnailUrl(yt, yt)).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
  });

  it("returns undefined for Drive videos without an explicit thumbnail", () => {
    expect(clipThumbnailUrl(undefined, "https://drive.google.com/file/d/xyz/view")).toBeUndefined();
  });
});

describe("youtubeVideoId", () => {
  it("extracts ids from every supported YouTube form and rejects others", () => {
    expect(youtubeVideoId("https://youtu.be/Ktxam4bHrTo")).toBe("Ktxam4bHrTo");
    expect(youtubeVideoId("https://m.youtube.com/watch?v=abc")).toBe("abc");
    expect(youtubeVideoId("https://www.youtube.com/live/liveId")).toBe("liveId");
    expect(youtubeVideoId("https://drive.google.com/file/d/xyz/view")).toBeNull();
    expect(youtubeVideoId("not a url")).toBeNull();
  });
});
